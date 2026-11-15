# Exportar os pontos da operação para o QGIS (15/11/2026)

**Pedido do responsável:** quando a operação receber novos pontos, a lista pode ser exportada em **novo CSV ou GeoJSON compatível com o QGIS, em UTF-8 e SIRGAS 2000**. **Base:** `main` (`120fc45`).

| Mudança | Arquivo |
|---|---|
| `exportarCsv`, `exportarGeoJson`, `celulaTexto`, `nomeDoArquivo` (funções puras) | `aplicacao/src/modulos/operacoes/exportar.ts` (novo) |
| Cartão "Exportar pontos" (CSV e GeoJSON), instruções do QGIS, aviso de privacidade e lembrete após importar | `operacoes/Operacoes.tsx` |

## Formato
- **CSV:** UTF-8 com BOM, separador vírgula, decimais com ponto, datas ISO. Colunas `N_PONTO, EQUIPE, COORD_X, COORD_Y, MUNICIPIO, DAT_SAIDA, DAT_RETOR, NOT_PLANEJ, SITUACAO, GRUPO, OPERACAO, N_DEMANDAS`. `COORD_X` = longitude, `COORD_Y` = latitude. **Reimportável:** as oito primeiras colunas são as da planilha (teste de ida e volta).
- **GeoJSON:** `FeatureCollection`, `Point` em `[lon, lat]`, `crs` `urn:ogc:def:crs:EPSG::4674`, propriedades com os mesmos nomes do CSV, `.geojson`, `application/geo+json`.
- **SIRGAS 2000:** a coordenada gravada já é SIRGAS 2000; não há conversão. A especificação RFC 7946 só prevê WGS84, e o `crs` é o formato que o QGIS/GDAL lê; a diferença em graus entre os dois é inferior a 1 m.
- **Segurança do CSV:** texto livre iniciado por `=`, `+`, `-` ou `@` ganha apóstrofo (não vira fórmula); aspas, vírgulas e quebras de linha são escapadas.
- **Privacidade:** o arquivo leva coordenadas e notas (aviso na tela); título e ids de demandas **não** vão, só a contagem.
- Exporta todos os pontos da operação (inclusive cancelados, coluna `SITUACAO`), não só os filtrados.

## Testes (Plan–Act–Verify)
| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Formato, BOM, ordem lon/lat, escape, anti-fórmula, `crs`, nome do arquivo, ida e volta com o importador | `npm test` (aplicacao) | incluídos em 477/477 | PASSOU |
| 2 | Tela: botões desabilitados sem pontos; download com nome, tipo e bytes do BOM certos | idem | incluído | PASSOU |
| 3 | Abrir os arquivos no **QGIS** | — | sem QGIS na máquina | NÃO TESTADO |
| 4 | Telas no navegador | — | — | NÃO CONFERIDO VISUALMENTE |

## Limitações
`Blob.text()` descarta o BOM ao ler; o teste confere os bytes. Não publicado.
