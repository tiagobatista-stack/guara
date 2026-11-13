// Regra pura de inatividade (PLANO.md §3, regra 3). Também será usada pelo
// servidor MCP local (P10), para que o app e o MCP apliquem a mesma regra.

export const DIA_MS = 24 * 60 * 60 * 1000;
export const DIAS_INATIVIDADE_PADRAO = 3;

export interface DemandaParaAlerta {
  id: string;
  status: string;
  ultimaAcaoRelevante: string;
}

/** Inativa: não concluída e com última ação relevante há MAIS de `limiarDias` dias corridos. */
export function estaInativa(d: DemandaParaAlerta, limiarDias: number, agora: Date): boolean {
  if (d.status === 'Concluída') return false;
  const decorrido = agora.getTime() - Date.parse(d.ultimaAcaoRelevante);
  return decorrido > limiarDias * DIA_MS;
}

export function listarInativas<T extends DemandaParaAlerta>(demandas: readonly T[], limiarDias: number, agora: Date): T[] {
  return demandas.filter((d) => estaInativa(d, limiarDias, agora));
}

/** Dias corridos inteiros desde a última ação relevante. */
export function diasParado(d: DemandaParaAlerta, agora: Date): number {
  return Math.floor((agora.getTime() - Date.parse(d.ultimaAcaoRelevante)) / DIA_MS);
}
