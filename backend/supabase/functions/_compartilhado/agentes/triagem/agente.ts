import type { ContratoAgente } from '../../tipos.ts';

export const agente: ContratoAgente = {
  id: 'triagem',
  versao: '0.1.0',
  papel: 'Recebe e classifica a demanda e aplica o roteamento.',
  habilidades: ['registrar-demanda', 'classificar-demanda'],
  ferramentas: ['banco-postgres'],
  permissao: 'leitura',
  desativavel: true,
};
