import type { Contagem, EntradaRelatorioExecutivo, SaidaRelatorioExecutivo } from './contrato.ts';

function contar(valores: string[]): Contagem[] {
  const mapa = new Map<string, number>();
  for (const v of valores) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  return [...mapa.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([chave, quantidade]) => ({ chave, quantidade }));
}

export function relatorioExecutivo(entrada: EntradaRelatorioExecutivo): SaidaRelatorioExecutivo {
  if (!entrada.validado) {
    return {
      liberado: false,
      motivo: 'resultados ainda não validados pelo revisor',
      dataReferencia: entrada.dataReferencia,
      total: 0,
      porSetor: [],
      porSituacao: [],
      fontes: [],
    };
  }
  return {
    liberado: true,
    dataReferencia: entrada.dataReferencia,
    total: entrada.demandas.length,
    porSetor: contar(entrada.demandas.map((d) => d.setor)),
    porSituacao: contar(entrada.demandas.map((d) => d.situacao)),
    fontes: entrada.demandas.map((d) => d.id),
  };
}
