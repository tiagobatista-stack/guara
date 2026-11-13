import type { ContratoHabilidade } from '../../tipos.ts';

export interface DemandaPrazo {
  id: string;
  prazo: string;
  ultimaMovimentacao: string;
  situacao: string;
}

export interface EntradaAvaliarPrazos {
  dataReferencia: string;
  diasInatividade: number;
  diasPrazoProximo: number;
  demandas: DemandaPrazo[];
}

export interface SaidaAvaliarPrazos {
  dataReferencia: string;
  vencidas: string[];
  prazoProximo: string[];
  paradas: string[];
  ignoradasConcluidas: string[];
}

export const contrato: ContratoHabilidade<EntradaAvaliarPrazos, SaidaAvaliarPrazos> = {
  id: 'avaliar-prazos',
  versao: '0.1.0',
  descricao: 'Identifica as demandas vencidas, com prazo próximo ou paradas há N dias.',
  modo: 'deterministico',
  agenteResponsavel: 'prazos',
  permissoes: ['demandas:ler'],
  ferramentas: ['banco-postgres'],
  esquemaEntrada: {
    tipo: 'objeto',
    campos: {
      dataReferencia: { tipo: 'texto' },
      diasInatividade: { tipo: 'numero' },
      diasPrazoProximo: { tipo: 'numero' },
      demandas: {
        tipo: 'lista',
        itens: {
          tipo: 'objeto',
          campos: { id: { tipo: 'texto' }, prazo: { tipo: 'texto' }, ultimaMovimentacao: { tipo: 'texto' }, situacao: { tipo: 'texto' } },
        },
      },
    },
  },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      dataReferencia: { tipo: 'texto' },
      vencidas: { tipo: 'lista', itens: { tipo: 'texto' } },
      prazoProximo: { tipo: 'lista', itens: { tipo: 'texto' } },
      paradas: { tipo: 'lista', itens: { tipo: 'texto' } },
      ignoradasConcluidas: { tipo: 'lista', itens: { tipo: 'texto' } },
    },
  },
  criteriosAceite: [
    'A data de referência é explícita (sem depender do relógio), para ser reproduzível',
    'Demandas concluídas não são tratadas como atrasadas',
    'A regra de corte (dias) é informada na entrada',
  ],
  desativavel: true,
};
