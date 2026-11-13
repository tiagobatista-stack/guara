import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaExtrairDocumento, SaidaExtrairDocumento } from './contrato.ts';
import { documentoRenovacao } from '../../../../../../dados-ficticios/documentos.ts';

export const saidaExtracaoEsperada: SaidaExtrairDocumento = {
  documentoId: 'DOC-FIC-0001',
  fonte: 'camada-de-texto',
  campos: [
    { campo: 'processo', valor: 'FIC-2026-0001', pagina: 1 },
    { campo: 'interessado', valor: 'Piscicultura Rio Claro Ltda (fictícia)', pagina: 1 },
    { campo: 'validadeLicencaAnterior', valor: '2026-12-31', pagina: 2 },
    { campo: 'areaHa', valor: '12,5', pagina: 2 },
    { campo: 'responsavelTecnico', valor: 'Eng. Fictício da Silva', pagina: 2 },
    { campo: 'outorgaAgua', valor: 'não apresentada', pagina: 2 },
  ],
  camposAusentes: [],
};

export const autoteste: CasoAutoteste<EntradaExtrairDocumento, SaidaExtrairDocumento> = {
  descricao: 'Extrai campos do documento fictício DOC-FIC-0001 (texto por página)',
  entrada: { documentoId: documentoRenovacao.id, paginas: documentoRenovacao.paginas },
  saidaEsperada: saidaExtracaoEsperada,
};
