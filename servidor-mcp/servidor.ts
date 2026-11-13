// Servidor MCP LOCAL e didático do GUARÁ (P10). Transporte stdio, ferramentas
// SOMENTE DE LEITURA sobre o guara-dados.json exportado pela interface.
// Não acessa o localStorage, não abre porta de rede e não deve ser publicado na Vercel.
// Execução: node servidor-mcp/servidor.ts   (Node ≥ 23.6 executa TypeScript nativamente)

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { carregarDados, consultarInativas, listarDemandas, resolverCaminho, resumirDemandas } from './consultas.ts';

const caminho = resolverCaminho(process.env.GUARA_DADOS_JSON);
const servidor = new McpServer({ name: 'guara-dados', version: '0.1.0' });
const somenteLeitura = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };

const responder = async (fn: () => Promise<unknown>) => {
  try {
    return { content: [{ type: 'text' as const, text: JSON.stringify(await fn(), null, 2) }] };
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
  async (args) => responder(async () => listarDemandas(await carregarDados(caminho), args)),
);

servidor.registerTool(
  'resumir_demandas',
  {
    description: 'Contagens por status e prioridade das demandas do guara-dados.json exportado.',
    inputSchema: {},
    annotations: somenteLeitura,
  },
  async () => responder(async () => ({ arquivo: caminho, ...resumirDemandas(await carregarDados(caminho)) })),
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
    responder(async () => consultarInativas(await carregarDados(caminho), limiar_dias, referencia ? new Date(referencia) : new Date())),
);

await servidor.connect(new StdioServerTransport());
console.error(`[guara-mcp] pronto (stdio, somente leitura). Arquivo: ${caminho}`);
