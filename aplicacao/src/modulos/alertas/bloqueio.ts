// Texto da demanda travada (ideia do TOCA, `travada_modulo.py`): "⛔ travada há 2 dias úteis: falta documento".
// Conta em dias úteis desde o travamento, com os feriados nacionais.

import { MOTIVOS_BLOQUEIO, type Bloqueio } from '../demandas/modelo.ts';
import { dataLocal, diasUteis, rotuloDias, type AjusteFeriados } from './dias-uteis.ts';

/** Texto do bloqueio, ou null se a demanda não está travada. */
export function textoBloqueio(d: { bloqueio?: Bloqueio }, agora: Date, ajuste: AjusteFeriados = {}): string | null {
  if (!d.bloqueio) return null;
  const desde = dataLocal(new Date(d.bloqueio.desde));
  const n = Math.max(0, diasUteis(desde, dataLocal(agora), ajuste));
  return `⛔ travada ${n === 0 ? 'hoje' : `há ${rotuloDias(n)}`}: ${MOTIVOS_BLOQUEIO[d.bloqueio.motivo]}`;
}
