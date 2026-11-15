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
import { bordaDoEstado, SeloEstado, textoDoEstado } from '../../compartilhado/SeloEstado.tsx';
import { Mascote, type EspecieMascote, type HumorMascote } from '../../compartilhado/Mascote.tsx';
import { nomeDoMascote, usePreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';

interface RegistroAuditoria {
  quando: string;
  acao: 'desativou' | 'reativou';
  componente: string;
}

const hora = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleTimeString('pt-BR') : '—');

function SeloPadrao({ situacao }: { situacao: SituacaoPadrao }) {
  const estado: Estado = situacao === 'DEMONSTRADO' ? 'OK' : situacao === 'FALHOU' ? 'FALHA' : 'NÃO TESTADO';
  const simbolo = situacao === 'DEMONSTRADO' ? '✓ ' : situacao === 'FALHOU' ? '✕ ' : '? ';
  return <strong className={`texto-pequeno ${textoDoEstado(estado)}`}>{simbolo}{situacao}</strong>;
}

function Cartao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="cartao">
      <p className="cartao-rotulo">{titulo}</p>
      <div>{children}</div>
    </div>
  );
}

export function SaudeDoSistema() {
  const preferencias = usePreferenciasMascote();
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
  // A espécie continua escolhida pelo estado; o nome é o que o analista deu nas Configurações.
  const especieDaSaude: EspecieMascote = estadoGeral === 'OK' ? 'capivara' : 'lobo-guara';
  const humor: HumorMascote = estadoGeral === 'OK' ? 'tranquilo' : estadoGeral === 'NÃO TESTADO' ? 'cauteloso' : 'atento';

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
    <section aria-labelledby="titulo-saude" className="pagina">
      <header className="cabecalho-saude">
        <Mascote especie={especieDaSaude} humor={humor} tamanho={64} nome={nomeDoMascote(preferencias, especieDaSaude)} />
        <div>
          <h1 id="titulo-saude" className="titulo-pagina">Saúde do sistema</h1>
          <p className="texto-suave texto-medio">
            Estado geral: <SeloEstado estado={estadoGeral} />
          </p>
        </div>
        <button type="button" onClick={executar} className="botao botao--primario">
          Executar verificação
        </button>
      </header>

      <div role="note" className="aviso">
        <strong>Modo local, sem Supabase.</strong> Os autotestes e o fluxo padrão rodam neste navegador com dados fictícios. Nada é
        gravado em <code>verificacoes_saude</code>. Os indicadores de banco, de execuções reais e de controle de acesso por perfil
        aparecem como <strong>NÃO TESTADO</strong> até o backend ser configurado.
      </div>

      {/* Indicadores gerais */}
      <div className="grade grade--4">
        <Cartao titulo="Agentes ativos / total">
          <p className="numero-grande">{agentes.filter((a) => !inativos.has(a.id)).length} / {agentes.length}</p>
        </Cartao>
        <Cartao titulo="Habilidades ativas / total">
          <p className="numero-grande">{habilidades.filter((h) => !inativos.has(h.contrato.id)).length} / {habilidades.length}</p>
        </Cartao>
        <Cartao titulo="Taxa de aprovação no gate">
          <p className="texto-medio">24 h / 7 dias: <SeloEstado estado="NÃO TESTADO" /> <span className="texto-pequeno">sem dados persistidos</span></p>
          <p className="texto-medio">Sessão local: {execucoes.length ? `${liberadas} de ${execucoes.length} liberadas` : 'nenhuma execução'}</p>
        </Cartao>
        <Cartao titulo="Execuções (sessão local)">
          <p className="texto-medio">Com falha: <strong>{execucoes.length - liberadas}</strong></p>
          <p className="texto-medio">Aguardando revisão humana: <strong>{liberadas}</strong></p>
          <p className="texto-medio">Concluídas pela revisão humana: <strong>0</strong> <span className="texto-pequeno">(revisão humana não implementada)</span></p>
        </Cartao>
      </div>
      <Cartao titulo="Última verificação completa">
        {relatorio ? (
          <p className="texto-medio">
            {new Date(relatorio.executadoEm).toLocaleString('pt-BR')} · modo {relatorio.modo} · {relatorio.resumo.ok} de {relatorio.resumo.total} habilidades OK,{' '}
            {relatorio.resumo.falha} com falha · <SeloEstado estado={estadoGeral} />
          </p>
        ) : (
          <p className="texto-medio">Nunca executada nesta sessão (ou invalidada por mudança de ativação). <SeloEstado estado="NÃO TESTADO" /></p>
        )}
      </Cartao>

      {/* Painel de agentes */}
      <section aria-labelledby="titulo-agentes">
        <h2 id="titulo-agentes" className="titulo-secao">Agentes ({agentes.length})</h2>
        <ul className="lista-limpa grade grade--3">
          {agentes.map((a) => {
            const met = metricasAgente(a.id);
            const inativo = inativos.has(a.id);
            return (
              <li key={a.id} data-testid={`agente-${a.id}`} className={`cartao cartao--estado ${bordaDoEstado(estadoAgente(a.id))}`}>
                <div className="linha-entre">
                  <div>
                    <p className="mono"><strong>{a.id}</strong></p>
                    <p className="texto-pequeno texto-suave">v{a.versao} · {a.permissao === 'rascunho' ? 'gera rascunhos' : 'somente leitura'}</p>
                  </div>
                  <SeloEstado estado={estadoAgente(a.id)} />
                </div>
                <p className="texto-medio">{a.papel}</p>
                <dl className="dados-definicao">
                  <dt>Habilidades</dt><dd>{a.habilidades.join(', ')}</dd>
                  <dt>Ferramentas</dt><dd>{a.ferramentas.join(', ') || 'nenhuma'}</dd>
                  <dt>Situação</dt><dd>{inativo ? 'inativo' : 'ativo'}</dd>
                  <dt>Execuções</dt>
                  <dd>{met ? `última ${hora(met.ultima)} · sucesso ${met.taxa}% · média ${met.media} ms (${met.total} etapas)` : 'sem dados'}</dd>
                </dl>
                {relatorio && <p className="texto-pequeno texto-suave">{relatorio.agentes[a.id]?.detalhe}</p>}
                <button
                  type="button"
                  disabled={!a.desativavel}
                  onClick={() => alternar(a.id)}
                  title={a.desativavel ? undefined : 'O agente revisor não pode ser desativado (seção 9.3)'}
                  className="botao botao--pequeno"
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
        <h2 id="titulo-habilidades" className="titulo-secao">Habilidades ({habilidades.length})</h2>
        <div className="tabela-rolavel">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Identificador</th>
                <th scope="col">Versão</th>
                <th scope="col">Modo</th>
                <th scope="col">Agente</th>
                <th scope="col">Último teste</th>
                <th scope="col">Critérios de aceite</th>
                <th scope="col">Última execução real</th>
                <th scope="col"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {habilidades.map(({ contrato: c }) => {
                const r = relatorio?.habilidades[c.id];
                return (
                  <tr key={c.id} data-testid={`habilidade-${c.id}`}>
                    <th scope="row" className="mono">{c.id}</th>
                    <td>{c.versao}</td>
                    <td>{c.modo === 'deterministico' ? 'determinístico' : 'assistido'}</td>
                    <td>{c.agenteResponsavel ?? <span className="texto-suave">fora do fluxo</span>}</td>
                    <td>
                      <SeloEstado estado={estadoHabilidade(c.id)} />
                      {r && <p className="texto-pequeno texto-suave">{r.detalhe} · {r.duracaoMs} ms</p>}
                      {c.observacao && <p className="texto-pequeno texto--atencao">{c.observacao}</p>}
                    </td>
                    <td className="texto-pequeno">{c.criteriosAceite.length} critérios; autoteste com 1 caso fixo</td>
                    <td className="texto-pequeno">nenhuma (sem Supabase)</td>
                    <td>
                      <button
                        type="button"
                        disabled={!c.desativavel}
                        onClick={() => alternar(c.id)}
                        title={c.desativavel ? undefined : 'Habilidade do revisor: não pode ser desativada'}
                        className="botao botao--pequeno"
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
        <h2 id="titulo-mapa" className="titulo-secao">Mapa de composição</h2>
        <p className="texto-pequeno texto-suave">orquestrador → agente → habilidade → ferramenta, com cada bloco na cor do seu estado</p>
        <div className="mapa">
          {agentes.map((a) => (
            <div key={a.id} className="linha-composicao">
              <span className="bloco-composicao"><strong>orquestrador</strong></span>
              <span aria-hidden="true">→</span>
              <span className={`bloco-composicao mono ${bordaDoEstado(estadoAgente(a.id))}`}>{a.id}</span>
              <span aria-hidden="true">→</span>
              {a.habilidades.map((h) => (
                <span key={h} className={`bloco-composicao mono ${bordaDoEstado(estadoHabilidade(h))}`}>{h} <span className="sr-only">({estadoHabilidade(h)})</span></span>
              ))}
              <span aria-hidden="true">→</span>
              {a.ferramentas.length ? a.ferramentas.map((f) => (
                <span key={f} className={`bloco-composicao bloco-composicao--tracejado ${bordaDoEstado('NÃO TESTADO')}`}>{f} <span className="sr-only">(NÃO TESTADO)</span></span>
              )) : <span className="texto-suave">sem ferramentas</span>}
            </div>
          ))}
          <div className="linha-composicao">
            <span className="bloco-composicao"><strong>gate-de-qualidade</strong></span>
            <span className="texto-suave">
              {GATE_DESATIVAVEL ? 'desativável' : 'não desativável'} · última decisão:{' '}
              {ultimaExecucao ? (ultimaExecucao.gate.aprovado ? 'liberou' : 'bloqueou') : 'sem execução'}
            </span>
          </div>
        </div>
      </section>

      {/* Ferramentas e integrações */}
      <section aria-labelledby="titulo-ferramentas">
        <h2 id="titulo-ferramentas" className="titulo-secao">Ferramentas e integrações</h2>
        <ul className="lista-limpa grade grade--2">
          {ferramentas.map((f) => (
            <li key={f.id} className="cartao texto-medio">
              <div className="linha-entre">
                <strong>{f.nome}</strong>
                <SeloEstado estado="NÃO TESTADO" />
              </div>
              <p className="texto-pequeno texto-suave">{f.descricao}</p>
              <p className="texto-pequeno">{f.motivoSemTeste}</p>
              <button type="button" disabled className="botao botao--pequeno">
                Testar conexão (indisponível)
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Padrões A–F */}
      <section aria-labelledby="titulo-padroes">
        <h2 id="titulo-padroes" className="titulo-secao">Padrões de orquestração (A–F)</h2>
        <div className="tabela-rolavel">
          <table className="tabela">
            <thead>
              <tr>
                <th scope="col">Padrão</th>
                <th scope="col">No produto (fluxo determinístico local)</th>
                <th scope="col">No desenvolvimento (subagentes Claude Code)</th>
              </tr>
            </thead>
            <tbody>
              {padroes.map((p) => (
                <tr key={p.letra}>
                  <th scope="row">
                    {p.letra}. {p.nome}
                    <p className="texto-pequeno texto-suave">{p.usoNoProduto}</p>
                  </th>
                  <td>
                    <SeloPadrao situacao={p.produto.situacao} />
                    <p className="texto-pequeno texto-suave">{p.produto.justificativa}</p>
                    {ultimaExecucao && <a href="#evidencias" className="texto-pequeno">ver registro {ultimaExecucao.id}</a>}
                  </td>
                  <td>
                    <SeloPadrao situacao={p.desenvolvimento.situacao} />
                    <p className="texto-pequeno texto-suave">{p.desenvolvimento.justificativa}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Evidências */}
      <section id="evidencias" aria-labelledby="titulo-evidencias">
        <h2 id="titulo-evidencias" className="titulo-secao">Evidências (sessão local, não persistidas)</h2>
        {execucoes.length === 0 ? (
          <p className="texto-suave texto-medio">Nenhuma execução registrada. Use “Executar verificação”.</p>
        ) : (
          <ol className="lista-limpa grade">
            {[...execucoes].reverse().map((ex) => (
              <li key={ex.id} className="cartao texto-pequeno">
                <p className="mono"><strong>{ex.id}</strong></p>
                <p>
                  Demanda {ex.demanda} · {ex.etapas.length} etapas · tentativas de redação: {ex.tentativasRedacao} · gate:{' '}
                  <strong>{ex.gate.aprovado ? 'liberou' : 'bloqueou'}</strong>
                </p>
                <table className="tabela tabela--compacta">
                  <thead><tr><th>#</th><th>Agente</th><th>Habilidade</th><th>Estado</th><th>Detalhe</th></tr></thead>
                  <tbody>
                    {ex.etapas.map((e) => (
                      <tr key={e.ordem}><td>{e.ordem}</td><td className="mono">{e.agente}</td><td className="mono">{e.habilidade}</td><td>{e.estado}</td><td>{e.detalhe} ({e.duracaoMs} ms)</td></tr>
                    ))}
                  </tbody>
                </table>
                <ul className="lista-limpa">
                  {ex.gate.verificacoes.map((v) => <li key={v.nome}>{v.aprovado ? '✓' : '✕'} {v.nome}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        )}
        <h3 className="titulo-secao">Auditoria de ativação</h3>
        {auditoria.length === 0 ? (
          <p className="texto-suave texto-medio">Nenhuma alteração.</p>
        ) : (
          <ul className="lista-limpa texto-pequeno">
            {auditoria.map((r, i) => <li key={i}>{hora(r.quando)} — {r.acao} <span className="mono">{r.componente}</span></li>)}
          </ul>
        )}
      </section>
    </section>
  );
}
