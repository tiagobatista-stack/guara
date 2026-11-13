import type { ContratoHabilidade } from '../../tipos.ts';
import { esquemaResultadoRequisito, type ResultadoRequisito } from '../conferir-requisitos/contrato.ts';

export interface EntradaValidarEvidencias {
  resultados: ResultadoRequisito[];
}

export interface SaidaValidarEvidencias {
  aprovado: boolean;
  erros: string[];
  ressalvas: string[];
  itensVerificados: number;
}

export const contrato: ContratoHabilidade<EntradaValidarEvidencias, SaidaValidarEvidencias> = {
  id: 'validar-evidencias',
  versao: '0.1.0',
  descricao: 'Revisão independente: confere se cada item atendido tem fonte (campo, valor, página) e lista as ressalvas.',
  modo: 'deterministico',
  agenteResponsavel: 'revisor',
  permissoes: ['demandas:ler', 'documentos:ler'],
  ferramentas: [],
  esquemaEntrada: { tipo: 'objeto', campos: { resultados: { tipo: 'lista', itens: esquemaResultadoRequisito } } },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      aprovado: { tipo: 'booleano' },
      erros: { tipo: 'lista', itens: { tipo: 'texto' } },
      ressalvas: { tipo: 'lista', itens: { tipo: 'texto' } },
      itensVerificados: { tipo: 'numero' },
    },
  },
  criteriosAceite: [
    'Item "atendido" sem evidência reprova o resultado',
    'Evidência com página inválida ou valor vazio reprova o resultado',
    'Itens pendentes ou não verificáveis viram ressalvas explícitas',
  ],
  desativavel: false,
};
