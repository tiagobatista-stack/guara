# Evidência — mascotes: piscar e reação ao toque (14/11/2026)

**Pedido do responsável:** "continue para animações". Primeira parte da etapa 2 do plano dos mascotes (`gestao/BACKLOG.md`): piscar e reação ao clique ou toque. Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Os olhos piscam de tempos em tempos, com intervalo próprio por espécie (ariranha 4,3 s, lobo-guará 5,6 s, capivara 6,7 s) para não piscarem juntos | `aplicacao/src/compartilhado/Mascote.tsx`, `aplicacao/src/estilos.css` |
| Clique ou toque no mascote: pulinho de 0,6 s com uma piscada, que termina sozinho | os mesmos |
| 3 testes novos | `aplicacao/src/compartilhado/Mascote.test.tsx` |

## Decisões

- **Animações só em CSS** (`@keyframes`), sem biblioteca. O componente apenas liga e desliga uma classe.
- **Com "reduzir movimento", nada anima** (piscar e pulinho desligados no CSS).
- **O clique é só simpatia:** não muda humor, rótulo nem dado, e não dá acesso a nenhuma função. Por isso o mascote não virou botão nem recebe foco do teclado.
- **Os rostos pequenos das falas não piscam nem reagem.**

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Suíte completa (esperado: 244 testes em 24 arquivos) | `npm test` | o responsável informou "testado"; a saída não foi colada na conversa, então a contagem não está registrada | INFORMADO PELO RESPONSÁVEL |
| 2 | Build | `npm run build` | idem | INFORMADO PELO RESPONSÁVEL |

## Limitações

- Os testes só conferem classes e temporizador; **a animação em si só se vê no navegador: NÃO CONFERIDO VISUALMENTE** (ritmo da piscada, altura do pulinho, celular).
- Faltam da etapa 2: tédio, sono, dormir, acordar e comemoração.
- A contagem de testes e a saída do build não foram vistas pelo Claude.
