# Evidência — MCP reativado no Node 26 (P10, 14/11/2026)

**Pedido do responsável:** "finalizar o servidor mcp", esclarecido como concluir o item 1 do BACKLOG ("Reativar o MCP (P10)").

## Dados

O responsável exportou `guara-dados.json` pela tela Alertas e o salvou em `servidor-mcp/dados/` (pasta não versionada: `.gitignore:29`). Conferência do arquivo: `formato: guara-dados`, `versao: 1`, `ficticio: true`, exportado em `2026-11-14T21:37:42.817Z`, 4 demandas `DEM-FIC-0001` a `DEM-FIC-0004`, uma em cada status.

## Verificações

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Cliente MCP real (stdio) chamando as 3 ferramentas | `node servidor-mcp/testar-servidor.ts` (Node v26.13.1) | 3 ferramentas `readOnly=true`; `resumir_demandas` total 4; `listar_inativas` 2 (`DEM-FIC-0002`, `DEM-FIC-0003`); filtro por status 1; `limite=1000` recusado (`isError = true`); "MCP total=4 · JSON no disco=4 · COINCIDEM" | PASSOU |
| 2 | Chamada real pelo Claude Code: `resumir_demandas` | ferramenta `mcp__guara-dados__resumir_demandas` nesta sessão | total 4; por status 1/1/1/1; por prioridade Alta 2, Média 1, Baixa 1; `ficticio: true` | PASSOU |
| 3 | Chamada real pelo Claude Code: `listar_inativas` | ferramenta `mcp__guara-dados__listar_inativas` (limiar do arquivo, 3 dias) | 2 inativas: `DEM-FIC-0002` (13 dias) e `DEM-FIC-0003` (11 dias), mesma regra do app | PASSOU |
| 4 | Tela `/mcp` do Claude Code | — | comando de interface, só o responsável pode abrir | NÃO TESTADO |

## Reexportação (18:49)

O responsável exportou de novo (`exportadoEm` `2026-11-14T22:49:14.423Z`, 4 demandas fictícias, agora com o processo `FIC-` no campo próprio). `testar-servidor.ts`: 4 = 4, COINCIDEM. Chamada real de `resumir_demandas` nesta sessão: total 4, Em Validação 2, A Fazer 1, Concluída 1, exportadoEm 22:49 — o servidor lê o arquivo novo sem reiniciar. **PASSOU.**

## Limitações

- O servidor aceita os campos novos do dia (bloqueio, três números, tipo e natureza), mas as ferramentas não os mostram.
- O processo do servidor desta sessão subiu às 17:40 e usa o código carregado naquela hora; o teste do item 1 usou o código atual.
- O MCP não sincroniza sozinho: depois de mudar dados no app, é preciso exportar de novo.
