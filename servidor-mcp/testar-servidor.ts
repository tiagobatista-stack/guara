// Teste do servidor MCP SEM interface: um cliente MCP real inicia o servidor por
// stdio, lista as ferramentas e chama cada uma. Compara o total com o JSON lido do disco.
// Uso: node servidor-mcp/testar-servidor.ts [caminho-do-json-dentro-de-dados/]

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolverCaminho } from './consultas.ts';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const arquivo = resolverCaminho(process.argv[2]);
const transporte = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(aqui, 'servidor.ts')],
  env: { ...process.env, GUARA_DADOS_JSON: arquivo } as Record<string, string>,
  stderr: 'pipe',
});
const cliente = new Client({ name: 'guara-teste', version: '0.1.0' });
await cliente.connect(transporte);

const texto = (r: { content: unknown }) => (r.content as { text: string }[])[0].text;
const ferramentas = (await cliente.listTools()).tools.map((t) => `${t.name} (readOnly=${t.annotations?.readOnlyHint})`);
console.log('FERRAMENTAS:', ferramentas.join(', '));

const resumo = JSON.parse(texto(await cliente.callTool({ name: 'resumir_demandas', arguments: {} })));
console.log('resumir_demandas →', JSON.stringify(resumo));
const inativas = JSON.parse(texto(await cliente.callTool({ name: 'listar_inativas', arguments: {} })));
console.log('listar_inativas →', JSON.stringify({ limiarDias: inativas.limiarDias, total: inativas.total, ids: inativas.itens.map((i: { id: string }) => i.id) }));
const lista = JSON.parse(texto(await cliente.callTool({ name: 'listar_demandas', arguments: { status: 'Em Andamento', limite: 5 } })));
console.log('listar_demandas(status=Em Andamento) →', JSON.stringify({ total: lista.total, ids: lista.itens.map((i: { id: string }) => i.id) }));

const invalido = await cliente.callTool({ name: 'listar_demandas', arguments: { limite: 1000 } });
console.log('listar_demandas(limite=1000) → isError =', invalido.isError === true);

const totalNoArquivo = JSON.parse(await readFile(arquivo, 'utf8')).demandas.length;
console.log(`COMPARAÇÃO: MCP total=${resumo.total} · JSON no disco=${totalNoArquivo} · ${resumo.total === totalNoArquivo ? 'COINCIDEM' : 'DIVERGEM'}`);
await cliente.close();
process.exit(resumo.total === totalNoArquivo ? 0 : 1);
