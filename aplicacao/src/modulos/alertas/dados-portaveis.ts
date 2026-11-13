// Exportação e importação JSON (P06; PLANO.md regra 7). O arquivo exportado
// também é a fonte de dados do servidor MCP local (P10).

import type { Demanda } from '../demandas/modelo.ts';
import { ehDemandaValida } from '../demandas/regras.ts';

export const FORMATO = 'guara-dados';
export const NOME_ARQUIVO = 'guara-dados.json';
export const TAMANHO_MAXIMO = 1_000_000; // 1 MB
export const MAX_DEMANDAS = 5000;

export interface DadosPortaveis {
  formato: typeof FORMATO;
  versao: 1;
  ficticio: true;
  exportadoEm: string;
  configuracao: { diasInatividade: number };
  demandas: Demanda[];
}

export function exportarDados(demandas: readonly Demanda[], diasInatividade: number, agora: Date): string {
  const dados: DadosPortaveis = {
    formato: FORMATO,
    versao: 1,
    ficticio: true,
    exportadoEm: agora.toISOString(),
    configuracao: { diasInatividade },
    demandas: [...demandas],
  };
  return JSON.stringify(dados, null, 2);
}

export type ResultadoImportacao = { ok: true; dados: DadosPortaveis } | { ok: false; erro: string };

export function diasValidos(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 365;
}

/** Valida o texto do arquivo. Nunca altera dados: só diz se pode ser importado. */
export function validarImportacao(texto: string): ResultadoImportacao {
  if (texto.length > TAMANHO_MAXIMO) return { ok: false, erro: `Arquivo maior que ${TAMANHO_MAXIMO / 1_000_000} MB.` };
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    return { ok: false, erro: 'O arquivo não é um JSON válido.' };
  }
  const d = bruto as Partial<DadosPortaveis>;
  if (typeof bruto !== 'object' || bruto === null || d.formato !== FORMATO || d.versao !== 1) {
    return { ok: false, erro: 'Formato não reconhecido: esperado um arquivo exportado pelo GUARÁ (versão 1).' };
  }
  if (!Array.isArray(d.demandas)) return { ok: false, erro: 'O arquivo não contém a lista de demandas.' };
  if (d.demandas.length > MAX_DEMANDAS) return { ok: false, erro: `Mais de ${MAX_DEMANDAS} demandas.` };
  const invalida = d.demandas.findIndex((x) => !ehDemandaValida(x));
  if (invalida >= 0) return { ok: false, erro: `Demanda inválida na posição ${invalida + 1}.` };
  if (new Set(d.demandas.map((x) => x.id)).size !== d.demandas.length) return { ok: false, erro: 'Há IDs de demanda duplicados.' };
  const dias = d.configuracao?.diasInatividade;
  if (dias !== undefined && !diasValidos(dias)) return { ok: false, erro: 'Configuração de inatividade inválida.' };
  return {
    ok: true,
    dados: {
      formato: FORMATO,
      versao: 1,
      ficticio: true,
      exportadoEm: typeof d.exportadoEm === 'string' ? d.exportadoEm : '',
      configuracao: { diasInatividade: dias ?? 3 },
      demandas: d.demandas,
    },
  };
}
