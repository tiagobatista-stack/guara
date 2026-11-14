// Os três números de uma demanda, que não se confundem (ideia do TOCA, `identificadores.py` e `processos.py`):
// - processo administrativo, ex.: FIC-2026-0001 ou ORGAO-PRO-2026/0000001 (formato livre, sem nome de órgão no código);
// - SIMP, código de demanda do Ministério Público: NNNNNN-NNN/AAAA;
// - processo judicial no padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO, com os dígitos verificadores conferidos (mod 97).
// Regras puras: normalizam o que a pessoa digitou ou devolvem a mensagem de erro.

export const NUMEROS = ['processo', 'simp', 'judicial'] as const;
export type CampoNumero = (typeof NUMEROS)[number];

export const ROTULOS_NUMERO: Record<CampoNumero, string> = {
  processo: 'Processo administrativo',
  simp: 'SIMP (Ministério Público)',
  judicial: 'Processo judicial (CNJ)',
};

export const PROCESSO_MAX = 60;

export type Leitura = { ok: true; valor: string } | { ok: false; erro: string };

/** Processo administrativo: letras, dígitos, espaço, ponto, barra e hífen; ao menos um dígito. Em maiúsculas. */
export function lerProcesso(texto: string): Leitura {
  const t = texto.trim().replace(/\s+/g, ' ');
  if (t.length > PROCESSO_MAX) return { ok: false, erro: `O processo pode ter no máximo ${PROCESSO_MAX} caracteres.` };
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ./-]*$/u.test(t) || !/\p{N}/u.test(t)) {
    return { ok: false, erro: 'Use letras, números, ponto, barra ou hífen, com ao menos um número (ex.: FIC-2026-0001).' };
  }
  return { ok: true, valor: t.toLocaleUpperCase('pt-BR') };
}

/** SIMP: NNNNNN-NNN/AAAA; aceita a palavra "SIMP" antes. */
export function lerSimp(texto: string): Leitura {
  const t = texto.trim().replace(/^simp\s*(?:n[ºo°.]*\s*)?[:-]?\s*/i, '');
  if (!/^\d{6}-\d{3}\/(?:19|20)\d{2}$/.test(t)) return { ok: false, erro: 'Use o formato NNNNNN-NNN/AAAA (ex.: 000001-001/2099).' };
  return { ok: true, valor: t };
}

/** Dígitos verificadores certos de um CNJ (para conferir e para montar números fictícios de teste). */
export function digitosCnj(numero: string, ano: string, j: string, tr: string, origem: string): string {
  return String(98 - Number(BigInt(`${numero}${ano}${j}${tr}${origem}00`) % 97n)).padStart(2, '0');
}

/** CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO ou os 20 dígitos seguidos; devolve no formato com pontuação. */
export function lerJudicial(texto: string): Leitura {
  const t = texto.trim();
  const m = /^(\d{7})-(\d{2})\.(\d{4})\.(\d)\.(\d{2})\.(\d{4})$/.exec(t) ?? /^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/.exec(t);
  if (!m) return { ok: false, erro: 'Use o formato NNNNNNN-DD.AAAA.J.TR.OOOO ou os 20 dígitos.' };
  const [, n, dd, ano, j, tr, o] = m;
  if (digitosCnj(n, ano, j, tr, o) !== dd) return { ok: false, erro: 'Os dígitos verificadores não conferem. Confira o número.' };
  return { ok: true, valor: `${n}-${dd}.${ano}.${j}.${tr}.${o}` };
}

export const LER_NUMERO: Record<CampoNumero, (texto: string) => Leitura> = {
  processo: lerProcesso,
  simp: lerSimp,
  judicial: lerJudicial,
};

/** Número já gravado é válido se a leitura devolve ele mesmo (forma normalizada). */
export function numeroGravadoValido(campo: CampoNumero, x: unknown): boolean {
  if (typeof x !== 'string') return false;
  const r = LER_NUMERO[campo](x);
  return r.ok && r.valor === x;
}
