// Modelo de demanda do MVP (planejamento/PLANO.md §2, alinhado à Apostila FluxoLab).

export const STATUS = ['A Fazer', 'Em Andamento', 'Em Validação', 'Concluída'] as const;
export type Status = (typeof STATUS)[number];

export const PRIORIDADES = ['Alta', 'Média', 'Baixa'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

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
}

/** Campos que o usuário informa no formulário. */
export interface EntradaDemanda {
  titulo: string;
  descricao: string;
  responsavel: string;
  prioridade: Prioridade;
  status: Status;
  prazo: string;
}

export const LIMITES = { tituloMin: 3, tituloMax: 120, descricaoMax: 2000, responsavelMax: 80 } as const;

export const CHAVE_DEMANDAS = 'guara:demandas:v1';
