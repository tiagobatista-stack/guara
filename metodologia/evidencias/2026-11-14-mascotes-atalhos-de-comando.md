# Evidência — atalhos de comando na conversa (14/11/2026)

**Pedido do responsável:** "vá para o próximo item" (`gestao/BACKLOG.md`, plano dos mascotes, item 1: sugestões de comando na conversa). Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Botões "prazos" e "ajuda" acima do campo de digitar (grupo "Atalhos de comando"): tocar envia o comando, como se tivesse sido digitado; o texto que estava no campo não é apagado | `aplicacao/src/modulos/assistente/PainelAssistente.tsx` |
| Saudação: "Toque em um atalho abaixo ou digite um comando." (antes: "Digite \"ajuda\".") | idem |
| Atalhos e campo ficam juntos num rodapé; na gaveta do celular, o rodapé inteiro fica preso embaixo, e o espaço reservado para a última fala passou de 88 para 140 px. Botões com 44 px de altura (alvo de toque) | `aplicacao/src/estilos.css` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Teste novo: "ajuda" e "prazos" pelos atalhos aparecem como envio do usuário, com a resposta certa, e o rascunho do campo continua | em `PainelAssistente.test.tsx` | conferido na suíte | PASSOU |
| 2 | Suíte completa | `npm test` | `Tests 297 passed (297)` | PASSOU |
| 3 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, `index-CA_j7zkl.js`, `index-CqYHmxS2.css` | PASSOU |

## Limitações

- Os atalhos ficam sempre visíveis (não só com a conversa vazia), para servirem também no celular depois de várias falas.
- Na gaveta, o rodapé ficou mais alto; em celular de tela baixa, sobra menos espaço para a conversa. **NÃO CONFERIDO VISUALMENTE.**
- Ambiente: Node v26.13.1. Não publicado.
