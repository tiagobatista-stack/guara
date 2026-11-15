// Operações de fiscalização (planejamento de viagens). Pedido do responsável, 15/11/2026.
// Uma operação reúne pontos entregues por terceiros e dura cerca de uma semana. O ponto é identificado
// pela localização: o mesmo lugar pode voltar em outra operação ou demanda, e saber se já foi vistoriado importa.

import type { Coordenada } from '../demandas/coordenadas.ts';

export const CHAVE_OPERACOES = 'guara:operacoes:v1';

export const SITUACOES_PONTO = ['planejado', 'vistoriado', 'cancelado'] as const;
export type SituacaoPonto = (typeof SITUACOES_PONTO)[number];
export const ROTULOS_SITUACAO: Record<SituacaoPonto, string> = {
  planejado: 'planejado',
  vistoriado: 'vistoriado',
  cancelado: 'cancelado',
};

export interface Ponto {
  id: string;
  /** Número do ponto na lista recebida, quando houver. */
  numero?: number;
  coordenada: Coordenada;
  municipio: string;
  /** Nome da equipe, como na planilha. */
  equipe?: string;
  /** AAAA-MM-DD. */
  saida?: string;
  retorno?: string;
  notas: string;
  /** Rótulo livre: pontos com o mesmo rótulo estão relacionados à mesma demanda. */
  grupo?: string;
  /** Ids de demandas ligadas ao ponto (um ponto pode ter várias, e uma demanda vários pontos). */
  demandas: string[];
  /** Marcação humana: o sistema não decide que um ponto foi vistoriado. */
  situacao: SituacaoPonto;
}

export interface Operacao {
  id: string;
  nome: string;
  /** AAAA-MM-DD; `fim` não vem antes de `inicio`. */
  inicio: string;
  fim: string;
  /** Quem encaminhou (texto livre, opcional). */
  origem?: string;
  pontos: Ponto[];
  /** ISO 8601. */
  criadaEm: string;
}

export const LIMITES_OPERACAO = {
  nome: 80,
  origem: 80,
  municipio: 80,
  equipe: 40,
  grupo: 40,
  notas: 500,
  pontos: 300,
  operacoes: 100,
  demandasPorPonto: 20,
} as const;
