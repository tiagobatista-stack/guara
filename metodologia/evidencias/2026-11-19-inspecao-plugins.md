# Evidência: inspeção de plugins com `/plugin` (P11)

- **Data:** 19/11/2026
- **Quem executou:** responsável, no terminal do Claude Code aberto em `F:\claude\guara`
- **Comando:** `/plugin`
- **Captura:** `2026-11-19-tela-plugin.png` (nesta pasta)

## O que a tela mostrou

- Abas: **Discover**, **Installed**, **Marketplaces**, **Errors** e **Stats**.
- Aba Discover: 3844 plugins listados (Anthropic Directory 3777; claude-plugins-official 291).
- Primeiros itens: `frontend-design`, `Superpowers`, `code-review`, `context7` e `skill-creator`, todos **não selecionados** (`( )`).

## O que foi feito

Somente inspeção. **Nenhum plugin foi instalado nem autorizado**, conforme o Prompt 11 da apostila ("não instalar plugins sem autorização, e não depender deles para concluir a aula").

## Plugin, skill e MCP não são a mesma coisa

| Mecanismo | O que é | No GUARÁ |
|---|---|---|
| Skill | Procedimento reutilizável em `SKILL.md` | `.claude/skills/` (3 skills) |
| MCP | Interface de ferramentas e dados | `servidor-mcp/`, registrado em `.mcp.json` |
| Plugin | **Pacote** que pode reunir skills, agentes, hooks e servidores MCP para distribuição | nenhum instalado; a lista acima mostra pacotes como `skill-creator` (contém skills) e `context7` (contém um servidor MCP) |

O GUARÁ não depende de plugin para funcionar.

## Resultado

**PASSOU** (inspeção). A tela `/mcp` também listou o MCP embutido `plugin:vercel:vercel` como "needs authentication"; ele não foi autenticado nem usado (`2026-11-19-tela-mcp.md`).
