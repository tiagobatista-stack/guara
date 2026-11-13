import type { Esquema } from './tipos.ts';

/** Valida um valor contra o esquema; devolve a lista de erros (vazia = válido). */
export function validarEsquema(valor: unknown, esquema: Esquema, caminho = 'raiz'): string[] {
  if (valor === undefined || valor === null) {
    return esquema.opcional ? [] : [`${caminho}: obrigatório`];
  }
  switch (esquema.tipo) {
    case 'texto':
      if (typeof valor !== 'string') return [`${caminho}: esperado texto`];
      if (esquema.valores && !esquema.valores.includes(valor)) {
        return [`${caminho}: valor "${valor}" fora de [${esquema.valores.join(', ')}]`];
      }
      return [];
    case 'numero':
      return typeof valor === 'number' && Number.isFinite(valor) ? [] : [`${caminho}: esperado número`];
    case 'booleano':
      return typeof valor === 'boolean' ? [] : [`${caminho}: esperado booleano`];
    case 'lista':
      if (!Array.isArray(valor)) return [`${caminho}: esperado lista`];
      return valor.flatMap((item, i) => validarEsquema(item, esquema.itens, `${caminho}[${i}]`));
    case 'objeto': {
      if (typeof valor !== 'object' || Array.isArray(valor)) return [`${caminho}: esperado objeto`];
      const registro = valor as Record<string, unknown>;
      return Object.entries(esquema.campos).flatMap(([campo, sub]) =>
        validarEsquema(registro[campo], sub, `${caminho}.${campo}`),
      );
    }
  }
}

/** Compara profundamente dois valores; devolve o primeiro caminho divergente ou null. */
export function primeiraDiferenca(obtido: unknown, esperado: unknown, caminho = 'raiz'): string | null {
  if (Object.is(obtido, esperado)) return null;
  if (typeof obtido !== typeof esperado || obtido === null || esperado === null) {
    return `${caminho}: obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`;
  }
  if (Array.isArray(esperado)) {
    if (!Array.isArray(obtido)) return `${caminho}: esperado lista`;
    if (obtido.length !== esperado.length) {
      return `${caminho}: tamanho ${obtido.length}, esperado ${esperado.length}`;
    }
    for (let i = 0; i < esperado.length; i++) {
      const d = primeiraDiferenca(obtido[i], esperado[i], `${caminho}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (typeof esperado === 'object') {
    const a = obtido as Record<string, unknown>;
    const b = esperado as Record<string, unknown>;
    const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const chave of chaves) {
      const d = primeiraDiferenca(a[chave], b[chave], `${caminho}.${chave}`);
      if (d) return d;
    }
    return null;
  }
  return `${caminho}: obtido ${JSON.stringify(obtido)}, esperado ${JSON.stringify(esperado)}`;
}
