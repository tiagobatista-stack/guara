import type { EntradaAvaliarPrazos, SaidaAvaliarPrazos } from './contrato.ts';

const DIA_MS = 24 * 60 * 60 * 1000;

function diaUtc(texto: string): number {
  const [a, m, d] = texto.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

export function diferencaDias(de: string, ate: string): number {
  return Math.round((diaUtc(ate) - diaUtc(de)) / DIA_MS);
}

export function avaliarPrazos(entrada: EntradaAvaliarPrazos): SaidaAvaliarPrazos {
  const saida: SaidaAvaliarPrazos = {
    dataReferencia: entrada.dataReferencia,
    vencidas: [],
    prazoProximo: [],
    paradas: [],
    ignoradasConcluidas: [],
  };
  for (const d of entrada.demandas) {
    if (d.situacao === 'concluida') {
      saida.ignoradasConcluidas.push(d.id);
      continue;
    }
    const diasAtePrazo = diferencaDias(entrada.dataReferencia, d.prazo);
    if (diasAtePrazo < 0) saida.vencidas.push(d.id);
    else if (diasAtePrazo <= entrada.diasPrazoProximo) saida.prazoProximo.push(d.id);

    if (diferencaDias(d.ultimaMovimentacao, entrada.dataReferencia) >= entrada.diasInatividade) {
      saida.paradas.push(d.id);
    }
  }
  return saida;
}
