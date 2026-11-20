// Quadro dos padrões A–F (seção 20.6). A situação de cada padrão vem de uma
// execução registrada; sem execução, nada é DEMONSTRADO.

import type { ExecucaoFluxo } from './fluxo-padrao.ts';

export type SituacaoPadrao = 'DEMONSTRADO' | 'NÃO DEMONSTRADO' | 'FALHOU';

export interface PadraoOrquestracao {
  letra: string;
  nome: string;
  usoNoProduto: string;
  produto: { situacao: SituacaoPadrao; justificativa: string };
  /** Demonstração com subagentes reais do Claude Code (coluna de desenvolvimento). */
  desenvolvimento: { situacao: SituacaoPadrao; justificativa: string };
}

const DEV_PENDENTE = {
  situacao: 'NÃO DEMONSTRADO' as const,
  justificativa:
    'Subagentes registrados (.claude/agents) não estavam disponíveis na sessão de 13/11/2026. Houve delegação real alternativa (agentes genéricos seguindo os arquivos de papel) para A–F: ver metodologia/evidencias/2026-11-13-p09-orquestracao.md.',
};

function etapaOk(ex: ExecucaoFluxo, agente: string, habilidade: string): boolean | null {
  const e = ex.etapas.filter((x) => x.agente === agente && x.habilidade === habilidade);
  if (e.length === 0) return null;
  return e.some((x) => x.estado === 'OK');
}

function situacaoDe(ok: boolean | null, sim: string, nao: string, ausente: string) {
  if (ok === null) return { situacao: 'NÃO DEMONSTRADO' as const, justificativa: ausente };
  return ok ? { situacao: 'DEMONSTRADO' as const, justificativa: sim } : { situacao: 'FALHOU' as const, justificativa: nao };
}

export function avaliarPadroes(ex: ExecucaoFluxo | null): PadraoOrquestracao[] {
  const semExecucao = { situacao: 'NÃO DEMONSTRADO' as const, justificativa: 'Fluxo padrão ainda não executado nesta sessão.' };
  const base = [
    { letra: 'A', nome: 'Delegação simples', usoNoProduto: 'O orquestrador delega a extração ao agente documental' },
    { letra: 'B', nome: 'Sequencial', usoNoProduto: 'triagem → documental → analista → redator' },
    { letra: 'C', nome: 'Revisor independente', usoNoProduto: 'O agente revisor valida a minuta do redator' },
    { letra: 'D', nome: 'Paralelo', usoNoProduto: 'analista e prazos trabalham sobre a mesma demanda' },
    { letra: 'E', nome: 'Supervisor / agregador', usoNoProduto: 'O orquestrador consolida as saídas dos agentes' },
    { letra: 'F', nome: 'Gate de qualidade', usoNoProduto: 'Resultado liberado só se esquema, fontes e revisão forem aprovados' },
  ];
  if (!ex) return base.map((p) => ({ ...p, produto: semExecucao, desenvolvimento: DEV_PENDENTE }));

  const ordem = ['triagem', 'documental', 'analista', 'redator'];
  const primeiras = ordem.map((a) => ex.etapas.findIndex((e) => e.agente === a));
  const sequenciaRespeitada = primeiras.every((i) => i >= 0) && primeiras.every((v, i, arr) => i === 0 || v > arr[i - 1]);
  const sequenciaOk = sequenciaRespeitada && ordem.every((a) => ex.etapas.filter((e) => e.agente === a).every((e) => e.estado === 'OK'));

  const produto: Record<string, PadraoOrquestracao['produto']> = {
    A: situacaoDe(etapaOk(ex, 'documental', 'extrair-documento'), 'Etapa documental/extrair-documento executada e validada.', 'Etapa de extração falhou.', 'Fluxo interrompido antes da extração.'),
    B: primeiras.some((i) => i < 0)
      ? { situacao: 'FALHOU', justificativa: 'Fluxo interrompido antes de completar a sequência.' }
      : situacaoDe(sequenciaOk, 'Agentes executados na ordem prevista, todos com saída válida.', 'Ordem incorreta ou etapa com falha.', ''),
    C: situacaoDe(etapaOk(ex, 'revisor', 'validar-evidencias'), 'Revisor (≠ redator) validou as evidências da minuta.', 'Revisão independente falhou.', 'Fluxo interrompido antes da revisão.'),
    D: { situacao: 'NÃO DEMONSTRADO', justificativa: 'No modo local, a execução usa uma única thread: analista e prazos rodam em sequência, sem paralelismo real.' },
    E: ex.consolidado
      ? { situacao: 'DEMONSTRADO', justificativa: `O orquestrador consolidou minuta, pendências e alertas de prazo da demanda ${ex.demanda}.` }
      : { situacao: 'FALHOU', justificativa: `Nada consolidado para ${ex.demanda}: o gate não liberou o resultado.` },
    F: {
      situacao: 'DEMONSTRADO',
      justificativa: ex.gate.aprovado
        ? 'Gate avaliou as 4 verificações e liberou o resultado.'
        : 'Gate avaliou as verificações e BLOQUEOU o resultado (comportamento esperado diante de falha).',
    },
  };
  return base.map((p) => ({ ...p, produto: produto[p.letra], desenvolvimento: DEV_PENDENTE }));
}
