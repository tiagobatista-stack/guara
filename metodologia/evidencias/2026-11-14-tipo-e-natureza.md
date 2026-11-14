# Evidência — tipo campo × gabinete e demanda × tarefa comum (14/11/2026)

**Pedido do responsável:** "implemente o item 11, tipo campo × gabinete" (`gestao/BACKLOG.md`, ideias vindas do TOCA). O item inclui também demanda × tarefa comum. A ideia vem de `tipo.py` e `demanda.py` do TOCA. A lógica foi reescrita; as listas de palavras são uma seleção das do TOCA.

| Mudança | Arquivo |
|---|---|
| Regras puras: `palavraNoTitulo` (começo de palavra, sem acento nem maiúsculas, "$" = palavra inteira), `deduzirTipo`, `deduzirNatureza` e `textoPorque` | `aplicacao/src/modulos/demandas/classificacao.ts` (novo) |
| Campos opcionais `tipo` e `natureza` | `aplicacao/src/modulos/demandas/modelo.ts` |
| Validação, gravação, comparação na edição, "não definido" apaga o campo, filtros (inclusive "não definido") e validação do que está gravado | `aplicacao/src/modulos/demandas/regras.ts` |
| Formulário: "Tipo" e "Natureza". No cadastro, preenchidos pelo título enquanto a pessoa não escolhe, com o porquê ("Deduzido do título, pela palavra «Vistoria». Troque se estiver errado."). Na edição, só a sugestão com "Usar". Na dúvida, "Não deu para deduzir pelo título: escolha, se souber." | `aplicacao/src/modulos/demandas/FormularioDemanda.tsx` |
| Demandas: tipo e natureza no detalhe, "Classificação" na lista, filtros "Tipo" e "Natureza" | `aplicacao/src/modulos/demandas/Demandas.tsx` |
| Kanban: tipo e "tarefa comum" na linha do cartão | `aplicacao/src/modulos/kanban/Kanban.tsx` |
| Modelo atualizado | `planejamento/PLANO.md` |

## Regras (as do TOCA)

- **Tipo:** palavra de um só tipo decide. Com palavras dos dois tipos, uma palavra forte de gabinete (ofício, informação, esclarecimento, manifestação) vence; sem ela, fica a dúvida. Sem palavra, dúvida.
- **Natureza:** um dos três números decide "demanda". Palavra de tarefa comum (reunião, curso, ligar…) vence a de demanda ("Reunião sobre o embargo" é tarefa comum). Sem palavra, tipo campo é demanda; senão, dúvida.
- Com duas palavras do mesmo grupo, vale a primeira da lista, como no TOCA.

## Decisões

- **Sem migração e sem mudar `versao: 1`.** Campos opcionais, dados antigos válidos (há teste).
- **A pessoa decide.** A dedução é uma sugestão com o porquê à vista (transparência da IA, princípio 9). Depois que a pessoa escolhe, o título não muda mais a escolha. Na edição, nada muda sozinho.
- **Não são obrigatórios.** Na dúvida, o campo fica "não definido".
- **A natureza não muda métricas nem alertas.** Tarefas comuns continuam contando no Dashboard e nos alertas.
- As listas de palavras não são configuráveis pela tela.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 12 testes unitários novos: palavra no título (acento, maiúsculas, começo de palavra, "$"), tipo (um tipo, forte de gabinete, dúvida), natureza (número, tarefa comum vence, campo, dúvida), porquê, validação, dados antigos, edição e filtros | em `testes/unidade/classificacao.test.ts` | 1ª execução: 1 falhou porque o teste esperava "Redigir" em "Redigir minuta…", mas vale a primeira da lista ("minuta"), como no TOCA. O título do teste foi trocado por um com uma só palavra; a regra não mudou. | PASSOU após ajuste do teste |
| 2 | 4 testes de tela: dedução no cadastro com o porquê; escolha da pessoa não sobrescrita pelo título; dúvida pede a escolha; tarefa comum; na edição só a sugestão com "Usar"; filtro por tipo | em `Demandas.test.tsx` | 1ª execução: 1 falhou pelo mesmo motivo ("parecer" vem antes de "redigir"); o título do teste foi trocado | PASSOU após ajuste do teste |
| 3 | Suíte completa | `npm test` | `Test Files 19 passed (19)` · `Tests 201 passed (201)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

**Defeito achado antes dos testes:** na primeira versão, escolher o tipo à mão podia ser desfeito pela dedução, porque a marcação "escolhido" só valia no render seguinte. Foi corrigido antes de rodar os testes; o teste "a escolha da pessoa não é sobrescrita pelo título" cobre o caso, mas não foi executado contra a versão com defeito.

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom), inclusive os dois filtros novos em tela de celular (agora são seis filtros).
- Listas de palavras fixas no código; sem tela para configurar.
- Os exemplos fictícios não têm tipo nem natureza.
- O MCP local não mostra tipo nem natureza.
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1.
