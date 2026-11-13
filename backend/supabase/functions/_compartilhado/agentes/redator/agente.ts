import type { ContratoAgente } from '../../tipos.ts';

export const agente: ContratoAgente = {
  id: 'redator',
  versao: '0.1.0',
  papel: 'Prepara minutas e relatórios preliminares, sempre como rascunho a revisar.',
  habilidades: ['redigir-minuta', 'relatorio-executivo'],
  ferramentas: ['banco-postgres'],
  permissao: 'rascunho',
  desativavel: true,
};
