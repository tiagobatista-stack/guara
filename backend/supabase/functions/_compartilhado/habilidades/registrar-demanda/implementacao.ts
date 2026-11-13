import type { EntradaRegistrarDemanda, SaidaRegistrarDemanda } from './contrato.ts';

export function dataValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  return data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d;
}

export function registrarDemanda(entrada: EntradaRegistrarDemanda): SaidaRegistrarDemanda {
  const erros: string[] = [];
  if (!/^FIC-\d{4}-\d{4}$/.test(entrada.processo)) {
    erros.push('processo deve seguir o padrão fictício FIC-AAAA-NNNN');
  }
  if (entrada.titulo.trim().length < 5) erros.push('título deve ter ao menos 5 caracteres');
  if (entrada.tipo.trim() === '') erros.push('tipo é obrigatório');
  if (!dataValida(entrada.prazo)) erros.push('prazo deve ser uma data válida AAAA-MM-DD');

  if (erros.length > 0) return { valida: false, erros };
  return {
    valida: true,
    erros: [],
    demanda: {
      id: `DEM-${entrada.processo}`,
      processo: entrada.processo,
      titulo: entrada.titulo.trim(),
      tipo: entrada.tipo,
      prazo: entrada.prazo,
      situacao: 'registrada',
    },
  };
}
