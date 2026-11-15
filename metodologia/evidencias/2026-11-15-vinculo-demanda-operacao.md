# Vínculo da demanda com a operação (15/11/2026)

**Pedido do responsável:** na janela Demandas, vincular a demanda a uma operação, seja para **agendar a vistoria** (incluir no planejamento) ou para ligá-la a um **ponto vistoriado**. Decisões: agendar cria um ponto com a coordenada da demanda; a vistoria ocorre no período da operação e a **data específica é a do relatório**, registrada depois (não acompanha a saída do ponto). **Base:** `main` (`120fc45`).

| Mudança | Arquivo |
|---|---|
| `vinculosDasDemandas`, `demandasEncaixadas` (ponto cancelado não conta) | `aplicacao/src/modulos/operacoes/regras.ts` |
| `incluirDemandaComoPonto`, `vincularDemandaAPonto`, `desvincularDemandaDePonto` | `operacoes/armazem.ts` |
| Situação "em operação"; `listarSemVistoria` e `textoVistoria` recebem as encaixadas | `demandas/vistoria.ts` |
| Filtro "Falta encaixar" (`sem-encaixe`); "Sem data de vistoria" (`sem-data`) | `demandas/regras.ts`, `Demandas.tsx` |
| Seção "Operação" no detalhe: agendar, vincular, desvincular, aviso de ponto vistoriado sem data | `demandas/VinculoOperacao.tsx` (novo), `Demandas.tsx` |
| Aviso do Painel desconta as encaixadas | `painel/Painel.tsx` |

## Decisões
- O vínculo fica **só no ponto** (`Ponto.demandas`): uma fonte, sem campo novo e sem migração. Demanda excluída deixa o id solto no ponto, ignorado pelas telas.
- Encaixada = ponto **não cancelado** a lista. Com data de vistoria, a situação continua "agendada" (a data vence).
- Sem coordenada na demanda, a tela pede a do ponto e a grava também na demanda; se a edição da demanda falhar (por exemplo, demanda de campo antiga sem vistoria), o ponto é criado e a tela avisa.
- Corrigido durante o trabalho: o rótulo do campo de coordenada englobava os textos de ajuda (nome acessível longo); passou a rótulo próprio.

## Testes (Plan–Act–Verify)
| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Regras e armazém do vínculo; situação, listagem e filtros | `npm test` (aplicacao) | incluídos em 477/477 em 41 arquivos | PASSOU |
| 2 | Telas: agendar (com e sem coordenada), vincular a ponto vistoriado, desvincular, aviso, filtro, Painel | idem | incluídos | PASSOU |
| 3 | Build, tipos e MCP | `npm run build`; `tsc --noEmit`; `node testar-servidor.ts` | ok; ok; 4 = 4 | PASSOU |
| 4 | Telas no navegador | — | — | NÃO CONFERIDO VISUALMENTE |

## Limitações
O teste antigo que passava `situacaoVistoria` direto ao `.map` foi trocado por função de seta (o segundo parâmetro novo recebia o índice). Não publicado.
