// Teste do servidor MCP SEM interface: um cliente MCP real inicia o servidor por
// stdio, lista as ferramentas e chama cada uma. Compara o total com o JSON lido do disco.
// Uso: node servidor-mcp/testar-servidor.ts [caminho-do-json-dentro-de-dados/]

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { avaliarIdade, resolverCaminho } from './consultas.ts';

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
resumo.total = resumo.resultado.total;
console.log('resumir_demandas →', JSON.stringify(resumo));
const inativas = JSON.parse(texto(await cliente.callTool({ name: 'listar_inativas', arguments: {} }))).resultado;
console.log('listar_inativas →', JSON.stringify({ limiarDias: inativas.limiarDias, total: inativas.total, ids: inativas.itens.map((i: { id: string }) => i.id) }));
const lista = JSON.parse(texto(await cliente.callTool({ name: 'listar_demandas', arguments: { status: 'Em Andamento', limite: 5 } }))).resultado;
console.log('listar_demandas(status=Em Andamento) →', JSON.stringify({ total: lista.total, ids: lista.itens.map((i: { id: string }) => i.id) }));

const invalido = await cliente.callTool({ name: 'listar_demandas', arguments: { limite: 1000 } });
console.log('listar_demandas(limite=1000) → isError =', invalido.isError === true);

// Caso válido, negado e de falha (rastreabilidade e fronteiras).
const comRastro = JSON.parse(texto(await cliente.callTool({ name: 'consultar_demanda', arguments: { id: JSON.parse(await readFile(arquivo, 'utf8')).demandas[0].id } })));
const rastro = comRastro.rastreio;
const okRastro = /^[0-9a-f]{64}$/.test(rastro.sha256) && rastro.somenteLeitura === true && rastro.metodo.startsWith('determinístico');
console.log('VÁLIDO consultar_demanda(id) →', comRastro.resultado.id, '· sha256', rastro.sha256.slice(0, 12), '· rastro', okRastro ? 'OK' : 'FALTA');
const inexistente = await cliente.callTool({ name: 'consultar_demanda', arguments: { id: 'NAO-EXISTE' } });
console.log('FALHA consultar_demanda(NAO-EXISTE) → isError =', inexistente.isError === true, '·', texto(inexistente));
let negado = false;
try { resolverCaminho('/etc/passwd'); } catch { negado = true; }
console.log('NEGADO caminho fora de dados/ → bloqueado =', negado);
if (!okRastro || inexistente.isError !== true || !negado) { await cliente.close(); process.exit(1); }

// Idade da exportação: recente sem aviso; antiga ou sem data com aviso explícito.
const ref = new Date('2026-11-20T12:00:00.000Z');
const recente = avaliarIdade('2026-11-20T08:00:00.000Z', ref);
const antiga = avaliarIdade('2026-11-14T22:49:14.423Z', ref);
const semData = avaliarIdade('', ref);
const okIdade = recente.aviso === null && recente.idadeHoras === 4 && !!antiga.aviso?.includes('NÃO refletir') && semData.aviso !== null && semData.idadeHoras === null;
console.log('IDADE recente(4 h) sem aviso ·', 'antiga com aviso ·', 'sem data com aviso →', okIdade ? 'OK' : 'FALHOU');
console.log('AVISO na exportação lida →', rastro.aviso ?? '(nenhum: exportação recente)');
if (!okIdade) { await cliente.close(); process.exit(1); }

const totalNoArquivo = JSON.parse(await readFile(arquivo, 'utf8')).demandas.length;
console.log(`COMPARAÇÃO: MCP total=${resumo.total} · JSON no disco=${totalNoArquivo} · ${resumo.total === totalNoArquivo ? 'COINCIDEM' : 'DIVERGEM'}`);
await cliente.close();
process.exit(resumo.total === totalNoArquivo ? 0 : 1);
