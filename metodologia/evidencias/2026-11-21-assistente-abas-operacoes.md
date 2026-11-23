# Assistente: abas, texto sem UUID e comando "operações" (21/11/2026)

Branch `operacoes-campo`. Commits: 421137d (11a, abas), 1473cec (11b, sem UUID), d3e90a0 (10, operações). Sem push nem PR.

## Verificação automática

| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | PASSOU |
| `npx vitest run` | PASSOU: 73 arquivos, 914 testes (nas execuções completas) |
| `npm run build` | PASSOU (só o aviso normal de tamanho de chunk) |

Observação: no Windows, o vitest às vezes encerra um worker ("exit code 3221225477") e descarta arquivos em silêncio, e o total cai. Repetir até chegar a 73 arquivos / 914 testes.

## Verificação visual (/revisar-interface)

NÃO TESTADO. Não há navegador nem Playwright neste ambiente. Ficam sem conferência: 375 px (conversa com pelo menos 5 linhas visíveis, campo sempre visível, abas sem rolagem horizontal), desktop com conversa longa, fila com 6 itens e 2 avisos, selo "Dados fictícios" no celular, área mínima de toque. Por teste de código, os botões têm nome acessível.

## Roteiro de aceite manual (a executar pelo responsável)

| Frase | Resultado esperado | Situação |
|---|---|---|
| ola | Cumprimento e convite a digitar "ajuda" | NÃO TESTADO (manual) |
| ajuda | Lista de comandos, incluindo prioridades, buscar e operações | NÃO TESTADO (manual) |
| prioridades | Até 5 demandas com motivo; sugestão da primeira; sem UUID | NÃO TESTADO (manual) |
| DEM-FIC-0002 | Resumo da demanda, com botões de ação | NÃO TESTADO (manual) |
| prorrogar DEM-FIC-0001 | Não altera nada: orienta a abrir a demanda (decisão humana) | NÃO TESTADO (manual) |
| DEM-FIC-0003 lembrar segunda feira | Só adia o aviso existente; não cria lembrete novo | NÃO TESTADO (manual) |
| lembrar DEM-FIC-0099 amanhã | Código inexistente: diz que não achou | NÃO TESTADO (manual) |
| xyz | "Não entendi", cita ajuda e operações | NÃO TESTADO (manual) |
| buscar licença | Lista as demandas achadas, como na tela Demandas; "Ver todos" abre a lista | NÃO TESTADO (manual) |
| operações | Três falas; números iguais à Linha do tempo de prazos do Dashboard | PASSOU em teste automático; manual NÃO TESTADO |

## Limitações conhecidas

- Sino x aba Avisos podem mostrar números diferentes; foram rotulados, não unificados.
- "lembrar" só adia um aviso existente.
- Só o formato exato DEM-FIC-nnnn é reconhecido como código digitado.
- Título limitado a 45 caracteres; o comentário do analista nunca aparece na fila (privacidade).
- Item 6d (regra de "decidir" para demanda vencida sem natureza e tipo) NÃO feito: aguarda decisão. O código não exige natureza e tipo para concluir.
- Commits 0be9ca0 e beadc28 têm autor tbagro.
