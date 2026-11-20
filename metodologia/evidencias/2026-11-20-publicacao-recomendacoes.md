# Publicação das recomendações do relatório (20/11/2026)

Dados fictícios. Autorização do responsável nesta tarefa: push da `operacoes-campo`, PR, merge e deploy. Sem force-push, rebase, reescrita de histórico nem mudança de configuração do Vercel ou do GitHub.

## Resultado

| Item | Estado |
|---|---|
| Gate antes do push (HEAD `2fd98ad`, árvore limpa, `git fetch`) | **PASSOU**: `npm test` 684/684 (59 arquivos), build ok, hook 8/8, MCP 4 ferramentas (válido, falha e negado OK; aviso de idade 138,6 h; total MCP 4 = JSON 4) |
| Commit do STATUS | `5553c9a` "Registra o commit 2fd98ad na linha 49ae do STATUS" |
| Push de `operacoes-campo` | Feito pelo responsável (o hook bloqueia o push do Claude); `origin/operacoes-campo` = `5553c9a` |
| PR | #7 https://github.com/tiagobatista-stack/guara/pull/7 (descrição com a mudança de contrato do MCP em destaque) |
| Verificações da PR | Vercel e Vercel Preview Comments: **pass**. `mergeable` ficou `UNKNOWN` na API durante toda a espera; `git merge-tree` local entre a branch e `origin/main` não acusou conflito |
| Merge | PR #7 **MERGED** às 17:29:59Z, com merge commit, pela conta `tiagobatista-stack`; **SHA na `main`: `b6970c5`**. Ao rodar `gh pr merge 7 --merge` a PR já constava mesclada; o merge não foi feito por este agente |
| Deploy do Vercel (`main` `b6970c5`) | status do commit: `success`, "Deployment has completed" |
| Bundles servidos por https://guara-lemon.vercel.app | `index-D807sqTy.js` e `index-B3S3-AIP.css` |
| Bundles de um build local da mesma árvore (`aplicacao/`) | `index-D807sqTy.js` e `index-B3S3-AIP.css` |
| Comparação | **IGUAIS**. `git diff 5553c9a b6970c5` vazio (mesma árvore que a branch) |

Antes desta rodada a URL servia `index-BFAzjbW4.js` (`b800374`, registro do R2 em `2026-11-19-roteiro-url-publica.md`).

## Limitações e pendências

- Roteiro de uso na URL pública **NÃO REPETIDO** nesta rodada, por pedido do responsável. **Pendente:** roteiro manual (teclado, celular, falha de armazenamento), com cliques físicos.
- Telas e celular: **NÃO CONFERIDO VISUALMENTE**.
- O fluxo de agentes usa demandas fictícias do catálogo, não as do localStorage.
- **Pendente (decisão do responsável):** dados reais nos testes (`SEMA-PRO…`, `DUDJUINA`, planilha no histórico `80de2b7`). Citados pelo responsável; **não verificados nesta rodada**.
- Mudança de contrato do MCP (respostas em `{rastreio, resultado}`; `arquivo` saiu do corpo de `resumir_demandas`): quem consome deve ler `resultado`.
- O estado do Vercel veio do status do commit no GitHub; o painel do Vercel não foi aberto.
