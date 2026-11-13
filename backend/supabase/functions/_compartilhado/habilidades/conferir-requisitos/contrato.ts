import type { ContratoHabilidade, Esquema } from '../../tipos.ts';
import type { ItemChecklist } from '../montar-checklist/contrato.ts';
import type { CampoExtraido } from '../extrair-documento/contrato.ts';

export type SituacaoRequisito = 'atendido' | 'pendente' | 'nao-verificavel';

export interface ResultadoRequisito {
  itemId: string;
  situacao: SituacaoRequisito;
  justificativa: string;
  evidencia?: CampoExtraido;
}

export interface EntradaConferirRequisitos {
  itens: ItemChecklist[];
  campos: CampoExtraido[];
}

export interface SaidaConferirRequisitos {
  resultados: ResultadoRequisito[];
  totais: { atendidos: number; pendentes: number; naoVerificaveis: number };
}

export const esquemaResultadoRequisito: Esquema = {
  tipo: 'objeto',
  campos: {
    itemId: { tipo: 'texto' },
    situacao: { tipo: 'texto', valores: ['atendido', 'pendente', 'nao-verificavel'] },
    justificativa: { tipo: 'texto' },
    evidencia: {
      tipo: 'objeto',
      opcional: true,
      campos: { campo: { tipo: 'texto' }, valor: { tipo: 'texto' }, pagina: { tipo: 'numero' } },
    },
  },
};

export const contrato: ContratoHabilidade = {
  id: 'conferir-requisitos',
  versao: '0.1.0',
  descricao: 'Confere o checklist contra as extrações e indica os itens atendidos, pendentes e não verificáveis, com evidência.',
  modo: 'deterministico',
  agenteResponsavel: 'analista',
  permissoes: ['demandas:ler', 'documentos:ler'],
  ferramentas: [],
  esquemaEntrada: {
    tipo: 'objeto',
    campos: {
      itens: { tipo: 'lista', itens: { tipo: 'objeto', campos: { id: { tipo: 'texto' }, descricao: { tipo: 'texto' } } } },
      campos: { tipo: 'lista', itens: { tipo: 'objeto', campos: { campo: { tipo: 'texto' }, valor: { tipo: 'texto' }, pagina: { tipo: 'numero' } } } },
    },
  },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      resultados: { tipo: 'lista', itens: esquemaResultadoRequisito },
      totais: {
        tipo: 'objeto',
        campos: { atendidos: { tipo: 'numero' }, pendentes: { tipo: 'numero' }, naoVerificaveis: { tipo: 'numero' } },
      },
    },
  },
  criteriosAceite: [
    'Item atendido sempre traz evidência (campo, valor, página)',
    'Valor negativo ("não apresentada") resulta em pendente',
    'Item sem campo de evidência é marcado como não verificável e nunca como atendido',
  ],
  desativavel: true,
};
