# Evidência — conversa no celular mostra o último envio (14/11/2026)

**Relato do responsável:** "no celular, a conversa não mostra o último envio na tela".

## Causas encontradas

1. A lista da conversa não rolava sozinha até a fala nova.
2. Na gaveta do celular, o painel tinha `height: 100%` abaixo da barra do "fechar": a soma passava da altura da tela, e a parte de baixo (últimas falas e campo de digitar) ficava fora. Até 5 avisos no topo também tiravam espaço da conversa.

## Correções

| Mudança | Arquivo |
|---|---|
| A cada fala nova, a última é rolada para dentro da área visível (`scrollIntoView({ block: 'nearest' })`) | `aplicacao/src/modulos/assistente/PainelAssistente.tsx` |
| Na gaveta: o painel ocupa só o espaço que sobra (`flex: 1; min-height: 0`), e a seção de avisos tem altura máxima de 30% da tela, com rolagem própria | `aplicacao/src/estilos.css` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Teste novo: depois de "ajuda" e de "bom dia", a rolagem é pedida para a última fala | em `PainelAssistente.test.tsx` | com a rolagem desligada de propósito: `1 failed`; com a correção: `11 passed (11)` no módulo | PASSOU |
| 2 | Suíte completa | `npm test` | `Test Files 29 passed (29)` · `Tests 296 passed (296)` | PASSOU |
| 3 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-CCt-fixf.js` | PASSOU |

## Limitações

- O jsdom não calcula layout: a correção de altura na gaveta (CSS) **não tem teste automático**. Conferir em celular: abrir o assistente, enviar "prazos" algumas vezes e ver a última fala e o campo de digitar.
- Com o teclado do celular aberto, alguns navegadores não encolhem a área visível; o campo pode ficar sob o teclado. **NÃO TESTADO.**
- Ambiente: Node v26.13.1. Não publicado.

## Ajuste depois da publicação: uma rolagem só

**Relato do responsável:** "a rolagem da tela ficou esquisita com duas divisões de tela". A correção anterior deu rolagem própria aos avisos (até 30% da altura) além da rolagem da conversa: eram duas áreas rolando na mesma gaveta.

| Mudança | Arquivo |
|---|---|
| Na gaveta, o painel inteiro (mascote, avisos e conversa) rola como uma área só; a conversa deixa de ter rolagem própria; o campo de digitar fica preso embaixo (`position: sticky`), e `scroll-padding-bottom` impede que a última fala fique atrás dele. A rolagem até a última fala continua a mesma (`scrollIntoView`) | `aplicacao/src/estilos.css` |

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Suíte completa | `npm test` | `Tests 296 passed (296)` | PASSOU |
| 2 | Build | `npm run build` | `✓ built`, `index-DDzrs3b6.js`, `index-BtIoFIcB.css` | PASSOU |
| 3 | Rolagem única no celular | — | só CSS; o jsdom não calcula layout | NÃO TESTADO |

O desktop (painel fixo à direita) não muda: lá só a conversa rola, como antes.
