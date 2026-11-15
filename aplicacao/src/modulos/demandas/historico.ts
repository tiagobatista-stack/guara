// Histórico da demanda: mudanças de status e do bloqueio (pedido do responsável em 14/11/2026).
// Os eventos só se acrescentam. Ficam fora da tela compartilhada, do Kanban e do MCP.

import { ACOES_HISTORICO, LIMITES, MOTIVOS_BLOQUEIO, STATUS, type AcaoHistorico, type Demanda, type EventoHistorico } from './modelo.ts';

/** Acrescenta o evento. Acima do limite, os mais antigos saem para o armazenamento não crescer sem fim. */
export function registrar(d: Demanda, evento: EventoHistorico): Demanda {
  const historico = [...(d.historico ?? []), evento];
  return { ...d, historico: historico.slice(-LIMITES.historicoMax) };
}

const ehStatus = (x: unknown) => STATUS.includes(x as never);
const ehAcao = (x: unknown): x is AcaoHistorico => typeof x === 'string' && Object.prototype.hasOwnProperty.call(ACOES_HISTORICO, x);
const ehMotivo = (x: unknown) => typeof x === 'string' && Object.prototype.hasOwnProperty.call(MOTIVOS_BLOQUEIO, x);

/** Valida um evento vindo do armazenamento ou de importação. */
export function eventoValido(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.quando === 'string' && !Number.isNaN(Date.parse(e.quando)) &&
    ehAcao(e.acao) &&
    (e.de === undefined || ehStatus(e.de)) &&
    (e.para === undefined || ehStatus(e.para)) &&
    (e.motivo === undefined || ehMotivo(e.motivo)) &&
    (e.detalhe === undefined ||
      (typeof e.detalhe === 'string' && e.detalhe.trim() !== '' && e.detalhe.length <= LIMITES.detalheBloqueioMax))
  );
}

/** "mudou o status: A Fazer → Em Andamento", "travou: falta documento · “detalhe”". */
export function textoEvento(e: EventoHistorico): string {
  if (e.acao === 'criada') return e.para ? `criada em ${e.para}` : 'criada';
  if (e.acao === 'status') return `${ACOES_HISTORICO.status}: ${e.de ?? '?'} → ${e.para ?? '?'}`;
  const motivo = e.motivo ? `: ${MOTIVOS_BLOQUEIO[e.motivo]}` : '';
  const detalhe = e.detalhe ? ` · “${e.detalhe}”` : '';
  return `${ACOES_HISTORICO[e.acao]}${motivo}${detalhe}`;
}

/** Do mais novo ao mais antigo, para a tela. */
export const historicoRecente = (d: Pick<Demanda, 'historico'>): EventoHistorico[] => [...(d.historico ?? [])].reverse();
