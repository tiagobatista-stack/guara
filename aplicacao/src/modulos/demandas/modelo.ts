// Modelo de demanda do MVP (planejamento/PLANO.md §2, alinhado à Apostila FluxoLab).

import type { Natureza, Tipo } from './classificacao.ts';

export const STATUS = ['A Fazer', 'Em Andamento', 'Em Validação', 'Concluída'] as const;
export type Status = (typeof STATUS)[number];

export const PRIORIDADES = ['Alta', 'Média', 'Baixa'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

/** Motivos de bloqueio, por botões (ideia do TOCA, `travada_modulo.py`). Só a categoria: texto livre poderia ter nomes. */
export const MOTIVOS_BLOQUEIO = {
  documento: 'falta documento',
  setor: 'aguardando outro setor',
  campo: 'depende de campo',
  outro: 'outro motivo',
} as const;
export type MotivoBloqueio = keyof typeof MOTIVOS_BLOQUEIO;

export interface Bloqueio {
  motivo: MotivoBloqueio;
  /** ISO 8601: quando a demanda travou (mudar o motivo não muda). */
  desde: string;
  /** Detalhe livre, opcional (pedido do responsável em 14/11/2026). Só aparece no detalhe da demanda. */
  detalhe?: string;
}

export interface Demanda {
  id: string;
  titulo: string;
  descricao: string;
  responsavel: string;
  prioridade: Prioridade;
  status: Status;
  /** ISO 8601. */
  criadaEm: string;
  /** AAAA-MM-DD, opcional. */
  prazo?: string;
  /** ISO 8601; muda só ao criar, editar de fato ou mudar status. */
  ultimaAcaoRelevante: string;
  /** Presente só enquanto a demanda está travada; não altera o status. */
  bloqueio?: Bloqueio;
  /** Os três números (identificadores.ts), opcionais e já normalizados. */
  processo?: string;
  simp?: string;
  judicial?: string;
  /** Campo × gabinete e demanda × tarefa comum (classificacao.ts); ausentes = não definidos. */
  tipo?: Tipo;
  natureza?: Natureza;
}

/** Campos que o usuário informa no formulário. */
export interface EntradaDemanda {
  titulo: string;
  descricao: string;
  responsavel: string;
  prioridade: Prioridade;
  status: Status;
  prazo: string;
  /** Vazios ou ausentes = sem o número. */
  processo?: string;
  simp?: string;
  judicial?: string;
  /** Ausente = não definido. */
  tipo?: Tipo;
  natureza?: Natureza;
}

export const LIMITES = { tituloMin: 3, tituloMax: 120, descricaoMax: 2000, responsavelMax: 80, detalheBloqueioMax: 300 } as const;

export const CHAVE_DEMANDAS = 'guara:demandas:v1';
