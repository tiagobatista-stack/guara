// Sugestão de bioma e vegetação (SEMA-MT): fetch SEMPRE mockado, com valores reais da Operação Castanheira; a chave de teste é falsa.

import assert from 'node:assert/strict';
import { consultarPontos, criarOperacaoComPontos, obterOperacoes } from './armazem.ts';
import { popGeo, sugestoesPop } from './pop-supressao.ts';
import { htmlDoRoteiro } from './roteiro.ts';
import { consultarSugestao, definirAuthkey, limparLegenda } from './sugestao-vegetacao.ts';

const CHAVE = 'CHAVE-FALSA-DE-TESTE';
const Q = { lat: -10.4523, lon: -58.5129 };
const DENSA = 'Floresta Ombrófila Densa (Floresta Amazônica ou Floresta Atlântica)';
type Resposta = { bioma?: string; vegetacao?: Record<string, string> };
/** fetch falso: devolve o GeoJSON padrão do GeoServer conforme a camada pedida; guarda as URLs. */
const servidor = (r: Resposta, status = 200) => {
  const urls: string[] = [];
  const f = (async (url: string) => {
    urls.push(url);
    const props = url.includes('BIOMAS_MT') ? (r.bioma ? { BIOMA: r.bioma } : null) : r.vegetacao ?? null;
    return { ok: status === 200, status, json: async () => ({ type: 'FeatureCollection', features: props ? [{ properties: props }] : [] }) };
  }) as unknown as typeof fetch;
  return { f, urls };
};
const castanheira1: Resposta = { bioma: 'Amazônia', vegetacao: { LEGENDA: '1Dse - Floresta Ombrófila Densa Submontana com dossel emergente' } };
const castanheira2: Resposta = { bioma: 'Amazônia', vegetacao: { LEGENDA: '4Acc - Agricultura com Culturas Cíclicas', NM_PRETET: 'Contato Floresta Ombrófila/Floresta Estacional', VEG_PRETET: 'ON' } };
const agua: Resposta = { bioma: 'Amazônia', vegetacao: { LEGENDA: "5Corpo d'água continental", FITOECOLOG: 'AGUA' } };

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

it('limpa o dígito do início da legenda', () => {
  assert.equal(limparLegenda('1Dse - Floresta'), 'Dse - Floresta');
  assert.equal(limparLegenda("5Corpo d'água continental"), "Corpo d'água continental");
});

it('consulta as duas camadas com POINT(lon lat) e devolve legenda limpa e bioma', async () => {
  const { f, urls } = servidor(castanheira1);
  const g = await consultarSugestao(Q, CHAVE, f, '2026-11-19T10:00:00Z');
  assert.deepEqual(g, { bioma: 'Amazônia', legenda: 'Dse - Floresta Ombrófila Densa Submontana com dossel emergente', quando: '2026-11-19T10:00:00Z' });
  assert.equal(urls.length, 2);
  assert.ok(urls.every((u) => decodeURIComponent(u).includes('INTERSECTS(SHAPE,POINT(-58.5129 -10.4523))')));
  assert.ok(urls[0].includes('BIOMAS_MT') && urls[1].includes('VEGETACAO_IBGE'));
});

it('ponto 1: Floresta Ombrófila Densa destacada; A-1 sugere Amazônia; A-2 sem opções de outros biomas', () => {
  const g = { bioma: 'Amazônia', legenda: 'Dse - Floresta Ombrófila Densa Submontana com dossel emergente', quando: 'x' };
  const r = popGeo({ geo: g });
  assert.deepEqual(r.fitos, [DENSA]);
  assert.equal(r.bioma, 'Amazônia');
  assert.ok(!r.opcoes.some((o) => /Araucária|Caatinga do Sertão|Restinga/.test(o.texto)));
  assert.ok(r.opcoes.some((o) => /^Outras/.test(o.texto)));
  assert.deepEqual(sugestoesPop({ geo: g }), { 'A-1': 'Amazônia', 'A-2': DENSA });
});

it('ponto 2: NM_PRETET "Contato Ombrófila/Estacional" destaca as duas famílias (sem a Mista); a agricultura não conta', async () => {
  const g = await consultarSugestao({ lat: -11.0517, lon: -58.7024 }, CHAVE, servidor(castanheira2).f);
  assert.equal(g.legenda, 'Acc - Agricultura com Culturas Cíclicas');
  const r = popGeo({ geo: g });
  assert.deepEqual(r.fitos.map((t) => t.split(' (')[0]), [
    'Floresta Ombrófila Densa', 'Floresta Ombrófila Aberta', 'Floresta Estacional Sempre-Verde', 'Floresta Estacional Semidecidual', 'Floresta Estacional Decidual',
  ]);
  assert.equal(r.bioma, 'Amazônia');
});

it('sem pretérita, só agricultura: nada destacado; Cerrado tira as ombrófilas da lista de A-2', () => {
  assert.deepEqual(popGeo({ geo: { bioma: 'Cerrado', legenda: 'Acc - Agricultura com Culturas Cíclicas', quando: 'x' } }).fitos, []);
  assert.ok(!popGeo({ geo: { bioma: 'Cerrado', quando: 'x' } }).opcoes.some((o) => /Ombrófila|Campinarana/.test(o.texto)));
});

it('corpo d’água: sem destaque no A-2; bioma conhecido ainda filtra a lista', async () => {
  const g = await consultarSugestao(Q, CHAVE, servidor(agua).f);
  assert.deepEqual(popGeo({ geo: g }).fitos, []);
  assert.equal(sugestoesPop({ geo: g })['A-2'], undefined);
});

it('sem bioma conhecido: lista completa de A-2 (31 opções), como antes', () => {
  assert.equal(popGeo({}).opcoes.length, 31);
  assert.equal(popGeo({ geo: { bioma: 'Mata Atlântica', quando: 'x' } }).opcoes.length, 31);
});

it('falha vira "erro" curto, sem URL nem chave; nunca lança', async () => {
  const recusada = await consultarSugestao(Q, CHAVE, servidor({}, 403).f);
  assert.match(recusada.erro!, /chave recusada/);
  const semRede = await consultarSugestao(Q, CHAVE, (async () => { throw new TypeError(`Failed to fetch https://x?authkey=${CHAVE}`); }) as unknown as typeof fetch);
  assert.match(semRede.erro!, /CORS/);
  assert.ok(![recusada, semRede].some((g) => JSON.stringify(g).includes(CHAVE) || JSON.stringify(g).includes('http')));
  assert.match((await consultarSugestao(Q, CHAVE, servidor({}).f)).erro!, /sem informação/);
});

const novo = { coordenada: Q, municipio: 'Castanheira', notas: '', demandas: [], situacao: 'planejado' as const };

it('sem chave: nada é consultado nem gravado, e o motivo é devolvido', async () => {
  const { f, urls } = servidor(castanheira1);
  vi.stubGlobal('fetch', f);
  const r = criarOperacaoComPontos({ nome: 'Op', inicio: '', fim: '', origem: '' }, '2026-11-19T00:00:00Z', [novo]);
  assert.ok(r.ok);
  assert.match((await consultarPontos(r.id))!, /chave/);
  assert.equal(urls.length, 0);
  assert.equal(obterOperacoes()[0].pontos[0].geo, undefined);
});

it('com chave: consulta ao incluir o ponto, grava uma vez no ponto e não repete; a chave não vai para as operações', async () => {
  const { f, urls } = servidor(castanheira1);
  vi.stubGlobal('fetch', f);
  definirAuthkey(CHAVE);
  const r = criarOperacaoComPontos({ nome: 'Op', inicio: '', fim: '', origem: '' }, '2026-11-19T00:00:00Z', [novo]);
  assert.ok(r.ok);
  await vi.waitFor(() => assert.equal(obterOperacoes()[0].pontos[0].geo?.bioma, 'Amazônia'));
  assert.equal(urls.length, 2);
  assert.equal(await consultarPontos(r.id), null); // sem lista: só os nunca consultados
  assert.equal(urls.length, 2);
  await consultarPontos(r.id, [obterOperacoes()[0].pontos[0].id]); // "Reconsultar"
  assert.equal(urls.length, 4);
  assert.ok(!JSON.stringify(obterOperacoes()).includes(CHAVE));
});

it('verso do POP: bioma e vegetação em destaque, caixas vazias, fonte impressa, A-2 só do bioma', () => {
  const viagem = { id: 'v', equipe: 'A', integrantes: [], veiculos: [], saida: '2026-12-07', retorno: '2026-12-11', notas: '' };
  const p = {
    id: 'p1', numero: 1, tipoDano: 'Desmatamento', coordenada: Q, municipio: 'Castanheira', notas: '', demandas: [], situacao: 'planejado' as const, viagem: 'v',
    geo: { bioma: 'Amazônia', legenda: 'Dse - Floresta Ombrófila Densa Submontana', quando: 'x' },
  };
  const html = htmlDoRoteiro({ operacao: { id: 'o', nome: 'Op', viagens: [viagem], pontos: [p], criadaEm: '2026-11-19T00:00:00Z' } as never, viagem, pontos: [p] as never, demandas: [], geradoEm: '2026-11-19' });
  assert.ok(html.includes('Sugestão: Vegetação IBGE, escala 1:250.000 (via Geoportal SEMA-MT). Confirmar em campo.'));
  assert.ok(html.includes('<b>Amazônia</b> <i class="sug">(sugerido — conferir)</i>'));
  assert.ok(html.includes('<b>Floresta Ombrófila Densa'));
  assert.ok(!html.includes('Caatinga do Sertão'));
});
