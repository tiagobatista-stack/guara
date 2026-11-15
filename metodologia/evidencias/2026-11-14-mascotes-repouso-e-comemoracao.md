# Evidência — mascotes: tédio, sono, dormir e comemoração (14/11/2026)

**Pedido do responsável:** "siga para as outras emoções". Segunda parte da etapa 2 do plano dos mascotes (`gestao/BACKLOG.md`). Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Repouso por tempo sem atividade na página (ponteiro, toque, teclado, rolagem): entediado (pálpebra a meio, olhar vagando), sonolento (pálpebra baixa, cabeça pendendo), dormindo (olhos fechados, respiração, um "z") | `aplicacao/src/compartilhado/Mascote.tsx`, `aplicacao/src/estilos.css` |
| Acordar: qualquer atividade, mudança de humor ou comemoração acorda, com um pulinho | os mesmos |
| Comemoração: `comemorarMascotes('pequena' \| 'grande')`, com olhos de riso, boca aberta e pulos (1,2 s ou 2,4 s) | os mesmos |
| Kanban: mover uma demanda para "Concluída" pede a festa pequena; se era a última em aberto, a grande | `aplicacao/src/modulos/kanban/Kanban.tsx` |
| 7 testes novos (6 em `Mascote.test.tsx`, 1 em `Kanban.test.tsx`) | — |

## Tempos e jeito de cada espécie

| Estado | Ariranha | Capivara | Lobo-guará |
|---|---|---|---|
| Entediado | 1 min | 45 s | 1 min 15 s |
| Sonolento | 3 min | 2 min 15 s | 3 min 45 s |
| Dormindo | 6 min | 4 min 30 s | 7 min 30 s |

A ariranha vaga o olhar mais depressa quando entediada. O lobo-guará dorme com um olho meio aberto. A conferência acontece a cada 5 s, então a troca pode atrasar até 5 s.

## Decisões

- **Nada é medido nem guardado.** O tempo parado fica só na memória da página, serve só ao desenho e some ao recarregar. Não há texto, som, aviso ou registro.
- **O rótulo para leitor de tela não muda** com o repouso nem com a festa: continua anunciando espécie, bioma e humor.
- **Com "reduzir movimento"**, os estados aparecem (pálpebras, olhos fechados, "z" parado), sem animação.
- **Os rostos pequenos das falas** não entram em repouso nem comemoram.
- **A festa não depende do conteúdo da demanda:** só do fato de ela ter sido movida para "Concluída".

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Suíte completa, com os 7 testes novos | `npm test` | `Test Files 24 passed (24)` · `Tests 251 passed (251)` | PASSOU |
| 2 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ 93 modules transformed`; `✓ built in 129ms` | PASSOU |

Executados pelo responsável no Windows, sobre o commit `bfd6808`; a saída foi colada na conversa. A contagem de 251 confirma também os 244 da etapa anterior (piscar e toque).

## Limitações

- **As animações só se avaliam no navegador: NÃO CONFERIDO VISUALMENTE** (pálpebras, cabeça pendendo, "z", pulos da festa, tema escuro, celular).
- O mascote aparece no painel do assistente e na Saúde do sistema. No celular, com o painel fechado, a festa do Kanban não é vista.
- No painel do assistente o humor é "atento" enquanto houver aviso, e o aviso do MVP é fixo; mesmo assim o mascote entra em repouso com a página parada, e o texto "Atento: 1 aviso abaixo." continua visível.
- Comemoração só no Kanban; a tela Demandas não muda status.
- O commit `bfd6808` foi feito antes dos testes, a pedido do responsável, e por isso leva "NÃO TESTADO" no título; os testes passaram depois, sem mudança no código.
