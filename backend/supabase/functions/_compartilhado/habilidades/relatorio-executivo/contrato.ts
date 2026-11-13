import type { ContratoHabilidade, Esquema } from '../../tipos.ts';

export interface DemandaRelatorio {
  id: string;
  setor: string;
  situacao: string;
}

export interface EntradaRelatorioExecutivo {
  dataReferencia: string;
  /** Só gera relatório de resultados validados pelo revisor. */
  validado: boolean;
  demandas: DemandaRelatorio[];
}

export interface Contagem {
  chave: string;
  quantidade: number;
}

export interface SaidaRelatorioExecutivo {
  liberado: boolean;
  motivo?: string;
  dataReferencia: string;
  total: number;
  porSetor: Contagem[];
  porSituacao: Contagem[];
  fontes: string[];
}

const esquemaContagem: Esquema = { tipo: 'objeto', campos: { chave: { tipo: 'texto' }, quantidade: { tipo: 'numero' } } };

export const contrato: ContratoHabilidade<EntradaRelatorioExecutivo, SaidaRelatorioExecutivo> = {
  id: 'relatorio-executivo',
  versao: '0.1.0',
  descricao: 'Consolida os resultados validados em um relatório com totais e rastreabilidade (IDs de origem).',
  modo: 'deterministico',
  agenteResponsavel: 'redator',
  permissoes: ['relatorios:criar-rascunho'],
  ferramentas: ['banco-postgres'],
  esquemaEntrada: {
    tipo: 'objeto',
    campos: {
      dataReferencia: { tipo: 'texto' },
      validado: { tipo: 'booleano' },
      demandas: {
        tipo: 'lista',
        itens: { tipo: 'objeto', campos: { id: { tipo: 'texto' }, setor: { tipo: 'texto' }, situacao: { tipo: 'texto' } } },
      },
    },
  },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      liberado: { tipo: 'booleano' },
      motivo: { tipo: 'texto', opcional: true },
      dataReferencia: { tipo: 'texto' },
      total: { tipo: 'numero' },
      porSetor: { tipo: 'lista', itens: esquemaContagem },
      porSituacao: { tipo: 'lista', itens: esquemaContagem },
      fontes: { tipo: 'lista', itens: { tipo: 'texto' } },
    },
  },
  criteriosAceite: [
    'Recusa gerar o relatório se os resultados não foram validados',
    'Todo total é rastreável aos IDs listados em fontes',
    'A ordenação é determinística (alfabética por chave)',
  ],
  desativavel: true,
};
