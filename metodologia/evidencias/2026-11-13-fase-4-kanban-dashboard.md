# Evidências — Fase 4: Kanban e Dashboard (P05), 13/11/2026

## Arquivos

- `aplicacao/src/modulos/kanban/Kanban.tsx`: 4 colunas, menu acessível "Mover para" e contagem por coluna. Arrastar e soltar **não** foi implementado (é opcional na apostila).
- `aplicacao/src/modulos/painel/metricas.ts` e `Painel.tsx`: o Dashboard mostra total, contagem por status, vencidas e inativas, as listas e a linha do tempo de prazos.
- `aplicacao/src/modulos/alertas/inatividade.ts`: regra pura, que será reaproveitada pelo MCP (P10). Neste momento o limiar fixo é de 3 dias; a configuração vem na fase 5.
- Fonte única de verdade: Kanban, Dashboard e lista leem o mesmo armazém (`useEstadoDemandas`).

## Testes automatizados

| # | Item | Resultado | Situação |
|---|---|---|---|
| 1 | Vencida: prazo de ontem conta; prazo de hoje, sem prazo ou concluída não contam | `metricas-inatividade.test.ts` | PASSOU |
| 2 | Inatividade: exatamente 3 dias não conta; 3 dias e 1 ms conta; concluída nunca; ação recente normaliza | idem | PASSOU |
| 3 | `calcularMetricas`: total, contagem por status, vencidas, inativas | idem | PASSOU |
| 4 | Kanban: mover pelo menu atualiza as colunas, o Dashboard e o localStorage, e persiste ao recarregar (cenário 7) | `Kanban.test.tsx` | PASSOU |
| 5 | Dashboard com relógio controlado: 1 vencida, 1 inativa, "parada há 5 dias" | idem | PASSOU |
| 6 | Suíte completa: `npm test` | `Test Files 9 passed (9)`, `Tests 63 passed (63)` | PASSOU |
| 7 | `npm run build` | `✓ built in 441ms` | PASSOU |

## Navegador real

A janela estava atrás de outra; os eventos de DOM foram disparados por script. O localStorage e a recarga são reais.

| Passo | Resultado | Situação |
|---|---|---|
| Kanban antes | A Fazer 1, Em Andamento 1, Em Validação 1, Concluída 1 | PASSOU |
| Mover "Denúncia de desmate (FICTÍCIA)" para Em Andamento | aviso "movida para Em Andamento"; colunas A Fazer 0 e Em Andamento 2; localStorage gravado com "Em Andamento" | PASSOU |
| F5 e Dashboard | total 4; A Fazer 0, Em Andamento 2, Em Validação 1, Concluída 1; vencidas 0; inativas 1 (DEM-FIC-0003, última ação em 03/11) | PASSOU |
| Menu | Dashboard, Demandas, Kanban, Documentos, Agenda, Conhecimento, Saúde do sistema | PASSOU |
| Arrastar e soltar | não implementado (opcional) | NÃO TESTADO |

Cenários do PLANO.md cobertos até aqui: 1 a 9 (o 10 está parcial: a regra está testada, mas a tela de alertas vem na fase 5).
