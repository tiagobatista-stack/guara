# Operações e planejamento de viagens (15/11/2026)

**Pedido do responsável:** além das demandas da carga do analista, há operações de fiscalização encaminhadas por terceiros, em uma semana, com lista de pontos ou processos. Exemplo: `documentacao/planilha_operacao_anonima.xlsx` (10 pontos; colunas N_PONTO, EQUIPE, COORD_X, COORD_Y, MUNICIPIO, DAT_SAIDA, DAT_RETOR, NOT_PLANEJ). Pontos podem ser agrupados, ligados a processos existentes e virar processos; o mesmo local pode voltar em demandas futuras, então a localização identifica o ponto. **Base:** `main` (`4d7a32a`).

| Mudança | Arquivo |
|---|---|
| Tipos `Operacao` e `Ponto`, limites e chave `guara:operacoes:v1` | `aplicacao/src/modulos/operacoes/modelo.ts` |
| Validação, sem equipe / sem data, contagem do Painel, distância (haversine) e `pontosProximos` | `operacoes/regras.ts` |
| Armazém local (reaproveita `criarListaLocal` e `novoId` de `atalhos/lista-local.ts`) | `operacoes/armazem.ts` |
| Importação CSV (`;`, `,` ou tabulação; UTF-8 com recuo para Windows-1252; datas DD/MM/AAAA ou ISO) com erro por linha | `operacoes/importar-csv.ts` |
| Telas: operações, importação com prévia, pontos, equipe/datas, grupo, situação, ligar/desligar demanda, criar demanda a partir do ponto | `operacoes/Operacoes.tsx` |
| Item "Operações" no menu, ícone, rota e aviso no Painel | `nucleo/registro-modulos.ts`, `compartilhado/Icone.tsx`, `nucleo/Aplicacao.tsx`, `painel/Painel.tsx` |

## Decisões
- O ponto tem identidade própria (coordenada) e vínculo opcional e múltiplo com demandas; "vistoriado" é marcação humana.
- "Local já visitado" é sugestão com origem e data (operação, equipe, situação, data, distância), até 200 m, cruzando todas as operações e as coordenadas das demandas.
- Linha de CSV com problema **não entra**: a prévia lista o motivo e a pessoa corrige o arquivo. A planilha de exemplo tem retorno anterior à saída: é acusado, não corrigido.
- A aspa só abre célula no começo dela, porque as aspas dos segundos (11° 28' 09,2" S) vêm no meio do texto.
- O aviso de conflito de equipe do plano foi **retirado**: na planilha a mesma equipe percorre vários municípios na mesma viagem, e a regra acusaria falso alarme em todo ponto.
- Dados só no navegador, fora do backup JSON, da tela compartilhada e do MCP (lista branca inalterada). A planilha foi lida só para entender o formato; nenhum dado dela foi copiado para o repositório.

## Testes (Plan–Act–Verify)
| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Regras, armazém e importação | `npm test` (aplicacao) | 439/439 em 40 arquivos (eram 402; 37 novos) | PASSOU |
| 2 | Telas (7 testes) e aviso do Painel (1) | idem | incluídos no total | PASSOU |
| 3 | Build | `npm run build` | ok | PASSOU |
| 4 | MCP | `node testar-servidor.ts` | total 4 = 4 | PASSOU |
| 5 | Planilha `.xlsx` real importada pela tela | — | só o formato lido; CSV de exemplo é fictício | NÃO TESTADO |
| 6 | Telas no navegador | — | — | NÃO CONFERIDO VISUALMENTE |

## Limitações
Raio de 200 m fixo na tela; `.xlsx` direto não lê; operações fora do backup (limpar os dados do navegador apaga); sem calendário, rota nem mapa. Não publicado.

## Período opcional (15/11/2026, pedido do responsável)
O CSV costuma trazer as datas; sem CSV, o período é opcional.
- `inicio` e `fim` da operação são opcionais (sem migração: operações já gravadas continuam válidas); com os dois, o fim não vem antes do início.
- Na importação, o período informado vale e as datas do arquivo são conferidas contra ele. Sem período (ou com só um lado), a prévia mostra "Período tirado do arquivo" e, ao importar, só o lado que falta é preenchido (menor e maior data das linhas **válidas**).
- `alterarPeriodo` define ou limpa o período depois, recusando o que deixaria pontos de fora.
- Arquivos: `operacoes/modelo.ts`, `regras.ts` (`periodoDosPontos`), `armazem.ts` (`alterarPeriodo`, `incluirPontos`), `importar-csv.ts` (`periodoDoArquivo`), `Operacoes.tsx`.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 7 | Testes | `npm test` (aplicacao) | 451/451 em 40 arquivos (eram 439; 12 novos) | PASSOU |
| 8 | Build e MCP | `npm run build`; `node testar-servidor.ts` | ok; 4 = 4 | PASSOU |
| 9 | Tela no navegador | — | — | NÃO CONFERIDO VISUALMENTE |

## Agrupar pontos (15/11/2026, relato do responsável: "pouco intuitivo")
Antes, o grupo era um texto digitado ponto a ponto em Editar. Agora: caixa de seleção por ponto, "Selecionar todos os visíveis", campo "Nome do grupo" com sugestão dos grupos existentes, **Agrupar selecionados** e **Tirar do grupo**; a lista mostra uma seção por grupo (nome, quantidade e equipes) e "Sem grupo" por último; filtro "Grupo". Sem nenhum grupo, a lista continua simples. Equipe e grupo são independentes. Arquivos: `operacoes/regras.ts` (`agruparPontos`, `nomesDeGrupos`), `armazem.ts` (`definirGrupo`, uma gravação para vários pontos), `Operacoes.tsx`.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 10 | Testes | `npm test` (aplicacao) | 483/483 em 41 arquivos (eram 477; 6 novos) | PASSOU |
| 11 | Build e tipos | `npm run build`; `tsc --noEmit` | ok | PASSOU |
| 12 | Tela no navegador | — | — | NÃO CONFERIDO VISUALMENTE |
