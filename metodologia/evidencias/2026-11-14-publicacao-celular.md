# Evidência — publicação do mascote no celular e da correção da conversa (14/11/2026)

**Contexto:** o responsável fez o push da `main` até `d0c7b2d` (`b494cb9` mascote no celular e no tablet; `d0c7b2d` conversa no celular). O hook bloqueia o push feito pelo Claude.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Push | `git status -sb` | `main` igual a `origin/main` | PASSOU |
| 2 | Deploy na Vercel | `curl https://guara-lemon.vercel.app/` | `assets/index-CCt-fixf.js`, o mesmo bundle do build local | PASSOU |
| 3 | Código novo no JS publicado | `curl` do bundle + `grep` | `scrollIntoView` e "Abrir assistente: " presentes | PASSOU |
| 4 | CSS da gaveta publicado | `curl` do CSS + `grep` | `.gaveta .assistente{flex:1;height:auto;min-height:0}` presente | PASSOU |

## Limitações

- O estado do deploy não foi consultado pela API da Vercel; a conferência foi pela URL pública.
- **No celular: NÃO CONFERIDO VISUALMENTE** (última fala e campo de digitar visíveis; rosto no botão flutuante).
