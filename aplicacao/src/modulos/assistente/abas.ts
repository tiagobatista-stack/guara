// Abas do painel do assistente (item 11a, 21/11/2026): Conversa · Fila · Avisos.
// A última aba escolhida fica neste navegador (com try/catch, como as preferências do mascote).
// "Pedir" uma aba é um recado de uma tela para o painel que vai abrir (ex.: o botão do cabeçalho
// com um aviso urgente pede "Avisos"); o painel lê o recado ao montar e o apaga.

export type Aba = 'conversa' | 'fila' | 'avisos';
export const ABAS: readonly Aba[] = ['conversa', 'fila', 'avisos'];
export const CHAVE_ABA = 'guara:assistente:aba:v1';

export const ehAba = (x: unknown): x is Aba => typeof x === 'string' && (ABAS as readonly string[]).includes(x);

/** Última aba escolhida; "conversa" quando não há escolha ou o armazenamento está bloqueado. */
export function lerAba(): Aba {
  try {
    const v = window.localStorage.getItem(CHAVE_ABA);
    return ehAba(v) ? v : 'conversa';
  } catch {
    return 'conversa';
  }
}

export function gravarAba(aba: Aba) {
  try {
    window.localStorage.setItem(CHAVE_ABA, aba);
  } catch {
    // Armazenamento bloqueado: a escolha vale só até fechar a página.
  }
}

let pedida: Aba | null = null;
export const pedirAba = (aba: Aba | null) => { pedida = aba; };
/** Lê sem apagar (a inicialização do React pode rodar duas vezes); o painel apaga depois de montar. */
export const abaPedida = (): Aba | null => pedida;

/** Texto do rótulo visível e do nome acessível de cada aba ("Fila (3)" · "Fila, 3 itens"). */
export function rotuloDaAba(aba: Aba, n: number): { visivel: string; nome: string } {
  if (aba === 'conversa') return { visivel: 'Conversa', nome: 'Conversa' };
  const titulo = aba === 'fila' ? 'Fila' : 'Avisos';
  return { visivel: `${titulo} (${n})`, nome: `${titulo}, ${n} ${n === 1 ? 'item' : 'itens'}` };
}

/** Aba vizinha para as setas ← e →, e extremos para Home e End (padrão WAI-ARIA de abas). */
export function abaPorTecla(atual: Aba, tecla: string): Aba | null {
  const i = ABAS.indexOf(atual);
  if (tecla === 'ArrowRight') return ABAS[(i + 1) % ABAS.length];
  if (tecla === 'ArrowLeft') return ABAS[(i - 1 + ABAS.length) % ABAS.length];
  if (tecla === 'Home') return ABAS[0];
  if (tecla === 'End') return ABAS[ABAS.length - 1];
  return null;
}
