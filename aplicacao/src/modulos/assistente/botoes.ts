// Botões das respostas do assistente (item 7, 21/11/2026). Não há mais fileira fixa de atalhos:
// toda resposta termina com 2 a 4 botões coerentes com o contexto, para quem não quer digitar
// (útil no celular). Regras fixas, sem IA. Só os botões da ÚLTIMA fala do assistente ficam ativos.

import { rotaDaTelaDemandas } from '../../nucleo/registro-modulos.ts';
import type { AcaoDaFala, Mensagem } from './conversa.ts';

export const MINIMO_DE_BOTOES = 2;
export const MAXIMO_DE_BOTOES = 4;

const PRIORIDADES: AcaoDaFala = { rotulo: 'O que faço primeiro?', comando: 'prioridades' };
const PRAZOS: AcaoDaFala = { rotulo: 'Ver prazos', comando: 'prazos' };
const AJUDA: AcaoDaFala = { rotulo: 'O que você faz?', comando: 'ajuda' };
/** Só entra na resposta quando há uma demanda aberta na tela Demandas. */
const SOBRE_A_DEMANDA_ABERTA: AcaoDaFala = { rotulo: 'Sobre a demanda aberta', comando: 'demanda' };
const ABRIR_DEMANDAS: AcaoDaFala = { rotulo: 'Abrir Demandas', comando: 'abrir demandas', rota: rotaDaTelaDemandas() };

/** Em que contexto a resposta foi dada: define os botões que completam a fala. */
export type ContextoDaResposta = 'inicio' | 'nao-entendi' | 'lista' | 'ajuda' | 'outro';

// Quantos botões a resposta deve ter, no mínimo, e quais completam, em ordem.
const REGRAS: Record<ContextoDaResposta, { alvo: number; complementos: readonly AcaoDaFala[] }> = {
  inicio: { alvo: 3, complementos: [PRIORIDADES, PRAZOS, AJUDA] },
  'nao-entendi': { alvo: 3, complementos: [PRAZOS, PRIORIDADES, AJUDA] },
  lista: { alvo: 2, complementos: [PRIORIDADES, PRAZOS, AJUDA] },
  ajuda: { alvo: 4, complementos: [PRIORIDADES, PRAZOS] },
  outro: { alvo: 2, complementos: [PRIORIDADES, PRAZOS, AJUDA] },
};

/**
 * Botões finais de uma resposta: os que ela já trouxe, os que completam o contexto até o mínimo e,
 * se houver demanda aberta na tela, "Sobre a demanda aberta". Nunca repete o comando que acabou de ser dado.
 */
export function botoesDaResposta(proprios: readonly AcaoDaFala[], contexto: ContextoDaResposta, temDemandaAberta: boolean, comandoAtual?: string): AcaoDaFala[] {
  const { alvo, complementos } = REGRAS[contexto];
  const vagas = MAXIMO_DE_BOTOES - (temDemandaAberta && comandoAtual !== SOBRE_A_DEMANDA_ABERTA.comando ? 1 : 0);
  const todos: AcaoDaFala[] = [];
  const juntar = (a: AcaoDaFala) => { if (!todos.some((x) => x.comando === a.comando) && a.comando !== comandoAtual) todos.push(a); };
  // Depois de prazos ou prioridades, "Abrir Demandas" vem antes do "Abrir demanda" específico.
  if (contexto === 'lista') juntar(ABRIR_DEMANDAS);
  proprios.forEach(juntar);
  for (const c of complementos) if (todos.length < alvo) juntar(c);
  const final = todos.slice(0, vagas);
  if (temDemandaAberta && comandoAtual !== SOBRE_A_DEMANDA_ABERTA.comando) final.push(SOBRE_A_DEMANDA_ABERTA);
  return final;
}

/** Põe os botões na última fala do assistente da resposta; as anteriores ficam como estão. */
export function comBotoes(resposta: Mensagem[], contexto: ContextoDaResposta, temDemandaAberta: boolean, comandoAtual?: string): Mensagem[] {
  if (resposta.length === 0) return resposta;
  const i = resposta.length - 1;
  const ultima = resposta[i];
  return [...resposta.slice(0, i), { ...ultima, acoes: botoesDaResposta(ultima.acoes ?? [], contexto, temDemandaAberta, comandoAtual) }];
}

/** Fala de abertura (não gravada): também termina com botões. */
export const BOTOES_DE_ABERTURA: readonly AcaoDaFala[] = botoesDaResposta([], 'inicio', false);
