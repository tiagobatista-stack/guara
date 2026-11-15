# Evidência — conversa guardada, gaveta como diálogo e atalhos em linguagem de gente (14/11/2026)

**Pedido do responsável:** "faça Persistir a conversa, corrigir o comportamento de diálogo da gaveta e humanizar os atalhos, e atualize o backlog", a partir da avaliação de UX do chat do mascote feita nesta sessão (itens 1 a 4 e 10 da avaliação). Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Armazém da conversa em `guara:conversa:v1` (mesmo desenho das preferências do mascote: `useSyncExternalStore`, validação do que foi gravado, memória quando o armazenamento está bloqueado). Teto de 60 falas; as mais antigas saem. A saudação fica sempre no topo e não é gravada | `aplicacao/src/modulos/assistente/conversa.ts` (novo) |
| O painel lê e grava no armazém: fechar a gaveta, trocar de tela ou recarregar não apaga a conversa; painel fixo (desktop) e gaveta mostram a mesma conversa | `aplicacao/src/modulos/assistente/PainelAssistente.tsx` |
| Atalhos "Ver prazos" e "O que você faz?" (antes "prazos" e "ajuda"); a resposta de "ajuda" explica o que "prazos" faz; saudação diz "Escolha um atalho" em vez de "Toque"; campo com `enterKeyHint="send"` e `autoComplete="off"` | idem |
| Componente `Gaveta` usado pelo assistente e pelo menu "Mais": foco entra no botão de fechar ao abrir e volta para quem abriu ao fechar; Esc fecha; toque no fundo escuro fecha; Tab circula só dentro da gaveta | `aplicacao/src/compartilhado/Gaveta.tsx` (novo), `aplicacao/src/nucleo/Aplicacao.tsx` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Novos: conversa mantida depois de desmontar e montar o painel; gravação inválida descartada e teto de 60 falas; atributos do campo | em `PainelAssistente.test.tsx` (3 testes) | conferido na suíte | PASSOU |
| 2 | Novos: foco entra e volta; Esc fecha; fundo fecha e o interior não; Tab circula | `Gaveta.test.tsx` (4 testes) | conferido na suíte | PASSOU |
| 3 | Testes antigos ajustados aos rótulos novos e ao texto novo de "ajuda" | `PainelAssistente.test.tsx` | conferido na suíte | PASSOU |
| 4 | Suíte completa | `npm test` | `Test Files 30 passed (30)`, `Tests 304 passed (304)` | PASSOU |
| 5 | Build | `npm run build` | `✓ built`, `index-BqzrsL8U.js`, `index-CqYHmxS2.css` | PASSOU |

## Limitações

- Não há botão para apagar a conversa na tela; a função `limparConversa` existe e é usada nos testes. Fica no backlog.
- A conversa não entra no backup exportado (`guara-dados.json`), como as preferências do mascote também não entram.
- O que a pessoa digita fica gravado neste navegador: só comandos, mas vale lembrar na documentação do módulo.
- A circulação do foco com Tab é simples (primeiro e último elemento focável). Leitor de tela e celular: **NÃO CONFERIDO VISUALMENTE**.
- Ambiente: Node v26.13.1. Não publicado.
