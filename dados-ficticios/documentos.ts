// FICTÍCIO — documento sintético representado como texto por página.
// Simula a camada de texto de um PDF; a leitura de PDF real ainda não existe (MVP-1).

export interface PaginaTexto {
  numero: number;
  texto: string;
}

export interface DocumentoFicticio {
  ficticio: true;
  id: string;
  nome: string;
  paginas: PaginaTexto[];
}

export const documentoRenovacao: DocumentoFicticio = {
  ficticio: true,
  id: 'DOC-FIC-0001',
  nome: 'requerimento-renovacao-FICTICIO.pdf',
  paginas: [
    {
      numero: 1,
      texto:
        'REQUERIMENTO DE RENOVAÇÃO (DOCUMENTO FICTÍCIO)\nProcesso: FIC-2026-0001\nInteressado: Piscicultura Rio Claro Ltda (fictícia)\nAtividade: piscicultura em tanques escavados',
    },
    {
      numero: 2,
      texto:
        'Licença anterior válida até: 2026-12-31\nÁrea total (ha): 12,5\nResponsável técnico: Eng. Fictício da Silva\nOutorga de uso da água: não apresentada',
    },
  ],
};

/** Segundo caso sintético do fluxo (renovação com dados próprios, para provar que a trilha segue a entrada). */
export const documentoRenovacaoCerrado: DocumentoFicticio = {
  ficticio: true,
  id: 'DOC-FIC-0101',
  nome: 'requerimento-renovacao-cerrado-FICTICIO.pdf',
  paginas: [
    {
      numero: 1,
      texto:
        'REQUERIMENTO DE RENOVAÇÃO (DOCUMENTO FICTÍCIO)\nProcesso: FIC-2026-0101\nInteressado: Fazenda Cerrado Alto (fictícia)\nAtividade: armazenagem de grãos',
    },
    {
      numero: 2,
      texto:
        'Licença anterior válida até: 2027-03-31\nÁrea total (ha): 48,0\nResponsável técnico: Eng. Sintética Souza\nOutorga de uso da água: apresentada',
    },
  ],
};

/** Documentos que o fluxo sabe ler; uma demanda só é extraída se um destes estiver em `documentos`. */
export const documentosFicticios: DocumentoFicticio[] = [documentoRenovacao, documentoRenovacaoCerrado];
