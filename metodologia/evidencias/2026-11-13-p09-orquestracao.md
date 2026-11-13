# Evidência — P09: subagentes e padrões A–F (13/11/2026)

## Limitação registrada antes de tudo

A chamada `Agent(subagent_type: "arquiteto")` retornou `Agent type 'arquiteto' not found`. Os subagentes de `.claude/agents/` **não estão registrados nesta sessão**, porque ela foi aberta na pasta pai e o registro acontece na abertura. Portanto:

- **Invocação dos subagentes registrados `arquiteto`, `implementador` e `auditor`: NÃO DEMONSTRADO.** Para demonstrar, é preciso abrir uma nova sessão em `estagiario-digital-fofofauna/`.
- **Fluxo alternativo real, usado abaixo:** delegação de verdade (ferramenta `Agent`) a subagentes `general-purpose`, instruídos a ler e seguir o arquivo do papel (`.claude/agents/<papel>.md`). Cada resposta começa com "AGENTE: <papel>". **É uma delegação real, mas não é o subagente registrado.**

## Registro por padrão

| Padrão | Agente (entrada) | Saída resumida | Evidência | Situação |
|---|---|---|---|---|
| A. Delegação simples | arquiteto: "avaliar riscos do MVP, somente leitura" | 5 riscos priorizados (1 alto, 3 médios, 1 baixo) e 1 item pequeno para o implementador | relatório abaixo | DEMONSTRADO (alternativo) |
| D. Paralelo | arquiteto (arquitetura) e auditor (evidências), disparados na **mesma mensagem**, ambos somente leitura | os dois rodaram em segundo plano ao mesmo tempo (cerca de 42 s e 45 s) | duas notificações de conclusão independentes | DEMONSTRADO (alternativo) |
| B. Sequencial | arquiteto (item pequeno) → implementador: corrigir com teste | 1 linha em `Alertas.tsx` e teste novo; o teste **falhou antes** ("Expected 3, Received 10") e passou depois (5/5 na pasta) | relatório do implementador | DEMONSTRADO (alternativo) |
| C. Revisor independente | auditor (não produziu a correção) revisa diff, teste, suíte e build | APROVADO: mudança mínima em 2 arquivos; o teste exercita o defeito; rodou 76/76 e build ok. "Antes falhou" ficou NÃO VERIFICÁVEL por execução | relatório do auditor | DEMONSTRADO (alternativo) |
| E. Supervisor / agregador | Claude principal consolida arquiteto, auditor e implementador | conflitos resolvidos: STATUS reescrito (linhas contraditórias), "Restaurar exemplos" passou de PASSOU para PARCIAL, os 5 riscos do arquiteto ficaram em aberto no STATUS | `gestao/STATUS.md`, `ACEITE-MVP.md` | DEMONSTRADO |
| F. Gate de qualidade | commit só se `npm test` e `npm run build` passarem | ver o rodapé "Gate F" | saída registrada abaixo | DEMONSTRADO |

## Relatório do arquiteto (A/D), resumido

1. **ALTO:** `dados-portaveis.ts:64`. A importação marca `ficticio: true` mesmo quando o arquivo não traz a marca. Recomendação: recusar o arquivo se `ficticio !== true`.
2. **MÉDIO:** `armazem.ts:149-152`. Uma falha parcial na importação deixa as demandas trocadas, mas a mensagem diz "nada foi importado". Recomendação: restaurar o backup dentro do `catch`.
3. **MÉDIO:** `armazem.ts:59` e `:187`. O `salvar` e o acesso ao localStorage na inicialização ficam fora de try/catch (modo privado, cota cheia).
4. **MÉDIO:** não há sincronização entre abas (evento `storage`).
5. **BAIXO:** `ehDemandaValida` não confere os limites de tamanho na importação.

**Item pequeno:** `Alertas.tsx`. "Desfazer última importação" não atualiza o campo do limiar na tela.

## Relatório do auditor (D), resumido

- Rodou `npx vitest run`: 11/11 arquivos e 75/75 testes.
- Cenários 10, 12, 1 e 7: **APROVADO**, com duas ressalvas:
  - o cenário 10 muda o status direto no armazém, sem passar pelo Kanban;
  - no cenário 12, os 6 casos unitários só testam a validação; a prova de que os dados não mudam está em `Alertas.test.tsx`.
- Inconsistências apontadas no `gestao/STATUS.md`: linhas antigas ainda dizem "não executado" ou "40/40".
- Em `ACEITE-MVP.md`, "Restaurar exemplos" deveria estar como parcial.

## Gate F (executado pelo Claude principal antes dos commits)

| Comando | Saída | Situação |
|---|---|---|
| `npx vitest run` (em `aplicacao/`) | `Test Files 11 passed (11)` · `Tests 76 passed (76)` | PASSOU |
| `npm run build` | `✓ built in 522ms` | PASSOU |
| `python -m unittest testes/unidade/test_hook_verificar_comando.py` | `OK` (8 testes) | PASSOU |

O gate passou, então foi feito o commit: primeiro a correção do padrão B, separada; depois as demais mudanças da fase 6.
