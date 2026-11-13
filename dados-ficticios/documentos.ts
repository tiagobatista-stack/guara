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
