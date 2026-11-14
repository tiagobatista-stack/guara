# Evidência — publicação dos campos essenciais (14/11/2026)

**Contexto:** o responsável fez o push da `main` com o commit `9254bf8` (campos essenciais, item 13). O hook bloqueia o push feito pelo Claude.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Testes e build antes do push | `npm test`, `npm run build` | `Tests 216 passed (216)`; `✓ built`, bundle `index-BkBp1oms.js` | PASSOU |
| 2 | Push | `git status -sb`; `git rev-parse --short origin/main` | `main` igual a `origin/main` = `9254bf8` | PASSOU |
| 3 | Deploy na Vercel | `curl https://guara-lemon.vercel.app/` a cada 15 s | primeiro ainda `index-BZCS2W7X.js` (deploy anterior); depois `assets/index-BkBp1oms.js`, o mesmo bundle do build local | PASSOU |
| 4 | Função nova no bundle publicado | `curl` do bundle + `grep` | "campos essenciais preenchidos" e "Faltando dados" presentes | PASSOU |

## Limitações

- O estado do deploy não foi consultado pela API da Vercel; a conferência foi pela URL pública.
- **Telas no navegador: NÃO CONFERIDO VISUALMENTE.**
- A branch `login-google` (`4df52c9`) continua só na máquina local e não foi publicada.
