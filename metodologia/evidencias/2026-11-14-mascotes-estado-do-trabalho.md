# Evidência — mascote sinaliza o estado do trabalho (etapa 4, 14/11/2026)

**Pedido do responsável:** "vá para o próximo item" (`gestao/BACKLOG.md`, plano dos mascotes, item 1 da lista "A fazer": sinalizar o estado do trabalho, PARCIAL). Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Regra pura `avisosDoDia`: um aviso por demanda em aberto, o mais urgente (vencida; prazo em até 3 dias úteis, inclusive "vence hoje"; parada além do limiar de inatividade), com as mesmas regras do Dashboard, dos feriados locais e do limiar gravado. `resumoDosAvisos`: "2 vencidas, 1 com prazo próximo e 1 parada" | `aplicacao/src/modulos/assistente/avisos.ts` (novo) |
| Painel do assistente: o aviso fixo e fictício ("DEM-FIC-0002: prazo em 1 dia") saiu. Os avisos vêm das demandas deste navegador, como fala curta do mascote com origem e data ("fato · fonte: demandas deste navegador · 13/11/2026"), no máximo 5 ("E mais N: veja o Dashboard e a tela Alertas"). O humor e o texto ao lado do mascote resumem os avisos ("Atento: 1 vencida." / "Tranquilo: nenhuma demanda vencida, com prazo próximo ou parada.") | `modulos/assistente/PainelAssistente.tsx`, `estilos.css` (`.avisos-assistente`) |

## Decisões

- O mascote **conta prazos e inatividade; não opina sobre o mérito** das demandas (fora do plano, por decisão).
- Uma demanda gera só um aviso, para a lista não repetir a mesma demanda.
- O título aparece no aviso como foi digitado (o painel é a tela de trabalho, não a tela compartilhada).

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 4 testes unitários: ordem e tipo dos avisos (vencidas há mais tempo primeiro, prazo próximo, paradas; concluída e prazo distante sem aviso), feriado local muda parada para prazo próximo, limiar gravado, sem aviso, resumo em português | em `testes/unidade/avisos-assistente.test.ts` | conferidos na suíte | PASSOU |
| 2 | 2 testes de tela novos e 1 reescrito: atento com o resumo e a fala com origem e data; tranquilo sem aviso e atento quando uma demanda vencida é criada; limite de 5 avisos. Os outros 3 testes do painel passaram a usar dados controlados (antes dependiam do aviso fixo) | em `PainelAssistente.test.tsx` | conferidos na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 28 passed (28)` · `Tests 271 passed (271)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-9uO3NDGp.js` | PASSOU |

## Limitações

- **Falta da etapa 4:** o olhar que aponta para o cartão ou aviso que pede atenção.
- O comando "prazos" da conversa continua usando a habilidade `avaliar-prazos` sobre os dados fictícios de `dados-ficticios/`, não os dados deste navegador; os avisos e o comando podem dizer coisas diferentes.
- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom).
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1. Não publicado.
