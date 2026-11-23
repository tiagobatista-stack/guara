// Consulta automática do ponto às bases do GeoServer da SEMA-MT (WFS, mesma URL base e authkey de bioma e vegetação).
// Sem geometria na resposta. Lista vazia = "vazio"; erro, 403 ou 15 s sem resposta = "falha" (no relatório vira [CONSULTA NÃO REALIZADA]).
// A authkey vai na URL: nunca aparece em log, em mensagem de erro ou no registro gravado.

import type { Coordenada } from '../demandas/coordenadas.ts';
import { BASES_CONSULTA, type BaseConsulta, type ConsultaBase } from './modelo.ts';
import { consultarSugestao, URL_GEOSERVER, type SugestaoGeo } from './sugestao-vegetacao.ts';

export const TEMPO_LIMITE_MS = 15_000;
const LIMITE_DETALHE = 200;
/** Camadas _PONTO: busca por caixa de ±0,0045° (≈ 500 m) em volta do ponto; fora do raio equivalente, o registro é descartado. */
export const DELTA_PROXIMIDADE_GRAUS = 0.0045;
const RAIO_PROXIMIDADE_M = DELTA_PROXIMIDADE_GRAUS * 111_195;
const MAXIMO_PROXIMOS = 3;

/** Distância em metros entre duas coordenadas (haversine). */
export function distanciaM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** Dados pessoais e do proprietário: nunca vão em propertyName (CAR, embargos e autos). */
export const CAMPOS_PROIBIDOS = ['NOME', 'NOMESPROPRIETARIOS', 'CPF_CNPJ', 'PROPRIEDAD'] as const;
const BASES_COM_DADOS_PESSOAIS = new Set<BaseConsulta>(['car', 'embargos', 'autos']);

interface Camada {
  nome: string;
  /** Campos confirmados com a chave: pedidos sem DescribeFeatureType. */
  confirmados?: string[];
  /** Campos prováveis: só os que a camada tem (DescribeFeatureType) são pedidos. */
  candidatos?: string[];
  /** Quais campos entram no detalhe (padrão: os pedidos). */
  exibir?: string[];
  /** Camada de pontos: busca por proximidade (BBOX) e distância até o ponto, em vez de INTERSECTS. */
  pontual?: boolean;
}

const CAMPOS_EMBARGO = ['NUMERO_TERMO', 'T_EMBARGO', 'NUMERO_PROCESSO', 'N_PROCESSO', 'DAT_LAVRAT'];
const CAMPOS_AUTO = ['NUMERO_AUTO', 'NUMERO', 'A_INFRAC', 'N_PROCESSO', 'DAT_LAVRAT'];
const CAMPOS_TI = ['NOME_TI_AB', 'NOMETI', 'NOME', 'ETNIA'];
const CAMPOS_UC = ['NOME', 'CATEGORIA', 'JURISDICAO'];

export const CAMADAS: Record<Exclude<BaseConsulta, 'bioma' | 'vegetacao'>, Camada[]> = {
  car: [{ nome: 'Geoportal:MVW_REQUERIMENTO_ATP', confirmados: ['NUMEROESTADUAL', 'SITUACAO', 'AREA_HA'], exibir: ['NUMEROESTADUAL', 'SITUACAO'] }],
  embargos: [
    { nome: 'Geoportal:AREAS_EMBARGADAS_SEMA', confirmados: ['T_EMBARGO', 'N_PROCESSO', 'DAT_LAVRAT'] },
    { nome: 'Geoportal:AREA_EMBARGADA_SIGA_POLIGONO', candidatos: CAMPOS_EMBARGO },
    { nome: 'Geoportal:AREA_EMBARGADA_SIGA_PONTO', candidatos: CAMPOS_EMBARGO, pontual: true },
  ],
  autos: [
    { nome: 'Geoportal:AUTOS_DE_INFRACAO_SIGA_POLIGONO', candidatos: CAMPOS_AUTO },
    { nome: 'Geoportal:AUTOS_DE_INFRACAO_SIGA_PONTO', candidatos: CAMPOS_AUTO, pontual: true },
  ],
  ti: [{ nome: 'Geoportal:TERRAS_INDIGENAS', candidatos: CAMPOS_TI }],
  uc: [{ nome: 'Geoportal:UNIDADES_CONSERVACAO', candidatos: CAMPOS_UC }],
  amortecimento: [
    { nome: 'Geoportal:TI_AMORTECIMENTO', candidatos: CAMPOS_TI },
    { nome: 'Geoportal:UC_AMORTECIMENTO', candidatos: CAMPOS_UC },
  ],
};

// ---------- Rede ----------

/** `fetch` com limite de tempo na requisição inteira: passou de 15 s (cabeçalho ou corpo), aborta e a consulta vira falha. O corpo já vem lido. */
const comTempo = (f: typeof fetch, ms = TEMPO_LIMITE_MS): typeof fetch => async (entrada, opcoes) => {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), ms);
  try {
    const r = await f(entrada, { ...opcoes, signal: controle.signal });
    const corpo = await r.text();
    return { ok: r.ok, status: r.status, text: async () => corpo, json: async () => JSON.parse(corpo) } as Response;
  } finally { clearTimeout(relogio); }
};

const montarUrl = (params: Record<string, string>) => `${URL_GEOSERVER}?${new URLSearchParams(params).toString().replace(/\+/g, '%20')}`;

const mensagemDeErro = (status: number) => (status === 401 || status === 403 ? `chave recusada pelo servidor (HTTP ${status})` : `servidor respondeu HTTP ${status}`);
const mensagemDeExcecao = (e: unknown) => (e instanceof SyntaxError ? 'resposta inesperada do servidor' : 'sem rede, tempo esgotado ou bloqueio do navegador (CORS)');

// ---------- DescribeFeatureType (uma vez por sessão, em cache) ----------

interface Descricao { campos: Set<string>; geometria: string }
const descricoes = new Map<string, Promise<Descricao | null>>();
export const limparCacheDeCampos = () => descricoes.clear();

async function descrever(camada: string, chave: string, f: typeof fetch): Promise<Descricao | null> {
  const emCache = descricoes.get(camada);
  if (emCache) return emCache;
  const busca = (async (): Promise<Descricao | null> => {
    try {
      const r = await f(montarUrl({ service: 'WFS', version: '2.0.0', request: 'DescribeFeatureType', typeName: camada, outputFormat: 'application/json', authkey: chave }));
      if (!r.ok) return null;
      const j = (await r.json()) as { featureTypes?: { properties?: { name?: string; type?: string }[] }[] };
      const props = (j.featureTypes?.[0]?.properties ?? []).filter((p): p is { name: string; type?: string } => typeof p.name === 'string');
      if (props.length === 0) return null;
      // Para o responsável confirmar os campos reais; nunca inclui a chave.
      console.info(`[GeoServer] ${camada}: ${props.map((p) => p.name).join(', ')}`);
      return { campos: new Set(props.map((p) => p.name)), geometria: props.find((p) => p.type?.startsWith('gml:'))?.name ?? 'SHAPE' };
    } catch { return null; }
  })();
  descricoes.set(camada, busca);
  const d = await busca;
  if (!d) descricoes.delete(camada); // falha passageira não fica gravada na sessão
  return d;
}

// ---------- Consulta de uma camada ----------

type Propriedades = Record<string, unknown>;
interface ItemEncontrado { chave: string; texto: string }
interface Proximo { m: number; texto: string; chave?: string }
interface ResultadoCamada { itens: ItemEncontrado[]; proximos?: Proximo[]; erro?: string }

/** Nº do termo de embargo ou do auto, para reconhecer o mesmo registro no polígono e no ponto. */
function chaveDoNumero(base: BaseConsulta, props: Propriedades): string | undefined {
  const n = base === 'embargos' ? comoTexto(props.NUMERO_TERMO) || comoTexto(props.T_EMBARGO)
    : base === 'autos' ? comoTexto(props.NUMERO_AUTO) || comoTexto(props.NUMERO) || comoTexto(props.A_INFRAC) : '';
  return n ? `${base}-n:${semAcento(n)}` : undefined;
}

/** Primeira coordenada [lon, lat] de uma geometria Point ou MultiPoint do GeoJSON. */
function coordenadaDaFeicao(g: unknown): { lat: number; lon: number } | null {
  const geo = g as { type?: string; coordinates?: unknown } | null | undefined;
  const par = geo?.type === 'Point' ? geo.coordinates : geo?.type === 'MultiPoint' && Array.isArray(geo.coordinates) ? geo.coordinates[0] : undefined;
  return Array.isArray(par) && typeof par[0] === 'number' && typeof par[1] === 'number' ? { lon: par[0], lat: par[1] } : null;
}

const comoTexto = (v: unknown): string => {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  const t = String(v).trim();
  const data = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  return data ? `${data[3]}/${data[2]}/${data[1]}` : t;
};
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "Primeiro (segundo, terceiro)"; valores repetidos entre campos (ex.: NOME_TI_AB e NOMETI) entram uma vez. */
function descrever1(props: Propriedades, campos: readonly string[]): string {
  const vistos = new Set<string>();
  const partes: string[] = [];
  for (const c of campos) {
    const v = comoTexto(props[c]);
    if (!v || vistos.has(semAcento(v))) continue;
    vistos.add(semAcento(v));
    partes.push(v);
  }
  return partes.length > 1 ? `${partes[0]} (${partes.slice(1).join(', ')})` : partes[0] ?? '';
}

export const seguros = (base: BaseConsulta, campos: readonly string[]): string[] =>
  BASES_COM_DADOS_PESSOAIS.has(base) ? campos.filter((c) => !(CAMPOS_PROIBIDOS as readonly string[]).includes(c.toUpperCase())) : [...campos];

async function consultarCamada(base: BaseConsulta, camada: Camada, c: Coordenada, chave: string, f: typeof fetch): Promise<ResultadoCamada> {
  let campos = camada.confirmados ?? [];
  let geometria = 'SHAPE';
  if (!camada.confirmados) {
    const d = await descrever(camada.nome, chave, f);
    if (d) { geometria = d.geometria; campos = (camada.candidatos ?? []).filter((x) => d.campos.has(x)); }
  }
  campos = seguros(base, campos);
  const d = DELTA_PROXIMIDADE_GRAUS;
  const filtro = camada.pontual
    ? `BBOX(${geometria},${+(c.lon - d).toFixed(6)},${+(c.lat - d).toFixed(6)},${+(c.lon + d).toFixed(6)},${+(c.lat + d).toFixed(6)})`
    : `INTERSECTS(${geometria},POINT(${c.lon} ${c.lat}))`;
  const comum = { service: 'WFS', request: 'GetFeature', typeName: camada.nome, outputFormat: 'application/json', CQL_FILTER: filtro, authkey: chave };
  try {
    if (camada.pontual) { // precisa da geometria para medir a distância (é só um ponto, sem dado pessoal)
      const r = await f(montarUrl({ ...comum, propertyName: [...campos, geometria].join(',') }));
      if (!r.ok) return { itens: [], erro: mensagemDeErro(r.status) };
      const j = (await r.json()) as { features?: { properties?: Propriedades; geometry?: unknown }[] };
      const exibir = (camada.exibir ?? campos).filter((x) => campos.includes(x));
      const proximos: Proximo[] = [];
      for (const ft of j.features ?? []) {
        const onde = coordenadaDaFeicao(ft.geometry);
        if (!onde) return { itens: [], erro: 'o servidor não devolveu a posição do registro pontual' };
        const m = Math.round(distanciaM(c, onde));
        if (m <= RAIO_PROXIMIDADE_M) proximos.push({ m, texto: resumir(descrever1(ft.properties ?? {}, exibir) || 'encontrado'), chave: chaveDoNumero(base, ft.properties ?? {}) });
      }
      return { itens: [], proximos };
    }
    if (campos.length === 0) { // nenhum campo conhecido: só a contagem
      const r = await f(montarUrl({ ...comum, resultType: 'hits' }));
      if (!r.ok) return { itens: [], erro: mensagemDeErro(r.status) };
      const texto = await r.text();
      let n: number | undefined;
      try { const j = JSON.parse(texto) as { totalFeatures?: unknown; numberMatched?: unknown }; n = [j.totalFeatures, j.numberMatched].find((x): x is number => typeof x === 'number'); } catch { /* pode vir em XML */ }
      n ??= Number(/numberOfFeatures="(\d+)"/.exec(texto)?.[1] ?? /numberMatched="(\d+)"/.exec(texto)?.[1] ?? NaN);
      if (!Number.isFinite(n)) return { itens: [], erro: 'resposta inesperada do servidor' };
      return { itens: n > 0 ? [{ chave: `hits:${camada.nome}`, texto: 'encontrado (campos não identificados)' }] : [] };
    }
    const r = await f(montarUrl({ ...comum, propertyName: campos.join(',') }));
    if (!r.ok) return { itens: [], erro: mensagemDeErro(r.status) };
    const j = (await r.json()) as { features?: { properties?: Propriedades }[] };
    const exibir = (camada.exibir ?? campos).filter((x) => campos.includes(x));
    const itens = (j.features ?? []).map((ft): ItemEncontrado => {
      const props = ft.properties ?? {};
      const texto = descrever1(props, exibir) || 'encontrado';
      // Embargos: o mesmo termo aparece em mais de uma camada; o número do termo é a chave.
      return { chave: chaveDoNumero(base, props) ?? `${base}:${semAcento(texto)}`, texto };
    });
    return { itens };
  } catch (e) {
    return { itens: [], erro: mensagemDeExcecao(e) };
  }
}

const resumir = (t: string) => (t.length > LIMITE_DETALHE ? `${t.slice(0, LIMITE_DETALHE - 3)}...` : t);

async function consultarBase(base: Exclude<BaseConsulta, 'bioma' | 'vegetacao'>, c: Coordenada, chave: string, f: typeof fetch, quando: string): Promise<ConsultaBase> {
  const rs = await Promise.all(CAMADAS[base].map((camada) => consultarCamada(base, camada, c, chave, f)));
  // Em duplicata vale o primeiro item (camada confirmada, com mais campos), não o último.
  const unicos = new Map<string, string>();
  for (const i of rs.flatMap((r) => r.itens)) if (!unicos.has(i.chave)) unicos.set(i.chave, i.texto);
  // Registro pontual cujo nº já apareceu na sobreposição do polígono (ou em outro ponto) não entra em "próximos".
  const vistos = new Set(unicos.keys());
  const todosProximos = rs.flatMap((r) => r.proximos ?? []).sort((a, b) => a.m - b.m).filter((p) => !p.chave || (!vistos.has(p.chave) && !!vistos.add(p.chave)));
  const proximos = todosProximos.slice(0, MAXIMO_PROXIMOS).map(({ m, texto }) => ({ m, texto }));
  const mais = todosProximos.length - proximos.length;
  const erro = rs.find((r) => r.erro)?.erro;
  if (unicos.size > 0 || proximos.length > 0) {
    return { estado: 'encontrado', quando, fonte: 'automatica', ...(unicos.size > 0 ? { detalhe: resumir([...unicos.values()].join('; ')) } : {}), ...(proximos.length > 0 ? { proximidade: proximos } : {}), ...(mais > 0 ? { maisProximos: mais } : {}) };
  }
  if (erro) return { estado: 'falha', quando, fonte: 'automatica', detalhe: erro };
  return { estado: 'vazio', quando, fonte: 'automatica' };
}

/** Registro de bioma ou vegetação a partir do `geo` (consulta automática já existente). */
export function consultaDoGeo(g: SugestaoGeo, base: 'bioma' | 'vegetacao'): ConsultaBase {
  const valor = base === 'bioma' ? g.bioma : g.legenda ?? g.pretetita;
  // `erro` é de uma das duas camadas: se esta base trouxe valor, vale o valor.
  if (g.erro && !valor) return { estado: 'falha', quando: g.quando, fonte: 'automatica', detalhe: g.erro };
  return { estado: valor ? 'encontrado' : 'vazio', quando: g.quando, fonte: 'automatica', ...(valor ? { detalhe: valor } : {}) };
}

/** Consulta as 8 bases em paralelo. Nunca lança: cada falha vira o estado "falha" da base. */
export async function consultarBases(c: Coordenada, chave: string, f: typeof fetch = fetch, quando = new Date().toISOString()): Promise<{ consultas: Record<BaseConsulta, ConsultaBase>; geo: SugestaoGeo }> {
  const rede = comTempo(f);
  const outras = BASES_CONSULTA.filter((b): b is Exclude<BaseConsulta, 'bioma' | 'vegetacao'> => b !== 'bioma' && b !== 'vegetacao');
  const [geo, ...resto] = await Promise.all([consultarSugestao(c, chave, rede, quando), ...outras.map((b) => consultarBase(b, c, chave, rede, quando))]);
  const porBase = Object.fromEntries(outras.map((b, i) => [b, resto[i]])) as Record<(typeof outras)[number], ConsultaBase>;
  return { geo, consultas: { bioma: consultaDoGeo(geo, 'bioma'), vegetacao: consultaDoGeo(geo, 'vegetacao'), ...porBase } };
}

export const diaLocal = (instante: string) => {
  const d = new Date(instante);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** A consulta automática não apaga: registro manual do mesmo dia ou mais novo, nem um registro bom quando a nova falhou. */
export function preservarRegistro(atual: ConsultaBase | undefined, novo: ConsultaBase): 'manual' | 'falha' | null {
  if (!atual) return null;
  if (atual.fonte === 'manual' && diaLocal(atual.quando) >= diaLocal(novo.quando)) return 'manual';
  if (novo.estado === 'falha' && (atual.estado === 'encontrado' || atual.estado === 'vazio')) return 'falha';
  return null;
}
