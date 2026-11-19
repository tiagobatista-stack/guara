// Lista guardada no localStorage, no mesmo esquema das preferências do mascote, usada por atalhos e contatos.
// Leitura tolerante: gravação corrompida volta ao padrão; armazenamento bloqueado vale só até fechar a página.

import { useSyncExternalStore } from 'react';

export interface ListaLocal<T> {
  obter(): T[];
  gravar(nova: T[]): void;
  soNaMemoria(): boolean;
  useLista(): T[];
  useSoNaMemoria(): boolean;
}

/** `aoIlegivel`: recebe o texto bruto quando o JSON gravado não pode ser lido (para guardá-lo antes que a próxima gravação o apague). */
export function criarListaLocal<T>(chave: string, padrao: () => T[], validar: (x: unknown) => T[], aoIlegivel?: (bruto: string) => void): ListaLocal<T> {
  const ouvintes = new Set<() => void>();
  let brutoLido: string | null | undefined;
  let atual: T[] = padrao();
  let memoria = false;

  function obter(): T[] {
    if (memoria) return atual;
    let bruto: string | null;
    try {
      bruto = window.localStorage.getItem(chave);
    } catch {
      memoria = true;
      return atual;
    }
    if (bruto !== brutoLido) {
      brutoLido = bruto;
      try {
        atual = bruto === null ? padrao() : validar(JSON.parse(bruto));
      } catch {
        if (bruto !== null) aoIlegivel?.(bruto);
        atual = padrao();
      }
    }
    return atual;
  }

  function gravar(nova: T[]) {
    atual = nova;
    const bruto = JSON.stringify(nova);
    try {
      window.localStorage.setItem(chave, bruto);
      brutoLido = bruto;
      memoria = false;
    } catch {
      memoria = true;
    }
    ouvintes.forEach((ouvinte) => ouvinte());
  }

  function assinar(ouvinte: () => void): () => void {
    ouvintes.add(ouvinte);
    window.addEventListener('storage', ouvinte);
    return () => {
      ouvintes.delete(ouvinte);
      window.removeEventListener('storage', ouvinte);
    };
  }

  const soNaMemoria = () => {
    obter();
    return memoria;
  };

  return {
    obter,
    gravar,
    soNaMemoria,
    useLista: () => useSyncExternalStore(assinar, obter),
    useSoNaMemoria: () => useSyncExternalStore(assinar, soNaMemoria),
  };
}

/** Id novo que não repete nenhum da lista. */
export function novoId(prefixo: string, lista: readonly { id: string }[]): string {
  let id: string;
  do id = `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  while (lista.some((a) => a.id === id));
  return id;
}
