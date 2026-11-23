// Quarentena global: o que não pôde virar operação (JSON ilegível, estrutura básica inválida) fica guardado, bruto,
// em vez de ser apagado na próxima gravação. Só o responsável decide descartar, depois de baixar.

import { useSyncExternalStore } from 'react';

export const CHAVE_QUARENTENA = 'guara:quarentena-operacoes:v1';

export interface ItemQuarentena { quando: string; motivo: string; bruto: string }

const ouvintes = new Set<() => void>();
let cacheBruto: string | null | undefined;
let cache: ItemQuarentena[] = [];

const itemValido = (x: unknown): x is ItemQuarentena =>
  typeof x === 'object' && x !== null && typeof (x as ItemQuarentena).quando === 'string' && typeof (x as ItemQuarentena).motivo === 'string' && typeof (x as ItemQuarentena).bruto === 'string';

export function lerQuarentena(): ItemQuarentena[] {
  let bruto: string | null;
  try { bruto = localStorage.getItem(CHAVE_QUARENTENA); } catch { return cache; }
  if (bruto !== cacheBruto) {
    cacheBruto = bruto;
    try { const j = bruto === null ? [] : JSON.parse(bruto); cache = Array.isArray(j) ? j.filter(itemValido) : []; } catch { cache = []; }
  }
  return cache;
}

/** `adiado`: chamada durante a leitura (render) — avisa os ouvintes depois, para não atualizar componente enquanto renderiza. */
function gravarQuarentena(itens: ItemQuarentena[], adiado = false): void {
  try {
    const bruto = JSON.stringify(itens);
    localStorage.setItem(CHAVE_QUARENTENA, bruto);
    cacheBruto = bruto;
    cache = itens;
  } catch { console.warn('[GUARÁ] Não foi possível gravar a quarentena (armazenamento cheio ou bloqueado).'); }
  if (adiado) queueMicrotask(() => ouvintes.forEach((o) => o())); else ouvintes.forEach((o) => o());
}

/** Guarda o conteúdo bruto (texto ou valor) sem repetir o que já está lá. */
export function guardarEmQuarentena(conteudo: unknown, motivo: string, quando = new Date().toISOString()): void {
  const bruto = typeof conteudo === 'string' ? conteudo : JSON.stringify(conteudo);
  const atuais = lerQuarentena();
  if (atuais.some((i) => i.bruto === bruto)) return;
  console.warn(`[GUARÁ] Conteúdo guardado em quarentena: ${motivo}.`);
  gravarQuarentena([...atuais, { quando, motivo, bruto }], true);
}

export function removerDaQuarentena(indice: number): void {
  gravarQuarentena(lerQuarentena().filter((_, i) => i !== indice));
}

const assinar = (o: () => void) => { ouvintes.add(o); window.addEventListener('storage', o); return () => { ouvintes.delete(o); window.removeEventListener('storage', o); }; };
export const useQuarentena = (): ItemQuarentena[] => useSyncExternalStore(assinar, lerQuarentena);
