// Classificador de frases do assistente (etapa 1 da conversa, 20/11/2026): sem IA, por regras.
// Normaliza a frase e procura, na tabela `frases.ts`, o gatilho que aparece nela como sequência
// de palavras inteiras ("ok" não casa dentro de "bloqueio"). Vence o gatilho mais longo; no
// empate, a ordem da tabela. Nada reconhecido devolve null, e o painel responde "não entendi".

import { INTENCOES, type Intencao } from './frases.ts';
import { palavras } from './normalizar.ts';

const GATILHOS = INTENCOES.flatMap((intencao) =>
  intencao.gatilhos.map((g) => ({ intencao, palavras: palavras(g) })).filter((g) => g.palavras.length > 0),
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
  let melhor: { intencao: Intencao; tamanho: number } | null = null;
  for (const g of GATILHOS) {
    if (contem(frase, g.palavras) && (!melhor || g.palavras.length > melhor.tamanho)) {
      melhor = { intencao: g.intencao, tamanho: g.palavras.length };
    }
  }
  return melhor?.intencao ?? null;
}
