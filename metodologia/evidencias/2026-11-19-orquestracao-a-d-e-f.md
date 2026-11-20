# Evidência — P09: padrões A, D, E e F com os subagentes registrados (19/11/2026)

Sessão aberta em `F:\claude\guara` (branch `operacoes-campo`). Os agentes `arquiteto`, `auditor` e `implementador` aparecem como tipos registrados da ferramenta `Agent` (`.claude/agents/`). **Diferença em relação a 13/11** (`2026-11-13-p09-orquestracao.md`): naquela rodada, o fluxo foi alternativo (`general-purpose` lendo o arquivo do papel). Desta vez, cada chamada usou `subagent_type` com o nome do agente registrado. Os padrões B e C não fizeram parte desta rodada.

## Registro por padrão

| Padrão | Agente | Entrada | Saída | Evidência | Status |
|---|---|---|---|---|---|
| A. Delegação simples | `arquiteto` | Riscos do módulo `aplicacao/src/modulos/operacoes/`, só leitura, priorizados, com arquivo e linha | 3 ALTO, 5 MÉDIO, 9 BAIXO e 3 candidatos pequenos (B1 a B3) | Chamada `Agent(subagent_type: "arquiteto")` observada. O agente rodou em segundo plano (cerca de 225 s, 28 ferramentas) e terminou com notificação de conclusão. Ferramentas do agente: Read, Glob e Grep. Não alterou arquivos | DEMONSTRADO |
| D. Paralelo | `arquiteto` e `auditor` | arquiteto: importação e exportação da planilha da SEMA. auditor: afirmações do STATUS (49h a 49k) e evidências de 19/11, podendo rodar `npm test` | arquiteto: 1 ALTO, 5 MÉDIO e 6 BAIXO, além de lacunas de teste e 2 candidatos. auditor: tabela com 9 afirmações (4 comprovadas, 4 parciais e 1 reprovada) e `npm test` 527/527 | As duas chamadas saíram na **mesma mensagem**. Os registros de transcrição dos dois foram criados às 19:59:07,869 e 19:59:07,870 (1 ms de diferença). O auditor terminou (cerca de 71 s) enquanto o arquiteto D continuava (cerca de 224 s). A captura `2026-11-19-orquestracao-disparo.png` mostra "2 background agents launched" e "Waiting for 3 background agents to finish" | DEMONSTRADO |
| E. Supervisor/agregador | Claude principal | Os 3 relatórios | Consolidação, divergências (abaixo) e escolha do risco B1/2.3 | Conferência no código (`importar-csv.ts:62`, `:67` e `:189`) e no git (`git status`, `merge-base`) | DEMONSTRADO |
| F. Gate de qualidade | Claude principal → `implementador` | Gate antes da correção. Depois, corrigir B1 com teste que falhe antes | Correção em `importar-csv.ts` e teste novo em `planilha.test.ts` | **Gate antes:** `npm test` 44 arquivos, 527/527, e `npm run build` ok (`built in 224ms`). Chamada `Agent(subagent_type: "implementador")` observada (cerca de 73 s). **Falha antes, reproduzida pelo Claude principal** com o `importar-csv.ts` do HEAD e o teste novo: `Tests 1 failed \| 9 passed (10)`. **Depois:** `10 passed (10)`. **Gate depois:** `npm test` 44 arquivos, 528/528, e `npm run build` ok (`built in 160ms`) | DEMONSTRADO |

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
- **Padrões B e C:** não fizeram parte desta rodada (o auditor não revisou a correção).
- **Riscos em aberto:**
  - ALTO: A1, A2, A3 e 2.1;
  - MÉDIO: M1 a M5 e 2.2 a 2.6;
  - dados fictícios nos testes (M2).
- **Tela:** a correção não foi conferida no navegador (NÃO TESTADO).
