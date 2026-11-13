import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaConferirRequisitos, SaidaConferirRequisitos } from './contrato.ts';
import { itensRenovacaoEsperados } from '../montar-checklist/autoteste.ts';
import { saidaExtracaoEsperada } from '../extrair-documento/autoteste.ts';

export const saidaConferenciaEsperada: SaidaConferirRequisitos = {
  resultados: [
    {
      itemId: 'RL-01',
      situacao: 'atendido',
      justificativa: 'campo "processo" encontrado na página 1',
      evidencia: { campo: 'processo', valor: 'FIC-2026-0001', pagina: 1 },
    },
    {
      itemId: 'RL-02',
      situacao: 'atendido',
      justificativa: 'campo "interessado" encontrado na página 1',
      evidencia: { campo: 'interessado', valor: 'Piscicultura Rio Claro Ltda (fictícia)', pagina: 1 },
    },
    {
      itemId: 'RL-03',
      situacao: 'atendido',
      justificativa: 'campo "validadeLicencaAnterior" encontrado na página 2',
      evidencia: { campo: 'validadeLicencaAnterior', valor: '2026-12-31', pagina: 2 },
    },
    {
      itemId: 'RL-04',
      situacao: 'atendido',
      justificativa: 'campo "responsavelTecnico" encontrado na página 2',
      evidencia: { campo: 'responsavelTecnico', valor: 'Eng. Fictício da Silva', pagina: 2 },
    },
    {
      itemId: 'RL-05',
      situacao: 'pendente',
      justificativa: 'documento indica "não apresentada" (página 2)',
      evidencia: { campo: 'outorgaAgua', valor: 'não apresentada', pagina: 2 },
    },
    { itemId: 'RL-06', situacao: 'nao-verificavel', justificativa: 'requer verificação humana' },
  ],
  totais: { atendidos: 4, pendentes: 1, naoVerificaveis: 1 },
};

export const autoteste: CasoAutoteste<EntradaConferirRequisitos, SaidaConferirRequisitos> = {
  descricao: 'Confere o checklist de renovação contra as extrações do DOC-FIC-0001',
  entrada: { itens: itensRenovacaoEsperados, campos: saidaExtracaoEsperada.campos },
  saidaEsperada: saidaConferenciaEsperada,
};
