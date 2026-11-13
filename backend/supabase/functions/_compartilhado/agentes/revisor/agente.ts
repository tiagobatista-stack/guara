import type { ContratoAgente } from '../../tipos.ts';

export const agente: ContratoAgente = {
  id: 'revisor',
  versao: '0.1.0',
  papel: 'Faz a revisão independente: não aprova o que não foi verificado e nunca revisa o próprio trabalho.',
  habilidades: ['validar-evidencias'],
  ferramentas: [],
  permissao: 'leitura',
  desativavel: false,
};
