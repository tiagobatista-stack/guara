// Quantos avisos o assistente lista de uma vez (passo 5, 21/11/2026). O excedente vira "E mais N"
// e continua no Dashboard e em Alertas. Preferência deste navegador (`guara:assistente:limite-avisos:v1`);
// com o armazenamento bloqueado, vale só até fechar a página. Não é um limite por dia: o assistente
// não emite notificação sozinho, só lista; por isso o limite é de itens na tela.

import { useSyncExternalStore } from 'react';

export const CHAVE_LIMITE_AVISOS = 'guara:assistente:limite-avisos:v1';
export const OPCOES_LIMITE_AVISOS = [3, 5, 8, 10] as const;
export const LIMITE_AVISOS_PADRAO = 5;

export const validarLimite = (x: unknown): number =>
  typeof x === 'number' && (OPCOES_LIMITE_AVISOS as readonly number[]).includes(x) ? x : LIMITE_AVISOS_PADRAO;

const ouvintes = new Set<() => void>();
let memoria: number | null = null; // armazenamento bloqueado

export function obterLimiteDeAvisos(): number {
  if (memoria !== null) return memoria;
  try {
    const bruto = window.localStorage.getItem(CHAVE_LIMITE_AVISOS);
    return bruto === null ? LIMITE_AVISOS_PADRAO : validarLimite(Number(bruto));
  } catch {
    return LIMITE_AVISOS_PADRAO;
  }
}

export function definirLimiteDeAvisos(n: number) {
  const valido = validarLimite(n);
  try {
    window.localStorage.setItem(CHAVE_LIMITE_AVISOS, String(valido));
    memoria = null;
  } catch {
    memoria = valido;
  }
  ouvintes.forEach((o) => o());
}

function assinar(o: () => void): () => void {
  ouvintes.add(o);
  window.addEventListener('storage', o);
  return () => {
    ouvintes.delete(o);
    window.removeEventListener('storage', o);
  };
}

export function useLimiteDeAvisos(): number {
  return useSyncExternalStore(assinar, obterLimiteDeAvisos);
}
