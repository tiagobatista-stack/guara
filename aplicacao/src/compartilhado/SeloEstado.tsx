import type { Estado } from '@catalogo/tipos.ts';

// Todo estado tem cor, símbolo e texto: não depende só da cor (seção 9.7, acessibilidade).
const SUFIXO: Record<Estado, string> = {
  OK: 'ok',
  'ATENÇÃO': 'atencao',
  FALHA: 'falha',
  'NÃO TESTADO': 'nao-testado',
};

const SIMBOLO: Record<Estado, string> = { OK: '✓', 'ATENÇÃO': '!', FALHA: '✕', 'NÃO TESTADO': '?' };

export function SeloEstado({ estado }: { estado: Estado }) {
  return (
    <span className={`selo selo--${SUFIXO[estado]}`}>
      <span aria-hidden="true">{SIMBOLO[estado]}</span>
      {estado}
    </span>
  );
}

/** Classe de borda colorida pelo estado (cartões e mapa de composição). */
export function bordaDoEstado(estado: Estado): string {
  return `borda--${SUFIXO[estado]}`;
}

export function textoDoEstado(estado: Estado): string {
  return `texto--${SUFIXO[estado]}`;
}
