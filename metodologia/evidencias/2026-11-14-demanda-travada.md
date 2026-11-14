# Evidência — demanda travada (14/11/2026)

**Pedido do responsável:** "implemente o item 6, demanda travada" (`gestao/BACKLOG.md`, ideias vindas do TOCA). A ideia vem de `travada_modulo.py` do TOCA. A lógica foi reescrita, sem copiar código.

| Mudança | Arquivo |
|---|---|
| Campo opcional `bloqueio: { motivo, desde }` e `MOTIVOS_BLOQUEIO` (falta documento, aguardando outro setor, depende de campo, outro motivo) | `aplicacao/src/modulos/demandas/modelo.ts` |
| Regras puras: `travarDemanda`, `destravarDemanda`, `confirmarBloqueio`; concluir remove o bloqueio; validação do bloqueio; filtro `bloqueio` | `aplicacao/src/modulos/demandas/regras.ts` |
| Armazém: `travar`, `destravar` e `confirmarBloqueio`, gravando antes de publicar | `aplicacao/src/modulos/demandas/armazem.ts` |
| Texto "⛔ travada há N dias úteis: motivo" (feriados nacionais) | `aplicacao/src/modulos/alertas/bloqueio.ts` (novo) |
| Demandas: no detalhe, motivo e botões "Marcar como travada", "Mudar motivo", "Ainda travada" e "Destravou"; linha na lista; filtro "Bloqueio" | `aplicacao/src/modulos/demandas/Demandas.tsx` |
| Kanban: linha do bloqueio no cartão (o cartão fica na mesma coluna) | `aplicacao/src/modulos/kanban/Kanban.tsx` |
| Alertas: demanda travada e inativa pergunta "Ela continua travada?" com "Ainda travada" e "Destravou" | `aplicacao/src/modulos/alertas/Alertas.tsx` |
| Modelo e regra 1 atualizados | `planejamento/PLANO.md` |

## Decisões

- **Sem migração e sem mudar `versao: 1`.** O campo é opcional e só acrescenta: dados antigos continuam válidos (há teste). O app publicado hoje lê dados com `bloqueio` e ignora o campo. Por isso as migrações versionadas não foram necessárias agora; continuam no BACKLOG para a primeira mudança que não for só um acréscimo.
- **Bloqueio não é status.** As 4 colunas do Kanban e os 12 cenários de aceite continuam iguais.
- **Só a categoria do motivo, sem texto livre.** Como no TOCA, texto livre pode conter nomes de pessoas. O detalhe pode ir na descrição.
- **Reavaliação pelo alerta de inatividade existente.** No TOCA, a demanda travada sai do alerta de inatividade e ganha uma pergunta a cada 3 dias úteis. Aqui, para não mudar a regra 3 do PLANO (cenário 10), a travada continua no alerta de inatividade, que passa a perguntar "Ela continua travada?". "Ainda travada" conta como ação relevante e tira o alerta até o próximo limiar. A regra 1 do PLANO foi ampliada para incluir travar, mudar o motivo, reavaliar e destravar.
- **Concluir remove o bloqueio**, e demanda concluída não pode ser travada.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 12 testes unitários novos: transições, "desde" mantido ao mudar motivo, concluída, texto em dias úteis (com o feriado de 20/11), dados antigos válidos, bloqueio malformado recusado (inclusive `toString` e `null`), importação `versao: 1`, filtro, persistência ao recarregar, edição que preserva o bloqueio, recusa sem gravar | em `testes/unidade/demanda-travada.test.ts` | conferidos na suíte | PASSOU |
| 2 | 4 testes de tela: travar, mudar motivo, filtrar e destravar em Demandas; concluída sem opção de travar; cartão do Kanban; "Ainda travada" e "Destravou" em Alertas | em `Demandas.test.tsx`, `Kanban.test.tsx` e `Alertas.test.tsx` | conferidos na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 15 passed (15)` · `Tests 155 passed (155)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom), inclusive o formulário de bloqueio em tela de celular.
- O MCP local (`servidor-mcp/consultas.ts`) não mostra o bloqueio em `listar_demandas`. A regra de inatividade dele não mudou.
- O Dashboard não tem contagem de travadas.
- O seletor de motivo do detalhe volta para o motivo atual só quando o detalhe é aberto pela lista.
- Os testes novos não foram executados contra o código anterior. As funções não existiam, então falhariam por ausência, e não por defeito.
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1.
