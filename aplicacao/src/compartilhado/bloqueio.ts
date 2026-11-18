// Regra única do bloqueio (demanda travada e ponto de operação travado): detalhe limpo e limitado, e o "desde" que não muda.

import { LIMITES, type Bloqueio, type MotivoBloqueio } from '../modulos/demandas/modelo.ts';

/** Detalhe do bloqueio sem espaços sobrando; '' quando não há detalhe. */
export const limparDetalheBloqueio = (detalhe: string): string => detalhe.replace(/\s+/g, ' ').trim();

/** Detalhe limpo, ou a mensagem para a pessoa se passar do limite. */
export function conferirDetalheBloqueio(detalhe: string): { ok: true; detalhe: string } | { ok: false; mensagem: string } {
  const limpo = limparDetalheBloqueio(detalhe);
  if (limpo.length > LIMITES.detalheBloqueioMax) return { ok: false, mensagem: `O detalhe do bloqueio tem no máximo ${LIMITES.detalheBloqueioMax} caracteres.` };
  return { ok: true, detalhe: limpo };
}

/** Novo bloqueio: trocar o motivo ou o detalhe mantém o "desde" original. O detalhe já deve vir conferido. */
export const novoBloqueio = (atual: Bloqueio | undefined, motivo: MotivoBloqueio, agoraIso: string, detalhe = ''): Bloqueio =>
  ({ motivo, desde: atual?.desde ?? agoraIso, ...(detalhe ? { detalhe } : {}) });
