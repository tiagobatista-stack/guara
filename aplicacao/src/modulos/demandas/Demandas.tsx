// Demandas: lista com pesquisa e filtros, cadastro, edição, detalhe e exclusão
// com confirmação (incremento 1 do PLANO.md). Dados no localStorage deste navegador.

import { Fragment, useEffect, useMemo, useState } from 'react';
import { definirDemandaEmFoco } from '../assistente/demanda-em-foco.ts';
import { PRIORIDADES, STATUS, type Demanda } from './modelo.ts';
import { filtrarDemandas, FILTROS_VAZIOS, paraEntrada, type Filtros } from './regras.ts';
import { useAjusteFeriados, useArmazem, useEstadoDemandas } from './armazem.ts';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { ENTRADA_VAZIA, FormularioDemanda } from './FormularioDemanda.tsx';
import { acharParecida } from './parecida.ts';
import { NUMEROS, ROTULOS_NUMERO } from './identificadores.ts';
import { NATUREZAS, ROTULOS_NATUREZA, ROTULOS_TIPO, TIPOS } from './classificacao.ts';
import { resumosEmAberto } from './resumo.ts';
import { textoFalta } from './essenciais.ts';
import { formatarDecimal, formatarGms } from './coordenadas.ts';
import { textoVistoria } from './vistoria.ts';
import { VinculoOperacao } from './VinculoOperacao.tsx';
import { ContextoDoRelatorio } from './ContextoDoRelatorio.tsx';
import { useOperacoes } from '../operacoes/armazem.ts';
import { demandasEncaixadas } from '../operacoes/regras.ts';
import { historicoRecente, textoEvento } from './historico.ts';
import { situacaoDaDemanda, type AjusteFeriados } from '../alertas/dias-uteis.ts';
import { textoEmAndamento } from '../alertas/inatividade.ts';
import { textoBloqueio } from '../alertas/bloqueio.ts';
import { BloqueioDoItem } from '../../compartilhado/BloqueioDoItem.tsx';
import { AnotacoesDoItem, ConfirmaConclusao, SeloAnotacoes } from '../../compartilhado/AnotacoesDoItem.tsx';
import { contarAbertas } from '../../compartilhado/anotacoes.ts';
import type { EntradaDemanda } from './modelo.ts';
import { parametrosDaRota } from '../../nucleo/registro-modulos.ts';

type Modo = { tipo: 'lista' } | { tipo: 'nova' } | { tipo: 'editar'; id: string } | { tipo: 'detalhe'; id: string };
type Aviso = { tipo: 'sucesso' | 'erro'; texto: string } | null;

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR');
const data = (aaaammdd?: string) => (aaaammdd ? new Date(`${aaaammdd}T00:00:00`).toLocaleDateString('pt-BR') : '—');
const comSituacao = (d: Demanda, agora: Date, ajuste: AjusteFeriados) => {
  const s = situacaoDaDemanda(d, agora, ajuste);
  return s ? `${data(d.prazo)} · ${s.texto}` : data(d.prazo);
};

function baixarArquivo(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function Demandas({ agora = () => new Date() }: { agora?: () => Date }) {
  const armazem = useArmazem();
  const { demandas, erroArmazenamento, conteudoBruto } = useEstadoDemandas();
  const ajuste = useAjusteFeriados(agora());
  const operacoes = useOperacoes();
  const encaixadas = useMemo(() => demandasEncaixadas(operacoes), [operacoes]);
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' });
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [focoInicial, setFocoInicial] = useState<'prazo' | undefined>(undefined);
  const abrirDetalhe = (_d: Demanda | undefined, id: string) => {
    setAviso(null);
    setModo({ tipo: 'detalhe', id });
  };
  // Tela compartilhada (projetor, reunião): só o resumo por lista branca, sem dado pessoal.
  const [compartilhada, setCompartilhada] = useState(false);

  const responsaveis = useMemo(
    () => [...new Set(demandas.map((d) => d.responsavel).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [demandas],
  );
  const visiveis = useMemo(() => filtrarDemandas(demandas, filtros, encaixadas), [demandas, filtros, encaixadas]);
  const buscar = (id: string) => demandas.find((d) => d.id === id);

  const excluir = (d: Demanda) => {
    if (!window.confirm(`Excluir a demanda "${d.titulo}"? Esta ação não pode ser desfeita.`)) return;
    const r = armazem.excluir(d.id);
    setAviso(r.ok ? { tipo: 'sucesso', texto: 'Demanda excluída.' } : { tipo: 'erro', texto: r.mensagem });
    if (r.ok) setModo({ tipo: 'lista' });
  };

  // Concluir com anotações abertas pergunta antes (não bloqueia): guarda a entrada à espera do "Concluir".
  const [confirmaEdicao, setConfirmaEdicao] = useState<EntradaDemanda | null>(null);
  const salvarEdicao = (id: string, entrada: EntradaDemanda) => {
    const r = armazem.editar(id, entrada);
    if (!r.ok) {
      if (!r.erros) setAviso({ tipo: 'erro', texto: r.mensagem });
      return r.erros ?? {};
    }
    setConfirmaEdicao(null);
    setAviso({ tipo: 'sucesso', texto: 'Alterações gravadas.' });
    setModo({ tipo: 'detalhe', id });
    return null;
  };

  const responder = (r: { ok: true } | { ok: false; mensagem: string }, sucesso: string) =>
    setAviso(r.ok ? { tipo: 'sucesso', texto: sucesso } : { tipo: 'erro', texto: r.mensagem });

  const restaurar = () => {
    if (!window.confirm('Substituir TODOS os dados deste navegador pelos exemplos fictícios?')) return;
    const r = armazem.restaurarExemplos();
    setAviso(r.ok ? { tipo: 'sucesso', texto: 'Exemplos restaurados.' } : { tipo: 'erro', texto: r.mensagem });
  };

  // O assistente e a exportação passam a saber qual demanda está aberta; ao sair do detalhe, o foco some.
  const idEmFoco = modo.tipo === 'detalhe' && buscar(modo.id) ? modo.id : null;
  useEffect(() => {
    definirDemandaEmFoco(idEmFoco);
    return () => definirDemandaEmFoco(null);
  }, [idEmFoco]);

  // Rota "#/demandas?abrir=DEM-FIC-0001&campo=prazo" (botão "Abrir demanda" do assistente): abre a demanda
  // para edição, foca o campo e limpa os parâmetros para não reabrir ao recarregar. Código inexistente
  // vira mensagem na tela. Lê ao montar e a cada mudança de rota (o botão pode ser tocado já nesta tela).
  useEffect(() => {
    const aplicar = () => {
      const p = parametrosDaRota(window.location.hash);
      // "#/demandas?texto=licença" (botão "Ver todos em Demandas" da busca do assistente): volta à lista com
      // o termo no campo de pesquisa, o mesmo que a conversa usou.
      const texto = p.get('texto');
      if (texto !== null) {
        window.history.replaceState(null, '', '#/demandas');
        setAviso(null);
        setModo({ tipo: 'lista' });
        setFiltros({ ...FILTROS_VAZIOS, texto });
        return;
      }
      const id = p.get('abrir');
      if (!id) return;
      window.history.replaceState(null, '', '#/demandas');
      if (!demandas.some((d) => d.id === id)) {
        setAviso({ tipo: 'erro', texto: `Não encontrei a demanda ${id} neste navegador.` });
        return;
      }
      setAviso(null);
      // "campo=bloqueio" (botão "Ver o motivo do bloqueio"): abre o detalhe, onde o motivo e o comentário aparecem.
      if (p.get('campo') === 'bloqueio') {
        setModo({ tipo: 'detalhe', id });
        return;
      }
      setFocoInicial(p.get('campo') === 'prazo' ? 'prazo' : undefined);
      setModo({ tipo: 'editar', id });
    };
    aplicar();
    window.addEventListener('hashchange', aplicar);
    return () => window.removeEventListener('hashchange', aplicar);
  }, [demandas]);

  const emEdicao = modo.tipo === 'editar' ? buscar(modo.id) : undefined;
  const emDetalhe = modo.tipo === 'detalhe' ? buscar(modo.id) : undefined;

  return (
    <section aria-labelledby="titulo-demandas" className="pagina">
      <div className="linha-entre">
        <div>
          <h1 id="titulo-demandas" className="titulo-pagina">Demandas</h1>
          <p className="texto-suave texto-medio">
            {demandas.length} demanda(s) neste navegador. Os dados ficam no localStorage e não são compartilhados.
          </p>
        </div>
        {modo.tipo === 'lista' && !erroArmazenamento && (
          <div className="acoes">
            {compartilhada ? (
              <button type="button" className="botao botao--primario" onClick={() => setCompartilhada(false)}>Sair da tela compartilhada</button>
            ) : (
              <>
                <button type="button" className="botao" onClick={() => { setAviso(null); setCompartilhada(true); }}>Tela compartilhada</button>
                <button type="button" className="botao botao--primario" onClick={() => { setAviso(null); setModo({ tipo: 'nova' }); }}>
                  Nova demanda
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {aviso && (
        <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`feedback feedback--${aviso.tipo}`}>{aviso.texto}</p>
      )}

      {erroArmazenamento && (
        <div role="alert" className="aviso">
          <p><strong>Os dados salvos neste navegador estão corrompidos</strong> ({erroArmazenamento}). Nada foi apagado.</p>
          <div className="acoes">
            <button type="button" className="botao" onClick={() => baixarArquivo('guara-conteudo-corrompido.json', conteudoBruto ?? '')}>
              Baixar conteúdo bruto
            </button>
            <button type="button" className="botao" onClick={restaurar}>Restaurar exemplos</button>
          </div>
        </div>
      )}

      {modo.tipo === 'nova' && (
        <FormularioDemanda
          titulo="Nova demanda"
          inicial={ENTRADA_VAZIA}
          aoCancelar={() => setModo({ tipo: 'lista' })}
          deduzirAoDigitar
          verificarParecida={(entrada) => acharParecida(entrada, demandas)}
          aoVerExistente={(id) => {
            abrirDetalhe(buscar(id), id);
          }}
          aoSalvar={(entrada) => {
            const r = armazem.criar(entrada);
            if (!r.ok) {
              if (!r.erros) setAviso({ tipo: 'erro', texto: r.mensagem });
              return r.erros ?? {};
            }
            setAviso({ tipo: 'sucesso', texto: 'Demanda criada e gravada.' });
            setModo({ tipo: 'lista' });
            return null;
          }}
        />
      )}

      {emEdicao && (
        <FormularioDemanda
          key={emEdicao.id}
          focoInicial={focoInicial}
          titulo="Editar demanda"
          inicial={paraEntrada(emEdicao)}
          aoCancelar={() => { setConfirmaEdicao(null); setModo({ tipo: 'detalhe', id: emEdicao.id }); }}
          aoSalvar={(entrada) => {
            if (entrada.status === 'Concluída' && emEdicao.status !== 'Concluída' && contarAbertas(emEdicao.anotacoes) > 0) {
              setConfirmaEdicao(entrada);
              return {};
            }
            return salvarEdicao(emEdicao.id, entrada);
          }}
        />
      )}
      {emEdicao && confirmaEdicao && (
        <ConfirmaConclusao anotacoes={emEdicao.anotacoes} aoVoltar={() => setConfirmaEdicao(null)}
          aoConcluir={() => { if (salvarEdicao(emEdicao.id, confirmaEdicao) !== null) setAviso({ tipo: 'erro', texto: 'Corrija os campos do formulário.' }); }} />
      )}

      {emDetalhe && (
        <article className="cartao" aria-labelledby="titulo-detalhe">
          <h2 id="titulo-detalhe" className="titulo-secao">{emDetalhe.titulo}</h2>
          <p className="texto-medio">{emDetalhe.descricao || <span className="texto-suave">Sem descrição.</span>}</p>
          <dl className="dados-definicao">
            <dt>Status</dt><dd>{emDetalhe.status}</dd>
            {textoEmAndamento(emDetalhe, agora()) && <><dt>Andamento</dt><dd>{textoEmAndamento(emDetalhe, agora())}</dd></>}
            <dt>Prioridade</dt><dd>{emDetalhe.prioridade}</dd>
            <dt>Tipo</dt><dd>{emDetalhe.tipo ? ROTULOS_TIPO[emDetalhe.tipo] : 'não definido'}</dd>
            <dt>Natureza</dt><dd>{emDetalhe.natureza ? ROTULOS_NATUREZA[emDetalhe.natureza] : 'não definida'}</dd>
            <dt>Responsável</dt><dd>{emDetalhe.responsavel || '—'}</dd>
            <dt>Prazo</dt><dd>{comSituacao(emDetalhe, agora(), ajuste)}</dd>
            {NUMEROS.map((c) => <Fragment key={c}><dt>{ROTULOS_NUMERO[c]}</dt><dd className="mono">{emDetalhe[c] ?? '—'}</dd></Fragment>)}
            <dt>Coordenada</dt>
            <dd className="mono" data-testid="coordenada-detalhe">
              {emDetalhe.coordenada ? `${formatarDecimal(emDetalhe.coordenada)} · ${formatarGms(emDetalhe.coordenada)} (SIRGAS 2000)` : '—'}
            </dd>
            {textoVistoria(emDetalhe, encaixadas) && <><dt>Vistoria</dt><dd data-testid="vistoria-detalhe">{textoVistoria(emDetalhe, encaixadas)}</dd></>}
            <dt>Criada em</dt><dd>{dataHora(emDetalhe.criadaEm)}</dd>
            <dt>Última ação relevante</dt><dd>{dataHora(emDetalhe.ultimaAcaoRelevante)}</dd>
            <dt>Preenchimento</dt>
            <dd data-testid="preenchimento-detalhe">
              {emDetalhe.status === 'Concluída' ? 'concluída: nada a cobrar' : textoFalta(emDetalhe) ?? 'campos essenciais preenchidos'}
            </dd>
            <dt>Bloqueio</dt><dd data-testid="bloqueio-detalhe">{textoBloqueio(emDetalhe, agora(), ajuste) ?? 'não está travada'}</dd>
            {emDetalhe.bloqueio?.detalhe && (
              <><dt>Detalhe do bloqueio</dt><dd data-testid="bloqueio-detalhe-livre">{emDetalhe.bloqueio.detalhe}</dd></>
            )}
          </dl>
          <VinculoOperacao demanda={emDetalhe} aoEditar={() => { setAviso(null); setModo({ tipo: 'editar', id: emDetalhe.id }); }} />
          <ContextoDoRelatorio key={`contexto-${emDetalhe.id}`} demanda={emDetalhe} />
          {emDetalhe.status !== 'Concluída' && (
            <BloqueioDoItem
              key={emDetalhe.id}
              item="demanda"
              bloqueio={emDetalhe.bloqueio}
              aoDestravar={() => responder(armazem.destravar(emDetalhe.id), 'Demanda destravada.')}
              aoConfirmar={() => responder(armazem.confirmarBloqueio(emDetalhe.id), 'Reavaliação registrada: a demanda continua travada.')}
              aoTravar={(motivo, detalhe, acao) => responder(
                armazem.travar(emDetalhe.id, motivo, detalhe),
                acao === 'apagar-detalhe' ? 'Detalhe do bloqueio apagado.' : emDetalhe.bloqueio ? 'Bloqueio atualizado.' : 'Demanda marcada como travada.',
              )}
              ajudaExtra="Evite nomes de pessoas: o texto vai no JSON exportado, mas não aparece na tela compartilhada nem no Kanban."
            />
          )}
          <AnotacoesDoItem key={`anotacoes-${emDetalhe.id}`} item="demanda" anotacoes={emDetalhe.anotacoes}
            aoMudar={(lista) => { const r = armazem.salvarAnotacoes(emDetalhe.id, lista); if (!r.ok) setAviso({ tipo: 'erro', texto: r.mensagem }); }} />
          <section className="bloco-detalhe" aria-labelledby="titulo-historico">
            <h3 id="titulo-historico" className="titulo-secao titulo-secao--bloco">Histórico</h3>
            {historicoRecente(emDetalhe).length > 0 && (
              <ol className="linha-tempo" aria-label="Histórico da demanda, do mais novo ao mais antigo" data-testid="historico">
                {historicoRecente(emDetalhe).map((e, i) => (
                  <li key={i}>
                    <span className="texto-suave">{new Date(e.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span> · {textoEvento(e)}
                  </li>
                ))}
              </ol>
            )}
            {!emDetalhe.historico?.some((e) => e.acao === 'criada') && (
              <p className="texto-pequeno texto-suave">
                {emDetalhe.historico?.length ? 'Os eventos anteriores ao histórico (14/11/2026) não foram registrados.' : 'Nenhum evento registrado: esta demanda é anterior ao histórico (14/11/2026).'}
              </p>
            )}
          </section>
          <div className="acoes acoes--rodape">
            <button type="button" className="botao" onClick={() => { setAviso(null); setModo({ tipo: 'editar', id: emDetalhe.id }); }}>Editar</button>
            <button type="button" className="botao botao--perigo" onClick={() => excluir(emDetalhe)}>Excluir</button>
            <button type="button" className="botao" onClick={() => setModo({ tipo: 'lista' })}>Voltar à lista</button>
          </div>
        </article>
      )}

      {modo.tipo === 'lista' && !erroArmazenamento && compartilhada && (
        <>
          <p role="status" className="aviso">
            <strong>Tela compartilhada.</strong> Só aparecem as demandas em aberto, com título, status, prioridade, prazo, tipo, natureza,
            andamento, bloqueio e processo administrativo. Responsável e descrição não aparecem; SIMP e processo judicial aparecem só como “tem”.
            O título aparece como foi digitado: evite nomes de pessoas nele.
          </p>
          {(() => {
            const resumos = resumosEmAberto(demandas, agora(), ajuste);
            return resumos.length === 0 ? (
              <EstadoVazio cartao texto="Nenhuma demanda em aberto." />
            ) : (
              <ul className="lista-limpa grade grade--2" aria-label="Resumo das demandas em aberto">
                {resumos.map((r) => (
                  <li key={r.id} className="cartao" data-testid={`resumo-${r.id}`}>
                    <p><strong>{r.titulo}</strong></p>
                    <dl className="dados-definicao">
                      {r.linhas.map(([rotulo, valor]) => <Fragment key={rotulo}><dt>{rotulo}</dt><dd>{valor}</dd></Fragment>)}
                    </dl>
                  </li>
                ))}
              </ul>
            );
          })()}
        </>
      )}

      {modo.tipo === 'lista' && !erroArmazenamento && !compartilhada && (
        <>
          <form className="cartao filtros" role="search" aria-label="Pesquisar e filtrar demandas" onSubmit={(e) => e.preventDefault()}>
            <label className="campo-grupo">
              <span>Pesquisar</span>
              <input className="campo" type="search" value={filtros.texto} placeholder="Título, descrição ou número"
                onChange={(e) => setFiltros({ ...filtros, texto: e.target.value })} />
            </label>
            <label className="campo-grupo">
              <span>Status</span>
              <select className="campo" value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value as Filtros['status'] })}>
                <option value="">Todos</option>
                {STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="campo-grupo">
              <span>Prioridade</span>
              <select className="campo" value={filtros.prioridade} onChange={(e) => setFiltros({ ...filtros, prioridade: e.target.value as Filtros['prioridade'] })}>
                <option value="">Todas</option>
                {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="campo-grupo">
              <span>Bloqueio</span>
              <select className="campo" value={filtros.bloqueio} onChange={(e) => setFiltros({ ...filtros, bloqueio: e.target.value as Filtros['bloqueio'] })}>
                <option value="">Todas</option>
                <option value="travadas">Só travadas</option>
                <option value="livres">Sem bloqueio</option>
              </select>
            </label>
            <label className="campo-grupo">
              <span>Tipo</span>
              <select className="campo" value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value as Filtros['tipo'] })}>
                <option value="">Todos</option>
                {TIPOS.map((t) => <option key={t} value={t}>{ROTULOS_TIPO[t]}</option>)}
                <option value="sem">Não definido</option>
              </select>
            </label>
            <label className="campo-grupo">
              <span>Natureza</span>
              <select className="campo" value={filtros.natureza} onChange={(e) => setFiltros({ ...filtros, natureza: e.target.value as Filtros['natureza'] })}>
                <option value="">Todas</option>
                {NATUREZAS.map((n) => <option key={n} value={n}>{ROTULOS_NATUREZA[n]}</option>)}
                <option value="sem">Não definida</option>
              </select>
            </label>
            <label className="campo-grupo">
              <span>Preenchimento</span>
              <select className="campo" value={filtros.preenchimento} onChange={(e) => setFiltros({ ...filtros, preenchimento: e.target.value as Filtros['preenchimento'] })}>
                <option value="">Todas</option>
                <option value="faltando">Faltando dados</option>
                <option value="completas">Completas</option>
              </select>
            </label>
            <label className="campo-grupo">
              <span>Vistoria</span>
              <select className="campo" value={filtros.vistoria} onChange={(e) => setFiltros({ ...filtros, vistoria: e.target.value as Filtros['vistoria'] })}>
                <option value="">Todas</option>
                <option value="agendada">Com data</option>
                <option value="sem-data">Sem data de vistoria</option>
                <option value="sem-encaixe">Falta encaixar (sem data e sem operação)</option>
              </select>
            </label>
            <label className="campo-grupo">
              <span>Responsável</span>
              <select className="campo" value={filtros.responsavel} onChange={(e) => setFiltros({ ...filtros, responsavel: e.target.value })}>
                <option value="">Todos</option>
                {responsaveis.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
          </form>

          {visiveis.length === 0 ? (
            demandas.length === 0 ? (
              <EstadoVazio cartao texto="Nenhuma demanda cadastrada." dica="Use “Nova demanda” para registrar a primeira." />
            ) : (
              <EstadoVazio cartao texto="Nenhuma demanda corresponde aos filtros." dica="Mude ou limpe os filtros para ver as outras." />
            )
          ) : (
            <ul className="lista-limpa grade grade--2" aria-label="Lista de demandas">
              {visiveis.map((d) => (
                <li key={d.id} className="cartao" data-testid={`demanda-${d.id}`}>
                  <p><strong>{d.titulo}</strong> <SeloAnotacoes anotacoes={d.anotacoes} testid={`anotacoes-${d.id}`} /></p>
                  <dl className="dados-definicao">
                    <dt>Status</dt><dd>{d.status}</dd>
                    {textoEmAndamento(d, agora()) && <><dt>Andamento</dt><dd data-testid={`andamento-${d.id}`}>{textoEmAndamento(d, agora())}</dd></>}
                    <dt>Prioridade</dt><dd>{d.prioridade}</dd>
                    {(d.tipo || d.natureza) && (
                      <><dt>Classificação</dt><dd data-testid={`classe-${d.id}`}>{[d.tipo && ROTULOS_TIPO[d.tipo], d.natureza && ROTULOS_NATUREZA[d.natureza]].filter(Boolean).join(' · ')}</dd></>
                    )}
                    <dt>Responsável</dt><dd>{d.responsavel || '—'}</dd>
                    <dt>Prazo</dt><dd>{comSituacao(d, agora(), ajuste)}</dd>
                    {NUMEROS.filter((c) => d[c]).map((c) => <Fragment key={c}><dt>{ROTULOS_NUMERO[c]}</dt><dd className="mono" data-testid={`${c}-${d.id}`}>{d[c]}</dd></Fragment>)}
                    {textoVistoria(d, encaixadas) && <><dt>Vistoria</dt><dd data-testid={`vistoria-${d.id}`}>{textoVistoria(d, encaixadas)}</dd></>}
                    {textoFalta(d) && <><dt>Preenchimento</dt><dd className="texto--atencao" data-testid={`falta-${d.id}`}>{textoFalta(d)}</dd></>}
                    {d.bloqueio && <><dt>Bloqueio</dt><dd data-testid={`bloqueio-${d.id}`}>{textoBloqueio(d, agora(), ajuste)}</dd></>}
                  </dl>
                  <div className="acoes">
                    <button type="button" className="botao botao--pequeno" aria-label={`Detalhes de ${d.titulo}`} onClick={() => abrirDetalhe(d, d.id)}>
                      Detalhes
                    </button>
                    <button type="button" className="botao botao--pequeno" aria-label={`Editar ${d.titulo}`} onClick={() => { setAviso(null); setModo({ tipo: 'editar', id: d.id }); }}>
                      Editar
                    </button>
                    <button type="button" className="botao botao--pequeno botao--perigo" aria-label={`Excluir ${d.titulo}`} onClick={() => excluir(d)}>
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
