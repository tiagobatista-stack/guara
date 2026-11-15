# Evidência — aviso de armazenamento bloqueado nas Configurações (14/11/2026)

**Pedido do responsável:** "próximo no backlog" (`gestao/BACKLOG.md`, plano dos mascotes, item 1: aviso de armazenamento bloqueado nas Configurações). Feito na `main`, sobre `eb0280b`.

Antes, com o localStorage bloqueado (modo privado, cota cheia, política do navegador), a escolha do mascote e os nomes passavam a valer só na memória, sem nenhum aviso na tela.

| Mudança | Arquivo |
|---|---|
| `preferenciasSoNaMemoria` e o hook `usePreferenciasSoNaMemoria`: expõem o estado que o armazém já guardava (não leu ou não conseguiu gravar) | `aplicacao/src/compartilhado/preferencias-mascote.ts` |
| Configurações: aviso (`role="alert"`) "Este navegador não deixou gravar as preferências (armazenamento bloqueado, cheio ou em modo privado). As mudanças valem só até fechar ou recarregar a página." Some quando uma gravação volta a funcionar | `aplicacao/src/modulos/configuracoes/Configuracoes.tsx` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Teste novo: sem aviso no início; com `setItem` falhando, escolher a ariranha mostra o aviso e a escolha vale na página; com a gravação de volta, o aviso some e a escolha é gravada | em `Configuracoes.test.tsx` | conferido na suíte | PASSOU |
| 2 | Suíte completa | `npm test` | `Tests 319 passed (319)` | PASSOU |
| 3 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-BczTcvUX.js` | PASSOU |

## Limitações

- O aviso aparece só nas Configurações; as outras telas que usam o mascote não avisam.
- Telas no navegador (modo privado de verdade): **NÃO TESTADO**.
- Ambiente: Node v26.13.1. Não publicado.
