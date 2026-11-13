import type { ContratoHabilidade } from '../../tipos.ts';

export interface EntradaRegistrarDemanda {
  processo: string;
  titulo: string;
  tipo: string;
  prazo: string;
  descricao: string;
}

export interface SaidaRegistrarDemanda {
  valida: boolean;
  erros: string[];
  demanda?: { id: string; processo: string; titulo: string; tipo: string; prazo: string; situacao: 'registrada' };
}

export const contrato: ContratoHabilidade<EntradaRegistrarDemanda, SaidaRegistrarDemanda> = {
  id: 'registrar-demanda',
  versao: '0.1.0',
  descricao: 'Valida os dados informados pelo usuário e registra a demanda.',
  modo: 'deterministico',
  agenteResponsavel: 'triagem',
  permissoes: ['demandas:criar-rascunho'],
  ferramentas: ['banco-postgres'],
  esquemaEntrada: {
    tipo: 'objeto',
    campos: {
      processo: { tipo: 'texto' },
      titulo: { tipo: 'texto' },
      tipo: { tipo: 'texto' },
      prazo: { tipo: 'texto' },
      descricao: { tipo: 'texto' },
    },
  },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      valida: { tipo: 'booleano' },
      erros: { tipo: 'lista', itens: { tipo: 'texto' } },
      demanda: {
        tipo: 'objeto',
        opcional: true,
        campos: {
          id: { tipo: 'texto' },
          processo: { tipo: 'texto' },
          titulo: { tipo: 'texto' },
          tipo: { tipo: 'texto' },
          prazo: { tipo: 'texto' },
          situacao: { tipo: 'texto', valores: ['registrada'] },
        },
      },
    },
  },
  criteriosAceite: [
    'Processo no padrão fictício FIC-AAAA-NNNN (o MVP só aceita dados fictícios)',
    'Título com pelo menos 5 caracteres',
    'Prazo em data válida AAAA-MM-DD',
    'Demanda inválida não é registrada',
  ],
  desativavel: true,
};
