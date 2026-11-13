import type { ContratoAgente } from '../../tipos.ts';

export const agente: ContratoAgente = {
  id: 'prazos',
  versao: '0.1.0',
  papel: 'Acompanha a inatividade e os prazos das demandas.',
  habilidades: ['avaliar-prazos'],
  ferramentas: ['banco-postgres'],
  permissao: 'leitura',
  desativavel: true,
};
