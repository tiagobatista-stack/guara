// Resposta do comando "prioridades" (etapa 2 da lógica de apoio, 21/11/2026): monta, a partir de
// `priorizar.ts`, a fila do dia em texto. Só lê; não altera demanda, não grava e não usa IA.
// Cada resposta sai rotulada: a ordem é inferência (pesos fixos), a próxima ação é sugestão.

import type { Demanda } from '../demandas/modelo.ts';
import type { AjusteFeriados } from '../alertas/dias-uteis.ts';
import type { Mensagem } from './conversa.ts';
import { rotaParaAbrirDemanda } from '../../nucleo/registro-modulos.ts';
import { encurtarTitulo, priorizarDemandas, resumoDosMotivos, type ItemDePrioridade } from './priorizar.ts';

/** Itens listados de uma vez; o resto vira "E mais N". */
export const MAXIMO_NA_FILA = 5;
function linhaDoItem(item: ItemDePrioridade, posicao: number): string {
  return `${posicao}. ${item.id} — ${encurtarTitulo(item.titulo)}\n   ${resumoDosMotivos(item.motivos)} (${item.pontos} pontos)`;
}

export function respostaDePrioridades(
  demandas: readonly Demanda[],
  agora: Date,
  limiarDias: number,
  ajuste: AjusteFeriados,
  origem: string,
): Mensagem[] {
  const fila = priorizarDemandas(demandas, agora, limiarDias, ajuste);
  if (fila.length === 0) {
    return [{ autor: 'assistente', natureza: 'fato', fonte: origem, texto: 'Nenhuma demanda aberta pede atenção agora: sem prazo vencido, sem parada e sem pendência de preenchimento.' }];
  }
  const mostradas = fila.slice(0, MAXIMO_NA_FILA);
  const resto = fila.length - mostradas.length;
  const linhas = [
    fila.length === 1 ? 'Uma demanda pede atenção:' : `${fila.length} demandas pedem atenção, da mais urgente para a menos:`,
    ...mostradas.map((item, i) => linhaDoItem(item, i + 1)),
    ...(resto > 0 ? [`E mais ${resto} no Dashboard e em Alertas.`] : []),
  ];
  const [primeira] = fila;
  return [
    {
      autor: 'assistente',
      natureza: 'inferência',
      fonte: `${origem} · pontuação por pesos fixos (método determinístico); a ordem é uma regra, confira antes de agir`,
      texto: linhas.join('\n'),
    },
    {
      autor: 'assistente',
      natureza: 'sugestão',
      fonte: 'tabela de decisão da próxima ação (método determinístico); a decisão é sua',
      texto: `${primeira.id} → ${primeira.proximaAcao.texto.charAt(0).toLowerCase()}${primeira.proximaAcao.texto.slice(1)}`,
      // Decidir sobre o prazo acontece no campo Prazo da demanda: o botão leva até lá, sem alterar nada.
      ...(primeira.proximaAcao.tipo === 'decidir'
        ? { acoes: [{ rotulo: 'Abrir demanda', comando: `abrir ${primeira.id}`, rota: rotaParaAbrirDemanda(primeira.id) }] }
        : {}),
    },
  ];
}
