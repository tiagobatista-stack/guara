// Consultas SOMENTE LEITURA sobre o guara-dados.json exportado pela interface (P10).
// Reaproveita a validação de importação e a regra de inatividade do próprio app,
// para que o MCP e a interface apliquem exatamente as mesmas regras.

import { createHash } from 'node:crypto';
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

/** Idade a partir da qual a exportação deixa de ser tratada como atual. */
export const LIMITE_IDADE_HORAS = 24;

/** Idade da exportação e aviso explícito quando passa do limite (ou quando a data não existe). */
export function avaliarIdade(exportadoEm: string, agora: Date, limiteHoras: number = LIMITE_IDADE_HORAS) {
  const t = Date.parse(exportadoEm);
  if (Number.isNaN(t)) {
    return { idadeHoras: null, limiteHoras, aviso: 'A exportação não informa a data: não dá para saber se reflete a tela do GUARÁ. Exporte de novo pela tela Alertas.' };
  }
  const idadeHoras = Math.max(0, Math.round(((agora.getTime() - t) / 3_600_000) * 10) / 10);
  const aviso = idadeHoras > limiteHoras
    ? `Exportação com ${idadeHoras} h (limite ${limiteHoras} h): estes dados podem NÃO refletir a tela do GUARÁ. Exporte de novo pela tela Alertas e salve em servidor-mcp/dados/.`
    : null;
  return { idadeHoras, limiteHoras, aviso };
}

/** Rastro de cada resposta do MCP: de qual arquivo e de qual exportação ela veio, e por qual método. */
export interface Rastreio {
  fonte: 'guara-dados.json exportado pela tela Alertas';
  arquivo: string;
  sha256: string;
  bytes: number;
  exportadoEm: string;
  /** Idade da exportação em horas (null se o arquivo não tem data). */
  idadeHoras: number | null;
  limiteHoras: number;
  /** Não nulo quando a exportação passou do limite: o dado pode não refletir a tela. */
  aviso: string | null;
  origemDaExportacao: DadosPortaveis['origem'] | null;
  ficticio: true;
  metodo: 'determinístico: leitura e contagem sobre o arquivo, sem modelo de IA';
  somenteLeitura: true;
  consultadoEm: string;
}

export interface DadosRastreados { dados: DadosPortaveis; rastreio: Rastreio }

export async function carregarDados(caminho: string): Promise<DadosPortaveis> {
  return (await carregarRastreado(caminho)).dados;
}

export async function carregarRastreado(caminho: string, agora: Date = new Date()): Promise<DadosRastreados> {
  let tamanho: number;
  try {
    tamanho = (await stat(caminho)).size;
  } catch {
    throw new Error(`Arquivo não encontrado: ${caminho}. Exporte os dados pela tela Alertas do GUARÁ e salve-o nesse caminho.`);
  }
  if (tamanho > TAMANHO_MAXIMO) throw new Error('Arquivo maior que o limite de 1 MB.');
  const bruto = await readFile(caminho);
  const r = validarImportacao(bruto.toString('utf8'));
  if (!r.ok) throw new Error(`JSON inválido: ${r.erro}`);
  return {
    dados: r.dados,
    rastreio: {
      fonte: 'guara-dados.json exportado pela tela Alertas',
      arquivo: path.basename(caminho),
      sha256: createHash('sha256').update(bruto).digest('hex'),
      bytes: bruto.length,
      exportadoEm: r.dados.exportadoEm,
      ...avaliarIdade(r.dados.exportadoEm, agora),
      origemDaExportacao: r.dados.origem ?? null,
      ficticio: true,
      metodo: 'determinístico: leitura e contagem sobre o arquivo, sem modelo de IA',
      somenteLeitura: true,
      consultadoEm: agora.toISOString(),
    },
  };
}

/** Uma demanda pelo id; sem id, a que estava aberta na exportação. Erro claro quando não há como escolher. */
export function consultarDemanda(dados: DadosPortaveis, id: string | undefined) {
  const alvo = id ?? dados.origem?.demandaEmFoco;
  if (!alvo) throw new Error('Informe o id da demanda: a exportação não registra uma demanda em foco.');
  const d = dados.demandas.find((x) => x.id === alvo);
  if (!d) throw new Error(`Demanda ${alvo} não encontrada no arquivo exportado.`);
  const { id: _id, titulo, status, prioridade, responsavel, prazo, ultimaAcaoRelevante, processo } = d;
  return { id: d.id, escolhidaPor: id ? 'id informado' : 'demanda em foco na exportação', titulo, status, prioridade, responsavel, prazo: prazo ?? null, processo: processo ?? null, ultimaAcaoRelevante };
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
