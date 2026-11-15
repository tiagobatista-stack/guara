# Evidência — preferências do mascote no backup (14/11/2026)

**Pedido do responsável:** "próximo item do backlog" (`gestao/BACKLOG.md`, plano dos mascotes, item 1: exportar e importar não levavam `guara:mascote:v1`). Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Campo opcional `mascote` (principal e nomes) no arquivo exportado; o formato continua `versao: 1` e arquivos antigos, sem o campo, seguem válidos. Na importação, o campo passa por `validarPreferencias`: parte inválida volta ao padrão em vez de recusar o arquivo (é preferência visual) | `aplicacao/src/modulos/alertas/dados-portaveis.ts` |
| `definirPreferencias` substitui as preferências inteiras | `aplicacao/src/compartilhado/preferencias-mascote.ts` |
| Exportar leva as preferências atuais; depois de importação confirmada e gravada, a preferência do arquivo é aplicada; arquivo sem o campo não mexe na preferência | `aplicacao/src/modulos/alertas/Alertas.tsx` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Novo: exportação contém `mascote`; importação aplica o principal e os nomes do arquivo, descartando nome inválido | `Alertas.test.tsx` | conferido na suíte | PASSOU |
| 2 | Novo: arquivo antigo (sem `mascote`) importa sem alterar a preferência | `Alertas.test.tsx` | conferido na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Tests 306 passed (306)` | PASSOU |
| 4 | Build | `npm run build` | `✓ built`, `index-C_dI661j.js` | PASSOU |

## Limitações

- "Desfazer última importação" restaura demandas e limiar, mas **não** a preferência do mascote (fica fora do armazém das demandas). Anotado no backlog.
- O servidor MCP ignora o campo novo (só lê `demandas` e `configuracao`); não foi reexecutado.
- Telas: NÃO CONFERIDO VISUALMENTE. Não publicado.
