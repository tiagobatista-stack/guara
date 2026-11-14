# Evidência — tempo em andamento (14/11/2026)

**Pedido do responsável:** "implemente o item 7, tempo em andamento" (`gestao/BACKLOG.md`, ideias vindas do TOCA). A ideia vem do "▶ fazendo · há N d" da janela de tarefas do TOCA. A lógica foi reescrita, sem copiar código.

| Mudança | Arquivo |
|---|---|
| Regra pura `textoEmAndamento`: só para "Em Andamento"; "em andamento · última ação há N dias" (dias corridos inteiros, "há menos de 1 dia" abaixo de 24 h, nunca negativo) | `aplicacao/src/modulos/alertas/inatividade.ts` |
| Kanban: linha do andamento no cartão | `aplicacao/src/modulos/kanban/Kanban.tsx` |
| Demandas: item "Andamento" na lista e no detalhe | `aplicacao/src/modulos/demandas/Demandas.tsx` |

**Decisão de texto:** o modelo não guarda a data em que a demanda entrou em "Em Andamento". A contagem parte de `ultimaAcaoRelevante`, que também muda em qualquer edição de fato. Por isso, o texto diz "última ação há N dias" e não "em andamento há N dias", para não afirmar o que o dado não sustenta. O modelo e o formato `versao: 1` não mudaram.

**Filtro "em andamento":** o filtro de Status da tela Demandas já tem a opção "Em Andamento", então nada foi acrescentado.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 3 testes unitários novos (só "Em Andamento"; menos de 1 dia, 1 dia no singular, 4,9 dias = 4; ação no futuro não gera número negativo) | em `testes/unidade/metricas-inatividade.test.ts` | conferidos na suíte | PASSOU |
| 2 | 1 teste de componente: Kanban e Demandas com relógio fixo; "há 4 dias" na coluna e na lista; demanda em outro status sem a linha | em `Kanban.test.tsx` | conferido na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 14 passed (14)` · `Tests 139 passed (139)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

## Limitações

- O tempo conta desde a última ação relevante, não desde a entrada em "Em Andamento". Guardar essa data muda o modelo e depende das migrações versionadas do BACKLOG.
- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom).
- Os testes novos não foram executados contra o código anterior. A função não existia, então falhariam por ausência, e não por defeito.
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1.
