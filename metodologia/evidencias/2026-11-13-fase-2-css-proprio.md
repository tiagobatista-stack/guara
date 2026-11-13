# Evidências — Fase 2: CSS próprio (13/11/2026)

O Tailwind foi substituído por `aplicacao/src/estilos.css` (decisões D2 e D10). O arquivo traz:

- variáveis da paleta Fofofauna: guará, pantanal (azul petróleo no cabeçalho, como pede o P04) e cerrado;
- modo claro e escuro (`prefers-color-scheme`);
- classes semânticas em português;
- pontos de quebra em 768, 1024 e 1280 px.

| # | Item | Comando / verificação | Resultado | Situação |
|---|---|---|---|---|
| 1 | Nenhuma classe utilitária restante | `grep` de padrões Tailwind (`flex`, `bg-`, `dark:` etc.) em `src` | nenhuma ocorrência | PASSOU |
| 2 | Testes | `npm test` | `5 passed (5)`, `40 passed (40)` | PASSOU |
| 3 | Build | `npm run build` | `✓ built`; CSS de 11,0 kB (3,0 kB gzip); JS de 282 kB | PASSOU |
| 4 | Desktop, 1366 px | estilos computados no navegador | menu lateral 240 px com rótulos; painel do assistente 320 px; barra inferior e botão flutuante ocultos; indicadores em 4 colunas; sem rolagem horizontal; cabeçalho `rgb(47,111,115)`; botão primário `rgb(200,112,42)` | PASSOU |
| 5 | Tablet, 800 px | idem | menu recolhido de 64 px, sem rótulos; painel do assistente oculto e botão "Assistente" visível; indicadores em 2 colunas; sem rolagem horizontal | PASSOU |
| 6 | Smartphone (preset mobile) | idem | menu lateral oculto; barra inferior com 5 itens e alvos de toque de 56 px; botão flutuante de 56 px; indicadores em 1 coluna; sem rolagem horizontal | PASSOU |
| 7 | Gaveta "Mais" no smartphone | clique em "Mais" disparado por JS e inspeção do DOM | gaveta aberta com os 6 rótulos visíveis | PASSOU |
| 8 | Captura de tela visual | `screenshot` do painel | tempo esgotado: a janela do app estava atrás de outra | NÃO TESTADO |
| 9 | Contraste WCAG AA medido | — | sem ferramenta de medição nesta rodada | NÃO TESTADO |

## Observações

- No preset mobile o pane relatou `innerWidth` de 673 px (escala do emulador). O valor é menor que 768, então o layout de smartphone foi aplicado. Conferir também em um celular real ou no DevTools.
- Os erros de console `CORES_BORDA` vieram do hot reload no meio das edições e não reapareceram depois de recarregar a página. O build e os testes passaram com o código final.
