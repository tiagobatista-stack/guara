# Evidência — detalhe livre da demanda travada (14/11/2026)

**Pedido do responsável:** "as demandas travadas além das caixas de seleção deveriam ter um campo livre para informar detalhes do travamento do processo". Feito na `main`.

Isso revê uma decisão do item 6 (demanda travada), que tinha deixado o motivo só por categoria porque texto livre pode ter nomes. O campo novo é opcional e fica restrito ao detalhe da demanda.

| Mudança | Arquivo |
|---|---|
| Modelo: `bloqueio.detalhe?` (texto livre, até 300 caracteres), sem migração e sem mudar `versao: 1` | `aplicacao/src/modulos/demandas/modelo.ts`, `planejamento/PLANO.md` |
| Regras: `travarDemanda` grava motivo e detalhe; mudar só o detalhe mantém o "desde" e conta como ação relevante; detalhe vazio some do registro. `limparDetalheBloqueio` tira espaços sobrando. A validação aceita detalhe ausente, ou texto não vazio de até 300 caracteres | `modulos/demandas/regras.ts` |
| Armazém: `travar(id, motivo, detalhe)` recusa acima de 300 caracteres sem gravar | `modulos/demandas/armazem.ts` |
| Tela: campo "Detalhe do bloqueio (opcional)" no detalhe da demanda, com dica para evitar nomes de pessoas; o detalhe aparece só ali. O botão "Mudar motivo" virou "Atualizar bloqueio" | `modulos/demandas/Demandas.tsx` |

## Onde o detalhe aparece e onde não aparece

- **Aparece:** no detalhe da demanda (tela Demandas) e no JSON exportado (é dado da demanda).
- **Não aparece:** no texto "⛔ travada há N dias úteis: motivo" (lista, Kanban, Alertas), na tela compartilhada (o resumo é montado por lista branca e lê só esse texto) e no MCP (que devolve só id, título, status, prioridade, responsável, prazo e última ação).

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 4 testes unitários: gravar e trocar o detalhe mantendo o "desde"; armazém limpa espaços, recusa 301 caracteres sem gravar e o detalhe sobrevive ao recarregar; validação (vazio, outro tipo, longo); detalhe fora do texto do bloqueio e do resumo compartilhado | em `testes/unidade/demanda-travada.test.ts` | conferidos na suíte | PASSOU |
| 2 | 1 teste de tela: grava, aparece só no detalhe (não na lista nem na tela compartilhada), volta ao reabrir, e apagar o texto remove o detalhe | em `Demandas.test.tsx` | falhou na primeira execução (a dica dentro do `<label>` entrava no nome do campo); corrigido na tela, passou | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 28 passed (28)` · `Tests 276 passed (276)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-D0nqr30B.js` | PASSOU |
| 5 | MCP (usa a mesma validação) | `node servidor-mcp/testar-servidor.ts` | 3 ferramentas `readOnly=true`; "MCP total=4 · JSON no disco=4 · COINCIDEM" | PASSOU |

## Limitações

- O texto livre pode conter nomes de pessoas se alguém digitar; a tela só avisa. Ele vai no JSON exportado e no backup.
- Telas no navegador: **NÃO CONFERIDO VISUALMENTE**.
- Ambiente: Node v26.13.1. Não publicado.
