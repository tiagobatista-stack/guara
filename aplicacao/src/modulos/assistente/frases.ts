// Banco de frases do assistente: o que cada comando significa e as frases que o pedem.
// É a fonte única do classificador (`classificar.ts`) e da resposta do comando "ajuda": um comando
// novo entra aqui e aparece na ajuda sem mais nada. Gatilhos são escritos em português comum;
// a comparação acontece depois de normalizar os dois lados (`normalizar.ts`).

export type IdIntencao = 'prazos' | 'prioridades' | 'demanda' | 'ajuda';

export interface Intencao {
  id: IdIntencao;
  /** Comando curto que a pessoa pode digitar e que os botões enviam. */
  comando: string;
  /** Rótulo do botão, em linguagem de gente. */
  rotulo: string;
  /** O que o comando faz, para a lista da ajuda. */
  descricao: string;
  /** Outra forma de pedir, mostrada como exemplo na ajuda. */
  exemplo: string;
  /** Frases (ou trechos de frase) que pedem este comando. */
  gatilhos: readonly string[];
}

/** Ordem da tabela = ordem da ajuda e desempate do classificador. */
export const INTENCOES: readonly Intencao[] = [
  {
    id: 'prazos',
    comando: 'prazos',
    rotulo: 'Ver prazos',
    descricao: 'lista as demandas vencidas, com prazo próximo e paradas',
    exemplo: 'o que tá vencido?',
    gatilhos: [
      'prazos', 'prazo', 'vencidas', 'vencidos', 'vencida', 'vencido', 'venceu', 'vence hoje',
      'atrasadas', 'atrasados', 'atrasada', 'atrasado', 'paradas', 'parados', 'parada', 'parado',
      'o que esta vencido', 'o que venceu', 'o que esta atrasado', 'o que esta parado',
      'pendencias', 'urgentes', 'urgencias',
    ],
  },
  {
    id: 'prioridades',
    comando: 'prioridades',
    rotulo: 'O que faço primeiro?',
    descricao: 'ordena as demandas que pedem atenção, com o motivo e a próxima ação sugerida',
    exemplo: 'o que faço primeiro?',
    gatilhos: [
      'prioridades', 'prioridade', 'priorizar', 'prioriza', 'fila do dia', 'prioridades do dia',
      'o que faco primeiro', 'o que eu faco primeiro', 'o que fazer primeiro', 'o que fazer hoje',
      'por onde comeco', 'por onde eu comeco', 'o que priorizar', 'o que e mais urgente',
    ],
  },
  {
    id: 'demanda',
    comando: 'demanda',
    rotulo: 'Sobre a demanda aberta',
    descricao: 'fala da demanda aberta na tela Demandas',
    exemplo: 'fala dessa demanda',
    gatilhos: [
      'demanda', 'esta demanda', 'essa demanda', 'demanda aberta', 'sobre a demanda',
      'fala dessa demanda', 'fala da demanda', 'resumo da demanda', 'o que falta nessa demanda',
    ],
  },
  {
    id: 'ajuda',
    comando: 'ajuda',
    rotulo: 'O que você faz?',
    descricao: 'mostra esta lista',
    exemplo: 'o que você faz?',
    gatilhos: [
      'ajuda', 'me ajuda', 'ajudar', 'socorro', 'help', 'comandos', 'comando', 'menu', 'opcoes',
      'o que voce faz', 'o que voce sabe fazer', 'o que voce sabe', 'o que posso pedir',
      'o que eu posso pedir', 'como funciona', 'como te uso', 'como usar',
    ],
  },
];
