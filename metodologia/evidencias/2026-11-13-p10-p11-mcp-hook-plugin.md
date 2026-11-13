# Evidências — P10 (MCP local) e P11 (hook e plugin), 13/11/2026

## P10 — Servidor MCP local `guara-dados`

**Arquivos:**

- `servidor-mcp/servidor.ts`: transporte stdio e 3 ferramentas somente leitura.
- `servidor-mcp/consultas.ts`: reaproveita `validarImportacao` e `listarInativas` do app.
- `servidor-mcp/testar-servidor.ts`: cliente MCP real.
- `.mcp.json`: registro no escopo do projeto.
- Dependências: `@modelcontextprotocol/sdk` 1.32.2 e `zod` 4.6.7, com 0 vulnerabilidades.
- Execução com Node 26.13.1, que roda TypeScript nativamente.

**Fonte de dados:** conteúdo **realmente gerado pelo botão "Exportar guara-dados.json"** na página do app (`exportadoEm` 2026-11-13T16:35:09.064Z, 5 demandas fictícias). O conteúdo foi capturado do Blob do download e gravado em `servidor-mcp/dados/guara-dados.json`, que não é versionado.

| # | Verificação | Comando / chamada | Resultado | Situação |
|---|---|---|---|---|
| 1 | Ferramentas expostas | `node servidor-mcp/testar-servidor.ts` (cliente MCP real via stdio, `listTools`) | `listar_demandas`, `resumir_demandas`, `listar_inativas`, todas com `readOnly=true` | PASSOU |
| 2 | `resumir_demandas` chamada de verdade | `callTool` | total 5; Em Andamento 3, Em Validação 1, Concluída 1; Alta 2, Média 2, Baixa 1 | PASSOU |
| 3 | `listar_inativas` (regra do app) | `callTool` | limiar 3; total 1: `DEM-FIC-0003`, o mesmo resultado da tela Alertas | PASSOU |
| 4 | `listar_demandas(status=Em Andamento)` | `callTool` | 3: DEM-FIC-0001, DEM-FIC-0002, CHECK-P06 | PASSOU |
| 5 | Entrada inválida | `listar_demandas(limite=1000)` | `isError = true` | PASSOU |
| 6 | Comparação com o JSON exportado | total do MCP × `demandas.length` no disco | "MCP total=5 · JSON no disco=5 · COINCIDEM" | PASSOU |
| 7 | Path traversal | `resolverCaminho` com `../package.json`, `dados/../../CLAUDE.md`, `C:/Windows/win.ini` e `dados/x.txt` | os 4 foram bloqueados | PASSOU |
| 8 | Conexão listada em `/mcp` ou `claude mcp list` e chamada pelo próprio Claude Code | — | o `.mcp.json` só é lido ao abrir uma sessão na pasta do projeto, e esta sessão foi aberta na pasta pai | NÃO TESTADO |

## P11 — Hook com sentinela

| # | Verificação | Resultado | Situação |
|---|---|---|---|
| 1 | Regra da sentinela `GUARA_HOOK_TEST_BLOCK` (Bash e PowerShell) bloqueada; `echo GUARA_OK` permitido | `python -m unittest ...`: `Ran 8 tests ... OK` | PASSOU |
| 2 | Sentinela bloqueada **pelo hook em sessão real** | nesta sessão `echo GUARA_HOOK_TEST_BLOCK` foi **executado** (saída "GUARA_HOOK_TEST_BLOCK"): o `.claude/settings.json` do projeto não está carregado | NÃO TESTADO |
| 3 | Hook escrito em Node, como no texto da apostila | mantido em Python 3.12 (portátil e testado). Trocar o interpretador do hook nesta sessão arriscaria bloquear o próprio ambiente | desvio registrado |

## P11 — Inspeção de plugins (somente leitura, nada instalado)

| Verificação | Resultado |
|---|---|
| `ListPlugins` (plugins da conta claude.ai) | nenhum plugin habilitado (`results: []`) |
| `~/.claude/plugins/known_marketplaces.json` | 1 marketplace conhecido: `claude-plugins-official` |
| `~/.claude/plugins/store/` | 1 entrada interna embutida (`cc-plugin-agents-md_builtin`) |
| `/plugin` (interface da CLI) | não disponível nesta interface; abrir no terminal com `claude` → `/plugin` |

**Plugin é um pacote de extensões** (pode conter skills, agentes, hooks e servidores MCP). Não é sinônimo de skill nem de MCP. Nenhum plugin foi instalado.

## Para fechar os itens NÃO TESTADO

Abrir uma **nova sessão do Claude Code na pasta `estagiario-digital-fofofauna/`** e:

1. aprovar o MCP `guara-dados` e conferir com `/mcp`; pedir ao Claude para chamar `resumir_demandas`;
2. pedir `echo GUARA_HOOK_TEST_BLOCK` (deve ser recusado **pelo hook**) e `echo GUARA_OK` (deve ser permitido);
3. invocar os subagentes registrados `arquiteto`, `implementador` e `auditor` (P09).
