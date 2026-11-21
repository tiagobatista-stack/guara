// Classificador de frases do assistente (etapa 1 da conversa, 20/11/2026): sem IA, por regras.
// Normaliza a frase e procura, na tabela `frases.ts`, o gatilho que aparece nela como sequência
// de palavras inteiras ("ok" não casa dentro de "bloqueio").
// Regra de precedência (21/11/2026):
//   1. Comando vence cumprimento: "bom dia, prioridades" é prioridades, mesmo com o gatilho
//      "bom dia" (2 palavras) maior que "prioridades" (1). Cumprimento só vale sozinho.
//   2. Dentro do mesmo grupo, vence o gatilho mais longo; no empate, a ordem da tabela.
// Nada reconhecido devolve null, e o painel responde "não entendi".

import { INTENCOES, INTENCOES_SOCIAIS, type Intencao } from './frases.ts';
import { palavras } from './normalizar.ts';

const GATILHOS = [...INTENCOES, ...INTENCOES_SOCIAIS].flatMap((intencao) =>
  intencao.gatilhos
    .map((g) => ({ intencao, palavras: palavras(g), social: INTENCOES_SOCIAIS.includes(intencao) }))
    .filter((g) => g.palavras.length > 0),
);

/** true se `trecho` aparece em `frase` como sequência de palavras inteiras. */
function contem(frase: readonly string[], trecho: readonly string[]): boolean {
  for (let i = 0; i + trecho.length <= frase.length; i++) {
    if (trecho.every((p, j) => frase[i + j] === p)) return true;
  }
  return false;
}

/** Intenção da frase, ou null quando nenhum gatilho aparece nela. */
export function classificar(texto: string): Intencao | null {
  const frase = palavras(texto);
  // Só um "?" (ou "??"): a pessoa está perguntando o que pode fazer.
  if (frase.length === 0) return /\?/.test(texto) ? (INTENCOES.find((i) => i.id === 'ajuda') ?? null) : null;
  // Frase que COMEÇA com buscar/procurar/achar/cadê é uma busca, mesmo que o termo seja outro gatilho
  // ("buscar parada" procura "parada" nas demandas; não pede a lista de prazos).
  const busca = INTENCOES.find((i) => i.id === 'buscar');
  if (busca && busca.gatilhos.some((g) => palavras(g)[0] === frase[0])) return busca;
  let melhor: { intencao: Intencao; tamanho: number; social: boolean } | null = null;
  for (const g of GATILHOS) {
    if (!contem(frase, g.palavras)) continue;
    const vence = !melhor || (melhor.social && !g.social) || (melhor.social === g.social && g.palavras.length > melhor.tamanho);
    if (vence) melhor = { intencao: g.intencao, tamanho: g.palavras.length, social: g.social };
  }
  return melhor?.intencao ?? null;
}
