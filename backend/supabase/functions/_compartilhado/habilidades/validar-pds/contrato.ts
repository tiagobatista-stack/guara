import type { ContratoHabilidade } from '../../tipos.ts';

/** null = informação ausente (não verificável). */
export interface EntregaSoftware {
  buildPassou: boolean | null;
  testesPassaram: boolean | null;
  documentacaoAtualizada: boolean | null;
  segredosVersionados: boolean | null;
  evidenciasRegistradas: boolean | null;
}

export interface EntradaValidarPds {
  entrega: EntregaSoftware;
  /** Documento oficial do PDS fornecido (título, versão, data, origem)? */
  documentoOficialPds: boolean;
}

export type SituacaoCriterio = 'atendido' | 'nao-atendido' | 'nao-verificavel';

export interface SaidaValidarPds {
  aviso: string;
  conclusaoConformidade: 'nao-emitida';
  matriz: { criterio: string; situacao: SituacaoCriterio }[];
}

export const AVISO_PDS =
  'Checklist didático de qualidade. NÃO é o PDS oficial da SEMA-MT; nenhuma conclusão de conformidade é emitida.';

export const contrato: ContratoHabilidade = {
  id: 'validar-pds',
  versao: '0.1.0',
  descricao: 'Checklist didático de qualidade das entregas do próprio sistema (não é o PDS oficial da SEMA).',
  modo: 'deterministico',
  agenteResponsavel: null,
  permissoes: ['qualidade:ler'],
  ferramentas: [],
  esquemaEntrada: {
    tipo: 'objeto',
    campos: {
      entrega: {
        tipo: 'objeto',
        campos: {
          buildPassou: { tipo: 'booleano', opcional: true },
          testesPassaram: { tipo: 'booleano', opcional: true },
          documentacaoAtualizada: { tipo: 'booleano', opcional: true },
          segredosVersionados: { tipo: 'booleano', opcional: true },
          evidenciasRegistradas: { tipo: 'booleano', opcional: true },
        },
      },
      documentoOficialPds: { tipo: 'booleano' },
    },
  },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      aviso: { tipo: 'texto' },
      conclusaoConformidade: { tipo: 'texto', valores: ['nao-emitida'] },
      matriz: {
        tipo: 'lista',
        itens: {
          tipo: 'objeto',
          campos: { criterio: { tipo: 'texto' }, situacao: { tipo: 'texto', valores: ['atendido', 'nao-atendido', 'nao-verificavel'] } },
        },
      },
    },
  },
  criteriosAceite: [
    'Nunca emite conclusão de conformidade',
    'Informação ausente resulta em "não verificável", nunca em "atendido"',
    'Traz o aviso de que não é o PDS oficial',
  ],
  observacao: 'Não pertence ao fluxo de demandas: verifica a qualidade das entregas do próprio GUARÁ.',
  desativavel: true,
};
