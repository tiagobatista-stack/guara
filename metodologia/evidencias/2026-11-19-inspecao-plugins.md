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

## Complemento: aba Installed (19/11/2026, 21h24)

Captura: `2026-11-19-plugin-installed.png` (nesta pasta). Fecha a ressalva do `auditor`, que só tinha visto a aba Discover.

| Seção | Item | Tipo | Observação |
|---|---|---|---|
| Project | `guara-dados` | MCP | o servidor do projeto (`.mcp.json`) |
| User | `vercel` | Plugin | `claude-plugins-official`, 37 skills, "1 use"; escopo do **usuário**, não do projeto |
| Needs attention | `vercel` | MCP | do plugin acima; "1 to sign in", **não autenticado** |
| Built-in | `cc-plugin-agents-md`, `cc-plugin-diff`, `cc-plugin-plugin-authoring`, `cc-plugin-sec-default`, `cc-plugin-telemetry` | Plugin | embutidos no Claude Code |
| Skills (project) | `revisar-interface`, `testar-sistema`, `validar-pds` | Skill | as 3 skills do GUARÁ |
| Skills (claude.ai sync) | `docs`, `docx`, `pdf`, `pptx`, `xlsx` e outras | Skill | da conta, não do projeto |

### Correção do registro anterior

A frase "nada instalado" vale para **esta atividade e para o projeto**: nenhum plugin foi instalado em 19/11 e o GUARÁ não declara plugin. Porém **há um plugin de usuário instalado** (`vercel`), anterior a esta inspeção, além dos plugins embutidos. Ele não foi usado nesta atividade e seu MCP não está autenticado. O GUARÁ não depende dele: a publicação usa a integração GitHub → Vercel (`documentacao/implantacao.md`).

### Observação sobre o contador de uso

A tela mostra as 3 skills do projeto como "never used", embora o STATUS registre a invocação de `testar-sistema` em 13/11 (P08). O contador da tela não basta para contradizer nem para confirmar aquela evidência; a origem do número não foi investigada. **NÃO VERIFICADO.**

### Resultado

Inspeção de plugins: **PASSOU**, com a correção acima.
