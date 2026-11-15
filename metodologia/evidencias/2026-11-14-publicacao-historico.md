# Evidência — publicação dos avisos reais, do detalhe do bloqueio e do histórico (14/11/2026)

**Contexto:** o responsável fez o push da `main` em duas vezes: até `58b6e44` (avisos reais no assistente e detalhe do bloqueio) e depois até `b0090e7` (histórico da demanda). O hook bloqueia o push feito pelo Claude.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Push até `58b6e44` | `git status -sb` | `main` 1 commit à frente de `origin/main` depois do commit `b0090e7` | PASSOU |
| 2 | Deploy de `58b6e44` | `curl https://guara-lemon.vercel.app/` | `assets/index-D0nqr30B.js`, o mesmo bundle do build local | PASSOU |
| 3 | Push até `b0090e7` | `git status -sb` | `main` igual a `origin/main` | PASSOU |
| 4 | Deploy de `b0090e7` | `curl https://guara-lemon.vercel.app/` | `assets/index-DNRKpTRc.js`, o mesmo bundle do build local | PASSOU |
| 5 | Função nova no bundle publicado | `curl` do bundle + `grep` | "bloqueio encerrado ao concluir" e "anterior ao histórico" presentes | PASSOU |

## Limitações

- O estado do deploy não foi consultado pela API da Vercel; a conferência foi pela URL pública.
- **Telas no navegador: NÃO CONFERIDO VISUALMENTE.**
