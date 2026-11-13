// Consultas SOMENTE LEITURA sobre o guara-dados.json exportado pela interface (P10).
// Reaproveita a validação de importação e a regra de inatividade do próprio app,
// para que o MCP e a interface apliquem exatamente as mesmas regras.

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAMANHO_MAXIMO, validarImportacao, type DadosPortaveis } from '../aplicacao/src/modulos/alertas/dados-portaveis.ts';
import { diasParado, listarInativas } from '../aplicacao/src/modulos/alertas/inatividade.ts';

export const PASTA_PERMITIDA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dados');
export const ARQUIVO_PADRAO = path.join(PASTA_PERMITIDA, 'guara-dados.json');

/** Resolve o caminho e impede path traversal: só arquivos .json dentro de servidor-mcp/dados/. */
export function resolverCaminho(informado: string | undefined): string {
  const absoluto = path.resolve(informado ?? ARQUIVO_PADRAO);
  const relativo = path.relative(PASTA_PERMITIDA, absoluto);
  if (relativo === '' || relativo.startsWith('..') || path.isAbsolute(relativo)) {
    throw new Error(`Caminho não permitido: use um arquivo dentro de ${PASTA_PERMITIDA}.`);
  }
  if (path.extname(absoluto).toLowerCase() !== '.json') throw new Error('Somente arquivos .json são permitidos.');
  return absoluto;
}

export async function carregarDados(caminho: string): Promise<DadosPortaveis> {
  let tamanho: number;
  try {
    tamanho = (await stat(caminho)).size;
  } catch {
    throw new Error(`Arquivo não encontrado: ${caminho}. Exporte os dados pela tela Alertas do GUARÁ e salve-o nesse caminho.`);
  }
  if (tamanho > TAMANHO_MAXIMO) throw new Error('Arquivo maior que o limite de 1 MB.');
  const r = validarImportacao(await readFile(caminho, 'utf8'));
  if (!r.ok) throw new Error(`JSON inválido: ${r.erro}`);
  return r.dados;
}

export interface FiltroListagem {
  status?: string;
  prioridade?: string;
  limite?: number;
}

export function listarDemandas(dados: DadosPortaveis, f: FiltroListagem) {
  const limite = f.limite ?? 20;
  const filtradas = dados.demandas.filter(
    (d) => (!f.status || d.status === f.status) && (!f.prioridade || d.prioridade === f.prioridade),
  );
  return {
    total: filtradas.length,
    exibidas: Math.min(limite, filtradas.length),
    itens: filtradas.slice(0, limite).map(({ id, titulo, status, prioridade, responsavel, prazo, ultimaAcaoRelevante }) => ({
      id, titulo, status, prioridade, responsavel, prazo: prazo ?? null, ultimaAcaoRelevante,
    })),
  };
}

export function resumirDemandas(dados: DadosPortaveis) {
  const contar = (chave: 'status' | 'prioridade') =>
    dados.demandas.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d[chave]]: (acc[d[chave]] ?? 0) + 1 }), {});
  return {
    total: dados.demandas.length,
    porStatus: contar('status'),
    porPrioridade: contar('prioridade'),
    exportadoEm: dados.exportadoEm,
    ficticio: dados.ficticio,
  };
}

export function consultarInativas(dados: DadosPortaveis, limiarDias: number | undefined, referencia: Date) {
  const limiar = limiarDias ?? dados.configuracao.diasInatividade;
  const inativas = listarInativas(dados.demandas, limiar, referencia);
  return {
    limiarDias: limiar,
    referencia: referencia.toISOString(),
    regra: 'não concluída e última ação relevante há MAIS de limiarDias dias corridos (mesma regra do app)',
    total: inativas.length,
    itens: inativas.map((d) => ({ id: d.id, titulo: d.titulo, status: d.status, diasParado: diasParado(d, referencia) })),
  };
}
