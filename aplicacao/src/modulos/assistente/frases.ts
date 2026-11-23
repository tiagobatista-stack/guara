// Banco de frases do assistente: o que cada comando significa e as frases que o pedem.
// É a fonte única do classificador (`classificar.ts`) e da resposta do comando "ajuda": um comando
// novo entra aqui e aparece na ajuda sem mais nada. Gatilhos são escritos em português comum;
// a comparação acontece depois de normalizar os dois lados (`normalizar.ts`).

export type IdIntencao = 'prazos' | 'prioridades' | 'demanda' | 'ajuda' | 'lembrete' | 'prorrogar' | 'buscar' | 'operacoes' | 'compromisso' | 'agenda' | 'cumprimento';

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
    id: 'lembrete',
    comando: 'lembrar',
    rotulo: 'Criar um lembrete',
    descricao: 'adia o aviso de uma demanda até a hora combinada (precisa do código e de quando)',
    exemplo: 'me lembra de DEM-FIC-0003 na segunda',
    gatilhos: ['lembrar', 'lembra', 'lembre', 'lembrete', 'me lembra', 'me lembre', 'me avisa depois'],
  },
  {
    id: 'prorrogar',
    comando: 'prorrogar',
    rotulo: 'Prorrogar um prazo',
    descricao: 'leva você ao campo Prazo da demanda; a nova data é decisão sua (precisa do código)',
    exemplo: 'prorrogar DEM-FIC-0001',
    gatilhos: ['prorrogar', 'prorroga', 'prorrogue', 'prorrogacao', 'prorrogar prazo', 'estender prazo', 'dilatar prazo'],
  },
  {
    id: 'buscar',
    comando: 'buscar',
    rotulo: 'Buscar uma demanda',
    descricao: 'acha demandas pelo título, pela descrição ou pelo número (precisa de uma palavra)',
    exemplo: 'cadê a licença de Sinop?',
    gatilhos: ['buscar', 'procurar', 'procura', 'achar', 'cade'],
  },
  {
    id: 'operacoes',
    comando: 'operações',
    rotulo: 'Ver operações',
    descricao: 'mostra o que falta do campo: pontos sem resultado, travados, a reprogramar e as operações em andamento',
    exemplo: 'o que falta das operações?',
    gatilhos: ['operacoes', 'operacao', 'pontos', 'campo', 'viagens', 'o que falta das operacoes', 'pontos pendentes'],
  },
  {
    id: 'compromisso',
    comando: 'anotar compromisso',
    rotulo: 'Anotar um compromisso',
    descricao: 'anota reunião, palestra, curso ou compromisso na Agenda, depois de você confirmar (precisa do tipo e do dia)',
    exemplo: 'reunião dia 10/12 sobre licenciamento',
    gatilhos: ['anotar compromisso', 'marcar compromisso', 'marcar reuniao', 'agendar reuniao', 'novo compromisso'],
  },
  {
    id: 'agenda',
    comando: 'agenda',
    rotulo: 'Ver a agenda',
    descricao: 'lista compromissos, vistorias e saídas de hoje, de amanhã ou dos próximos 7 dias',
    exemplo: 'o que tenho amanhã?',
    gatilhos: [
      'agenda', 'compromissos', 'compromisso', 'minha agenda', 'o que tenho hoje', 'o que tenho amanha', 'o que tenho na semana',
      'o que tenho essa semana', 'o que tenho esta semana', 'o que tenho de compromisso', 'agenda de hoje', 'agenda de amanha', 'agenda da semana',
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

/**
 * Intenções sociais: não são comandos e ficam fora da lista da ajuda. Têm precedência menor que
 * as de `INTENCOES`: se a frase também pede um comando ("bom dia, prioridades"), o comando vence,
 * mesmo com gatilho mais curto (regra em `classificar.ts`).
 */
export const INTENCOES_SOCIAIS: readonly Intencao[] = [
  {
    id: 'cumprimento',
    comando: 'oi',
    rotulo: 'Dizer oi',
    descricao: 'cumprimenta e lembra o que sei fazer',
    exemplo: 'bom dia',
    gatilhos: ['oi', 'ola', 'oie', 'e ai', 'eai', 'opa', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hey'],
  },
];
