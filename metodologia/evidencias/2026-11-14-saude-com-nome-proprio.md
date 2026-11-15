# Evidência — Saúde do sistema com o nome dado ao mascote (14/11/2026)

**Pedido do responsável:** "vá para o próximo item" (`gestao/BACKLOG.md`, plano dos mascotes, item 1: Saúde do sistema com nome próprio). Feito na `main`. O push de `90ea0d8` (só testes e documentação) foi confirmado: `main` igual a `origin/main`.

| Mudança | Arquivo |
|---|---|
| O mascote da Saúde do sistema continua escolhido pelo estado (capivara quando OK; lobo-guará nos outros), mas agora recebe o nome dado nas Configurações; o leitor de tela anuncia "Tobias, Lobo-guará (Cerrado), cauteloso" | `aplicacao/src/modulos/saude-do-sistema/SaudeDoSistema.tsx` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Teste novo: com nomes dados ao lobo-guará e à capivara, o mascote anuncia "Tobias, …, cauteloso" antes da verificação e "Dona Cida, …, tranquilo" depois | em `SaudeDoSistema.test.tsx` | conferido na suíte | PASSOU |
| 2 | Suíte completa | `npm test` | `Tests 322 passed (322)` | PASSOU |
| 3 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-h_IMYh--.js` | PASSOU |

## Limitações

- O nome aparece só para o leitor de tela (como no resto do app); não há legenda visível com o nome nesta tela.
- Tela no navegador: **NÃO CONFERIDO VISUALMENTE**.
- Ambiente: Node v26.13.1. Não publicado.
