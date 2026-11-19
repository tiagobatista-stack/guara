// Data do último backup exportado, neste navegador. O mascote lembra quando passa de 7 dias.

import { useSyncExternalStore } from 'react';

export const CHAVE_ULTIMO_BACKUP = 'guara:ultimo-backup:v1';
export const DIAS_LEMBRETE_BACKUP = 7;

const ouvintes = new Set<() => void>();

export function lerUltimoBackup(): string | null {
  try {
    const v = localStorage.getItem(CHAVE_ULTIMO_BACKUP);
    return v !== null && !Number.isNaN(Date.parse(v)) ? v : null;
  } catch { return null; }
}

export function registrarBackup(quando: Date): void {
  try { localStorage.setItem(CHAVE_ULTIMO_BACKUP, quando.toISOString()); } catch { /* sem armazenamento: o lembrete continua */ }
  ouvintes.forEach((o) => o());
}

const assinar = (o: () => void) => { ouvintes.add(o); window.addEventListener('storage', o); return () => { ouvintes.delete(o); window.removeEventListener('storage', o); }; };
export const useUltimoBackup = (): string | null => useSyncExternalStore(assinar, lerUltimoBackup);
