// Como o assistente chama uma demanda em texto (item 11b, 21/11/2026).
// As demandas criadas no app têm como id um identificador interno (UUID), que não diz nada à pessoa.
// Regra: id que parece UUID NUNCA aparece; mostra-se o título (curto). Código legível (DEM-FIC-0001,
// dos dados de exemplo) continua aparecendo antes do título, porque a pessoa pode digitá-lo.

import { encurtarTitulo } from './priorizar.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ehIdInterno = (id: string): boolean => UUID.test(id);

/** O id quando é um código legível; null quando é um identificador interno. */
export const codigoLegivel = (id: string): string | null => (ehIdInterno(id) ? null : id);

/** "DEM-FIC-0001 — Título" para código legível; só "Título" para identificador interno. */
export function rotuloDaDemanda(id: string, titulo: string): string {
  const curto = encurtarTitulo(titulo);
  return codigoLegivel(id) ? `${id} — ${curto}` : curto;
}

/** Só o código legível, ou o título curto: para frases como "DEM-1 → fazer isto" ou "Título → fazer isto". */
export const nomeDaDemanda = (id: string, titulo: string): string => codigoLegivel(id) ?? encurtarTitulo(titulo);
