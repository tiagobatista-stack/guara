import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaRedigirMinuta, SaidaRedigirMinuta } from './contrato.ts';
import { saidaConferenciaEsperada } from '../conferir-requisitos/autoteste.ts';
import { modeloMinuta } from '../../../../../../dados-ficticios/checklists.ts';

export const autoteste: CasoAutoteste<EntradaRedigirMinuta, SaidaRedigirMinuta> = {
  descricao: 'Redige minuta preliminar do processo FIC-2026-0001',
  entrada: { processo: 'FIC-2026-0001', modeloId: modeloMinuta.id, resultados: saidaConferenciaEsperada.resultados },
  saidaEsperada: {
    modeloId: 'MOD-FIC-01',
    situacao: 'a-revisar',
    paragrafos: [
      'Processo FIC-2026-0001: minuta preliminar gerada a partir do checklist.',
      'Itens atendidos: 4. Itens pendentes: 1. Itens não verificáveis: 1.',
      'RL-05: pendente — documento indica "não apresentada" (página 2)',
      'RL-06: nao-verificavel — requer verificação humana',
    ],
    pendencias: ['RL-05', 'RL-06'],
    aviso: 'Rascunho gerado automaticamente. Exige revisão e validação humana; não é documento oficial.',
  },
};
