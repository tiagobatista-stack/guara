import { AVISO_MINUTA, type EntradaRedigirMinuta, type SaidaRedigirMinuta } from './contrato.ts';

export function redigirMinuta(entrada: EntradaRedigirMinuta): SaidaRedigirMinuta {
  const conta = (s: string) => entrada.resultados.filter((r) => r.situacao === s).length;
  const naoAtendidos = entrada.resultados.filter((r) => r.situacao !== 'atendido');

  return {
    modeloId: entrada.modeloId,
    situacao: 'a-revisar',
    paragrafos: [
      `Processo ${entrada.processo}: minuta preliminar gerada a partir do checklist.`,
      `Itens atendidos: ${conta('atendido')}. Itens pendentes: ${conta('pendente')}. Itens não verificáveis: ${conta('nao-verificavel')}.`,
      ...naoAtendidos.map((r) => `${r.itemId}: ${r.situacao} — ${r.justificativa}`),
    ],
    pendencias: naoAtendidos.map((r) => r.itemId),
    aviso: AVISO_MINUTA,
  };
}
