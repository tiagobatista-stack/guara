# Evidência — histórico da demanda: status e bloqueio (14/11/2026)

**Pedido do responsável:** "cada alteração do bloqueio é evento no histórico do processo" e "as mudanças se aplicam às demais mudanças de status". Feito na `main`.

Sobre gravar o texto do detalhe em cada evento, o responsável não respondeu. Foi gravado, porque o objetivo é o histórico do processo; trocar por "detalhe alterado" sem o texto é uma mudança pequena.

| Mudança | Arquivo |
|---|---|
| Modelo: `historico?` opcional com eventos `{quando, acao, de?, para?, motivo?, detalhe?}`, até 500 por demanda; sem migração e sem mudar `versao: 1` | `aplicacao/src/modulos/demandas/modelo.ts`, `planejamento/PLANO.md` |
| `registrar`, `eventoValido`, `textoEvento`, `historicoRecente` | `modulos/demandas/historico.ts` (novo) |
| Regras: "criada" ao criar; "mudou o status" em `mudarStatus` e em `editarDemanda` quando o status muda; "travou", "mudou o bloqueio", "reavaliada: ainda travada", "destravou" e "bloqueio encerrado ao concluir". A validação confere cada evento | `modulos/demandas/regras.ts` |
| **Correção encontrada no caminho:** concluir pelo formulário de edição não encerrava o bloqueio (só o Kanban e a mudança direta de status encerravam). Agora os dois caminhos usam a mesma função | `modulos/demandas/regras.ts` |
| Tela: seção "Histórico" no detalhe da demanda, do mais novo ao mais antigo; demanda anterior ao histórico mostra que não tem eventos | `modulos/demandas/Demandas.tsx` |

## Onde o histórico aparece e onde não aparece

- **Aparece:** no detalhe da demanda e no JSON exportado.
- **Não aparece:** na lista, no Kanban, na tela compartilhada (lista branca) e no MCP (que devolve só campos escolhidos).

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 9 testes unitários: "criada"; sequência status → travou → ainda travada → mudou → destravou; nada muda sem mudança; concluir encerra o bloqueio pelo Kanban e pelo formulário; textos; limite de 500; validação (sem histórico válida, eventos malformados); fora da tela compartilhada; persistência no armazém | em `testes/unidade/historico.test.ts` (novo) | conferidos na suíte | PASSOU |
| 2 | 2 testes de tela: linha do tempo com 3 eventos na ordem certa; demanda antiga avisa que não tem eventos | em `Demandas.test.tsx` | conferidos na suíte | PASSOU |
| 3 | Teste existente do "ainda travada" atualizado: agora também registra o evento (mudança pedida) | em `testes/unidade/demanda-travada.test.ts` | falhou antes da atualização, passou depois | PASSOU |
| 4 | Suíte completa | `npm test` | `Test Files 29 passed (29)` · `Tests 287 passed (287)` | PASSOU |
| 5 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-DNRKpTRc.js` | PASSOU |
| 6 | MCP (usa a mesma validação) | `node servidor-mcp/testar-servidor.ts` | "MCP total=4 · JSON no disco=4 · COINCIDEM" | PASSOU |

## Limitações

- Demandas gravadas antes de hoje não têm eventos anteriores; o histórico começa na próxima mudança.
- Editar título, prazo, responsável e outros campos não gera evento (só status e bloqueio, como pedido).
- O histórico guarda cada versão do detalhe do bloqueio: um nome digitado por engano e depois apagado continua no histórico e no JSON exportado. A tela não apaga eventos.
- O teste da correção do formulário não foi rodado contra o código anterior para confirmar a falha.
- Telas no navegador: **NÃO CONFERIDO VISUALMENTE**.
- Ambiente: Node v26.13.1. Não publicado.
