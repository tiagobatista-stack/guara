# Evidência — servidor MCP voltou a carregar (14/11/2026)

**Achado durante a coordenada da demanda:** `node servidor-mcp/testar-servidor.ts` falhava com `ERR_UNKNOWN_FILE_EXTENSION: Unknown file extension ".tsx" for …/compartilhado/Mascote.tsx`.

**Causa:** desde `4b6fd96` (preferências do mascote no backup), `dados-portaveis.ts` importa `preferencias-mascote.ts`, que importava `MASCOTES` de `Mascote.tsx`. O servidor MCP roda no Node, que carrega `.ts` mas não `.tsx`. Conferido no `HEAD` (`7862e30`): a cadeia de imports já estava lá, sem relação com as mudanças da coordenada. O MCP estava quebrado desde então, sem que nenhum teste da suíte do app acusasse.

| Mudança | Arquivo |
|---|---|
| `EspecieMascote` e `MASCOTES` passam para um arquivo TypeScript puro | `aplicacao/src/compartilhado/especies-mascote.ts` (novo) |
| `Mascote.tsx` reexporta os dois (quem importava de lá continua igual) | `aplicacao/src/compartilhado/Mascote.tsx` |
| `preferencias-mascote.ts` importa do arquivo puro | `aplicacao/src/compartilhado/preferencias-mascote.ts` |

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Servidor MCP antes | `node servidor-mcp/testar-servidor.ts` | `ERR_UNKNOWN_FILE_EXTENSION ".tsx"` | FALHOU |
| 2 | Servidor MCP depois | `node servidor-mcp/testar-servidor.ts` | 3 ferramentas `readOnly=true`; "MCP total=4 · JSON no disco=4 · COINCIDEM" | PASSOU |
| 3 | Suíte e build | `npm test`, `npm run build` | `Tests 356 passed (356)`; `✓ built` | PASSOU |

## Limitações

- O teste do MCP não faz parte do `npm test`; por isso a quebra passou despercebida. Vale incluir uma checagem de carga do servidor na suíte ou no gate.
- Tela `/mcp` do Claude Code: NÃO TESTADO.

## Incidente no caminho (sem perda)

Para confirmar que o defeito não vinha das mudanças em andamento, foi usado `git stash push -u`. A pasta `.venv` (não ignorada pelo `.gitignore`) entrou no stash, a remoção falhou e o `pop` também. Conferido em seguida: os arquivos rastreados eram idênticos ao stash, os dois arquivos novos da coordenada também, e todos os 1399 arquivos da `.venv` guardados no stash existiam no disco (2660 no total). O stash redundante foi descartado. Sugestão: pôr `.venv/` no `.gitignore`.
