// Resposta do comando "ajuda", gerada da tabela `frases.ts`: comando novo aparece aqui sozinho.
// Ajuste de 20/11/2026: um comando por linha, curto; botão só para o comando que não está nos
// atalhos fixos abaixo da conversa (os mesmos botões duas vezes só ocupavam espaço).

import { INTENCOES, type Intencao } from './frases.ts';
import type { Mensagem } from './conversa.ts';

export function respostaDeAjuda(comandosDosAtalhos: readonly string[], intencoes: readonly Intencao[] = INTENCOES): Mensagem {
  const nomes = intencoes.map((i) => `"${i.comando}"`);
  const acoes = intencoes
    .filter((i) => !comandosDosAtalhos.includes(i.comando))
    .map((i) => ({ rotulo: i.rotulo, comando: i.comando }));
  const linhas = [
    nomes.length > 1 ? `Comandos disponíveis: ${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}.` : `Comando disponível: ${nomes[0] ?? 'nenhum'}.`,
    ...intencoes.map((i) => `• ${i.comando} — ${i.descricao} (ou "${i.exemplo}")`),
    acoes.length ? 'Regras fixas, sem IA. Toque num comando abaixo para usá-lo.' : 'Regras fixas, sem IA. Os atalhos abaixo enviam esses comandos.',
  ];
  const resposta: Mensagem = { autor: 'assistente', natureza: 'fato', fonte: 'lista de comandos do MVP', texto: linhas.join('\n') };
  if (acoes.length) resposta.acoes = acoes;
  return resposta;
}

/** Cumprimento curto, o que sei fazer em uma linha e os atalhos. Fato do sistema, sem consultar dados. */
export function respostaDeCumprimento(): Mensagem {
  return {
    autor: 'assistente',
    natureza: 'fato',
    fonte: 'sistema',
    texto: 'Olá! Posso mostrar prazos, a fila de prioridades e falar de uma demanda. Escolha um atalho ou digite "ajuda".',
    acoes: [
      { rotulo: 'O que faço primeiro?', comando: 'prioridades' },
      { rotulo: 'Ver prazos', comando: 'prazos' },
      { rotulo: 'O que você faz?', comando: 'ajuda' },
    ],
  };
}
