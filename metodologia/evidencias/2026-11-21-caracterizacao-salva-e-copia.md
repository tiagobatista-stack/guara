# Caracterização do dano: salva sozinha e cópia para o relatório (21/11/2026)

Branch `operacoes-campo`. Commits: 60e10df (item 12), 4eb1bde (item 13), f5cfab9 (setupFiles). Sem push nem PR.

## Verificação automática

| Verificação | Resultado |
|---|---|
| `npm test` completo (PowerShell e Git Bash, em `aplicacao/`) | PASSOU: 73 arquivos, 920 testes |
| `npm run build` | PASSOU (só o aviso normal de tamanho de chunk) |
| `npx tsc --noEmit` | PASSOU |

Cobertura automática do item 13 (`pop-supressao.test.tsx`): "Faltam A-7 e A-23. Copiar assim mesmo?" sem esses itens no texto; "Voltar" não copia; "Copiar assim mesmo" copia; lembrete de A-22 (A-12 "Outros recursos", A-21.1 "Outros (especificar…)"); aviso de coerência A-5/A-5.2; texto com e sem a seção "Dados de campo".

## Teste manual no ponto JUINA202610-01

NÃO TESTADO. Não há navegador nem Playwright neste ambiente. O roteiro abaixo fica para o responsável; a mesma sequência está coberta por teste de componente, mas teste de componente não substitui o clique real.

| Passo | Resultado esperado | Situação |
|---|---|---|
| Deixar A-7 e A-23 vazios e clicar em "Copiar texto para o relatório" | Aparece "Faltam A-7 e A-23. Copiar assim mesmo?" | NÃO TESTADO (manual) |
| Clicar em "Voltar" | A pergunta some e nada é copiado | NÃO TESTADO (manual) |
| Copiar de novo e clicar em "Copiar assim mesmo" | Texto copiado sem A-7 e A-23 e com a seção "Dados de campo" | NÃO TESTADO (manual) |

## Falha intermitente "Invalid Chai property: toBeInTheDocument"

Hipótese, não confirmada. Observado várias vezes nesta sessão e depois sumiu sem mudança de código. Fatos:

- Falhava também com as alterações guardadas (`git stash`), então não vem do item 12 nem do 13.
- No diagnóstico, `globalThis.expect` era diferente do `expect` importado de `vitest` no arquivo de setup (duas instâncias), então os matchers do jest-dom não chegavam ao `expect` dos testes.
- Não havia vitest em modo watch rodando. Os processos `claude.exe` e o `node servidor-mcp` não são vitest. Pode ter havido outra sessão do Claude Code rodando comandos no mesmo diretório; não foi confirmado.
- Mesmos comandos deram resultados diferentes em momentos diferentes (subconjuntos passando, suíte inteira falhando com 168 testes, depois 920/920 pelos dois shells).
- O STATUS já registra que o vitest no Windows às vezes encerra worker com "exit code 3221225477".
- Tornar o `setupFiles` independente do diretório (f5cfab9) não resolveu a falha enquanto ela ocorria; ficou como proteção, não como correção.

Se voltar: rodar `npm test` pelo PowerShell em `F:\claude\guara\aplicacao`, conferir processos `node` com vitest e repetir até 73 arquivos / 920 testes.
