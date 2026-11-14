# Evidência — reverificação no Node 26 (14/11/2026)

**Motivo:** o responsável trocou o Node 22.17.1 pelo 26.13.1 (itens 1 a 3 do `gestao/BACKLOG.md`).

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Versões | `node -v`, `npm -v` | v26.13.1, 11.20.0 (≥ 22.22.2 pedido pelo `jsdom`) | PASSOU |
| 2 | Instalação limpa | `npm ci` em `aplicacao/` | 1ª tentativa: `EPERM` porque um `npm run dev` antigo prendia o binário do rolldown. O responsável encerrou o servidor. 2ª: `added 97 packages`, `found 0 vulnerabilities`, nenhum `EBADENGINE`; `package-lock.json` sem alteração | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 14 passed (14)` · `Tests 135 passed (135)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |
| 5 | Hook | `python -m unittest testes/unidade/test_hook_verificar_comando.py` | `Ran 8 tests` · `OK` | PASSOU |
| 6 | Dependências do MCP | `npm install` em `servidor-mcp/` | `found 0 vulnerabilities`; `package-lock.json` sem alteração | PASSOU |
| 7 | Servidor MCP no Node 26 | `node servidor-mcp/testar-servidor.ts` | lista as 3 ferramentas (`listar_demandas`, `resumir_demandas`, `listar_inativas`, todas `readOnly=true`); o erro `ERR_UNKNOWN_FILE_EXTENSION ".ts"` não ocorre mais. A consulta parou: falta `servidor-mcp/dados/guara-dados.json` (não versionado, P12) | PARCIAL |
| 8 | Chamada real de `resumir_demandas` pelo Claude Code | — | `guara-dados` desconectado nesta sessão (`CONNECTION_CLOSED`) | NÃO TESTADO |
| 9 | Servidor local | `npm run dev`, `curl http://localhost:5173/` | HTTP 200 | PASSOU |

## Limitações

- As telas de dias úteis continuam **NÃO CONFERIDAS VISUALMENTE**: não houve navegador automatizado nesta sessão.
- Os itens 7 e 8 dependem de o responsável exportar `guara-dados.json` pela tela Alertas e reiniciar a sessão.
