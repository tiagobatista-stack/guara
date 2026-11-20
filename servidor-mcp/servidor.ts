// Servidor MCP LOCAL e didático do GUARÁ (P10). Transporte stdio, ferramentas
// SOMENTE DE LEITURA sobre o guara-dados.json exportado pela interface.
// Não acessa o localStorage, não abre porta de rede e não deve ser publicado na Vercel.
// Execução: node servidor-mcp/servidor.ts   (Node ≥ 23.6 executa TypeScript nativamente)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { DadosPortaveis } from '../aplicacao/src/modulos/alertas/dados-portaveis.ts';
import { carregarRastreado, consultarDemanda, consultarInativas, listarDemandas, resolverCaminho, resumirDemandas } from './consultas.ts';

const caminho = resolverCaminho(process.env.GUARA_DADOS_JSON);
const servidor = new McpServer({ name: 'guara-dados', version: '0.1.0' });
const somenteLeitura = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

// Toda resposta de sucesso leva o rastreio (arquivo, sha256, exportação, método).
const responder = async (fn: (d: DadosPortaveis) => unknown) => {
  try {
    const { dados, rastreio } = await carregarRastreado(caminho);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ rastreio, resultado: fn(dados) }, null, 2) }] };
  } catch (erro) {
    return { isError: true, content: [{ type: 'text' as const, text: erro instanceof Error ? erro.message : String(erro) }] };
  }
};

servidor.registerTool(
  'listar_demandas',
  {
    description: 'Lista demandas FICTÍCIAS do guara-dados.json exportado, com filtro opcional de status e prioridade.',
    inputSchema: {
      status: z.enum(['A Fazer', 'Em Andamento', 'Em Validação', 'Concluída']).optional(),
      prioridade: z.enum(['Alta', 'Média', 'Baixa']).optional(),
      limite: z.number().int().min(1).max(100).optional().describe('Máximo de itens (1 a 100, padrão 20)'),
    },
    annotations: somenteLeitura,
  },
  async (args) => responder((d) => listarDemandas(d, args)),
);

servidor.registerTool(
  'resumir_demandas',
  {
    description: 'Contagens por status e prioridade das demandas do guara-dados.json exportado.',
    inputSchema: {},
    annotations: somenteLeitura,
  },
  async () => responder((d) => resumirDemandas(d)),
);

servidor.registerTool(
  'listar_inativas',
  {
    description: 'Demandas inativas pela mesma regra do app (não concluída, última ação há mais de N dias corridos).',
    inputSchema: {
      limiar_dias: z.number().int().min(1).max(365).optional().describe('Padrão: o limiar gravado no arquivo exportado'),
      referencia: z.string().datetime().optional().describe('Instante de referência ISO 8601; padrão: agora'),
    },
    annotations: somenteLeitura,
  },
  async ({ limiar_dias, referencia }) =>
    responder((d) => consultarInativas(d, limiar_dias, referencia ? new Date(referencia) : new Date())),
);

servidor.registerTool(
  'consultar_demanda',
  {
    description: 'Dados de UMA demanda fictícia do guara-dados.json: pelo id, ou a que estava aberta no GUARÁ quando o arquivo foi exportado.',
    inputSchema: { id: z.string().min(1).max(100).optional().describe('Padrão: a demanda em foco registrada na exportação') },
    annotations: somenteLeitura,
  },
  async ({ id }) => responder((d) => consultarDemanda(d, id)),
);

await servidor.connect(new StdioServerTransport());
console.error(`[guara-mcp] pronto (stdio, somente leitura). Arquivo: ${caminho}`);
