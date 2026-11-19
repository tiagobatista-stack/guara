// Sugestão de bioma e vegetação de um ponto, consultada uma vez ao GeoServer da SEMA-MT (WFS) e gravada no ponto:
// a rede só é necessária ao incluir o ponto ou em "Reconsultar". Camadas e campos confirmados pelo responsável com a chave:
// Geoportal:BIOMAS_MT (BIOMA) e Geoportal:VEGETACAO_IBGE (LEGENDA, NM_PRETET, VEG_PRETET, FITOECOLOG). Ordem do ponto: lon lat.
// A chave (authkey) vai na URL: fica só no localStorage deste navegador, nunca no código, em testes ou em log. Proxy: depois, se o app
// for publicado para outros usuários. O resultado é sugestão (IBGE 1:250.000): o fiscal confirma em campo.

import type { Coordenada } from '../demandas/coordenadas.ts';

export const URL_GEOSERVER = 'https://geo.sema.mt.gov.br/geoserver/ows';
export const CHAVE_AUTHKEY = 'guara:sema:authkey:v1';

export interface SugestaoGeo {
  /** BIOMA, como no servidor ("Amazônia"). */
  bioma?: string;
  /** LEGENDA da vegetação atual, sem o prefixo numérico. */
  legenda?: string;
  /** NM_PRETET: vegetação pretérita, preenchida em áreas já antropizadas. */
  pretetita?: string;
  /** ISO 8601 da consulta. */
  quando: string;
  /** Por que não houve sugestão (sem rede, chave recusada…); nunca traz a URL nem a chave. */
  erro?: string;
}

export function lerAuthkey(): string | undefined {
  try { return localStorage.getItem(CHAVE_AUTHKEY) || undefined; } catch { return undefined; }
}

/** Grava a chave (sem espaços) ou, vazia, remove. Devolve o problema ou null. */
export function definirAuthkey(valor: string): string | null {
  const v = valor.trim();
  try {
    if (v) localStorage.setItem(CHAVE_AUTHKEY, v); else localStorage.removeItem(CHAVE_AUTHKEY);
    return null;
  } catch { return 'Este navegador não deixou gravar a chave.'; }
}

/** "1Dse - Floresta…" → "Dse - Floresta…": o servidor põe um dígito na frente da legenda. */
export const limparLegenda = (s: string): string => s.replace(/^\d+/, '').trim();

const texto = (v: unknown, max = 200): string | undefined => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

export function geoValido(x: unknown): x is SugestaoGeo {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const g = x as Record<string, unknown>;
  return typeof g.quando === 'string' && g.quando.length <= 40 &&
    (['bioma', 'legenda', 'pretetita', 'erro'] as const).every((k) => g[k] === undefined || (typeof g[k] === 'string' && g[k].length <= 200));
}

type Propriedades = Record<string, unknown>;

/** Atributos da primeira feição que cobre o ponto; erro em texto curto (sem URL) quando a consulta falha. */
async function consultar(camada: string, campos: string, c: Coordenada, chave: string, f: typeof fetch): Promise<{ props?: Propriedades; erro?: string }> {
  const q = new URLSearchParams({
    service: 'WFS', request: 'GetFeature', typeName: camada, propertyName: campos, outputFormat: 'json',
    CQL_FILTER: `INTERSECTS(SHAPE,POINT(${c.lon} ${c.lat}))`, authkey: chave,
  });
  try {
    const r = await f(`${URL_GEOSERVER}?${q.toString().replace(/\+/g, '%20')}`); // espaço como %20: o '+' literal já saiu como %2B
    if (!r.ok) return { erro: r.status === 401 || r.status === 403 ? `chave recusada pelo servidor (HTTP ${r.status})` : `servidor respondeu HTTP ${r.status}` };
    const j = (await r.json()) as { features?: { properties?: Propriedades }[] };
    return { props: j.features?.[0]?.properties ?? {} };
  } catch (e) {
    return { erro: e instanceof SyntaxError ? 'resposta inesperada do servidor' : 'sem rede ou bloqueio do navegador (CORS)' };
  }
}

/** Consulta bioma e vegetação do ponto. Nunca lança: a falha vira `erro` e o ponto segue sem sugestão. */
export async function consultarSugestao(c: Coordenada, chave: string, f: typeof fetch = fetch, quando = new Date().toISOString()): Promise<SugestaoGeo> {
  const [b, v] = await Promise.all([
    consultar('Geoportal:BIOMAS_MT', 'BIOMA', c, chave, f),
    consultar('Geoportal:VEGETACAO_IBGE', 'LEGENDA,NM_PRETET', c, chave, f),
  ]);
  const bioma = texto(b.props?.BIOMA);
  const legenda = texto(v.props?.LEGENDA);
  const pretetita = texto(v.props?.NM_PRETET);
  const erro = v.erro ?? b.erro ?? (bioma || legenda ? undefined : 'sem informação do servidor para este ponto');
  return { ...(bioma ? { bioma } : {}), ...(legenda ? { legenda: limparLegenda(legenda) } : {}), ...(pretetita ? { pretetita } : {}), quando, ...(erro ? { erro } : {}) };
}
