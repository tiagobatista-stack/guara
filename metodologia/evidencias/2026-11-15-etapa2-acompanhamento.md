# Etapa 2 do plano de campo: código, resultado e acompanhamento (15/11/2026)

**Pedido do responsável:** o sistema ajuda a planejar a operação e também a gerenciar se todos os pontos foram finalizados, para não acumular demandas. A planilha de controle da SEMA traz CODIGO_PONTO, FISCALIZADO_AUTUADO (Sim, Fiscalizado não autuado, Não Cabe Atuação, Não), MOTIVO DE NÃO FISCALIZAR/AUTUAR (aberto; mais comuns: Área sem acesso, Infrator não localizado, Outros), NUM_PROTOCOLO (demanda e/ou auto), OBSERVACAO e TIPO_DANO (aberto).

| Mudança | Arquivo |
|---|---|
| Ponto: `codigo`, `tipoDano`, `resultado`, `motivo`, `protocolo`, `observacao`, `dataVistoria`, `reprogramado`; rótulos iguais aos da planilha; situação de acompanhamento | `operacoes/modelo.ts` |
| `gerarCodigo` (MUNICIPIO+AAAAMM-NN, sem acento nem espaço), `codigosEmUso`, `situacaoDoPonto`, `operacaoEncerrada`, `pendenciasDeCampo`, `dataLocal`; validação dos campos novos; pendência de planejamento só para ponto ainda planejado | `operacoes/regras.ts` |
| Número livre para ponto sem número; código da planilha preservado e recusado se repetido; código gerado quando há município e início (fixo depois); conflito explicado; `registrarResultado` (motivo obrigatório em "Não" e "Fiscalizado não autuado", data da vistoria não futura); `reprogramarPonto` | `operacoes/armazem.ts` |
| Importação lê CODIGO_PONTO, NUMERO_DO_PONTO, NOTA_PLANEJAMENTO e TIPO_DANO | `operacoes/importar-csv.ts` |
| Cartão do ponto: código, situação, tipo de dano, resultado; "Registrar resultado"; "Cancelar ponto"/"Reativar"; Editar com número, município e tipo de dano. Detalhe: resumo com finalizados, a reprogramar e "operação encerrada"; aviso do mascote. Lista: aviso do mascote com os pontos a reprogramar e "Reprogramar" para outra operação | `operacoes/Operacoes.tsx`, `estilos.css` |
| Painel: pontos sem resultado depois do retorno e pontos a reprogramar | `painel/Painel.tsx` |
| Testes: 9 de lógica (novo arquivo) e 6 de tela | `operacoes/acompanhamento.test.ts`, `operacoes/Operacoes.test.tsx` |

## Decisões
- Situação calculada: planejado; vistoriado, resultado pendente (legado); finalizado (Sim, Fiscalizado não autuado, Não Cabe Atuação); a reprogramar (Não); reprogramado; cancelado.
- Operação encerrada só com todos os pontos finalizados, cancelados ou reprogramados.
- Pendência de campo: ponto sem resultado cuja viagem voltou antes de hoje (data local do navegador) e ponto "Não" ainda não reprogramado.
- Reprogramar cria, na outra operação, um ponto planejado no mesmo local (demandas e tipo de dano levados; nota com o código de origem e o motivo) e marca o original como reprogramado.
- O código não muda depois de dado (mesmo mudando município ou período). Origem do município (consulta à base geo) fica para o módulo futuro.

## Testes (Plan–Act–Verify)
| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Lógica da etapa 2 e regressão das anteriores | `node --test` com shim de `describe/it/expect` | 75/75 (9 novos) | PASSOU (fora do Vitest) |
| 2 | Tipos dos arquivos alterados | `tsc` com declarações mínimas de React | sem erros | PASSOU (parcial) |
| 3 | Suíte completa e build (responsável, Windows, 19:24) | `npm test`, `npm run build` | 517/517 em 43 arquivos (eram 502; 15 novos); build ok, 116 módulos | PASSOU |
| 4 | Tela no navegador | — | servidor fechado antes da conferência | NÃO CONFERIDO VISUALMENTE |

## Limitações
Exportação ainda no layout antigo (etapa 3: layout da SEMA, `;`, vírgula decimal e reimportação dos resultados). Ficha, mapa e escopo nas etapas 5 e 6.

Observação: ficou gravada no navegador integrado (endereço 127.0.0.1:5173) uma operação fictícia "Operação fictícia (etapa 2)" para a conferência visual, que não chegou a ser feita; deve ser apagada na próxima conferência.
