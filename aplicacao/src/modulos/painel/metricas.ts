// Métricas do dashboard calculadas sobre a fonte única de verdade (P05).

import { STATUS, type Demanda, type Status } from '../demandas/modelo.ts';
import { listarInativas } from '../alertas/inatividade.ts';

/** Início de hoje no fuso do navegador. */
export function inicioDoDia(agora: Date): Date {
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

/** Vencida: não concluída e com prazo anterior ao início de hoje (fuso local). */
export function estaVencida(d: Demanda, agora: Date): boolean {
  if (d.status === 'Concluída' || !d.prazo) return false;
  const [a, m, dia] = d.prazo.split('-').map(Number);
  return new Date(a, m - 1, dia) < inicioDoDia(agora);
}

export interface Metricas {
  total: number;
  porStatus: Record<Status, number>;
  vencidas: Demanda[];
  inativas: Demanda[];
}

export function calcularMetricas(demandas: readonly Demanda[], agora: Date, limiarDias: number): Metricas {
  const porStatus = Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>;
  for (const d of demandas) porStatus[d.status]++;
  return {
    total: demandas.length,
    porStatus,
    vencidas: demandas.filter((d) => estaVencida(d, agora)),
    inativas: listarInativas(demandas, limiarDias, agora),
  };
}
