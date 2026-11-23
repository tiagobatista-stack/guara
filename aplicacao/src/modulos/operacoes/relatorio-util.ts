// Pequenos auxiliares de texto dos relatórios (relatorio.ts e relatorio-inspecao.ts).

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** AAAA-MM-DD → "21 de outubro de 2026". */
export function dataPorExtenso(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

export const dataBr = (iso: string) => iso.split('-').reverse().join('/');

/** "a, b e c". */
export const listaComE = (itens: readonly string[]): string => (itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`);

export const preencher = (modelo: string, valores: Record<string, string>): string => modelo.replace(/\{([^{}]+)\}/g, (inteiro, k: string) => (k in valores ? valores[k] : inteiro));
export const semParenteses = (t: string) => t.replace(/\s*\([^)]*\)/g, '').trim();
export const minuscula1 = (t: string) => (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t);
export const comPonto = (t: string) => (/[.!?\]]$/.test(t.trim()) ? t.trim() : `${t.trim()}.`);
export const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const pendente = (t: string) => `[PENDENTE: ${t}]`;
export const limparLegenda = (t: string) => t.replace(/^\S{1,6}\s-\s/, '').trim();

