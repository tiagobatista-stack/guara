import type { ContratoHabilidade } from '../../tipos.ts';

export interface PaginaTexto {
  numero: number;
  texto: string;
}

export interface EntradaExtrairDocumento {
  documentoId: string;
  paginas: PaginaTexto[];
}

export interface CampoExtraido {
  campo: string;
  valor: string;
  pagina: number;
}

export interface SaidaExtrairDocumento {
  documentoId: string;
  fonte: 'camada-de-texto';
  campos: CampoExtraido[];
  camposAusentes: string[];
}

export const contrato: ContratoHabilidade<EntradaExtrairDocumento, SaidaExtrairDocumento> = {
  id: 'extrair-documento',
  versao: '0.1.0',
  descricao: 'Extrai campos de um documento com camada de texto e indica a página de origem.',
  modo: 'deterministico',
  agenteResponsavel: 'documental',
  permissoes: ['documentos:ler'],
  ferramentas: ['armazenamento-arquivos'],
  esquemaEntrada: {
    tipo: 'objeto',
    campos: {
      documentoId: { tipo: 'texto' },
      paginas: { tipo: 'lista', itens: { tipo: 'objeto', campos: { numero: { tipo: 'numero' }, texto: { tipo: 'texto' } } } },
    },
  },
  esquemaSaida: {
    tipo: 'objeto',
    campos: {
      documentoId: { tipo: 'texto' },
      fonte: { tipo: 'texto', valores: ['camada-de-texto'] },
      campos: {
        tipo: 'lista',
        itens: { tipo: 'objeto', campos: { campo: { tipo: 'texto' }, valor: { tipo: 'texto' }, pagina: { tipo: 'numero' } } },
      },
      camposAusentes: { tipo: 'lista', itens: { tipo: 'texto' } },
    },
  },
  criteriosAceite: [
    'Todo campo extraído informa a página de origem',
    'Campos não encontrados aparecem como ausentes e nunca são inventados',
  ],
  observacao:
    'O autoteste usa texto por página, simulando a camada de texto de um PDF. A leitura de arquivo PDF real ainda não está implementada (MVP-1).',
  desativavel: true,
};
