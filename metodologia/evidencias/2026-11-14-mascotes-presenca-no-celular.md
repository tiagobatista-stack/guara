# Evidência — mascote presente no celular e no tablet (14/11/2026)

**Pedido do responsável:** "vá para o próximo item" (`gestao/BACKLOG.md`, plano dos mascotes, item 1: presença no celular). Feito na `main`. Antes, a publicação de `c578994` foi conferida: a URL pública serve `index-BPahiGzq.js`, o mesmo bundle do build.

Abaixo de 1280 px o painel do assistente fica fechado, e o mascote sumia junto: a festa do Kanban e o aviso de atenção não eram vistos no celular.

| Mudança | Arquivo |
|---|---|
| `RostoDoAssistente`: rosto do mascote principal (com o nome dado nas Configurações), atento quando há aviso; é um mascote vivo, que pisca, reage, dorme e comemora como o do painel. `useAvisosDoDia` e `rotuloAbrirAssistente` reaproveitam a regra dos avisos | `aplicacao/src/modulos/assistente/PainelAssistente.tsx` |
| Celular: o botão flutuante troca o ícone de conversa pelo rosto (44 px), com a contagem de avisos; fundo claro com borda laranja, para o lobo-guará não sumir no laranja | `nucleo/Aplicacao.tsx`, `estilos.css` |
| Tablet (768–1279 px): o botão "Assistente" do cabeçalho troca o ícone pelo rosto (28 px) | `nucleo/Aplicacao.tsx` |
| Nome acessível dos dois botões com o resumo: "Abrir assistente: 1 vencida" | `nucleo/Aplicacao.tsx` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Botão flutuante e botão do cabeçalho com o rosto do principal; tranquilo sem aviso; ao criar demanda vencida, fica atento, mostra a contagem e o nome passa a "Abrir assistente: 1 vencida" | em `nucleo/Aplicacao.test.tsx` | conferido na suíte | PASSOU |
| 2 | Com o painel fechado, o mascote do botão flutuante comemora | em `nucleo/Aplicacao.test.tsx` | conferido na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 29 passed (29)` · `Tests 295 passed (295)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-BUg6SxfA.js` | PASSOU |

## Limitações

- O jsdom não aplica as larguras de tela: os testes conferem os botões, não qual deles aparece em cada largura.
- No desktop (≥ 1280 px) os dois botões ficam escondidos, mas os mascotes deles continuam montados (ouvintes de ponteiro e atividade compartilhados, sem custo visível).
- Tamanho, contraste do fundo e posição da contagem: **NÃO CONFERIDO VISUALMENTE** em celular real.
- Ambiente: Node v26.13.1. Não publicado.
