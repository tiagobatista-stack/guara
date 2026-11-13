import type { ContratoHabilidade } from '../../tipos.ts';

export interface EntradaClassificarDemanda {
  titulo: string;
  descricao: string;
}

export interface SaidaClassificarDemanda {
  tipo: string;
  setor: string;
  prioridade: 'alta' | 'media' | 'baixa';
  regraAplicada: string;
  sugestao: true;
}

export const contrato: ContratoHabilidade<EntradaClassificarDemanda, SaidaClassificarDemanda> = {
  id: 'classificar-demanda',
  versao: '0.1.0',
  descricao: 'Sugere tipo, setor e prioridade a partir de regras explícitas de palavras-chave.',
  modo: 'deterministico',
  agenteResponsavel: 'triagem',
  permissoes: ['demandas:ler'],
  ferramentas: [],
  esquemaEntrada: { tipo: 'objeto', campos: { titulo: { tipo: 'texto' }, descricao: { tipo: 'texto' } } },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      tipo: { tipo: 'texto' },
      setor: { tipo: 'texto', valores: ['licenciamento', 'fiscalizacao', 'tecnologia', 'triagem-humana'] },
      prioridade: { tipo: 'texto', valores: ['alta', 'media', 'baixa'] },
      regraAplicada: { tipo: 'texto' },
      sugestao: { tipo: 'booleano' },
    },
  },
  criteriosAceite: [
    'Toda classificação indica a regra aplicada',
    'O resultado é sempre marcado como sugestão (a decisão é humana)',
    'Texto sem regra aplicável vai para triagem humana',
  ],
  desativavel: true,
};
