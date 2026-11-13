import type { ContratoHabilidade } from '../../tipos.ts';

export interface ItemChecklist {
  id: string;
  descricao: string;
  /** Campo extraído que comprova o item; null = só verificável por humano. */
  campoEvidencia: string | null;
}

export interface EntradaMontarChecklist {
  tipo: string;
}

export interface SaidaMontarChecklist {
  tipo: string;
  configurado: boolean;
  itens: ItemChecklist[];
}

export const contrato: ContratoHabilidade<EntradaMontarChecklist, SaidaMontarChecklist> = {
  id: 'montar-checklist',
  versao: '0.1.0',
  descricao: 'Monta o checklist configurado para o tipo de demanda.',
  modo: 'deterministico',
  agenteResponsavel: 'analista',
  permissoes: ['checklists:ler'],
  ferramentas: ['banco-postgres'],
  esquemaEntrada: { tipo: 'objeto', campos: { tipo: { tipo: 'texto' } } },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      tipo: { tipo: 'texto' },
      configurado: { tipo: 'booleano' },
      itens: {
        tipo: 'lista',
        itens: {
          tipo: 'objeto',
          campos: { id: { tipo: 'texto' }, descricao: { tipo: 'texto' }, campoEvidencia: { tipo: 'texto', opcional: true } },
        },
      },
    },
  },
  criteriosAceite: [
    'Retorna somente itens configurados para o tipo',
    'Tipo sem configuração retorna configurado=false e lista vazia',
  ],
  desativavel: true,
};
