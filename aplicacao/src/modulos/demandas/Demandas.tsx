// Demandas: lista com pesquisa e filtros, cadastro, edição, detalhe e exclusão
// com confirmação (incremento 1 do PLANO.md). Dados no localStorage deste navegador.

import { useMemo, useState } from 'react';
import { PRIORIDADES, STATUS, type Demanda } from './modelo.ts';
import { filtrarDemandas, FILTROS_VAZIOS, paraEntrada, type Filtros } from './regras.ts';
import { useArmazem, useEstadoDemandas } from './armazem.ts';
import { ENTRADA_VAZIA, FormularioDemanda } from './FormularioDemanda.tsx';

type Modo = { tipo: 'lista' } | { tipo: 'nova' } | { tipo: 'editar'; id: string } | { tipo: 'detalhe'; id: string };
type Aviso = { tipo: 'sucesso' | 'erro'; texto: string } | null;

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR');
const data = (aaaammdd?: string) => (aaaammdd ? new Date(`${aaaammdd}T00:00:00`).toLocaleDateString('pt-BR') : '—');

function baixarArquivo(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function Demandas() {
  const armazem = useArmazem();
  const { demandas, erroArmazenamento, conteudoBruto } = useEstadoDemandas();
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' });
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [aviso, setAviso] = useState<Aviso>(null);

  const responsaveis = useMemo(
    () => [...new Set(demandas.map((d) => d.responsavel).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [demandas],
  );
  const visiveis = useMemo(() => filtrarDemandas(demandas, filtros), [demandas, filtros]);
  const buscar = (id: string) => demandas.find((d) => d.id === id);

  const excluir = (d: Demanda) => {
    if (!window.confirm(`Excluir a demanda "${d.titulo}"? Esta ação não pode ser desfeita.`)) return;
    const r = armazem.excluir(d.id);
    setAviso(r.ok ? { tipo: 'sucesso', texto: 'Demanda excluída.' } : { tipo: 'erro', texto: r.mensagem });
    if (r.ok) setModo({ tipo: 'lista' });
  };

  const restaurar = () => {
    if (!window.confirm('Substituir TODOS os dados deste navegador pelos exemplos fictícios?')) return;
    const r = armazem.restaurarExemplos();
    setAviso(r.ok ? { tipo: 'sucesso', texto: 'Exemplos restaurados.' } : { tipo: 'erro', texto: r.mensagem });
  };

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
          <button type="button" className="botao botao--primario" onClick={() => { setAviso(null); setModo({ tipo: 'nova' }); }}>
            Nova demanda
          </button>
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
          titulo="Editar demanda"
          inicial={paraEntrada(emEdicao)}
          aoCancelar={() => setModo({ tipo: 'detalhe', id: emEdicao.id })}
          aoSalvar={(entrada) => {
            const r = armazem.editar(emEdicao.id, entrada);
            if (!r.ok) {
              if (!r.erros) setAviso({ tipo: 'erro', texto: r.mensagem });
              return r.erros ?? {};
            }
            setAviso({ tipo: 'sucesso', texto: 'Alterações gravadas.' });
            setModo({ tipo: 'detalhe', id: emEdicao.id });
            return null;
          }}
        />
      )}

      {emDetalhe && (
        <article className="cartao" aria-labelledby="titulo-detalhe">
          <h2 id="titulo-detalhe" className="titulo-secao">{emDetalhe.titulo}</h2>
          <p className="texto-medio">{emDetalhe.descricao || <span className="texto-suave">Sem descrição.</span>}</p>
          <dl className="dados-definicao">
            <dt>Status</dt><dd>{emDetalhe.status}</dd>
            <dt>Prioridade</dt><dd>{emDetalhe.prioridade}</dd>
            <dt>Responsável</dt><dd>{emDetalhe.responsavel || '—'}</dd>
            <dt>Prazo</dt><dd>{data(emDetalhe.prazo)}</dd>
            <dt>Criada em</dt><dd>{dataHora(emDetalhe.criadaEm)}</dd>
            <dt>Última ação relevante</dt><dd>{dataHora(emDetalhe.ultimaAcaoRelevante)}</dd>
          </dl>
          <div className="acoes">
            <button type="button" className="botao" onClick={() => { setAviso(null); setModo({ tipo: 'editar', id: emDetalhe.id }); }}>Editar</button>
            <button type="button" className="botao botao--perigo" onClick={() => excluir(emDetalhe)}>Excluir</button>
            <button type="button" className="botao" onClick={() => setModo({ tipo: 'lista' })}>Voltar à lista</button>
          </div>
        </article>
      )}

      {modo.tipo === 'lista' && !erroArmazenamento && (
        <>
          <form className="cartao filtros" role="search" aria-label="Pesquisar e filtrar demandas" onSubmit={(e) => e.preventDefault()}>
            <label className="campo-grupo">
              <span>Pesquisar</span>
              <input className="campo" type="search" value={filtros.texto} placeholder="Título ou descrição"
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
              <span>Responsável</span>
              <select className="campo" value={filtros.responsavel} onChange={(e) => setFiltros({ ...filtros, responsavel: e.target.value })}>
                <option value="">Todos</option>
                {responsaveis.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
          </form>

          {visiveis.length === 0 ? (
            <p className="cartao texto-suave">
              {demandas.length === 0 ? 'Nenhuma demanda cadastrada.' : 'Nenhuma demanda corresponde aos filtros.'}
            </p>
          ) : (
            <ul className="lista-limpa grade grade--2" aria-label="Lista de demandas">
              {visiveis.map((d) => (
                <li key={d.id} className="cartao" data-testid={`demanda-${d.id}`}>
                  <p><strong>{d.titulo}</strong></p>
                  <dl className="dados-definicao">
                    <dt>Status</dt><dd>{d.status}</dd>
                    <dt>Prioridade</dt><dd>{d.prioridade}</dd>
                    <dt>Responsável</dt><dd>{d.responsavel || '—'}</dd>
                    <dt>Prazo</dt><dd>{data(d.prazo)}</dd>
                  </dl>
                  <div className="acoes">
                    <button type="button" className="botao botao--pequeno" aria-label={`Detalhes de ${d.titulo}`} onClick={() => { setAviso(null); setModo({ tipo: 'detalhe', id: d.id }); }}>
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
