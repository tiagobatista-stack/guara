// Exportação dos pontos de uma operação para o QGIS: CSV e GeoJSON, em UTF-8 e SIRGAS 2000 (EPSG:4674).
// Funções puras que devolvem o texto do arquivo. A coordenada gravada já é SIRGAS 2000: não há conversão.
// O arquivo leva coordenadas e notas, mas nunca o título das demandas (só a contagem).

import type { Operacao, Ponto } from './modelo.ts';

/** O CSV exportado pode ser importado de volta: as oito primeiras colunas são as da planilha de operação. */
export const COLUNAS_EXPORTACAO = [
  'N_PONTO', 'EQUIPE', 'COORD_X', 'COORD_Y', 'MUNICIPIO', 'DAT_SAIDA', 'DAT_RETOR', 'NOT_PLANEJ',
  'SITUACAO', 'GRUPO', 'OPERACAO', 'N_DEMANDAS',
] as const;

export const SRC_EXPORTACAO = 'EPSG:4674';
const BOM = '﻿';

/** Texto livre para uma célula: neutraliza fórmula de planilha (= + - @) e escapa aspas, vírgula e quebra de linha. */
export function celulaTexto(valor: string | undefined): string {
  const t = (valor ?? '').replace(/\s*[\r\n]+\s*/g, ' ');
  const seguro = /^[=+\-@\t]/.test(t) ? `'${t}` : t;
  return /[",]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

function linhaDoPonto(o: Operacao, p: Ponto): string[] {
  return [
    p.numero !== undefined ? String(p.numero) : '',
    celulaTexto(p.equipe),
    String(p.coordenada.lon),
    String(p.coordenada.lat),
    celulaTexto(p.municipio),
    p.saida ?? '',
    p.retorno ?? '',
    celulaTexto(p.notas),
    p.situacao,
    celulaTexto(p.grupo),
    celulaTexto(o.nome),
    String(p.demandas.length),
  ];
}

/** CSV em UTF-8 com BOM (o Excel abre os acentos certos), separador vírgula e decimais com ponto. COORD_X é a longitude e COORD_Y a latitude. */
export function exportarCsv(o: Operacao): string {
  const linhas = [COLUNAS_EXPORTACAO.join(','), ...o.pontos.map((p) => linhaDoPonto(o, p).join(','))];
  return BOM + linhas.join('\r\n') + '\r\n';
}

/** GeoJSON com o `crs` EPSG:4674, que o QGIS lê e usa para atribuir SIRGAS 2000. Coordenadas na ordem [longitude, latitude]. */
export function exportarGeoJson(o: Operacao): string {
  const colecao = {
    type: 'FeatureCollection',
    name: o.nome,
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4674' } },
    features: o.pontos.map((p) => ({
      type: 'Feature',
      properties: {
        N_PONTO: p.numero ?? null,
        EQUIPE: p.equipe ?? null,
        MUNICIPIO: p.municipio || null,
        DAT_SAIDA: p.saida ?? null,
        DAT_RETOR: p.retorno ?? null,
        NOT_PLANEJ: p.notas || null,
        SITUACAO: p.situacao,
        GRUPO: p.grupo ?? null,
        OPERACAO: o.nome,
        N_DEMANDAS: p.demandas.length,
      },
      geometry: { type: 'Point', coordinates: [p.coordenada.lon, p.coordenada.lat] },
    })),
  };
  return JSON.stringify(colecao, null, 2) + '\n';
}

/** Nome de arquivo sem acento nem caracteres inválidos: «operacao-x-pontos-2026-09-18.csv». */
export function nomeDoArquivo(o: Pick<Operacao, 'nome'>, extensao: 'csv' | 'geojson', hoje: string): string {
  const base = o.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `${base || 'operacao'}-pontos-${hoje}.${extensao}`;
}
