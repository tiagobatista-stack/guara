# Vistoria da demanda de campo (15/11/2026)

**Pedido do responsável:** na ficha, se a demanda é de campo, informar a data da vistoria ou marcar "vistoria em aberto", para ver no calendário quando será atendida e saber quem ainda não foi encaixado. Calendário e mapa ficam para etapas futuras. **Base:** `main` (`dbc5396`).

| Mudança | Arquivo |
|---|---|
| Tipo `Vistoria` e campos opcionais (`vistoria?: { data? }`; na entrada `vistoria` e `vistoriaData`), sem migração, `versao: 1` mantido | `aplicacao/src/modulos/demandas/modelo.ts` |
| Situação (agendada, aberta, não informada), lista de campo sem data e texto | `demandas/vistoria.ts` (novo) |
| Regra: tipo campo exige data válida ou "em aberto"; fora do campo a vistoria é descartada; edição, `paraEntrada`, filtro e `ehDemandaValida` | `demandas/regras.ts` |
| "Falta: vistoria" só quando nunca foi informada (demandas antigas de campo) | `demandas/essenciais.ts` |
| Bloco "Vistoria" no formulário (só tipo campo), linha no detalhe e na lista, filtro "Vistoria" | `FormularioDemanda.tsx`, `Demandas.tsx` |
| Aviso no Painel: "N demandas de campo ainda não foram encaixadas" | `painel/Painel.tsx` |
| Modelo documentado e ideia do calendário e do mapa | `planejamento/PLANO.md`, `gestao/BACKLOG.md` |

## Decisões
- Objeto sem `data` = em aberto; ausente = não informada (demandas antigas). Só as duas últimas entram na lista de "sem vistoria".
- Fora da tela compartilhada e do MCP (a lista branca não mudou). Vai no backup JSON.
- "Atendida" para o mapa será derivada, sem campo novo.

## Testes (Plan–Act–Verify)
| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Testes | `npm test` (aplicacao) | 402/402 em 37 arquivos (eram 385; 17 novos) | PASSOU |
| 2 | Build | `npm run build` | ok | PASSOU |
| 3 | MCP | `node testar-servidor.ts` | total 4 = 4 | PASSOU |
| 4 | Ajustados 3 testes antigos que criavam demanda de campo sem vistoria (agora exigida) | — | — | PASSOU |
| 5 | Telas no navegador | — | — | NÃO CONFERIDO VISUALMENTE |

## Limitações
Calendário e mapa não existem ainda. Editar demanda de campo antiga obriga a escolher a vistoria. Node do ambiente local. Não publicado.
