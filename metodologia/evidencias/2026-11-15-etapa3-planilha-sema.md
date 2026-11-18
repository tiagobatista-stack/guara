# Etapa 3 do plano de campo: planilha da SEMA nos dois sentidos (15/11/2026)

**Pedido do responsável:** a planilha de controle da operação (MES_PPROG, CODIGO_PONTO, NUMERO_DO_PONTO, EQUIPE, COORD_X, COORD_Y, MUNICIPIO, DATA_SAIDA, DATA_RETORNO, NOTA_PLANEJAMENTO, SERVIDOR_EQUIPE, FISCALIZADO_AUTUADO, MOTIVO DE NÃO FISCALIZAR/AUTUAR, NUM_PROTOCOLO, OBSERVACAO, LONGITUDE, LATITUDE, AG_FISCALIZACAO; TIPO_DANO quando houver) deve entrar e sair do sistema. COORD_X/COORD_Y (graus) e LONGITUDE/LATITUDE (decimal com vírgula) são a mesma coordenada. AG_FISCALIZACAO é o setor (ex.: DUDJUINA). Na reimportação, o sistema prevalece no planejamento.

| Mudança | Arquivo |
|---|---|
| `Operacao.setor`; `PontoNovo.integrantes` | `operacoes/modelo.ts` |
| `resultadoDaPlanilha`; integrantes da linha entram na viagem; validação do setor | `operacoes/regras.ts` |
| Importação: colunas de resultado, servidores, setor; COORD_X/COORD_Y valem e LONGITUDE/LATITUDE conferem (aviso acima de 50 m) ou substituem; avisos por linha; tira o apóstrofo anti-fórmula | `operacoes/importar-csv.ts` |
| Reimportação: casa pelo código (ou número), preenche só o vazio, lista diferenças, recusa código de outra operação, número com outro código e linha repetida | `operacoes/reimportar.ts` (novo) |
| `definirSetor`, `aplicarAtualizacoes` | `operacoes/armazem.ts` |
| `exportarPlanilhaSema` (19 colunas, `;`, vírgula decimal, graus com 3 casas, BOM, ordem por número) | `operacoes/exportar.ts` |
| Prévia com novos, atualizações e diferenças; setor tirado do arquivo; campo do setor; botões "Exportar planilha da SEMA", "Exportar CSV (QGIS)", "Exportar GeoJSON (QGIS)" | `operacoes/Operacoes.tsx` |
| Testes: 9 de lógica (novo arquivo); tela: exportação atualizada e reimportação (novo) | `operacoes/planilha.test.ts`, `operacoes/Operacoes.test.tsx` |

## Decisões
- MES_PPROG é exportado a partir do início da operação (ou da saída da viagem); na importação não é usado (o código usa o início da operação).
- TIPO_DANO vai na 19ª coluna, depois de AG_FISCALIZACAO, para não deslocar as colunas da planilha.
- A planilha da SEMA leva os nomes dos servidores (SERVIDOR_EQUIPE); o CSV e o GeoJSON do QGIS continuam sem nomes.
- Reimportação: o que já está preenchido no sistema não é trocado; a diferença aparece na prévia.

## Testes (Plan–Act–Verify)
| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Lógica (9 novos) e regressão | `node --test` com shim | 84/84 | PASSOU (fora do Vitest) |
| 2 | Tipos | `tsc` com declarações mínimas de React | sem erros | PASSOU (parcial) |
| 3 | Suíte completa e build | `npm test`, `npm run build` | 558/558 e build ok no branch `integracao-operacoes` (18/11/2026, após o merge com o `main`; inclui importação das planilhas de teste de ponta a ponta) | PASSOU |
| 4 | Abrir a planilha exportada no Excel | — | — | NÃO TESTADO |
| 5 | Tela no navegador | — | — | NÃO CONFERIDO VISUALMENTE |
