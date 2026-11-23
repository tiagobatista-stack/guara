// Demanda em foco: a que a pessoa abriu no detalhe da tela Demandas. Só o id, só na memória da
// página (não é gravado): serve para o assistente e a exportação saberem "qual demanda" sem a pessoa repetir.

import { useSyncExternalStore } from 'react';

let atual: string | null = null;
const ouvintes = new Set<() => void>();

export const obterDemandaEmFoco = (): string | null => atual;

export function definirDemandaEmFoco(id: string | null) {
  if (id === atual) return;
  atual = id;
  ouvintes.forEach((o) => o());
}

export function useDemandaEmFoco(): string | null {
  return useSyncExternalStore((o) => { ouvintes.add(o); return () => { ouvintes.delete(o); }; }, obterDemandaEmFoco);
}
