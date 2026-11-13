import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaValidarEvidencias, SaidaValidarEvidencias } from './contrato.ts';
import { saidaConferenciaEsperada } from '../conferir-requisitos/autoteste.ts';

export const autoteste: CasoAutoteste<EntradaValidarEvidencias, SaidaValidarEvidencias> = {
  descricao: 'Valida as evidências da conferência fictícia FIC-2026-0001',
  entrada: { resultados: saidaConferenciaEsperada.resultados },
  saidaEsperada: {
    aprovado: true,
    erros: [],
    ressalvas: ['RL-05: pendente', 'RL-06: nao-verificavel'],
    itensVerificados: 6,
  },
};
