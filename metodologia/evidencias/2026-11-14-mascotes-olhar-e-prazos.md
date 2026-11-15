# Evidência — etapa 4 concluída: olhar para o aviso e "prazos" com os dados reais (14/11/2026)

**Pedido do responsável:** "próximo item" (`gestao/BACKLOG.md`, plano dos mascotes, item 1: o que faltava da etapa 4). Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Mascote com `alvo` opcional: sem ponteiro recente, os olhos apontam para o alvo em vez de voltar ao centro; o ponteiro continua tendo prioridade; sem alvo, nada muda | `aplicacao/src/compartilhado/Mascote.tsx` |
| Painel do assistente: o alvo é o primeiro aviso (o mais urgente); sem aviso, não há alvo | `modulos/assistente/PainelAssistente.tsx` |
| Comando "prazos": responde com os mesmos avisos do painel, agrupados ("Vencidas: … Prazo próximo: … Paradas: …"), fonte "demandas deste navegador" e a data. Antes usava a habilidade `avaliar-prazos` sobre os dados fictícios de `dados-ficticios/`, que continua no catálogo e na Saúde do sistema | `modulos/assistente/PainelAssistente.tsx` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Mascote: olha para o alvo abaixo; o ponteiro acima tem prioridade; depois do descanso volta ao alvo; sem alvo, centro | em `compartilhado/Mascote.test.tsx` | conferido na suíte | PASSOU |
| 2 | Painel: com aviso, o olhar aponta para o primeiro aviso; sem aviso, centro; "prazos" responde com os dados reais, origem e data | 3 testes em `PainelAssistente.test.tsx` | conferidos na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 29 passed (29)` · `Tests 291 passed (291)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-R_LqMmV9.js` | PASSOU |

## Limitações

- Com "reduzir movimento" ativado, os olhos ficam parados no centro e não apontam para o aviso.
- A posição do aviso é lida quando o alvo muda e a cada movimento do ponteiro; ao rolar o painel sem mover o ponteiro, o olhar não se ajusta.
- Na gaveta do celular o painel é outro componente montado, e o comportamento é o mesmo; não foi testado à parte.
- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (os testes simulam as posições no jsdom).
- Ambiente: Node v26.13.1. Não publicado.
