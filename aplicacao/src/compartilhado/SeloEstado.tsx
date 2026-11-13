import type { Estado } from '@catalogo/tipos.ts';

// Todo estado tem cor, símbolo e texto: não depende só da cor (seção 9.7, acessibilidade).
const ESTILO: Record<Estado, { classe: string; simbolo: string }> = {
  OK: { classe: 'bg-green-100 text-green-900 ring-green-700 dark:bg-green-950 dark:text-green-200', simbolo: '✓' },
  'ATENÇÃO': { classe: 'bg-amber-100 text-amber-900 ring-amber-700 dark:bg-amber-950 dark:text-amber-200', simbolo: '!' },
  FALHA: { classe: 'bg-red-100 text-red-900 ring-red-700 dark:bg-red-950 dark:text-red-200', simbolo: '✕' },
  'NÃO TESTADO': { classe: 'bg-stone-200 text-stone-800 ring-stone-500 dark:bg-stone-800 dark:text-stone-200', simbolo: '?' },
};

export function SeloEstado({ estado }: { estado: Estado }) {
  const e = ESTILO[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${e.classe}`}>
      <span aria-hidden="true">{e.simbolo}</span>
      {estado}
    </span>
  );
}

export const CORES_BORDA: Record<Estado, string> = {
  OK: 'border-green-600',
  'ATENÇÃO': 'border-amber-500',
  FALHA: 'border-red-600',
  'NÃO TESTADO': 'border-stone-400',
};
