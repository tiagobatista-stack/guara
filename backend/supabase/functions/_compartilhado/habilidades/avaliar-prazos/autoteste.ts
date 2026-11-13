import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaAvaliarPrazos, SaidaAvaliarPrazos } from './contrato.ts';
import { DATA_REFERENCIA, demandasFicticias } from '../../../../../../dados-ficticios/demandas.ts';

export const autoteste: CasoAutoteste<EntradaAvaliarPrazos, SaidaAvaliarPrazos> = {
  descricao: 'Avalia prazos das 4 demandas fictícias em 13/11/2026 (inatividade ≥ 5 dias, prazo ≤ 3 dias)',
  entrada: {
    dataReferencia: DATA_REFERENCIA,
    diasInatividade: 5,
    diasPrazoProximo: 3,
    demandas: demandasFicticias.map(({ id, prazo, ultimaMovimentacao, situacao }) => ({ id, prazo, ultimaMovimentacao, situacao })),
  },
  saidaEsperada: {
    dataReferencia: '2026-11-13',
    vencidas: [],
    prazoProximo: ['DEM-FIC-0002'],
    paradas: ['DEM-FIC-0002', 'DEM-FIC-0003'],
    ignoradasConcluidas: ['DEM-FIC-0004'],
  },
};
