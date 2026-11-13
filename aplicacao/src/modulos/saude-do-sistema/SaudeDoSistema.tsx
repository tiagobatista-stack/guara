// Tela Saúde do sistema (seção 9.7). Modo local: os autotestes e o fluxo padrão
// rodam no navegador com dados fictícios. Nenhum estado OK sem execução real;
// indicadores que dependem do banco aparecem como NÃO TESTADO / "sem dados".

import { useMemo, useState, type ReactNode } from 'react';
import type { Estado } from '@catalogo/tipos.ts';
import { agentes, habilidades } from '@catalogo/catalogo.ts';
import { ferramentas } from '@catalogo/ferramentas/catalogo-ferramentas.ts';
import { executarVerificacao, type RelatorioVerificacao } from '@catalogo/verificacao-saude.ts';
import { executarFluxoPadrao, type ExecucaoFluxo } from '@catalogo/fluxo-padrao.ts';
import { avaliarPadroes, type SituacaoPadrao } from '@catalogo/padroes-orquestracao.ts';
import { GATE_DESATIVAVEL } from '@catalogo/gate-de-qualidade/gate.ts';
import { CORES_BORDA, SeloEstado } from '../../compartilhado/SeloEstado.tsx';
import { Mascote, type HumorMascote } from '../../compartilhado/Mascote.tsx';

interface RegistroAuditoria {
  quando: string;
  acao: 'desativou' | 'reativou';
  componente: string;
}

const hora = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString('pt-BR') : '—');

function SeloPadrao({ situacao }: { situacao: SituacaoPadrao }) {
  const estado: Estado = situacao === 'DEMONSTRADO' ? 'OK' : situacao === 'FALHOU' ? 'FALHA' : 'NÃO TESTADO';
  const cls = { OK: 'text-green-800 dark:text-green-300', FALHA: 'text-red-800 dark:text-red-300', 'NÃO TESTADO': 'text-stone-600 dark:text-stone-400', 'ATENÇÃO': '' }[estado];
  return <span className={`text-xs font-semibold ${cls}`}>{situacao === 'DEMONSTRADO' ? '✓ ' : situacao === 'FALHOU' ? '✕ ' : '? '}{situacao}</span>;
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-sm text-stone-600 dark:text-stone-400">{titulo}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function SaudeDoSistema() {
  const [inativos, setInativos] = useState<Set<string>>(() => new Set());
  const [relatorio, setRelatorio] = useState<RelatorioVerificacao | null>(null);
  const [execucoes, setExecucoes] = useState<ExecucaoFluxo[]>([]);
  const [auditoria, setAuditoria] = useState<RegistroAuditoria[]>([]);

  const ultimaExecucao = execucoes.at(-1) ?? null;
  const padroes = useMemo(() => avaliarPadroes(ultimaExecucao), [ultimaExecucao]);

  const executar = () => {
    setRelatorio(executarVerificacao(habilidades, agentes, 'local', inativos));
    setExecucoes((lista) => [...lista, executarFluxoPadrao(habilidades, agentes, inativos)]);
  };

  const alternar = (id: string) => {
    const novo = new Set(inativos);
    const acao = novo.has(id) ? 'reativou' : 'desativou';
    if (acao === 'reativou') novo.delete(id);
    else novo.add(id);
    setInativos(novo);
    setAuditoria((a) => [...a, { quando: new Date().toISOString(), acao, componente: id }]);
    // Estados anteriores deixam de valer: nova verificação é necessária.
    setRelatorio(null);
  };

  const estadoHabilidade = (id: string): Estado => relatorio?.habilidades[id]?.estado ?? 'NÃO TESTADO';
  const estadoAgente = (id: string): Estado => relatorio?.agentes[id]?.estado ?? 'NÃO TESTADO';

  const estadoGeral: Estado = !relatorio
    ? 'NÃO TESTADO'
    : Object.values(relatorio.habilidades).some((r) => r.estado === 'FALHA') || (ultimaExecucao && !ultimaExecucao.liberado)
      ? 'FALHA'
      : Object.values(relatorio.habilidades).some((r) => r.estado === 'ATENÇÃO')
        ? 'ATENÇÃO'
        : 'OK';
  const humor: HumorMascote = estadoGeral === 'OK' ? 'tranquilo' : estadoGeral === 'NÃO TESTADO' ? 'curioso' : 'atento';

  const metricasAgente = (id: string) => {
    const etapas = execucoes.flatMap((ex) => ex.etapas.filter((e) => e.agente === id).map((e) => ({ ...e, quando: ex.iniciadoEm })));
    if (etapas.length === 0) return null;
    const ok = etapas.filter((e) => e.estado === 'OK').length;
    return {
      ultima: etapas.at(-1)!.quando,
      taxa: Math.round((ok / etapas.length) * 100),
      media: Math.round((etapas.reduce((s, e) => s + e.duracaoMs, 0) / etapas.length) * 100) / 100,
      total: etapas.length,
    };
  };

  const liberadas = execucoes.filter((e) => e.liberado).length;

  return (
    <section aria-labelledby="titulo-saude" className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center gap-4">
        <Mascote especie={estadoGeral === 'OK' ? 'capivara' : 'lobo-guara'} humor={humor} tamanho={64} />
        <div className="min-w-0 flex-1">
          <h1 id="titulo-saude" className="text-2xl font-bold">Saúde do sistema</h1>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Estado geral: <SeloEstado estado={estadoGeral} />
          </p>
        </div>
        <button
          type="button"
          onClick={executar}
          className="min-h-11 rounded-lg bg-guara-500 px-4 font-semibold text-white hover:bg-guara-600"
        >
          Executar verificação
        </button>
      </header>

      <div role="note" className="rounded-xl border-2 border-dashed border-amber-500 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
        <strong>Modo local, sem Supabase.</strong> Os autotestes e o fluxo padrão rodam neste navegador com dados fictícios. Nada é
        gravado em <code>verificacoes_saude</code>. Os indicadores de banco, de execuções reais e de controle de acesso por perfil
        aparecem como <strong>NÃO TESTADO</strong> até o backend ser configurado.
      </div>

      {/* Indicadores gerais */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cartao titulo="Agentes ativos / total">
          <p className="text-2xl font-bold">{agentes.filter((a) => !inativos.has(a.id)).length} / {agentes.length}</p>
        </Cartao>
        <Cartao titulo="Habilidades ativas / total">
          <p className="text-2xl font-bold">{habilidades.filter((h) => !inativos.has(h.contrato.id)).length} / {habilidades.length}</p>
        </Cartao>
        <Cartao titulo="Taxa de aprovação no gate">
          <p className="text-sm">24 h / 7 dias: <SeloEstado estado="NÃO TESTADO" /> <span className="text-xs">sem dados persistidos</span></p>
          <p className="mt-1 text-sm">Sessão local: {execucoes.length ? `${liberadas} de ${execucoes.length} liberadas` : 'nenhuma execução'}</p>
        </Cartao>
        <Cartao titulo="Execuções (sessão local)">
          <p className="text-sm">Com falha: <strong>{execucoes.length - liberadas}</strong></p>
          <p className="text-sm">Aguardando revisão humana: <strong>{liberadas}</strong></p>
          <p className="text-sm">Concluídas pela revisão humana: <strong>0</strong> <span className="text-xs">(revisão humana não implementada)</span></p>
        </Cartao>
      </div>
      <Cartao titulo="Última verificação completa">
        {relatorio ? (
          <p className="text-sm">
            {new Date(relatorio.executadoEm).toLocaleString('pt-BR')} · modo {relatorio.modo} · {relatorio.resumo.ok} de {relatorio.resumo.total} habilidades OK,{' '}
            {relatorio.resumo.falha} com falha · <SeloEstado estado={estadoGeral} />
          </p>
        ) : (
          <p className="text-sm">Nunca executada nesta sessão (ou invalidada por mudança de ativação). <SeloEstado estado="NÃO TESTADO" /></p>
        )}
      </Cartao>

      {/* Painel de agentes */}
      <section aria-labelledby="titulo-agentes">
        <h2 id="titulo-agentes" className="text-lg font-bold">Agentes ({agentes.length})</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {agentes.map((a) => {
            const met = metricasAgente(a.id);
            const inativo = inativos.has(a.id);
            return (
              <li key={a.id} data-testid={`agente-${a.id}`} className={`rounded-xl border-l-4 bg-white p-4 shadow-sm dark:bg-stone-900 ${CORES_BORDA[estadoAgente(a.id)]}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono font-semibold">{a.id}</p>
                    <p className="text-xs text-stone-500">v{a.versao} · {a.permissao === 'rascunho' ? 'gera rascunhos' : 'somente leitura'}</p>
                  </div>
                  <SeloEstado estado={estadoAgente(a.id)} />
                </div>
                <p className="mt-2 text-sm">{a.papel}</p>
                <dl className="mt-2 space-y-1 text-xs text-stone-700 dark:text-stone-300">
                  <div><dt className="inline font-semibold">Habilidades: </dt><dd className="inline">{a.habilidades.join(', ')}</dd></div>
                  <div><dt className="inline font-semibold">Ferramentas: </dt><dd className="inline">{a.ferramentas.join(', ') || 'nenhuma'}</dd></div>
                  <div><dt className="inline font-semibold">Situação: </dt><dd className="inline">{inativo ? 'inativo' : 'ativo'}</dd></div>
                  <div>
                    <dt className="inline font-semibold">Execuções (fluxo local): </dt>
                    <dd className="inline">{met ? `última ${hora(met.ultima)} · sucesso ${met.taxa}% · média ${met.media} ms (${met.total} etapas)` : 'sem dados'}</dd>
                  </div>
                  {relatorio && <div className="text-stone-500">{relatorio.agentes[a.id]?.detalhe}</div>}
                </dl>
                <button
                  type="button"
                  disabled={!a.desativavel}
                  onClick={() => alternar(a.id)}
                  title={a.desativavel ? undefined : 'O agente revisor não pode ser desativado (seção 9.3)'}
                  className="mt-3 min-h-9 rounded-lg border border-stone-300 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700"
                >
                  {!a.desativavel ? 'Não desativável' : inativo ? 'Reativar' : 'Desativar'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Painel de habilidades */}
      <section aria-labelledby="titulo-habilidades">
        <h2 id="titulo-habilidades" className="text-lg font-bold">Habilidades ({habilidades.length})</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              <tr>
                <th scope="col" className="p-2">Identificador</th>
                <th scope="col" className="p-2">Versão</th>
                <th scope="col" className="p-2">Modo</th>
                <th scope="col" className="p-2">Agente</th>
                <th scope="col" className="p-2">Último teste</th>
                <th scope="col" className="p-2">Critérios de aceite</th>
                <th scope="col" className="p-2">Última execução real</th>
                <th scope="col" className="p-2"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {habilidades.map(({ contrato: c }) => {
                const r = relatorio?.habilidades[c.id];
                return (
                  <tr key={c.id} data-testid={`habilidade-${c.id}`} className="border-t border-stone-100 align-top dark:border-stone-800">
                    <th scope="row" className="p-2 font-mono font-semibold">{c.id}</th>
                    <td className="p-2">{c.versao}</td>
                    <td className="p-2">{c.modo === 'deterministico' ? 'determinístico' : 'assistido'}</td>
                    <td className="p-2">{c.agenteResponsavel ?? <span className="text-stone-500">fora do fluxo</span>}</td>
                    <td className="p-2">
                      <SeloEstado estado={estadoHabilidade(c.id)} />
                      {r && <p className="mt-1 text-xs text-stone-500">{r.detalhe} · {r.duracaoMs} ms</p>}
                      {c.observacao && <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">{c.observacao}</p>}
                    </td>
                    <td className="p-2 text-xs">{c.criteriosAceite.length} critérios; autoteste com 1 caso fixo</td>
                    <td className="p-2 text-xs">nenhuma (sem Supabase)</td>
                    <td className="p-2">
                      <button
                        type="button"
                        disabled={!c.desativavel}
                        onClick={() => alternar(c.id)}
                        title={c.desativavel ? undefined : 'Habilidade do revisor: não pode ser desativada'}
                        className="min-h-9 rounded-lg border border-stone-300 px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700"
                      >
                        {!c.desativavel ? 'Fixa' : inativos.has(c.id) ? 'Reativar' : 'Desativar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mapa de composição */}
      <section aria-labelledby="titulo-mapa">
        <h2 id="titulo-mapa" className="text-lg font-bold">Mapa de composição</h2>
        <p className="text-xs text-stone-600 dark:text-stone-400">orquestrador → agente → habilidade → ferramenta, com cada bloco na cor do seu estado</p>
        <div className="mt-3 space-y-2">
          {agentes.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded border-2 border-stone-400 px-2 py-1 font-semibold">orquestrador</span>
              <span aria-hidden="true">→</span>
              <span className={`rounded border-2 px-2 py-1 font-mono ${CORES_BORDA[estadoAgente(a.id)]}`}>{a.id}</span>
              <span aria-hidden="true">→</span>
              {a.habilidades.map((h) => (
                <span key={h} className={`rounded border-2 px-2 py-1 font-mono ${CORES_BORDA[estadoHabilidade(h)]}`}>{h} <span className="sr-only">({estadoHabilidade(h)})</span></span>
              ))}
              <span aria-hidden="true">→</span>
              {a.ferramentas.length ? a.ferramentas.map((f) => (
                <span key={f} className={`rounded border-2 border-dashed px-2 py-1 ${CORES_BORDA['NÃO TESTADO']}`}>{f} <span className="sr-only">(NÃO TESTADO)</span></span>
              )) : <span className="text-stone-500">sem ferramentas</span>}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded border-2 border-stone-400 px-2 py-1 font-semibold">gate-de-qualidade</span>
            <span className="text-stone-600 dark:text-stone-400">
              {GATE_DESATIVAVEL ? 'desativável' : 'não desativável'} · última decisão:{' '}
              {ultimaExecucao ? (ultimaExecucao.gate.aprovado ? 'liberou' : 'bloqueou') : 'sem execução'}
            </span>
          </div>
        </div>
      </section>

      {/* Ferramentas e integrações */}
      <section aria-labelledby="titulo-ferramentas">
        <h2 id="titulo-ferramentas" className="text-lg font-bold">Ferramentas e integrações</h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {ferramentas.map((f) => (
            <li key={f.id} className="rounded-xl border border-stone-200 bg-white p-3 text-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{f.nome}</span>
                <SeloEstado estado="NÃO TESTADO" />
              </div>
              <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{f.descricao}</p>
              <p className="mt-1 text-xs">{f.motivoSemTeste}</p>
              <button type="button" disabled className="mt-2 min-h-9 rounded-lg border border-stone-300 px-2 text-xs opacity-50 dark:border-stone-700">
                Testar conexão (indisponível)
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Padrões A–F */}
      <section aria-labelledby="titulo-padroes">
        <h2 id="titulo-padroes" className="text-lg font-bold">Padrões de orquestração (A–F)</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              <tr>
                <th scope="col" className="p-2">Padrão</th>
                <th scope="col" className="p-2">No produto (fluxo determinístico local)</th>
                <th scope="col" className="p-2">No desenvolvimento (subagentes Claude Code)</th>
              </tr>
            </thead>
            <tbody>
              {padroes.map((p) => (
                <tr key={p.letra} className="border-t border-stone-100 align-top dark:border-stone-800">
                  <th scope="row" className="p-2">
                    {p.letra}. {p.nome}
                    <p className="text-xs font-normal text-stone-500">{p.usoNoProduto}</p>
                  </th>
                  <td className="p-2">
                    <SeloPadrao situacao={p.produto.situacao} />
                    <p className="text-xs text-stone-600 dark:text-stone-400">{p.produto.justificativa}</p>
                    {ultimaExecucao && <a href="#evidencias" className="text-xs underline">ver registro {ultimaExecucao.id}</a>}
                  </td>
                  <td className="p-2">
                    <SeloPadrao situacao={p.desenvolvimento.situacao} />
                    <p className="text-xs text-stone-600 dark:text-stone-400">{p.desenvolvimento.justificativa}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Evidências */}
      <section id="evidencias" aria-labelledby="titulo-evidencias">
        <h2 id="titulo-evidencias" className="text-lg font-bold">Evidências (sessão local, não persistidas)</h2>
        {execucoes.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">Nenhuma execução registrada. Use “Executar verificação”.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {[...execucoes].reverse().map((ex) => (
              <li key={ex.id} className="rounded-xl border border-stone-200 bg-white p-3 text-xs dark:border-stone-800 dark:bg-stone-900">
                <p className="font-mono font-semibold">{ex.id}</p>
                <p>
                  Demanda {ex.demanda} · {ex.etapas.length} etapas · tentativas de redação: {ex.tentativasRedacao} · gate:{' '}
                  <strong>{ex.gate.aprovado ? 'liberou' : 'bloqueou'}</strong>
                </p>
                <table className="mt-2 w-full text-left">
                  <thead><tr><th className="pr-2">#</th><th className="pr-2">Agente</th><th className="pr-2">Habilidade</th><th className="pr-2">Estado</th><th>Detalhe</th></tr></thead>
                  <tbody>
                    {ex.etapas.map((e) => (
                      <tr key={e.ordem}><td className="pr-2">{e.ordem}</td><td className="pr-2 font-mono">{e.agente}</td><td className="pr-2 font-mono">{e.habilidade}</td><td className="pr-2">{e.estado}</td><td>{e.detalhe} ({e.duracaoMs} ms)</td></tr>
                    ))}
                  </tbody>
                </table>
                <ul className="mt-2">
                  {ex.gate.verificacoes.map((v) => <li key={v.nome}>{v.aprovado ? '✓' : '✕'} {v.nome}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        )}
        <h3 className="mt-4 font-semibold">Auditoria de ativação</h3>
        {auditoria.length === 0 ? (
          <p className="text-sm text-stone-600 dark:text-stone-400">Nenhuma alteração.</p>
        ) : (
          <ul className="text-xs">
            {auditoria.map((r, i) => <li key={i}>{hora(r.quando)} — {r.acao} <span className="font-mono">{r.componente}</span></li>)}
          </ul>
        )}
      </section>
    </section>
  );
}
