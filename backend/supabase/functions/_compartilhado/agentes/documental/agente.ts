import type { ContratoAgente } from '../../tipos.ts';

export const agente: ContratoAgente = {
  id: 'documental',
  versao: '0.1.0',
  papel: 'Organiza os documentos e extrai seu conteúdo, indicando a página de origem.',
  habilidades: ['extrair-documento'],
  ferramentas: ['armazenamento-arquivos'],
  permissao: 'leitura',
  desativavel: true,
};
