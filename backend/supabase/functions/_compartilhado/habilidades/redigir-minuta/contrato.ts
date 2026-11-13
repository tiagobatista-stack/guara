import type { ContratoHabilidade } from '../../tipos.ts';
import { esquemaResultadoRequisito, type ResultadoRequisito } from '../conferir-requisitos/contrato.ts';

export interface EntradaRedigirMinuta {
  processo: string;
  modeloId: string;
  resultados: ResultadoRequisito[];
}

export interface SaidaRedigirMinuta {
  modeloId: string;
  situacao: 'a-revisar';
  paragrafos: string[];
  pendencias: string[];
  aviso: string;
}

export const AVISO_MINUTA =
  'Rascunho gerado automaticamente. Exige revisão e validação humana; não é documento oficial.';

export const contrato: ContratoHabilidade<EntradaRedigirMinuta, SaidaRedigirMinuta> = {
  id: 'redigir-minuta',
  versao: '0.1.0',
  descricao: 'Gera uma minuta preliminar a partir da conferência, sempre marcada como "a revisar".',
  modo: 'deterministico',
  agenteResponsavel: 'redator',
  permissoes: ['minutas:criar-rascunho'],
  ferramentas: [],
  esquemaEntrada: {
    tipo: 'objeto',
    campos: {
      processo: { tipo: 'texto' },
      modeloId: { tipo: 'texto' },
      resultados: { tipo: 'lista', itens: esquemaResultadoRequisito },
    },
  },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      modeloId: { tipo: 'texto' },
      situacao: { tipo: 'texto', valores: ['a-revisar'] },
      paragrafos: { tipo: 'lista', itens: { tipo: 'texto' } },
      pendencias: { tipo: 'lista', itens: { tipo: 'texto' } },
      aviso: { tipo: 'texto' },
    },
  },
  criteriosAceite: [
    'A situação é sempre "a-revisar"',
    'Todos os itens não atendidos aparecem como pendência',
    'Contém o aviso de que não é documento oficial',
  ],
  desativavel: true,
};
