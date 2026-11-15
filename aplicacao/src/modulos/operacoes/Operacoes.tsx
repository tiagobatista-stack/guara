// Operações: fiscalizações encaminhadas por terceiros, com lista de pontos, equipes e datas (planejamento de viagens).
// Coordenadas podem identificar imóvel: os dados ficam só neste navegador.

import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { useArmazem, useEstadoDemandas } from '../demandas/armazem.ts';
import { formatarDecimal, formatarGms } from '../demandas/coordenadas.ts';
import { decodificarCsv, importarPontosCsv, type ResultadoCsv } from './importar-csv.ts';
import { LIMITES_OPERACAO, ROTULOS_SITUACAO, SITUACOES_PONTO, type Operacao, type Ponto, type SituacaoPonto } from './modelo.ts';
import {
  alterarPonto, criarOperacao, excluirOperacao, excluirPonto, incluirPontos, useOperacoes, useOperacoesSoNaMemoria,
} from './armazem.ts';
import { pontosProximos, pontosSemData, pontosSemEquipe, textoLocalProximo } from './regras.ts';

const dataBr = (d?: string) => (d ? d.split('-').reverse().join('/') : '—');

// ---------- Importação por CSV ----------

function ImportarCsv({ operacao }: { operacao: Operacao }) {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoCsv | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const conferir = (conteudo: string) => {
    setMensagem(null);
    setResultado(importarPontosCsv(conteudo, { inicio: operacao.inicio, fim: operacao.fim }));
  };
  const lerArquivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    const conteudo = decodificarCsv(new Uint8Array(await arquivo.arrayBuffer()));
    setTexto(conteudo);
    conferir(conteudo);
  };

  const validos = resultado?.linhas.filter((l) => l.ponto) ?? [];
  const comErro = resultado?.linhas.filter((l) => l.erros.length) ?? [];

  const importar = () => {
    const problema = incluirPontos(operacao.id, validos.map((l) => l.ponto!));
    if (problema) return setMensagem(problema);
    setMensagem(`${validos.length} ponto(s) importado(s).`);
    setResultado(null);
    setTexto('');
  };

  return (
    <section className="cartao" aria-labelledby="titulo-importar">
      <h3 id="titulo-importar" className="titulo-secao">Importar pontos (CSV)</h3>
      <p className="texto-pequeno texto-suave">
        Salve a planilha como CSV, ou copie as células e cole aqui. Colunas: N_PONTO, EQUIPE, COORD_X (longitude), COORD_Y (latitude),
        MUNICIPIO, DAT_SAIDA, DAT_RETOR, NOT_PLANEJ. Só a coordenada é obrigatória. Nada é gravado antes da conferência.
      </p>
      <label className="campo-grupo">
        <span>Arquivo CSV</span>
        <input className="campo" type="file" accept=".csv,text/csv,text/plain" onChange={lerArquivo} />
      </label>
      <label className="campo-grupo">
        <span>Ou cole o conteúdo</span>
        <textarea className="campo campo--area" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <div className="acoes">
        <button type="button" className="botao" disabled={!texto.trim()} onClick={() => conferir(texto)}>Conferir</button>
      </div>
      {mensagem && <p role="status" data-testid="mensagem-importacao">{mensagem}</p>}
      {resultado?.erro && <p role="alert" className="erro-campo">{resultado.erro}</p>}
      {resultado && !resultado.erro && (
        <div data-testid="previa-importacao">
          <p>
            <strong>{validos.length}</strong> ponto(s) pronto(s) para importar
            {comErro.length > 0 && <> e <strong className="texto--atencao">{comErro.length}</strong> linha(s) com problema (não entram; corrija o arquivo e confira de novo)</>}.
          </p>
          {comErro.length > 0 && (
            <ul className="lista-limpa" aria-label="Linhas com problema">
              {comErro.map((l) => <li key={l.linha} className="texto--atencao texto-pequeno">Linha {l.linha}: {l.erros.join(' ')}</li>)}
            </ul>
          )}
          <div className="acoes">
            <button type="button" className="botao botao--primario" disabled={validos.length === 0} onClick={importar}>
              Importar {validos.length} ponto(s)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- Um ponto ----------

function CartaoPonto({ operacao, ponto, todas }: { operacao: Operacao; ponto: Ponto; todas: readonly Operacao[] }) {
  const armazem = useArmazem();
  const { demandas } = useEstadoDemandas();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ equipe: ponto.equipe ?? '', saida: ponto.saida ?? '', retorno: ponto.retorno ?? '', grupo: ponto.grupo ?? '', notas: ponto.notas });
  const [erro, setErro] = useState<string | null>(null);
  const [ligar, setLigar] = useState('');

  const rotulo = ponto.numero !== undefined ? `Ponto ${ponto.numero}` : 'Ponto';
  const proximos = useMemo(
    () => pontosProximos(ponto, todas, demandas.filter((d) => !ponto.demandas.includes(d.id)).map((d) => ({ id: d.id, titulo: d.titulo, coordenada: d.coordenada }))),
    [ponto, todas, demandas],
  );
  const ligadas = ponto.demandas.map((id) => demandas.find((d) => d.id === id)).filter((d) => d !== undefined);

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const problema = alterarPonto(operacao.id, ponto.id, { equipe: form.equipe.trim(), saida: form.saida, retorno: form.retorno, grupo: form.grupo.trim(), notas: form.notas.trim() });
    setErro(problema);
    if (!problema) setEditando(false);
  };
  const mudarSituacao = (s: SituacaoPonto) => setErro(alterarPonto(operacao.id, ponto.id, { situacao: s }));
  const ligarDemanda = () => {
    if (!ligar) return;
    setErro(alterarPonto(operacao.id, ponto.id, { demandas: [...ponto.demandas, ligar] }));
    setLigar('');
  };
  const desligar = (id: string) => setErro(alterarPonto(operacao.id, ponto.id, { demandas: ponto.demandas.filter((x) => x !== id) }));

  const criarDemanda = () => {
    const base = ponto.numero !== undefined ? `ponto ${ponto.numero} de ${operacao.nome}` : operacao.nome;
    const r = armazem.criar({
      titulo: `Vistoria${ponto.municipio ? ` em ${ponto.municipio}` : ''} (${base})`.slice(0, 120),
      descricao: ponto.notas,
      responsavel: '',
      prioridade: 'Média',
      status: 'A Fazer',
      prazo: '',
      tipo: 'campo',
      natureza: 'demanda',
      coordenada: formatarDecimal(ponto.coordenada),
      ...(ponto.saida ? { vistoria: 'data' as const, vistoriaData: ponto.saida } : { vistoria: 'aberta' as const }),
    });
    if (!r.ok || !r.demanda) return setErro(r.ok ? 'Não foi possível criar a demanda.' : r.mensagem);
    setErro(alterarPonto(operacao.id, ponto.id, { demandas: [...ponto.demandas, r.demanda.id] }));
  };

  const livres = demandas.filter((d) => !ponto.demandas.includes(d.id));

  return (
    <li className="cartao" data-testid={`ponto-${ponto.id}`}>
      <p><strong>{rotulo}</strong>{ponto.municipio && <> · {ponto.municipio}</>} <span className="texto-pequeno texto-suave">({ROTULOS_SITUACAO[ponto.situacao]})</span></p>
      <dl className="dados-definicao">
        <dt>Coordenada</dt><dd className="mono">{formatarGms(ponto.coordenada)}</dd>
        <dt>Equipe</dt><dd data-testid={`equipe-${ponto.id}`}>{ponto.equipe ?? <span className="texto--atencao">sem equipe</span>}</dd>
        <dt>Saída</dt><dd>{ponto.saida ? dataBr(ponto.saida) : <span className="texto--atencao">sem data</span>}</dd>
        <dt>Retorno</dt><dd>{dataBr(ponto.retorno)}</dd>
        {ponto.grupo && <><dt>Grupo</dt><dd data-testid={`grupo-${ponto.id}`}>{ponto.grupo}</dd></>}
        {ponto.notas && <><dt>Notas</dt><dd>{ponto.notas}</dd></>}
        {ligadas.length > 0 && (
          <><dt>Demandas</dt><dd>{ligadas.map((d) => (
            <span key={d.id} className="texto-pequeno" data-testid={`ligada-${ponto.id}`}>
              {d.titulo}{' '}
              <button type="button" className="botao botao--pequeno" aria-label={`Desligar ${d.titulo}`} onClick={() => desligar(d.id)}>Desligar</button>{' '}
            </span>
          ))}</dd></>
        )}
      </dl>

      {proximos.length > 0 && (
        <div className="aviso" data-testid={`proximos-${ponto.id}`}>
          <p><strong>Local já aparece em outro registro</strong> (até 200 m; confira, a decisão é sua):</p>
          <ul className="lista-limpa">{proximos.map((l) => <li key={`${l.origem}-${l.id}`} className="texto-pequeno">{textoLocalProximo(l)}</li>)}</ul>
        </div>
      )}

      {erro && <p role="alert" className="erro-campo">{erro}</p>}

      {editando ? (
        <form onSubmit={salvar} className="formulario" noValidate aria-label={`Editar ${rotulo}`}>
          <div className="grade grade--2">
            <label className="campo-grupo"><span>Equipe</span>
              <input className="campo" value={form.equipe} maxLength={LIMITES_OPERACAO.equipe} onChange={(e) => setForm({ ...form, equipe: e.target.value })} /></label>
            <label className="campo-grupo"><span>Grupo</span>
              <input className="campo" value={form.grupo} maxLength={LIMITES_OPERACAO.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} /></label>
            <label className="campo-grupo"><span>Saída</span>
              <input className="campo" type="date" value={form.saida} onChange={(e) => setForm({ ...form, saida: e.target.value })} /></label>
            <label className="campo-grupo"><span>Retorno</span>
              <input className="campo" type="date" value={form.retorno} onChange={(e) => setForm({ ...form, retorno: e.target.value })} /></label>
          </div>
          <label className="campo-grupo"><span>Notas</span>
            <textarea className="campo campo--area" rows={2} value={form.notas} maxLength={LIMITES_OPERACAO.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label>
          <div className="acoes">
            <button type="submit" className="botao botao--primario">Salvar ponto</button>
            <button type="button" className="botao" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="acoes">
          <button type="button" className="botao botao--pequeno" aria-label={`Editar ${rotulo}`} onClick={() => setEditando(true)}>Editar</button>
          <label className="campo-grupo">
            <span className="texto-pequeno">Situação de {rotulo}</span>
            <select className="campo" value={ponto.situacao} onChange={(e) => mudarSituacao(e.target.value as SituacaoPonto)}>
              {SITUACOES_PONTO.map((s) => <option key={s} value={s}>{ROTULOS_SITUACAO[s]}</option>)}
            </select>
          </label>
          <button type="button" className="botao botao--pequeno" aria-label={`Criar demanda a partir do ${rotulo}`} onClick={criarDemanda}>Criar demanda a partir do ponto</button>
          <button
            type="button" className="botao botao--pequeno botao--perigo" aria-label={`Excluir ${rotulo}`}
            onClick={() => { if (window.confirm(`Excluir o ${rotulo}? Esta ação não pode ser desfeita.`)) excluirPonto(operacao.id, ponto.id); }}
          >Excluir</button>
        </div>
      )}

      {livres.length > 0 && !editando && (
        <div className="acoes">
          <label className="campo-grupo">
            <span className="texto-pequeno">Ligar a uma demanda existente ({rotulo})</span>
            <select className="campo" value={ligar} onChange={(e) => setLigar(e.target.value)}>
              <option value="">Escolha…</option>
              {livres.map((d) => <option key={d.id} value={d.id}>{d.titulo}</option>)}
            </select>
          </label>
          <button type="button" className="botao botao--pequeno" disabled={!ligar} aria-label={`Ligar demanda ao ${rotulo}`} onClick={ligarDemanda}>Ligar</button>
        </div>
      )}
    </li>
  );
}

// ---------- Uma operação ----------

function DetalheOperacao({ operacao, todas, aoVoltar }: { operacao: Operacao; todas: readonly Operacao[]; aoVoltar: () => void }) {
  const [equipe, setEquipe] = useState('');
  const [situacao, setSituacao] = useState<'' | SituacaoPonto>('');
  const [soPendentes, setSoPendentes] = useState(false);
  const equipes = useMemo(() => [...new Set(operacao.pontos.map((p) => p.equipe).filter((e): e is string => !!e))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [operacao.pontos]);
  const semEquipe = pontosSemEquipe(operacao.pontos).length;
  const semData = pontosSemData(operacao.pontos).length;
  const pendentes = new Set([...pontosSemEquipe(operacao.pontos), ...pontosSemData(operacao.pontos)].map((p) => p.id));
  const visiveis = operacao.pontos.filter(
    (p) => (!equipe || (equipe === 'sem' ? !p.equipe : p.equipe === equipe)) && (!situacao || p.situacao === situacao) && (!soPendentes || pendentes.has(p.id)),
  );

  return (
    <article aria-labelledby="titulo-operacao">
      <div className="acoes"><button type="button" className="botao" onClick={aoVoltar}>Voltar às operações</button></div>
      <h2 id="titulo-operacao" className="titulo-secao">{operacao.nome}</h2>
      <p className="texto-suave texto-medio">
        {dataBr(operacao.inicio)} a {dataBr(operacao.fim)}{operacao.origem && <> · encaminhada por {operacao.origem}</>}
      </p>
      <p data-testid="resumo-operacao">
        {operacao.pontos.length} ponto(s) · <span className={semEquipe ? 'texto--atencao' : ''}>{semEquipe} sem equipe</span> ·{' '}
        <span className={semData ? 'texto--atencao' : ''}>{semData} sem data</span>
      </p>

      <ImportarCsv operacao={operacao} />

      <form className="filtros grade grade--2" aria-label="Filtros dos pontos" onSubmit={(e) => e.preventDefault()}>
        <label className="campo-grupo"><span>Equipe</span>
          <select className="campo" value={equipe} onChange={(e) => setEquipe(e.target.value)}>
            <option value="">Todas</option>
            {equipes.map((x) => <option key={x}>{x}</option>)}
            <option value="sem">Sem equipe</option>
          </select></label>
        <label className="campo-grupo"><span>Situação</span>
          <select className="campo" value={situacao} onChange={(e) => setSituacao(e.target.value as '' | SituacaoPonto)}>
            <option value="">Todas</option>
            {SITUACOES_PONTO.map((s) => <option key={s} value={s}>{ROTULOS_SITUACAO[s]}</option>)}
          </select></label>
        <label><input type="checkbox" checked={soPendentes} onChange={(e) => setSoPendentes(e.target.checked)} /> Só os sem equipe ou sem data</label>
      </form>

      {operacao.pontos.length === 0 ? (
        <EstadoVazio cartao texto="Nenhum ponto nesta operação." dica="Importe um CSV acima para trazer a lista de pontos." />
      ) : visiveis.length === 0 ? (
        <EstadoVazio cartao texto="Nenhum ponto corresponde aos filtros." dica="Mude ou limpe os filtros." />
      ) : (
        <ul className="lista-limpa grade grade--2" aria-label="Pontos da operação">
          {visiveis.map((p) => <CartaoPonto key={p.id} operacao={operacao} ponto={p} todas={todas} />)}
        </ul>
      )}
    </article>
  );
}

// ---------- Lista ----------

export function Operacoes({ agora = () => new Date() }: { agora?: () => Date }) {
  const operacoes = useOperacoes();
  const soNaMemoria = useOperacoesSoNaMemoria();
  const [aberta, setAberta] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', inicio: '', fim: '', origem: '' });
  const [erro, setErro] = useState<string | null>(null);
  const emDetalhe = operacoes.find((o) => o.id === aberta);

  const criar = (e: FormEvent) => {
    e.preventDefault();
    const r = criarOperacao(form, agora().toISOString());
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    setForm({ nome: '', inicio: '', fim: '', origem: '' });
    setAberta(r.id);
  };

  return (
    <section aria-labelledby="titulo-operacoes" className="pagina">
      <h1 id="titulo-operacoes" className="titulo-pagina">Operações</h1>
      {soNaMemoria && (
        <p role="alert" className="aviso" data-testid="aviso-operacoes-sem-gravacao">
          Este navegador não deixou gravar as operações (armazenamento bloqueado, cheio ou em modo privado). As mudanças valem só até fechar a página.
        </p>
      )}
      {emDetalhe ? (
        <DetalheOperacao operacao={emDetalhe} todas={operacoes} aoVoltar={() => setAberta(null)} />
      ) : (
        <>
          <p className="texto-suave texto-medio">
            Fiscalizações encaminhadas por terceiros, com lista de pontos para vistoria. Os dados ficam só neste navegador:
            use dados reais apenas depois de classificação e autorização institucional.
          </p>
          <form onSubmit={criar} className="cartao formulario" noValidate aria-labelledby="titulo-nova-operacao">
            <h2 id="titulo-nova-operacao" className="titulo-secao">Nova operação</h2>
            <label className="campo-grupo"><span>Nome *</span>
              <input className="campo" value={form.nome} maxLength={LIMITES_OPERACAO.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
            <div className="grade grade--2">
              <label className="campo-grupo"><span>Início *</span>
                <input className="campo" type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></label>
              <label className="campo-grupo"><span>Fim *</span>
                <input className="campo" type="date" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} /></label>
            </div>
            <label className="campo-grupo"><span>Quem encaminhou (opcional)</span>
              <input className="campo" value={form.origem} maxLength={LIMITES_OPERACAO.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} /></label>
            {erro && <span role="alert" className="erro-campo">{erro}</span>}
            <div className="acoes"><button type="submit" className="botao botao--primario">Criar operação</button></div>
          </form>

          {operacoes.length === 0 ? (
            <EstadoVazio cartao texto="Nenhuma operação cadastrada." dica="Crie a operação e depois importe a lista de pontos." />
          ) : (
            <ul className="lista-limpa grade grade--2" aria-label="Lista de operações">
              {operacoes.map((o) => (
                <li key={o.id} className="cartao" data-testid={`operacao-${o.id}`}>
                  <p><strong>{o.nome}</strong></p>
                  <p className="texto-pequeno texto-suave">{dataBr(o.inicio)} a {dataBr(o.fim)}</p>
                  <p className="texto-pequeno">
                    {o.pontos.length} ponto(s) · {pontosSemEquipe(o.pontos).length} sem equipe · {pontosSemData(o.pontos).length} sem data
                  </p>
                  <div className="acoes">
                    <button type="button" className="botao botao--pequeno" aria-label={`Abrir ${o.nome}`} onClick={() => setAberta(o.id)}>Abrir</button>
                    <button
                      type="button" className="botao botao--pequeno botao--perigo" aria-label={`Excluir ${o.nome}`}
                      onClick={() => { if (window.confirm(`Excluir a operação "${o.nome}" e seus pontos? Esta ação não pode ser desfeita.`)) excluirOperacao(o.id); }}
                    >Excluir</button>
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
