// Normalização das frases digitadas no assistente (etapa 1 da conversa, 20/11/2026).
// Regras fixas, sem IA: minúsculas, sem acentos e sem pontuação, letras repetidas reduzidas
// ("naoo" → "nao", "prazoss" → "prazos") e abreviações comuns expandidas ("vc" → "voce").
// A mesma função normaliza a frase e os gatilhos da tabela (`frases.ts`), então os dois lados
// sempre se comparam na mesma forma, inclusive "processo" → "proceso".

/** Abreviações de digitação rápida, já na forma normalizada (sem letras repetidas). */
const ABREVIACOES: Record<string, string> = {
  vc: 'voce',
  vcs: 'voces',
  pq: 'porque',
  q: 'que',
  oq: 'o que',
  dps: 'depois',
  amn: 'amanha',
  amnh: 'amanha',
  tb: 'tambem',
  tbm: 'tambem',
  pf: 'por favor',
  pfv: 'por favor',
  pls: 'por favor',
  msg: 'mensagem',
  ta: 'esta',
  to: 'estou',
  tou: 'estou',
  hj: 'hoje',
};

/** Tira acentos, pontuação e espaços extras, e põe em minúsculas. */
function limpar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Reduz letras repetidas seguidas a uma só ("naaao" → "nao"). Números ficam como estão. */
function reduzirRepetidas(palavra: string): string {
  return palavra.replace(/([a-z])\1+/g, '$1');
}

/** Palavras da frase, já normalizadas e com as abreviações expandidas. */
export function palavras(texto: string): string[] {
  const limpo = limpar(texto);
  if (!limpo) return [];
  return limpo
    .split(' ')
    .map(reduzirRepetidas)
    .flatMap((p) => (ABREVIACOES[p] ?? p).split(' '));
}

/** Frase normalizada, com as palavras separadas por um espaço. */
export function normalizar(texto: string): string {
  return palavras(texto).join(' ');
}
