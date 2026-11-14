# Evidência — prazos em dias úteis com feriados nacionais (14/11/2026)

**Pedido do responsável:** "implemente os itens 1 e 2", da comparação entre o GUARÁ e o TOCA (`F:\claude\toca`). Os dois itens, como foram oferecidos: o módulo de dias úteis com feriados e o texto do prazo ligado às telas.

A lógica foi **reescrita em TypeScript** a partir do TOCA (`feriados.py`, `judicial.py` e `prazo.py:somar_uteis`), sem copiar código Python nem dados. O TOCA está sob GPL-3; os commits dele são do mesmo autor do GUARÁ.

| Mudança | Arquivo |
|---|---|
| Regra pura: Páscoa, feriados nacionais (9 fixos, Sexta-feira Santa e, opcionalmente, Carnaval e Corpus Christi), ajuste local (`extras`, `remover`), `diasUteis`, `somarDiasUteis`, `situacaoPrazo` e `situacaoDaDemanda` | `aplicacao/src/modulos/alertas/dias-uteis.ts` (novo) |
| Dashboard: "vencida em 10/11/2026 (vencido há 3 dias úteis)" e linha do tempo com "faltam N dias úteis" | `aplicacao/src/modulos/painel/Painel.tsx` |
| Kanban: linha do prazo em cada cartão (vermelha quando vencido); prop `agora` para relógio controlado | `aplicacao/src/modulos/kanban/Kanban.tsx` |
| Demandas: "23/11/2026 · faltam 5 dias úteis" na lista e no detalhe; prop `agora` | `aplicacao/src/modulos/demandas/Demandas.tsx` |

**Regra preservada:** "vencida" continua sendo prazo anterior a hoje no fuso local (cenário 9 do `PLANO.md`). Os dias úteis só mudam o texto exibido. A habilidade `avaliar-prazos` do catálogo não foi alterada e continua contando dias corridos.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 11 testes unitários novos (Páscoa em 6 anos, feriados de 2026, ajuste local, contagem 13/11 → 23/11 = 5 pulando o 20/11, virada do ano, textos, fim de semana, fuso local) | `npx vitest run dias-uteis` | 1ª execução: 10 passaram, 1 falhou porque a função devolvia `-0`. A função foi corrigida (o teste não foi alterado). | PASSOU após correção |
| 2 | 1 teste de componente: Kanban, Dashboard e Demandas com relógio fixo em 13/11/2026 | em `Kanban.test.tsx` | texto e classe `texto--falha` conferidos; demanda concluída sem texto de prazo | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 14 passed (14)` · `Tests 135 passed (135)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

## Limitações

- Feriados estaduais e municipais: a função aceita `extras` e `remover`, mas **não há tela para configurá-los**. As telas usam só os feriados nacionais.
- Prazos judiciais têm regras próprias de contagem (suspensões, recesso forense). O texto do GUARÁ é um apoio e não substitui a contagem oficial.
- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom).
- Os testes novos não foram executados contra o código anterior. O módulo não existia, então o teste unitário falharia por ausência e não por defeito.
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v22.17.1, abaixo do pedido por `jsdom` 31 (`^22.22.2`). Houve aviso do npm, mas nenhuma falha.
