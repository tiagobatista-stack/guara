# Evidência — publicação das ideias do TOCA (14/11/2026)

**Pedido do responsável:** "ao final faça o push". O hook do projeto bloqueou o `git push` feito pelo Claude (exige autorização humana), como previsto. O responsável fez o push pelo prompt.

## O que foi publicado

11 commits, de `3b97357` a `9e03ff8`:

- `3b97357` prazos em dias úteis; `c2a3f1c` apostila e CLAUDE.md; `6f8443f` BACKLOG;
- `7d108a7` tempo em andamento; `450f1a4` demanda travada; `e2bbe51` triagem sem prazo; `5e067a0` aviso de demanda parecida;
- `ac7e583` três números; `9293689` tipo e natureza; `3a389c2` tela compartilhada;
- `9e03ff8` "Create guara-dados.json": commit do responsável que versiona `dados-ficticios/guara-dados.json`. O arquivo é uma exportação marcada `"ficticio": true`, com processos `FIC-`.

## Verificações

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Testes antes do push | `npm test` | `Test Files 20 passed (20)` · `Tests 207 passed (207)` | PASSOU |
| 2 | Build antes do push | `npm run build` | `✓ built`; bundle `index-BZCS2W7X.js` | PASSOU |
| 3 | Hook antes do push | `python -m pytest -q testes/unidade/test_hook_verificar_comando.py` | `8 passed` | PASSOU |
| 4 | 1ª tentativa de push (responsável) | `git push origin main` | "Repository not found": a conta ativa do `gh` era `tbagro`, sem acesso ao repositório privado de `tiagobatista-stack` | FALHOU (resolvido) |
| 5 | Push (responsável) | `git push origin main` | `origin/main` = `9e03ff8` no repositório local | PASSOU |
| 6 | Deploy na Vercel | `curl https://guara-lemon.vercel.app/` | a página publicada carrega `assets/index-BZCS2W7X.js`, o mesmo bundle do build local | PASSOU |
| 7 | Funções novas no bundle publicado | `curl` do bundle + `grep` | "Tela compartilhada", "Marcar como travada", "Gravar prazo", "Criar mesmo assim" e "dígitos verificadores não conferem" presentes | PASSOU |

## Limitações

- O estado do deploy na Vercel e o repositório remoto não puderam ser consultados pela API: a conta ativa do `gh` voltou a ser `tbagro`, que recebe 404. A conferência foi pela URL pública.
- **Telas no navegador: NÃO CONFERIDO VISUALMENTE.** As oito entregas foram verificadas por testes no jsdom e pela presença no bundle publicado, não pelo uso na tela (celular, tablet, desktop e projetor).
