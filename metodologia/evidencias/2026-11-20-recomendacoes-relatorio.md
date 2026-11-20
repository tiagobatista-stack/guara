# Recomendações do relatório (ficha 01 GUARÁ, páginas 7 a 11) — 20/11/2026

Base: branch `operacoes-campo`, commit `758453f`. Mudanças **não commitadas, não publicadas**. Dados fictícios. Fonte das recomendações: `F:\claude\relatorio_projetos_formacao_claude_code_final.pdf` (a análise do relatório foi feita sobre o SHA `8db3d62`, da `main`).

## O que mudou

| Item do relatório | Mudança | Arquivos |
|---|---|---|
| P1 fluxo usa demanda fixa | `executarFluxoPadrao(catalogo, agentes, inativos, demanda)` recebe a demanda (padrão: a primeira, como antes). O documento vem de `demanda.documentos`; sem documento, falha explícita na extração. Demanda sem `ficticio: true` é recusada. A saída traz `entrada` e `modo`. A tela Saúde do sistema escolhe a demanda e mostra entrada e modo | `backend/.../_compartilhado/fluxo-padrao.ts`, `padroes-orquestracao.ts`, `habilidades/registrar-demanda/autoteste.ts` (busca por id, não por índice), `dados-ficticios/{demandas,documentos}.ts` (caso sintético `DEM-FIC-0101`, só do fluxo), `SaudeDoSistema.tsx` |
| Conectar o fluxo à demanda escolhida (assistente) | Demanda em foco (id, só em memória) e comando "demanda" do assistente (fato, inferência, sugestão) | `assistente/demanda-em-foco.ts`, `sobre-demanda.ts`, `PainelAssistente.tsx`, `Demandas.tsx` |
| Caráter determinístico visível | "método: determinístico (regras locais, sem modelo de IA)" em toda fala do assistente; `modo` na saída do fluxo e na tela | idem |
| P2 exportação MCP rastreável | Bloco `origem` no `guara-dados.json`; respostas do MCP em `{rastreio, resultado}` com sha256, data, idade, aviso acima de 24 h; ferramenta `consultar_demanda` | `dados-portaveis.ts`, `Alertas.tsx`, `servidor-mcp/{consultas,servidor,testar-servidor}.ts`, `servidor-mcp/README.md` |
| P2 README | Requisito de Node corrigido, resumo de teste, commit e publicação | `README.md` |
| Registro | Esta evidência; STATUS (cabeçalho, itens 49d–49n, nova linha) | `gestao/STATUS.md` |

## Casos (todos PASSOU)

| Caso | Onde | Resultado |
|---|---|---|
| **Válido** | Fluxo com `DEM-FIC-0001` e com `DEM-FIC-0101`: as duas liberam; cada trilha tem o próprio processo, documento, minuta e pendências (A: RL-05 e RL-06; B: só RL-06); o texto de uma não contém o processo da outra | `testes/integracao/fluxo-padrao.test.ts` |
| **Falha** | Fluxo com `DEM-FIC-0002` (sem documento): etapa `extrair-documento` FALHA, gate bloqueia, `liberado = false`, `modo` presente | idem; na tela, `SaudeDoSistema.test.tsx` |
| **Negado** | Demanda sem `ficticio: true` não entra no fluxo (1 etapa FALHA, nada consolidado) | idem |
| Válido / negado / falha (assistente) | Com o detalhe aberto responde fato, inferência e sugestão; sem demanda aberta orienta; foco que sumiu dos dados diz "não encontrei" | `assistente/demanda-em-foco.test.tsx` |
| Válido / falha / negado (MCP) | `consultar_demanda(DEM-FIC-0001)` com rastro; `NAO-EXISTE` dá `isError`; caminho fora de `servidor-mcp/dados/` bloqueado | `node servidor-mcp/testar-servidor.ts` |
| Idade da exportação | 4 h sem aviso; 138,4 h (a exportação de 14/11) com aviso "podem NÃO refletir a tela"; sem data com aviso | idem |

## Execução

| Verificação | Resultado |
|---|---|
| `npm test` | **PASSOU**: 684/684 em 59 arquivos |
| `npm run build` | **PASSOU** |
| Hook (`python -m unittest testes/unidade/test_hook_verificar_comando.py`) | **PASSOU**: 8/8 |
| Cliente MCP (`node servidor-mcp/testar-servidor.ts`) | **PASSOU**: 4 ferramentas, 4 = 4 |

## Mudança de contrato do MCP

Toda resposta de sucesso passou de `<resultado>` para `{ "rastreio": {...}, "resultado": <resultado> }`. Quem consumia o formato antigo precisa ler `resultado`. A ferramenta `resumir_demandas` perdeu o campo `arquivo` no corpo (agora está em `rastreio.arquivo`, só o nome do arquivo, não o caminho completo). `guara-dados.json` ganhou `origem` (opcional; arquivos antigos continuam válidos; `versao: 1`).

## Limitações

- O `sha256` é calculado pelo MCP ao ler o arquivo: mostra que o arquivo não mudou depois da leitura, não que saiu íntegro do navegador.
- O aviso de idade mostra que a exportação pode estar velha; ele não detecta a edição no navegador depois de exportar.
- O fluxo de agentes roda sobre demandas **fictícias** do catálogo de dados sintéticos, não sobre as demandas do localStorage do app: elas não têm documento nem o formato do fluxo. A escolha é feita na tela Saúde do sistema, não na lista de Demandas. Ligar as demandas reais ao fluxo ficou **planejado**, e exige um modelo de documento que não existe.
- Só duas demandas têm documento fictício (`DEM-FIC-0001` e `DEM-FIC-0101`); as outras mostram a falha controlada. O padrão D (paralelo) continua NÃO DEMONSTRADO.
- Autorização no servidor: não há servidor no MVP. Não implementado.
- O `guara-dados.json` em `servidor-mcp/dados/` é o de 14/11 e não tem `origem`; ele aciona o aviso de idade.
- Telas e celular: NÃO CONFERIDO VISUALMENTE (jsdom). Sem commit, push ou deploy. Não houve auditoria por subagente nesta rodada.
