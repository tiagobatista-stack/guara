# Evidência — P09: padrões A, D, E e F com os subagentes registrados (19/11/2026)

Sessão aberta em `F:\claude\guara` (branch `operacoes-campo`). Os agentes `arquiteto`, `auditor` e `implementador` aparecem como tipos registrados da ferramenta `Agent` (`.claude/agents/`). **Diferença em relação a 13/11** (`2026-11-13-p09-orquestracao.md`): naquela rodada, o fluxo foi alternativo (`general-purpose` lendo o arquivo do papel). Desta vez, cada chamada usou `subagent_type` com o nome do agente registrado. Os padrões B e C foram registrados depois do commit `bbb4ece` (ver "B e C" abaixo).

## Registro por padrão

| Padrão | Agente | Entrada | Saída | Evidência | Status |
|---|---|---|---|---|---|
| A. Delegação simples | `arquiteto` | Riscos do módulo `aplicacao/src/modulos/operacoes/`, só leitura, priorizados, com arquivo e linha | 3 ALTO, 5 MÉDIO, 9 BAIXO e 3 candidatos pequenos (B1 a B3) | Chamada `Agent(subagent_type: "arquiteto")` observada. O agente rodou em segundo plano (cerca de 225 s, 28 ferramentas) e terminou com notificação de conclusão. Ferramentas do agente: Read, Glob e Grep. Não alterou arquivos | DEMONSTRADO |
| D. Paralelo | `arquiteto` e `auditor` | arquiteto: importação e exportação da planilha da SEMA. auditor: afirmações do STATUS (49h a 49k) e evidências de 19/11, podendo rodar `npm test` | arquiteto: 1 ALTO, 5 MÉDIO e 6 BAIXO, além de lacunas de teste e 2 candidatos. auditor: tabela com 9 afirmações (4 comprovadas, 4 parciais e 1 reprovada) e `npm test` 527/527 | As duas chamadas saíram na **mesma mensagem**. Os registros de transcrição dos dois foram criados às 19:59:07,869 e 19:59:07,870 (1 ms de diferença). O auditor terminou (cerca de 71 s) enquanto o arquiteto D continuava (cerca de 224 s). A captura `2026-11-19-orquestracao-disparo.png` mostra "2 background agents launched" e "Waiting for 3 background agents to finish" | DEMONSTRADO |
| E. Supervisor/agregador | Claude principal | Os 3 relatórios | Consolidação, divergências (abaixo) e escolha do risco B1/2.3 | Conferência no código (`importar-csv.ts:62`, `:67` e `:189`) e no git (`git status`, `merge-base`) | DEMONSTRADO |
| F. Gate de qualidade | Claude principal → `implementador` | Gate antes da correção. Depois, corrigir B1 com teste que falhe antes | Correção em `importar-csv.ts` e teste novo em `planilha.test.ts` | **Gate antes:** `npm test` 44 arquivos, 527/527, e `npm run build` ok (`built in 224ms`). Chamada `Agent(subagent_type: "implementador")` observada (cerca de 73 s). **Falha antes, reproduzida pelo Claude principal** com o `importar-csv.ts` do HEAD e o teste novo: `Tests 1 failed \| 9 passed (10)`. **Depois:** `10 passed (10)`. **Gate depois:** `npm test` 44 arquivos, 528/528, e `npm run build` ok (`built in 160ms`) | DEMONSTRADO |

| B. Sequencial | `arquiteto` → `implementador` | O arquiteto do padrão A recomendou B1 (candidato 1, com o teste sugerido), e o implementador corrigiu no F | Correção de `bbb4ece` | A recomendação está no relatório A e coincide com o 2.3 do arquiteto D. A correção veio da chamada `Agent(subagent_type: "implementador")` do F, que falha antes e passa depois | DEMONSTRADO |
| C. Revisor independente | `auditor` (não produziu a correção) | Revisar `bbb4ece` (`importar-csv.ts` e `planilha.test.ts`), rodar `npm test` e `npm run build`, sem editar arquivos, e avaliar as linhas em branco antes do cabeçalho | **APROVADO COM RESSALVAS** | Chamada `Agent(subagent_type: "auditor")` observada (cerca de 123 s). O auditor reproduziu a falha numa cópia de `bbb4ece~1` (`git archive`), fora do repositório: `Tests 1 failed \| 9 passed (10)`, `actual [2] expected [3]`. Com o código novo, o teste passou. Uma sonda com 11 casos (`\n`, `\r\n`, `\r`, aspas com cada quebra, `""`, BOM, sem quebra no fim) deu o número esperado em todos. `npm test` 44 arquivos, 528/528. `npm run build` ok (`built in 158ms`). `git status --short` saiu vazio, sem edição no repositório. Já havia uma demonstração anterior do C com o `auditor` registrado em 13/11 (item 4 do STATUS: riscos 3b, 3c, C e D) | DEMONSTRADO |

## C. Resultado da revisão independente (bbb4ece)

**Itens avaliados:**

| Item | Resultado |
|---|---|
| 1. Mudança mínima e `lerCsv` com a mesma assinatura e o mesmo resultado | APROVADO. 13 casos iguais à versão antiga. `lerCsv` não tem quem a chame |
| 2. O teste exercita o defeito (falha antes, passa depois) | APROVADO |
| 3. Contagem de linhas físicas (`\n`, `\r\n`, `\r`, quebras dentro de aspas, `""`, BOM, fim do arquivo) | APROVADO |
| 4. Linhas em branco antes do cabeçalho | RESSALVA, não é defeito. `'\n\nCOORD_X;COORD_Y\n58 W;abc'` dá **[4]**, a linha que a pessoa vê no editor. O comentário de `LinhaImportada.linha` ("cabeçalho = 1", `importar-csv.ts:96`) fica inexato nesse caso |
| 5. `npm test` e `npm run build` | APROVADO (528/528, build ok) |

**Ressalvas em aberto:**
- **R1 (documentação):** trocar o comentário de `LinhaImportada.linha` por "Linha física no arquivo (a primeira = 1)".
- **R2 (defeito antigo, fora do `bbb4ece`):** com linhas em branco antes do cabeçalho, a detecção do separador olha uma linha vazia e cai no `;`. Por isso `'\n\nCOORD_X,COORD_Y\n58 W,abc'` dá "Não achei as colunas de coordenada", tanto no código antigo quanto no novo.
- **R3 (cobertura):** os casos `\r` sozinho, aspas com CRLF, `""` e linhas antes do cabeçalho passaram na sonda do auditor, mas não ficaram como teste no repositório.

### R1 e R3 tratados (19/11/2026, depois de `dbe46de`)

- **R1:** o comentário de `LinhaImportada.linha` (`importar-csv.ts:96`) passou a dizer "Linha física no arquivo em que o registro começa (a primeira = 1; é o cabeçalho, se nada vier antes dele)". **PASSOU** (só documentação; o build confere o tipo).
- **R3:** os 11 casos da sonda do auditor, mais o caso de linhas em branco antes do cabeçalho, viraram 12 testes em `planilha.test.ts` (`casosDeLinha`).
  - **Com o código atual:** `planilha.test.ts` deu `Tests 22 passed (22)`.
  - **Com o `importar-csv.ts` de `bbb4ece~1`** (troca temporária, depois restaurada): `Tests 11 failed | 11 passed (22)`. Os 10 casos novos falham. Também falha o teste do F. Os 2 de fim de arquivo ("sem quebra no fim" e "quebras sobrando no fim") passam antes e depois, porque ali não há linha vazia antes do dado; ficam como proteção contra regressão.
  - **Suíte e build:** `npm test` 44 arquivos, **540/540**. `npm run build` ok (`built in 161ms`). **PASSOU.**
- **R2** (detecção do separador com linhas em branco antes do cabeçalho, defeito antigo): corrigido depois. Ver "R2 corrigido" abaixo.

## E. Consolidação

**Convergências:**
- **Números de ponto repetidos.** A (M1) e D (2.6) apontam que `incluirPontos` não recusa números repetidos e que a reimportação casa pelo primeiro ponto (`reimportar.ts:101`).
- **Número da linha errado.** A (B1) e D (2.3) apontam que, com linhas vazias, "Linha N" sai errado.
- **Nomes com " e " divididos.** A (B2) e D (2.4) apontam a divisão de nomes por " e ".
- **Gravação em duas etapas.** A (M5) e D (2.10) apontam a gravação em duas etapas na importação.
- **STATUS desatualizado.** O arquiteto A (B9) e o auditor indicam que os itens 49h a 49j ainda dizem "Não commitado nem publicado", mas o git mostra `cfb32d5` como ancestral de `origin/main` (`git merge-base --is-ancestor` verdadeiro).

**Divergências e conflitos:**
1. **Prioridade do ALTO.** Cada relatório põe um risco diferente como ALTO: A prioriza a perda de operação inválida (A1), e D prioriza o resultado gravado no ponto errado quando só o número casa (2.1). Os dois não se contradizem, porque são riscos diferentes, mas o A não registrou 2.1 e o D não avaliou A1, por estar fora do escopo dele.
2. **Dados fictícios nos testes.** A afirma que os testes usam protocolos sem `FIC-` (`'SEMA-PRO-2026/0001'`, `'SISTEMA-1'`, `'PLANILHA-2'`) e o setor `DUDJUINA`. D diz que os testes usam "protocolos FIC-…" e, ao mesmo tempo, cita `SISTEMA-1` e `PLANILHA-2` sem o prefixo. A leitura correta é a do A: há protocolos com e sem o prefixo. Fica para o responsável decidir (seção 12).
3. **`npm test` do 49k.** O STATUS e `2026-11-15-etapa3-planilha-sema.md` dizem NÃO TESTADO. O auditor executou e obteve 527/527, e o gate F confirmou o mesmo número antes da correção. O build também passou no gate F.
4. **Plugin "nada instalado".** O auditor classifica como PARCIAL, porque a captura mostra só a aba Discover, sem a aba Installed. O arquiteto não tratou desse ponto.
5. **Estado do git.** O instantâneo de início de sessão dizia "clean", mas o auditor viu mudanças pendentes, e `git status` confirmou: STATUS.md modificado e arquivos `2026-11-19-*` fora do controle de versão. O responsável informou que essas mudanças são legítimas, de outra sessão, e devem entrar no commit.

**Risco escolhido:** B1/2.3, o número da linha. É pequeno (só a mensagem), real (confirmado em `importar-csv.ts:62`, `:67` e `:189`), de baixo impacto e com teste determinístico.

**Rejeitados:**
- B2 muda uma regra de negócio ("Fulano e Beltrana") e pede decisão do responsável.
- B3 só falha com o fuso fixado.
- Os riscos ALTO e MÉDIO não são pequenos.

## F. Correção aceita

- `aplicacao/src/modulos/operacoes/importar-csv.ts`:
  - a função interna `lerRegistros` devolve `{ linha, celulas }`, em que `linha` é a linha física onde o registro começa, contando as linhas vazias descartadas e as quebras dentro de aspas;
  - `lerCsv` mantém a assinatura;
  - `importarPontosCsv` usa `registros[i + 1].linha` em vez de `i + 2`.
- `aplicacao/src/modulos/operacoes/planilha.test.ts`: o teste "número da linha" cobre 3 casos (`;` vazio → 3, CRLF em branco → 4, aspas com quebra → [2, 5]).

## Limitações

- **Linhas em branco antes do cabeçalho:** o número continua sendo o da linha física, e o cabeçalho deixa de ser a 1. O comentário de `LinhaImportada.linha` ("cabeçalho = 1") não foi alterado.
- **Ressalvas R1 a R3 do auditor:** ver acima.
- **Riscos em aberto:**
  - ALTO: A1, A2, A3 e 2.1;
  - MÉDIO: M1 a M5 e 2.2 a 2.6;
  - dados fictícios nos testes (M2).
- **Tela:** a correção não foi conferida no navegador (NÃO TESTADO).

## Integração com a `origin/main` (19/11/2026)

- **Merge:** `git fetch origin` e `git merge origin/main` em `operacoes-campo`. A `main` estava 26 commits à frente da base da branch: PR #2, Roteiro, mapa, agenda e POP.
- **Conflito:** só em `importar-csv.ts`, na linha `return` de `importarPontosCsv`. Ficaram as duas mudanças: o número da linha física (`registros[i + 1].linha`), desta branch, e os campos `resultado` e `mes`, da `main`.
- **Dependências:**
  - O 1º `npm ci` falhou com `EPERM` no `rolldown-binding.win32-x64-msvc.node`. O arquivo estava preso pelo `npm run dev` aberto desde as 19:25.
  - Com autorização do responsável, o dev server foi encerrado (o servidor MCP não foi tocado).
  - O 2º `npm ci` passou, com 0 vulnerabilidades.
- **Gate:** `npm test` deu **58 arquivos, 672/672** (os 659 da `main` mais os 13 desta branch), e `npm run build` passou (`built in 229ms`). **PASSOU.**

## Publicação (19/11/2026)

- **Push e PR:** o responsável fez o push de `operacoes-campo` (`8df58f2`) e mesclou a PR #3 na `main` (`3666d55`, em 2026-11-20T01:09:09Z). `git merge-base --is-ancestor 8df58f2 origin/main` deu verdadeiro, e `git diff 8df58f2 origin/main` saiu vazio.
- **Vercel:** o status do commit `3666d55` é `success`.
- **URL pública:** `curl https://guara-lemon.vercel.app/` deu HTTP 200. O `index.html` público referencia `assets/index-BFR3kueV.js` e `assets/index-B3S3-AIP.css`, os mesmos arquivos do `aplicacao/dist/index.html` gerado localmente na mesma árvore. O JS respondeu HTTP 200, com 562.442 bytes. **PASSOU** (a versão publicada é a final).
- **Roteiro funcional na URL pública** (cadastro, Kanban, F5 e Saúde do sistema): **PASSOU**, em `2026-11-19-roteiro-url-publica.md`. Feito no navegador integrado do app Claude, com ações por script e janela emulada. Cliques físicos e celular: **NÃO TESTADO**.

## R2 corrigido (19/11/2026, depois do merge com a `main`)

- **Defeito:** `lerRegistros` escolhia o separador pela primeira linha do texto (`texto.split(/\r?\n/, 1)[0]`).
  - Com linhas em branco antes do cabeçalho, essa linha era vazia e o separador caía no `;`. Um CSV com vírgula dava "Não achei as colunas de coordenada".
  - Com `\r` sozinho como quebra, a "primeira linha" era o arquivo inteiro, e vírgulas nos dados podiam vencer o `;` do cabeçalho.
- **Correção** (`importar-csv.ts`, 1 linha e 1 comentário): o separador sai da primeira linha com conteúdo, separando as linhas por `\r\n`, `\r` ou `\n`.
- **Testes novos** (`planilha.test.ts`):
  - "separador: linhas em branco antes do cabeçalho…": vírgula com `\n\n` antes, tabulação com CRLF e uma linha só de espaços antes, e `importarPontosCsv` sem `erro` e com linha 4;
  - "separador: com \r sozinho…".
- **Antes da correção:** `Tests 2 failed | 22 passed (24)`. Os dois testes novos falharam por `AssertionError` (deep-equal).
- **Depois:** `planilha.test.ts` 24/24. `npm test` **58 arquivos, 674/674**. `npm run build` ok (`built in 243ms`). **PASSOU.**
- **Limitação:** uma linha só de separadores (por exemplo `,,,`) antes do cabeçalho ainda é tratada como linha com conteúdo. Nesse caso, ela decide o separador e pode virar um registro. Isso não foi tratado aqui.
