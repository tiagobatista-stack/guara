import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaRegistrarDemanda, SaidaRegistrarDemanda } from './contrato.ts';
import { demandasFicticias } from '../../../../../../dados-ficticios/demandas.ts';

const d = demandasFicticias[0];

export const autoteste: CasoAutoteste<EntradaRegistrarDemanda, SaidaRegistrarDemanda> = {
  descricao: 'Registra a demanda fictícia DEM-FIC-0001',
  entrada: { processo: d.processo, titulo: d.titulo, tipo: d.tipo, prazo: d.prazo, descricao: d.descricao },
  saidaEsperada: {
    valida: true,
    erros: [],
    demanda: {
      id: 'DEM-FIC-2026-0001',
      processo: 'FIC-2026-0001',
      titulo: 'Renovação de licença de operação — Piscicultura Rio Claro (FICTÍCIA)',
      tipo: 'renovacao-licenca',
      prazo: '2026-11-18',
      situacao: 'registrada',
    },
  },
};
