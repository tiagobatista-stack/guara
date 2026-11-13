import type { ContratoAgente } from '../../tipos.ts';

export const agente: ContratoAgente = {
  id: 'analista',
  versao: '0.1.0',
  papel: 'Monta e confere o checklist técnico.',
  habilidades: ['montar-checklist', 'conferir-requisitos'],
  ferramentas: ['banco-postgres'],
  permissao: 'leitura',
  desativavel: true,
};
