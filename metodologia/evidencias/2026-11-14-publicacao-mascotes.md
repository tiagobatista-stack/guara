# Evidência — publicação dos mascotes (14/11/2026)

**Contexto:** o responsável fez o push da `main` até `e9db6dc` (mascotes: etapas 1 a 3, avaliação de UX, feriados locais, evidência do MCP e BACKLOG). O hook bloqueia o push feito pelo Claude.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Push | `git status -sb`; `git log origin/main` | `main` igual a `origin/main` = `e9db6dc` | PASSOU |
| 2 | Build local do mesmo commit | `npm run build` | `✓ built`, bundle `index-CoUyrRiP.js` | PASSOU |
| 3 | Deploy na Vercel | `curl https://guara-lemon.vercel.app/` | `assets/index-CoUyrRiP.js`, o mesmo bundle do build local | PASSOU |
| 4 | Função nova no bundle publicado | `curl` do bundle + `grep` | `guara:mascote:v1` e `mascote--comemorando` presentes | PASSOU |

## Limitações

- `git fetch` falhou nesta máquina ("Repository not found", conta ativa do `gh` sem acesso); o `origin/main` local foi atualizado pelo push do responsável.
- O estado do deploy não foi consultado pela API da Vercel; a conferência foi pela URL pública.
- **Telas no navegador: NÃO CONFERIDO VISUALMENTE.**
