# Evidência — campos essenciais (14/11/2026)

**Pedido do responsável:** "implemente o item 13, campos essenciais" (`gestao/BACKLOG.md`, ideias vindas do TOCA). A ideia vem de `perguntas.py` do TOCA. A lógica foi reescrita, sem copiar código. Feito na **`main`** (o item não depende do login; a branch `login-google` não foi usada).

| Mudança | Arquivo |
|---|---|
| Regras puras: `essenciaisAplicaveis` (pela natureza), `camposQueFaltam` e `textoFalta` ("Falta: tipo, prazo.") | `aplicacao/src/modulos/demandas/essenciais.ts` (novo) |
| Filtro `preenchimento` (faltando dados ou completas) | `aplicacao/src/modulos/demandas/regras.ts` |
| Demandas: "Falta: …" na lista, "Preenchimento" no detalhe e filtro "Preenchimento" | `aplicacao/src/modulos/demandas/Demandas.tsx` |

## Regras

| Natureza | Campos essenciais |
|---|---|
| Tarefa comum | prazo, responsável |
| Demanda | tipo, prazo, responsável, processo administrativo |
| Não definida | natureza, tipo, prazo, responsável |

Concluída não cobra nada. Texto só com espaços conta como vazio. A lista mostra só o **nome** do campo, nunca o conteúdo (como no TOCA, onde dado pessoal não entra no "falta").

## Decisões

- **Só avisa.** Nenhum campo novo virou obrigatório: o cadastro continua aceitando a demanda incompleta.
- **Lista fixa no código**, sem tela para configurar. SIMP e processo judicial não são essenciais (nem toda demanda tem).
- O modelo não mudou.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 8 testes unitários novos: campos por natureza; demanda vazia; espaços contam como vazio; completa e comum completa; processo cobrado na demanda; concluída; só o nome do campo; filtro faltando e completas | em `testes/unidade/essenciais.test.ts` | conferidos na suíte | PASSOU |
| 2 | 1 teste de tela: "Falta" na lista, filtro, detalhe "campos essenciais preenchidos" e sumiço ao completar | em `Demandas.test.tsx` | conferido na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 21 passed (21)` · `Tests 216 passed (216)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

**Incidente no ambiente:** ao voltar da branch `login-google` para a `main`, o `npm ci` falhou com `EPERM` porque um `npm run dev` aberto prendia um arquivo do Vite, e deixou `node_modules` incompleto. Com a autorização do responsável, os processos do servidor de desenvolvimento (9160 e 32988) foram encerrados e o `npm ci` foi refeito (0 vulnerabilidades). O servidor MCP (processo 20416) não foi tocado.

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom). A tela Demandas agora tem sete filtros: conferir no celular.
- O Kanban e a tela compartilhada não mostram o "Falta".
- Os testes novos não foram executados contra o código anterior. O módulo não existia, então falhariam por ausência, e não por defeito.
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1.
