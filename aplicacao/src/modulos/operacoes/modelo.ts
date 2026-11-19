// Operações de fiscalização (planejamento de viagens). Pedido do responsável, 15/11/2026.
// Uma operação reúne pontos entregues por terceiros e dura cerca de uma semana. O ponto é identificado
// pela localização: o mesmo lugar pode voltar em outra operação ou demanda, e saber se já foi vistoriado importa.
// As datas de saída e retorno são do cronograma da viagem, não do ponto: cada viagem tem uma equipe
// (duas ou mais pessoas, um ou mais veículos) e percorre vários pontos (pedido do responsável, 15/11/2026).

import type { Coordenada } from '../demandas/coordenadas.ts';
import type { Bloqueio } from '../demandas/modelo.ts';
import type { Anotacao } from '../../compartilhado/anotacoes.ts';
import type { Caracterizacao } from './pop-supressao.ts';
import type { SugestaoGeo } from './sugestao-vegetacao.ts';

export const CHAVE_OPERACOES = 'guara:operacoes:v1';

export const SITUACOES_PONTO = ['planejado', 'vistoriado', 'cancelado'] as const;
export type SituacaoPonto = (typeof SITUACOES_PONTO)[number];
export const ROTULOS_SITUACAO: Record<SituacaoPonto, string> = {
  planejado: 'planejado',
  vistoriado: 'vistoriado',
  cancelado: 'cancelado',
};

/** Viagem do cronograma: uma equipe, com integrantes e veículos, e as datas de saída e retorno. */
export interface Viagem {
  id: string;
  /** Nome da equipe, como na planilha ("Equipe A"); vazio enquanto não for informado. */
  equipe: string;
  /** Pessoas da equipe (duas ou mais para a viagem ficar completa). Nomes: só neste navegador. */
  integrantes: string[];
  /** Veículos (prefixo, placa ou descrição curta); um ou mais para a viagem ficar completa. */
  veiculos: string[];
  /** Um dos integrantes, que dirige; o roteiro imprime o nome. */
  motorista?: string;
  /** Cargo e lotação por integrante (chave = nome em `integrantes`). Vazio = a pessoa ainda não preencheu; o motorista não entra na equipe técnica do relatório. */
  pessoas?: Record<string, { cargo?: string; lotacao?: string }>;
  /** AAAA-MM-DD. */
  saida?: string;
  retorno?: string;
  notas: string;
}

/** Resultado do ponto, com os mesmos rótulos da planilha da SEMA (FISCALIZADO_AUTUADO). Pedido do responsável, 15/11/2026. */
export const RESULTADOS = {
  sim: 'Sim',
  'fiscalizado-nao-autuado': 'Fiscalizado não autuado',
  'nao-cabe-atuacao': 'Não Cabe Atuação',
  nao: 'Não',
} as const;
export type ResultadoPonto = keyof typeof RESULTADOS;
/** Resultados que exigem o motivo (MOTIVO DE NÃO FISCALIZAR/AUTUAR). */
export const RESULTADOS_COM_MOTIVO: readonly ResultadoPonto[] = ['fiscalizado-nao-autuado', 'nao'];
/** Motivos mais comuns; o campo é aberto. */
export const MOTIVOS_SUGERIDOS = ['Área sem acesso', 'Infrator não localizado', 'Outros'] as const;

/**
 * Situação de acompanhamento, calculada (regras.ts `situacaoDoPonto`): o ponto só sai da lista de pendências
 * quando é finalizado, cancelado ou reprogramado em outra operação. "Não" (não fiscalizado) fica a reprogramar.
 */
export const SITUACOES_ACOMPANHAMENTO = {
  planejado: 'planejado',
  'resultado-pendente': 'vistoriado, resultado pendente',
  finalizado: 'finalizado',
  'a-reprogramar': 'a reprogramar',
  reprogramado: 'reprogramado',
  cancelado: 'cancelado',
} as const;
export type SituacaoAcompanhamento = keyof typeof SITUACOES_ACOMPANHAMENTO;

export interface Ponto {
  id: string;
  /** Número do ponto na lista recebida, quando houver; sem ele, o próximo livre da operação. */
  numero?: number;
  /** Código do ponto (CODIGO_PONTO): o da planilha ou MUNICIPIO+AAAAMM-NN. Fixo depois de criado e único entre as operações. */
  codigo?: string;
  /** Tipo de dano esperado (TIPO_DANO), texto aberto. */
  tipoDano?: string;
  /** Resultado (FISCALIZADO_AUTUADO) e o registro pós-campo. */
  resultado?: ResultadoPonto;
  motivo?: string;
  /** NUM_PROTOCOLO: protocolo da demanda e/ou do auto (um ou mais, texto). */
  protocolo?: string;
  observacao?: string;
  /** AAAA-MM-DD: data em que o ponto foi vistoriado. */
  dataVistoria?: string;
  /** Marca à parte da situação (mesmo formato da demanda): o ponto segue como está, mas há algo travando o encerramento (ex.: dados do autuado). */
  bloqueio?: Bloqueio;
  /** Anotações em checklist (compartilhado/anotacoes.ts). */
  anotacoes?: Anotacao[];
  /** Caracterização do dano (POP IBAMA, Anexo I): resposta por item ("A-10"); ver pop-supressao.ts. Sem CPF, endereço ou nome do autuado. */
  caracterizacao?: Caracterizacao;
  /** Planejamento (opcionais): imóvel/local, área desmatada em ha (> 0, 1 casa), CAR estadual e situação do CAR. */
  imovel?: string;
  areaHa?: number;
  car?: string;
  situacaoCar?: SituacaoCar;
  /** Etiquetas livres (até 10, 30 caracteres cada), com sugestões em ETIQUETAS_SUGERIDAS. */
  etiquetas?: string[];
  /** Bioma e vegetação sugeridos pelo GeoServer da SEMA-MT (consultados uma vez; ver sugestao-vegetacao.ts). */
  geo?: SugestaoGeo;
  /** Consulta às bases (CAR, embargos, TI/UC…): o que foi consultado, quando e o que achou. Bioma e vegetação vêm de `geo` quando não há registro aqui. */
  consultas?: Partial<Record<BaseConsulta, ConsultaBase>>;
  /** Ativa o bloco da caracterização (POP) num ponto cujo tipo de dano não o traz sozinho. */
  popAtivo?: boolean;
  /** Dados de campo do roteiro de vistoria (texto curto; sem CPF). */
  coordenadaAferida?: string;
  waypoint?: string;
  /** Quantidade de fotos (o roteiro pede de 12 a 30). */
  fotos?: string;
  drone?: { voou: boolean; arquivo?: string };
  /** Só nome e função. */
  pessoaContatada?: string;
  /** Por que a vistoria foi cancelada (até 100 caracteres); some ao reativar. */
  motivoCancelamento?: string;
  /** Fase pós-campo: envio do relatório no SIGA-MT. Sem `enviadoEm`, o ponto com resultado está em elaboração. */
  relatorio?: { enviadoEm?: string; protocoloSiga?: string; notas?: string };
  /** Ponto "Não" levado para outra operação: onde ele está agora. */
  reprogramado?: { operacao: string; ponto: string };
  coordenada: Coordenada;
  municipio: string;
  /** Id da viagem da operação em que o ponto foi encaixado; ausente = sem viagem. */
  viagem?: string;
  notas: string;
  /** Rótulo livre: pontos com o mesmo rótulo estão relacionados à mesma demanda. */
  grupo?: string;
  /** Ids de demandas ligadas ao ponto (um ponto pode ter várias, e uma demanda vários pontos). */
  demandas: string[];
  /** Marcação humana: o sistema não decide que um ponto foi vistoriado. */
  situacao: SituacaoPonto;
}

/**
 * Ponto ainda não gravado (importação, formulário, testes): pode trazer equipe e datas, como na planilha.
 * Ao incluir, elas viram (ou encontram) a viagem da operação.
 */
export type PontoNovo = Omit<Ponto, 'id' | 'viagem' | 'reprogramado'> & {
  equipe?: string; saida?: string; retorno?: string;
  /** SERVIDOR_EQUIPE: entram nos integrantes da viagem. */
  integrantes?: string[];
};

/** Motivo de mudança do período (opcional ao registrar). Pedido do responsável, 15/11/2026. */
export const MOTIVOS_PERIODO = {
  adiada: 'adiada',
  adiantada: 'adiantada',
  prorrogada: 'prorrogada',
  'falta-diaria': 'falta de diária',
  outro: 'outro motivo',
} as const;
export type MotivoPeriodo = keyof typeof MOTIVOS_PERIODO;

/** Evento do histórico do pedido. Só se acrescenta: a tela não edita nem apaga eventos. */
export interface EventoOperacao {
  /** ISO 8601. */
  quando: string;
  acao: 'criada' | 'periodo';
  /** Mudança de período: o anterior e o novo (lados ausentes = sem data). */
  de?: { inicio?: string; fim?: string };
  para?: { inicio?: string; fim?: string };
  motivo?: MotivoPeriodo;
}

export interface Operacao {
  id: string;
  nome: string;
  /** AAAA-MM-DD, opcionais: vêm do CSV quando a pessoa não informa. Com os dois, `fim` não vem antes de `inicio`. */
  inicio?: string;
  fim?: string;
  /** Quem encaminhou (texto livre, opcional). */
  origem?: string;
  /** Setor que fiscaliza (AG_FISCALIZACAO da planilha da SEMA, ex.: DUDJUINA). */
  setor?: string;
  /** Origem do alerta (lista fechada) e apoio (opcional), para o texto do relatório. A unidade é o `setor`. */
  origemAlerta?: OrigemAlerta;
  apoio?: string;
  viagens: Viagem[];
  pontos: Ponto[];
  /** ISO 8601. */
  criadaEm: string;
  /** ISO 8601: última mudança nas viagens (criar, editar, excluir) ou conferência manual do cronograma. Ausente em operações antigas: vale `criadaEm`. */
  cronogramaAtualizadoEm?: string;
  /** ISO 8601: última mudança estrutural dos pontos (criar, excluir, trocar de viagem, reprogramar). */
  operacaoAlteradaEm?: string;
  /** Histórico do pedido, do mais antigo ao mais novo. Ausente em operações anteriores ao histórico. */
  historico?: EventoOperacao[];
}

export type SituacaoCar = 'com-car' | 'sem-car' | 'nao-verificado';
export const SITUACOES_CAR: Record<SituacaoCar, string> = { 'com-car': 'com CAR', 'sem-car': 'sem CAR', 'nao-verificado': 'não verificado' };
export const ETIQUETAS_SUGERIDAS = ['hot spot', 'DLA suspeita', 'fora de CAR', 'não embargado', 'perto de TI', 'perto de embargo', 'não fiscalizado antes', 'desmate 2026'] as const;

export const LIMITES_OPERACAO = {
  imovel: 120,
  car: 60,
  etiquetas: 10,
  etiqueta: 30,
  nome: 80,
  origem: 80,
  municipio: 80,
  equipe: 40,
  grupo: 40,
  notas: 500,
  pontos: 300,
  operacoes: 100,
  demandasPorPonto: 20,
  viagens: 100,
  integrantes: 20,
  integrante: 80,
  veiculos: 10,
  veiculo: 60,
  historico: 200,
  codigo: 40,
  tipoDano: 80,
  motivo: 120,
  protocolo: 120,
  observacao: 500,
  setor: 40,
  cargo: 80,
  lotacao: 80,
  apoio: 80,
  detalheConsulta: 200,
} as const;

/** Mínimos para a viagem ficar completa (sem eles, aviso; nada é bloqueado). */
export const MINIMOS_VIAGEM = { integrantes: 2, veiculos: 1 } as const;

/** Bases do Geoportal da SEMA-MT que o relatório cita. Os textos estão em relatorio-frases.ts. */
export const BASES_CONSULTA = ['bioma', 'vegetacao', 'car', 'embargos', 'autos', 'ti', 'uc', 'amortecimento'] as const;
export type BaseConsulta = (typeof BASES_CONSULTA)[number];

export const ESTADOS_CONSULTA = { encontrado: 'encontrado', vazio: 'nada encontrado', 'nao-consultado': 'não consultado', falha: 'falhou' } as const;
export type EstadoConsulta = keyof typeof ESTADOS_CONSULTA;

/** Registro de uma consulta: só `encontrado` e `vazio` contam como consultada com sucesso. */
export interface ConsultaBase {
  estado: EstadoConsulta;
  /** ISO 8601. */
  quando: string;
  fonte: 'automatica' | 'manual';
  /** O que achou (nº do CAR, nome da TI…) ou o motivo da falha. */
  detalhe?: string;
  /** Registros pontuais (camadas _PONTO) a até ~500 m, do mais perto ao mais longe. Só embargos e autos. */
  proximidade?: { m: number; texto: string }[];
  /** Quantos registros pontuais próximos ficaram de fora da lista (acima do máximo). */
  maisProximos?: number;
}

export const ORIGENS_ALERTA = {
  planet: 'Planet',
  deter: 'DETER',
  denuncia: 'Denúncia',
  requisicao: 'Requisição (MP, Judiciário ou outro órgão)',
  outra: 'Outra',
} as const;
export type TipoOrigemAlerta = keyof typeof ORIGENS_ALERTA;
/** `detalhe`: o órgão (requisição) ou o texto (outra). */
export interface OrigemAlerta { tipo: TipoOrigemAlerta; detalhe?: string }
