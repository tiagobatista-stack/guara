# Viagens do cronograma — etapa 1 do plano de campo (15/11/2026)

**Pedido do responsável:** as datas de saída e retorno são do cronograma de viagem, não do ponto. Cada viagem é delegada a uma equipe de duas ou mais pessoas, com um ou mais veículos. Os pontos são vistoriados individualmente em datas diferentes (data da vistoria por ponto: etapa 2). Plano completo aprovado em conversa: (1) viagens; (2) ponto com código `MUNICIPIO+AAAAMM-NN`, data da vistoria e origem do município; (3) informações prévias; (4) ficha de campo no modelo do PDF; (5) lançamento pós-campo; (6) síntese. **Base:** `main` (`c28d0ce`).

| Mudança | Arquivo |
|---|---|
| Tipo `Viagem` (equipe, integrantes, veículos, saída, retorno, notas); `Ponto.viagem` no lugar de equipe e datas; `PontoNovo` para entrada (planilha) | `aplicacao/src/modulos/operacoes/modelo.ts` |
| Migração na leitura (ids determinísticos `vg-N`), `encaixarEmViagens`, viagem incompleta, conflito de agenda por pessoa/veículo, sugestões de nomes, pendências, organização por viagem | `operacoes/regras.ts` |
| `criarViagem`, `alterarViagem`, `excluirViagem` (pontos ficam sem viagem), `definirViagem` em lote; `incluirPontos` encaixa as linhas nas viagens; período confere as viagens | `operacoes/armazem.ts` |
| Importação devolve `PontoNovo` (equipe e datas da linha) | `operacoes/importar-csv.ts` |
| Exportação: equipe e datas vêm da viagem; colunas iguais; nomes de integrantes não saem no arquivo | `operacoes/exportar.ts` |
| Tela: seção "Viagens (cronograma)", formulário com listas de integrantes e veículos (sugestões dos já usados), encaixe em lote, lista por viagem ou grupo, filtro por viagem, importação e exportação recolhidas; correções do cartão do ponto | `operacoes/Operacoes.tsx`, `estilos.css` |
| Rótulo do ponto e mensagem de agendamento usam a viagem | `demandas/VinculoOperacao.tsx` |
| Aviso do Painel: "sem viagem ou com viagem sem data de saída" | `painel/Painel.tsx` |
| Testes: 9 de lógica (novo) e telas atualizadas + 5 novos | `operacoes/viagens.test.ts`, `operacoes/Operacoes.test.tsx` |
| Testes de unidade ajustados ao modelo com viagem (e 1 novo: migração do formato antigo) | `testes/unidade/operacoes.test.ts`, `testes/unidade/exportar-operacao.test.ts` |

## Decisões
- Mesma equipe (sem acento e maiúsculas), saída e retorno = mesma viagem, na importação e na migração.
- Viagem incompleta (sem nome, menos de 2 integrantes, sem veículo ou sem datas) gera aviso e não bloqueia.
- Conflito de agenda compara **pessoas e veículos**, não o nome da equipe, entre todas as operações; é sugestão, a decisão é do analista. O aviso antigo por equipe continua retirado.
- Excluir viagem não apaga pontos. Excluir ponto ficou com peso visual menor e a confirmação sugere "cancelado".
- Nomes dos integrantes ficam só no navegador, fora do backup, da tela compartilhada, do MCP e da exportação. Testes usam nomes fictícios.
- A chave do localStorage continua `guara:operacoes:v1`: a migração é feita na validação da leitura e gravada na próxima alteração.

## Testes (Plan–Act–Verify)
| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Lógica de viagens (migração, importação, lote, período, conflito, pendências, exportação, organização) | `node --test` com o mesmo `viagens.test.ts` e um shim de `it`/`localStorage` | 9/9 | PASSOU |
| 2 | Tipos dos arquivos alterados | `tsc` 7 com declarações mínimas de React (sem `@types/react`) | sem erros nos arquivos alterados | PASSOU (parcial) |
| 3 | Suíte completa, 1ª rodada (responsável, Windows, 16:49) | `npm test` | 488/497: 9 falhas em `testes/unidade/operacoes.test.ts` e `exportar-operacao.test.ts`, que ainda montavam pontos com equipe e datas | FALHOU |
| 3b | Os dois arquivos ajustados (+ importação CSV e `viagens.test.ts`) | `node --test` com shim de `describe/it/expect`; o shim reproduz as 3 falhas originais da exportação | 64/64 | PASSOU (fora do Vitest) |
| 3c | Suíte completa, 2ª rodada (responsável, Windows, 17:13) | `npm test` | 498/498 em 42 arquivos (eram 483; 15 novos) | PASSOU |
| 4 | Build (responsável, Windows) | `npm run build` (`tsc --noEmit` + Vite) | ok, 116 módulos | PASSOU |
| 5 | Telas no navegador (navegador integrado do Claude, `npm run dev` no Windows, 15/11 18:31) | operação fictícia gravada no formato antigo, depois apagada | ver "Conferência visual" | PASSOU, com ressalvas |

Motivo de rodar 3c e 4 no Windows do responsável: os binários nativos de `node_modules` (rolldown, TypeScript 7) são de Windows e a máquina de verificação não tem rede para instalar os de Linux. Rodar no Windows: `cd aplicacao && npm test && npm run build`.

## Conferência visual (15/11/2026)
Operação fictícia (`op-teste-visual`, 4 pontos, nomes e placa fictícios) gravada no formato antigo no navegador integrado e apagada ao final. Capturas em `capturas/2026-11-15-viagens-*.jpg`.

| Item | Resultado |
|---|---|
| Migração na leitura: 4 pontos → 2 viagens (Equipe A com 2, Equipe B com 1) e 1 sem viagem; campos antigos saem do ponto ao gravar | PASSOU |
| Viagem incompleta e resumo ("1 sem viagem · 2 viagem(ns) · 2 incompleta(s)") | PASSOU |
| Editar viagem: incluir integrantes e veículo com Enter, remover, salvar | PASSOU |
| Encaixe em lote: ponto 4 posto na Equipe B; aviso e seções por viagem atualizados; resumo "0 sem viagem" | PASSOU |
| 375 px: sem rolagem horizontal; cartões de viagem e de ponto em uma coluna; ações do ponto alinhadas pela base | PASSOU |
| Ressalva 1: no desktop, o formulário de edição da viagem fica espremido na metade da grade | A CORRIGIR |
| Ressalva 2: em 375 px, o botão flutuante do mascote cobre parte do cartão (anterior a esta mudança) | A CORRIGIR |
| Ressalva 3: "· N ponto(s)" quebra para a linha de baixo no título do cartão da viagem | cosmético |

## Período diferente na planilha e histórico do pedido (15/11/2026, pedido do responsável)
Ao importar um CSV cujas datas (18 a 22/09/2027) não cabiam no período (01 a 18/06/2027), as 10 linhas viravam 10 erros iguais. O responsável lembrou que a operação pode mudar de data (falta de diária, adiantada, prorrogada) e pediu que o mascote pergunte se mantém a data cadastrada, com as mudanças no histórico do pedido.

| Mudança | Arquivo |
|---|---|
| `Operacao.historico` (somente acréscimo): "criada" e "periodo" (de, para, motivo opcional: adiada, adiantada, prorrogada, falta de diária, outro) | `operacoes/modelo.ts`, `regras.ts` (validação) |
| `alterarPeriodo` registra o evento quando o período muda de fato; `criarOperacao` registra "criada" | `operacoes/armazem.ts` |
| Prévia da importação: datas fora do período viram **uma pergunta do mascote** (não erro por linha). "Sim, atualizar" → usar o período da planilha ou ampliar para os dois, com motivo; "Não, manter" → as linhas fora entram sem as datas (viagem sem datas). A importação espera a resposta | `operacoes/Operacoes.tsx` |
| Viagem com data fora do período: mesma pergunta, com "ampliar" como padrão; ao atualizar, a viagem é gravada | `operacoes/Operacoes.tsx` |
| "Histórico do pedido" no detalhe da operação; motivo opcional ao mudar o período à mão | `operacoes/Operacoes.tsx` |
| Formulário da viagem em linha inteira; "· N ponto(s)" sem quebra | `operacoes/Operacoes.tsx`, `estilos.css` |

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 6 | Lógica (histórico, unir períodos) | `node --test` (shim) | 11/11 em `viagens.test.ts`; unidade de operações 64/64 com os demais | PASSOU (fora do Vitest) |
| 7 | Pergunta do mascote na tela (CSV fictício colado na operação de teste do responsável; nada gravado) | navegador integrado | captura `capturas/2026-11-15-pergunta-periodo-mascote.jpg` | PASSOU |
| 8 | Suíte e build (responsável, Windows, 19:12) | `npm test`, `npm run build` | 502/502 em 42 arquivos (eram 498); build ok, 116 módulos | PASSOU |

## Limitações
Data da vistoria, código do ponto e origem do município ficam para a etapa 2. Sem calendário, rota nem mapa.
