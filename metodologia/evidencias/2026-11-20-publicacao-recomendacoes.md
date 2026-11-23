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

- O roteiro manual está na seção abaixo. **Pendentes:** teclado, celular, falha de armazenamento e o caso válido do assistente (sem resultado informado). DEM-FIC-0101 não foi executada.
- Celular: **NÃO TESTADO**. As telas foram vistas pelo responsável nos passos aprovados, no Firefox.
- O fluxo de agentes usa demandas fictícias do catálogo, não as do localStorage.
- **Pendente (decisão do responsável):** dados reais nos testes (`SEMA-PRO…`, `DUDJUINA`, planilha no histórico `80de2b7`). Citados pelo responsável; **não verificados nesta rodada**.
- Mudança de contrato do MCP (respostas em `{rastreio, resultado}`; `arquivo` saiu do corpo de `resumir_demandas`): quem consome deve ler `resultado`.
- O estado do Vercel veio do status do commit no GitHub; o painel do Vercel não foi aberto.

## Roteiro manual (20/11/2026)

Feito pelo responsável na URL pública, com o bundle `index-D807sqTy.js` (**antes** do deploy da correção da coluna de desenvolvimento, `8e6d766`). Método: Windows, Firefox, cliques físicos com mouse. Prints em `F:\claude\guara-prints6-11-20\`, fora do repositório (não copiados). O resultado é o relato do responsável; este agente não o reproduziu.

| # | Passo | Resultado |
|---|---|---|
| 1 | Cadastro de demanda | **PASSOU** |
| 2 | Kanban | **PASSOU** |
| 3 | F5 preserva os dados | **PASSOU** |
| 4 | Teclado | **NÃO TESTADO** |
| 5 | Saúde do sistema | **PASSOU** 10/10. Hook e MCP aparecem como NÃO TESTADO na tela por desenho (rodam fora do navegador; verificados no gate: hook 8/8, MCP 4 ferramentas) |
| 6 | Seletor do fluxo | **PASSOU**. DEM-FIC-0001: 8 etapas OK, gate liberou (`EXE-LOCAL-2026-11-20T18:01:41.115Z`; antes, `EXE-LOCAL-2026-11-20T17:50:21.833Z`, também liberou). DEM-FIC-0002: falha em `extrair-documento` ("sem documento fictício vinculado"), 3 etapas, gate bloqueou (`EXE-LOCAL-2026-11-20T18:06:09.086Z`). Duas entradas diferentes, cada trilha com os próprios dados e a falha bloqueando a liberação: critério de aceite do P1 atendido na URL pública. DEM-FIC-0101: **não executada** (desnecessária, segundo o responsável) |
| 7 | Assistente | Caso negado: **PASSOU** (sem demanda aberta, orienta abrir uma; método determinístico visível). Caso válido com DEM-FIC-0001 aberta: **sem resultado informado (NÃO TESTADO)** |
| 8 | Exportação em Alertas com bloco `origem` | **PASSOU** (`exportadoEm` 2026-11-20T17:47:36Z). O JSON exportado não vai para o repositório |
| 9 | Celular | **NÃO TESTADO** |
| 10 | Falha de armazenamento (Firefox, `dom.storage.enabled=false`) | **sem resultado informado (NÃO TESTADO)** |

**Observações do roteiro** (relato do responsável):
- Na primeira carga o seletor não apareceu: cache do Firefox; resolvido com Ctrl+Shift+R.
- Com DEM-FIC-0002, o Estado geral passou a FALHA embora 10/10 habilidades estivessem OK: o bloqueio esperado era tratado como falha do sistema. Corrigido em `2429d61` (Estado geral e Última verificação só de habilidades e agentes; resultado do fluxo à parte, com selo LIBERADO/BLOQUEADO; exceção real continua FALHA). Está só na branch `operacoes-campo`, **fora da `main`** e **não publicado**: conferir na URL depois do deploy.
- No caso bloqueado, "Revisor diferente do autor da minuta" aparece ✓ sem minuta (verdadeiro por vacuidade). **Observação registrada, sem correção nesta rodada.**
- Com DEM-FIC-0004, a coluna do produto dos padrões A–F mostrava FALHOU em A, B e E por causa do bloqueio esperado; corrigido neste commit. (Na URL pública: A, B e E FALHOU, C NÃO DEMONSTRADO, F DEMONSTRADO.) Agora A, B, C e E aparecem como NÃO EXERCIDO NESTA EXECUÇÃO, F continua DEMONSTRADO (bloqueou) e D continua NÃO DEMONSTRADO no modo local. FALHOU fica só para exceção real, ordem incorreta ou etapa que falhou por outro motivo. A não foi dado como DEMONSTRADO: a recusa por falta de documento é registrada pelo fluxo sem chamar a habilidade, então a implementação não distingue uma delegação validada.
- Os passos 7 (caso válido do assistente com DEM-FIC-0001 aberta) e 10 (falha de armazenamento) seguem **sem resultado informado (NÃO TESTADO)**.

**Achado do roteiro:** a coluna de desenvolvimento dos padrões A–F na Saúde do sistema ainda dizia NÃO DEMONSTRADO (sessão de 13/11), contradizendo o STATUS. Corrigida em `8e6d766` (A–F DEMONSTRADO conforme `2026-11-19-orquestracao-a-d-e-f.md`, com C = APROVADO COM RESSALVAS; coluna do produto inalterada, D continua NÃO DEMONSTRADO no modo local). 684/684 e build ok. O `8e6d766` está na branch no GitHub, mas **fora da `main`** e **não publicado**: o roteiro acima foi feito sem ele.
