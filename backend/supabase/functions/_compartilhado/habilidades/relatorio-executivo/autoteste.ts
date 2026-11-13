import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaRelatorioExecutivo, SaidaRelatorioExecutivo } from './contrato.ts';
import { DATA_REFERENCIA, demandasFicticias } from '../../../../../../dados-ficticios/demandas.ts';

export const autoteste: CasoAutoteste<EntradaRelatorioExecutivo, SaidaRelatorioExecutivo> = {
  descricao: 'Consolida as 4 demandas fictícias validadas',
  entrada: {
    dataReferencia: DATA_REFERENCIA,
    validado: true,
    demandas: demandasFicticias.map(({ id, setor, situacao }) => ({ id, setor, situacao })),
  },
  saidaEsperada: {
    liberado: true,
    dataReferencia: '2026-11-13',
    total: 4,
    porSetor: [
      { chave: 'fiscalizacao', quantidade: 1 },
      { chave: 'licenciamento', quantidade: 2 },
      { chave: 'tecnologia', quantidade: 1 },
    ],
    porSituacao: [
      { chave: 'aberta', quantidade: 1 },
      { chave: 'aguardando-revisao', quantidade: 1 },
      { chave: 'concluida', quantidade: 1 },
      { chave: 'em-analise', quantidade: 1 },
    ],
    fontes: ['DEM-FIC-0001', 'DEM-FIC-0002', 'DEM-FIC-0003', 'DEM-FIC-0004'],
  },
};
