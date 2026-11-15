// Exportação dos pontos de uma operação para o QGIS: CSV e GeoJSON, em UTF-8 e SIRGAS 2000 (EPSG:4674).
// Funções puras que devolvem o texto do arquivo. A coordenada gravada já é SIRGAS 2000: não há conversão.
// O arquivo leva coordenadas e notas, mas nunca o título das demandas (só a contagem).

import { RESULTADOS, type Operacao, type Ponto } from './modelo.ts';
import { viagemDoPonto } from './regras.ts';

/**
 * O CSV exportado pode ser importado de volta: as oito primeiras colunas são as da planilha de operação.
 * Equipe, saída e retorno vêm da viagem do ponto. Integrantes e veículos não saem no arquivo (nomes de pessoas).
 */
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
  const v = viagemDoPonto(o, p);
  return [
    p.numero !== undefined ? String(p.numero) : '',
    celulaTexto(v?.equipe),
    String(p.coordenada.lon),
    String(p.coordenada.lat),
    celulaTexto(p.municipio),
    v?.saida ?? '',
    v?.retorno ?? '',
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
    features: o.pontos.map((p) => ({ p, v: viagemDoPonto(o, p) })).map(({ p, v }) => ({
      type: 'Feature',
      properties: {
        N_PONTO: p.numero ?? null,
        EQUIPE: v?.equipe || null,
        MUNICIPIO: p.municipio || null,
        DAT_SAIDA: v?.saida ?? null,
        DAT_RETOR: v?.retorno ?? null,
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
export function nomeDoArquivo(o: Pick<Operacao, 'nome'>, extensao: 'csv' | 'geojson', hoje: string, sufixo = 'pontos'): string {
  const base = o.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return `${base || 'operacao'}-${sufixo}-${hoje}.${extensao}`;
}

// ---------- Planilha de controle da SEMA ----------

/** Colunas da planilha de controle da operação, na ordem dela (pedido do responsável, 15/11/2026); TIPO_DANO no fim. */
export const COLUNAS_SEMA = [
  'MES_PPROG', 'CODIGO_PONTO', 'NUMERO_DO_PONTO', 'EQUIPE', 'COORD_X', 'COORD_Y', 'MUNICIPIO', 'DATA_SAIDA', 'DATA_RETORNO',
  'NOTA_PLANEJAMENTO', 'SERVIDOR_EQUIPE', 'FISCALIZADO_AUTUADO', 'MOTIVO DE NÃO FISCALIZAR/AUTUAR', 'NUM_PROTOCOLO', 'OBSERVACAO',
  'LONGITUDE', 'LATITUDE', 'AG_FISCALIZACAO', 'TIPO_DANO',
] as const;

/** Célula para CSV com `;` (Excel em português): neutraliza fórmula e escapa aspas, `;` e quebra de linha. */
export function celulaPlanilha(valor: string | undefined): string {
  const t = (valor ?? '').replace(/\s*[\r\n]+\s*/g, ' ');
  const seguro = /^[=+\-@\t]/.test(t) ? `'${t}` : t;
  return /[";]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** Um eixo em graus, minutos e segundos com 3 casas e vírgula, como na planilha: 58° 38' 26,123" W. */
export function gmsEixo(valor: number, positivo: string, negativo: string): string {
  const milesimos = Math.round(Math.abs(valor) * 3600 * 1000);
  const g = Math.floor(milesimos / 3_600_000);
  const m = Math.floor((milesimos - g * 3_600_000) / 60_000);
  const s = (milesimos - g * 3_600_000 - m * 60_000) / 1000;
  return `${g}° ${m}' ${s.toFixed(3).replace('.', ',')}" ${valor < 0 ? negativo : positivo}`;
}

const decimalVirgula = (v: number) => v.toFixed(8).replace('.', ',');
const dataPlanilha = (d?: string) => (d ? d.split('-').reverse().join('/') : '');

function linhaSema(o: Operacao, p: Ponto): string[] {
  const v = o.viagens.find((x) => x.id === p.viagem);
  const mes = (o.inicio ?? v?.saida ?? '').slice(0, 7).replace('-', '');
  return [
    mes,
    celulaPlanilha(p.codigo),
    p.numero !== undefined ? String(p.numero) : '',
    celulaPlanilha(v?.equipe),
    celulaPlanilha(gmsEixo(p.coordenada.lon, 'E', 'W')),
    celulaPlanilha(gmsEixo(p.coordenada.lat, 'N', 'S')),
    celulaPlanilha(p.municipio),
    dataPlanilha(v?.saida),
    dataPlanilha(v?.retorno),
    celulaPlanilha(p.notas),
    celulaPlanilha(v?.integrantes.join(' / ')),
    p.resultado ? RESULTADOS[p.resultado] : '',
    celulaPlanilha(p.motivo),
    celulaPlanilha(p.protocolo),
    celulaPlanilha(p.observacao),
    decimalVirgula(p.coordenada.lon),
    decimalVirgula(p.coordenada.lat),
    celulaPlanilha(o.setor),
    celulaPlanilha(p.tipoDano),
  ];
}

/**
 * Planilha de controle da SEMA: UTF-8 com BOM, separador `;` e vírgula decimal (o Excel em português abre direto).
 * Leva nomes dos integrantes (SERVIDOR_EQUIPE): guarde e compartilhe conforme a classificação dos dados.
 */
export function exportarPlanilhaSema(o: Operacao): string {
  const pontos = [...o.pontos].sort((a, b) => (a.numero ?? 1e9) - (b.numero ?? 1e9));
  const linhas = [COLUNAS_SEMA.join(';'), ...pontos.map((p) => linhaSema(o, p).join(';'))];
  return BOM + linhas.join('\r\n') + '\r\n';
}
