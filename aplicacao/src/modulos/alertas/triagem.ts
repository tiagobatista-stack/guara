// Triagem das demandas sem prazo (ideia do TOCA, "nada fica na entrada sem uma decisão"):
// a demanda aberta sem prazo acumula e some de vista. A tela sugere um prazo em dias úteis;
// a pessoa confere a data e grava com um clique. Nada é gravado sem esse clique.

import { dataLocal, somarDiasUteis, type AjusteFeriados } from './dias-uteis.ts';

/** Prazo sugerido, como o `prazo_sugerido` padrão do TOCA ("10 dias úteis"). */
export const PRAZO_SUGERIDO_DIAS_UTEIS = 10;

/** Demandas não concluídas e sem prazo, da criada há mais tempo para a mais nova. */
export function listarSemPrazo<T extends { status: string; prazo?: string; criadaEm: string }>(demandas: readonly T[]): T[] {
  return demandas
    .filter((d) => d.status !== 'Concluída' && !d.prazo)
    .sort((a, b) => Date.parse(a.criadaEm) - Date.parse(b.criadaEm));
}

/** Data (AAAA-MM-DD) a `PRAZO_SUGERIDO_DIAS_UTEIS` dias úteis de hoje, com os feriados pulados. */
export function sugerirPrazo(agora: Date, ajuste: AjusteFeriados = {}): { data: string; feriadosPulados: string[] } {
  return somarDiasUteis(dataLocal(agora), PRAZO_SUGERIDO_DIAS_UTEIS, ajuste);
}
