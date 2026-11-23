// Consulta automática às bases do GeoServer: fetch sempre mockado (nada de rede nem de chave real).

import { CHAVE_AUTHKEY } from './sugestao-vegetacao.ts';
import { alterarPonto, consultarBasesDoPonto, criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';
import { CHAVE_OPERACOES, type ConsultaBase } from './modelo.ts';
import { consultaDe, textoDoRelatorio } from './relatorio.ts';
import { validarListaOperacoes } from './regras.ts';
import { CAMADAS, CAMPOS_PROIBIDOS, consultarBases, limparCacheDeCampos, seguros } from './consulta-bases.ts';

const COORD = { lat: -12.5, lon: -58.7 };
const CHAVE = 'k-secreta';

type Resposta = { status?: number; json?: unknown; texto?: string; pendurada?: boolean };
type Regra = (q: URLSearchParams) => Resposta | undefined;

/** Servidor falso: DescribeFeatureType devolve `campos[camada]` (padrão: todos os candidatos); o resto vem de `regra` (padrão: nenhuma feição). */
function servidor(regra: Regra = () => undefined, campos: Record<string, string[]> = {}) {
  const chamadas: URLSearchParams[] = [];
  const f = (async (url: string, opcoes?: RequestInit) => {
    const q = new URL(String(url)).searchParams;
    chamadas.push(q);
    let r: Resposta | undefined;
    if (q.get('request') === 'DescribeFeatureType') {
      const camada = q.get('typeName')!;
      const nomes = campos[camada] ?? ['NUMERO_TERMO', 'T_EMBARGO', 'NUMERO_PROCESSO', 'N_PROCESSO', 'DAT_LAVRAT', 'NUMERO_AUTO', 'NUMERO', 'A_INFRAC', 'NOME_TI_AB', 'NOMETI', 'ETNIA', 'NOME', 'CATEGORIA'];
      r = { json: { featureTypes: [{ properties: [...nomes.map((name) => ({ name, type: 'xsd:string' })), { name: 'SHAPE', type: 'gml:MultiPolygonPropertyType' }] }] } };
    } else r = regra(q);
    if (r?.pendurada) {
      return new Promise<Response>((_, rejeitar) => opcoes?.signal?.addEventListener('abort', () => rejeitar(new DOMException('abort', 'AbortError'))));
    }
    const status = r?.status ?? 200;
    const json = r?.json ?? { features: [] };
    return { ok: status < 400, status, json: async () => json, text: async () => r?.texto ?? JSON.stringify(json) } as Response;
  }) as unknown as typeof fetch;
  return { f, chamadas };
}

const feicao = (properties: Record<string, unknown>) => ({ json: { features: [{ properties }] } });
const camada = (q: URLSearchParams) => q.get('typeName') ?? '';

beforeEach(() => { localStorage.clear(); limparCacheDeCampos(); vi.restoreAllMocks(); vi.spyOn(console, 'info').mockImplementation(() => {}); });

describe('consultarBases', () => {
  it('encontrado: CAR com número e situação; embargos deduplicados pelo termo; bioma e vegetação via geo', async () => {
    const { f, chamadas } = servidor((q) => {
      switch (camada(q)) {
        case 'Geoportal:MVW_REQUERIMENTO_ATP': return feicao({ NUMEROESTADUAL: 'MT142247/2015', SITUACAO: 'AGUARDANDO ANALISE', AREA_HA: 10 });
        case 'Geoportal:AREAS_EMBARGADAS_SEMA': return feicao({ T_EMBARGO: 'TE-1', N_PROCESSO: 'P1', DAT_LAVRAT: '2020-05-10T00:00:00Z' });
        case 'Geoportal:AREA_EMBARGADA_SIGA_POLIGONO': return feicao({ NUMERO_TERMO: 'TE-1', N_PROCESSO: 'P1' });
        case 'Geoportal:BIOMAS_MT': return feicao({ BIOMA: 'Amazônia' });
        case 'Geoportal:VEGETACAO_IBGE': return feicao({ LEGENDA: '1Dse - Floresta Estacional', NM_PRETET: null });
        case 'Geoportal:TERRAS_INDIGENAS': return feicao({ NOME_TI_AB: 'Enawenê-Nawê', NOMETI: 'enawene-nawe', ETNIA: 'Enawenê' });
        default: return undefined;
      }
    });
    const r = await consultarBases(COORD, CHAVE, f, '2026-10-21T12:00:00.000Z');
    expect(r.consultas.car).toEqual({ estado: 'encontrado', quando: '2026-10-21T12:00:00.000Z', fonte: 'automatica', detalhe: 'MT142247/2015 (AGUARDANDO ANALISE)' });
    expect(r.consultas.embargos.detalhe).toBe('TE-1 (P1, 10/05/2020)'); // o mesmo termo nas duas camadas conta uma vez
    expect(r.consultas.ti.detalhe).toBe('Enawenê-Nawê (Enawenê)'); // valor repetido entre campos entra uma vez
    expect(r.consultas.bioma).toMatchObject({ estado: 'encontrado', detalhe: 'Amazônia', fonte: 'automatica' });
    expect(r.consultas.vegetacao.estado).toBe('encontrado');
    expect(r.consultas.autos.estado).toBe('vazio');
    expect(JSON.stringify(r)).not.toContain(CHAVE); // a chave nunca vai para o registro
    // geometria nunca é pedida; o filtro usa lon lat
    const car = chamadas.find((q) => camada(q) === 'Geoportal:MVW_REQUERIMENTO_ATP')!;
    expect(car.get('CQL_FILTER')).toBe('INTERSECTS(SHAPE,POINT(-58.7 -12.5))');
    expect(car.get('propertyName')).toBe('NUMEROESTADUAL,SITUACAO,AREA_HA');
    expect(car.get('outputFormat')).toBe('application/json');
  });

  it('vazio: lista vazia em todas as camadas', async () => {
    const { f } = servidor();
    const r = await consultarBases(COORD, CHAVE, f);
    for (const b of ['car', 'embargos', 'autos', 'ti', 'uc', 'amortecimento'] as const) expect(r.consultas[b]).toMatchObject({ estado: 'vazio', fonte: 'automatica' });
  });

  it('falha: 403 vira "falha" sem a chave no texto; falha numa camada não vira "vazio"', async () => {
    const { f } = servidor((q) => (camada(q) === 'Geoportal:MVW_REQUERIMENTO_ATP' || camada(q) === 'Geoportal:UNIDADES_CONSERVACAO' ? { status: 403 } : undefined));
    const r = await consultarBases(COORD, CHAVE, f);
    expect(r.consultas.car).toMatchObject({ estado: 'falha', detalhe: 'chave recusada pelo servidor (HTTP 403)' });
    expect(r.consultas.uc.estado).toBe('falha');
    expect(r.consultas.ti.estado).toBe('vazio');
    expect(JSON.stringify(r)).not.toContain(CHAVE);
  });

  it('timeout de 15 s vira falha', async () => {
    vi.useFakeTimers();
    try {
      const { f } = servidor((q) => (camada(q) === 'Geoportal:MVW_REQUERIMENTO_ATP' ? { pendurada: true } : undefined));
      const promessa = consultarBases(COORD, CHAVE, f);
      await vi.advanceTimersByTimeAsync(15_000);
      expect((await promessa).consultas.car.estado).toBe('falha');
    } finally { vi.useRealTimers(); }
  });

  it('campos desconhecidos: só pede o que a camada tem; sem nenhum candidato, só a contagem (hits)', async () => {
    const { f, chamadas } = servidor(
      (q) => (q.get('resultType') === 'hits' && camada(q) === 'Geoportal:AUTOS_DE_INFRACAO_SIGA_POLIGONO' ? { json: { totalFeatures: 2 } } : undefined),
      { 'Geoportal:AUTOS_DE_INFRACAO_SIGA_POLIGONO': ['GID', 'OBJETO'], 'Geoportal:AUTOS_DE_INFRACAO_SIGA_PONTO': ['NUMERO', 'DAT_LAVRAT'], 'Geoportal:UNIDADES_CONSERVACAO': ['NOME', 'CATEGORIA', 'COD'] },
    );
    const r = await consultarBases(COORD, CHAVE, f);
    expect(r.consultas.autos).toMatchObject({ estado: 'encontrado', detalhe: 'encontrado (campos não identificados)' });
    const poligono = chamadas.filter((q) => camada(q) === 'Geoportal:AUTOS_DE_INFRACAO_SIGA_POLIGONO' && q.get('request') === 'GetFeature');
    expect(poligono).toHaveLength(1);
    expect(poligono[0].get('resultType')).toBe('hits');
    expect(poligono[0].get('propertyName')).toBeNull();
    const ponto = chamadas.find((q) => camada(q) === 'Geoportal:AUTOS_DE_INFRACAO_SIGA_PONTO' && q.get('request') === 'GetFeature')!;
    expect(ponto.get('propertyName')).toBe('NUMERO,DAT_LAVRAT,SHAPE'); // só os candidatos que existem, mais a geometria (distância)
    expect(chamadas.find((q) => camada(q) === 'Geoportal:UNIDADES_CONSERVACAO' && q.get('request') === 'GetFeature')!.get('propertyName')).toBe('NOME,CATEGORIA');
  });

  it('DescribeFeatureType uma vez por camada e por sessão (cache)', async () => {
    const { f, chamadas } = servidor();
    await consultarBases(COORD, CHAVE, f);
    await consultarBases(COORD, CHAVE, f);
    const describes = chamadas.filter((q) => q.get('request') === 'DescribeFeatureType').map(camada);
    expect(new Set(describes).size).toBe(describes.length);
    expect(describes).not.toContain('Geoportal:MVW_REQUERIMENTO_ATP'); // confirmados: sem describe
  });

  it('propertyName nunca traz NOME, NOMESPROPRIETARIOS, CPF_CNPJ ou PROPRIEDAD em CAR e embargos (mesmo que a camada tenha)', async () => {
    const todos = ['NOME', 'NOMESPROPRIETARIOS', 'CPF_CNPJ', 'PROPRIEDAD', 'NUMERO_TERMO', 'N_PROCESSO', 'NUMERO_AUTO'];
    const { f, chamadas } = servidor(undefined, Object.fromEntries([...CAMADAS.embargos, ...CAMADAS.autos].map((c) => [c.nome, todos])));
    await consultarBases(COORD, CHAVE, f);
    const sensiveis = new Set([...CAMADAS.car, ...CAMADAS.embargos, ...CAMADAS.autos].map((c) => c.nome));
    const pedidos = chamadas.filter((q) => sensiveis.has(camada(q)) && q.get('propertyName'));
    expect(pedidos.length).toBeGreaterThan(0);
    for (const q of pedidos) {
      const campos = q.get('propertyName')!.toUpperCase().split(',');
      for (const proibido of CAMPOS_PROIBIDOS) expect(campos).not.toContain(proibido);
    }
    expect(seguros('car', ['NOME', 'CPF_CNPJ', 'SITUACAO'])).toEqual(['SITUACAO']);
    expect(seguros('ti', ['NOME', 'ETNIA'])).toEqual(['NOME', 'ETNIA']); // em TI/UC, NOME é o da área
  });
});

function textoDoRelatorioDe(autos: ConsultaBase): string {
  const r = criarOperacao({ nome: 'X', inicio: '', fim: '', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação');
  incluirPontos(r.id, [{ coordenada: COORD, municipio: 'X', notas: '', demandas: [], situacao: 'planejado' }]);
  const id = obterOperacoes().find((o) => o.id === r.id)!.pontos[0].id;
  alterarPonto(r.id, id, { consultas: { autos } });
  const op = obterOperacoes().find((o) => o.id === r.id)!;
  return textoDoRelatorio(op, op.pontos[0]);
}

describe('camadas _PONTO: proximidade', () => {
  const pontoA = (metros: number) => ({ type: 'Point', coordinates: [COORD.lon, COORD.lat + metros / 111_195] });
  const comPonto = (metros: number, props: Record<string, unknown>) => ({ json: { features: [{ properties: props, geometry: pontoA(metros) }] } });
  const soPonto = (resposta: Resposta) => (q: URLSearchParams) => (camada(q) === 'Geoportal:AUTOS_DE_INFRACAO_SIGA_PONTO' ? resposta : undefined);

  it('usa BBOX de ±0,0045° nas camadas de ponto e INTERSECTS nas de polígono; ponto a 300 m entra com a distância', async () => {
    const { f, chamadas } = servidor(soPonto(comPonto(300, { NUMERO_AUTO: 'AI-77', DAT_LAVRAT: '2021-03-04' })));
    const r = await consultarBases(COORD, CHAVE, f);
    expect(r.consultas.autos.estado).toBe('encontrado');
    expect(r.consultas.autos.detalhe).toBeUndefined(); // nada sobreposto
    expect(r.consultas.autos.proximidade).toEqual([{ m: 300, texto: 'AI-77 (04/03/2021)' }]);
    const get = (n: string) => chamadas.find((q) => camada(q) === n && q.get('request') === 'GetFeature')!.get('CQL_FILTER')!;
    expect(get('Geoportal:AUTOS_DE_INFRACAO_SIGA_PONTO')).toBe('BBOX(SHAPE,-58.7045,-12.5045,-58.6955,-12.4955)');
    expect(get('Geoportal:AUTOS_DE_INFRACAO_SIGA_POLIGONO')).toMatch(/^INTERSECTS\(SHAPE,POINT\(/);
  });

  it('ponto a 800 m não entra (a caixa é um quadrado: o canto passa do raio)', async () => {
    const { f } = servidor(soPonto(comPonto(800, { NUMERO_AUTO: 'AI-88' })));
    const r = await consultarBases(COORD, CHAVE, f);
    expect(r.consultas.autos).toMatchObject({ estado: 'vazio' });
    expect(r.consultas.autos.proximidade).toBeUndefined();
  });

  it('embargos: A_INFRAC (nº do auto no legado) nunca é pedido nem serve de chave; só T_EMBARGO/NUMERO_TERMO', async () => {
    const campos = Object.fromEntries(CAMADAS.embargos.map((c) => [c.nome, ['A_INFRAC', 'NUMERO_TERMO', 'T_EMBARGO']]));
    const { f, chamadas } = servidor((q) => {
      if (camada(q) === 'Geoportal:AREA_EMBARGADA_SIGA_POLIGONO') return feicao({ NUMERO_TERMO: 'TE-5', A_INFRAC: 'AI-1' });
      if (camada(q) === 'Geoportal:AREA_EMBARGADA_SIGA_PONTO') return { json: { features: [
        { properties: { NUMERO_TERMO: 'TE-5', A_INFRAC: 'AI-2' }, geometry: pontoA(100) }, // mesmo termo: repetido
        { properties: { NUMERO_TERMO: 'TE-6', A_INFRAC: 'AI-1' }, geometry: pontoA(200) }, // mesmo A_INFRAC, termo outro: não é repetido
      ] } };
      return undefined;
    }, campos);
    const e = (await consultarBases(COORD, CHAVE, f)).consultas.embargos;
    expect(e.proximidade).toEqual([{ m: 200, texto: 'TE-6' }]);
    for (const q of chamadas.filter((x) => CAMADAS.embargos.some((c) => c.nome === camada(x)) && x.get('propertyName'))) {
      expect(q.get('propertyName')!.split(',')).not.toContain('A_INFRAC');
    }
  });

  it('feição sem posição não vira "vazio": vira falha', async () => {
    const { f } = servidor(soPonto({ json: { features: [{ properties: { NUMERO_AUTO: 'AI-1' }, geometry: null }] } }));
    expect((await consultarBases(COORD, CHAVE, f)).consultas.autos.estado).toBe('falha');
  });

  it('timeout de 15 s cobre também a leitura do corpo', async () => {
    vi.useFakeTimers();
    try {
      const f = (async (_u: string, o?: RequestInit) => ({
        ok: true, status: 200,
        text: () => new Promise<string>((_, no) => o?.signal?.addEventListener('abort', () => no(new DOMException('abort', 'AbortError')))),
      })) as unknown as typeof fetch;
      const promessa = consultarBases(COORD, CHAVE, f);
      for (let i = 0; i < 4; i++) await vi.advanceTimersByTimeAsync(15_000); // describe e GetFeature são etapas em série, cada uma com seu relógio
      expect((await promessa).consultas.car.estado).toBe('falha');
    } finally { vi.useRealTimers(); }
  });

  it('dedup polígono × ponto: o mesmo nº de auto na sobreposição não entra em "próximos"', async () => {
    const { f } = servidor((q) => {
      if (camada(q) === 'Geoportal:AUTOS_DE_INFRACAO_SIGA_POLIGONO') return feicao({ NUMERO_AUTO: 'AI-77' });
      if (camada(q) === 'Geoportal:AUTOS_DE_INFRACAO_SIGA_PONTO') return { json: { features: [
        { properties: { NUMERO_AUTO: 'ai-77' }, geometry: pontoA(100) },
        { properties: { NUMERO_AUTO: 'AI-90' }, geometry: pontoA(200) },
      ] } };
      return undefined;
    });
    const a = (await consultarBases(COORD, CHAVE, f)).consultas.autos;
    expect(a.detalhe).toBe('AI-77');
    expect(a.proximidade).toEqual([{ m: 200, texto: 'AI-90' }]);
  });

  it('só o registro repetido no polígono: sem proximidade', async () => {
    const { f } = servidor((q) => (camada(q) === 'Geoportal:AUTOS_DE_INFRACAO_SIGA_POLIGONO' ? feicao({ NUMERO_AUTO: 'AI-77' }) : camada(q) === 'Geoportal:AUTOS_DE_INFRACAO_SIGA_PONTO' ? comPonto(50, { NUMERO_AUTO: 'AI-77' }) : undefined));
    const a = (await consultarBases(COORD, CHAVE, f)).consultas.autos;
    expect(a).toMatchObject({ estado: 'encontrado', detalhe: 'AI-77' });
    expect(a.proximidade).toBeUndefined();
  });

  it('acima de MAXIMO_PROXIMOS: guarda 3, conta o resto e a frase diz "e mais N registro(s) próximo(s)"', async () => {
    const lote = (n: number) => ({ json: { features: Array.from({ length: n }, (_, i) => ({ properties: { NUMERO_AUTO: `AI-${i}` }, geometry: pontoA(10 * (i + 1)) })) } });
    for (const [n, esperado] of [[5, 'e mais 2 registros próximos.'], [4, 'e mais 1 registro próximo.']] as const) {
      const { f } = servidor(soPonto(lote(n)));
      const a = (await consultarBases(COORD, CHAVE, f)).consultas.autos;
      expect(a.proximidade).toHaveLength(3);
      expect(a.maisProximos).toBe(n - 3);
      const t = textoDoRelatorioDe(a);
      expect(t).toContain(esperado);
      expect(t.match(/e mais/g)).toHaveLength(1); // só na última frase
    }
  });

  it('relatório: polígono vazio + ponto próximo gera a frase de proximidade; só vazio nos dois diz "sem sobreposição"', async () => {
    localStorage.setItem(CHAVE_AUTHKEY, CHAVE);
    const r = criarOperacao({ nome: 'Brasnorte', inicio: '', fim: '', origem: '' }, '2026-09-01T00:00:00Z');
    if (!r.ok) throw new Error('operação');
    incluirPontos(r.id, [{ coordenada: COORD, municipio: 'Brasnorte', notas: '', demandas: [], situacao: 'planejado' }]);
    const id = obterOperacoes()[0].pontos[0].id;
    const { f } = servidor(soPonto(comPonto(300, { NUMERO_AUTO: 'AI-77' })));
    await consultarBasesDoPonto(r.id, id, f);
    let op = obterOperacoes()[0];
    expect(textoDoRelatorio(op, op.pontos[0])).toContain('Foi identificado auto de infração (registro pontual) nas proximidades, a cerca de 300 m: AI-77.');
    expect(textoDoRelatorio(op, op.pontos[0])).not.toContain('Foi identificada sobreposição com auto(s)');
    // validação ao recarregar: o campo novo não derruba a operação
    expect(validarListaOperacoes(obterOperacoes())).toBeTruthy();
    await consultarBasesDoPonto(r.id, id, servidor().f);
    op = obterOperacoes()[0];
    expect(textoDoRelatorio(op, op.pontos[0])).toContain('Não foi identificada sobreposição com autos de infração');
  });
});

describe('consultarBasesDoPonto', () => {
  function ponto() {
    const r = criarOperacao({ nome: 'Brasnorte', inicio: '', fim: '', origem: '' }, '2026-09-01T00:00:00Z');
    if (!r.ok) throw new Error('operação');
    incluirPontos(r.id, [{ coordenada: COORD, municipio: 'Brasnorte', notas: '', demandas: [], situacao: 'planejado' }]);
    return { op: r.id, p: obterOperacoes()[0].pontos[0].id };
  }
  const hoje = new Date();
  const hojeAs = (h: number) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), h).toISOString();

  it('sem chave: avisa e não consulta', async () => {
    const { op, p } = ponto();
    const { f, chamadas } = servidor();
    expect(await consultarBasesDoPonto(op, p, f)).toBe('Preencha a chave do GeoServer em Configurações.');
    expect(chamadas).toHaveLength(0);
  });

  it('grava cada base; preserva manual do mesmo dia (avisa), sobrescreve manual antigo e não troca registro bom por falha', async () => {
    localStorage.setItem(CHAVE_AUTHKEY, CHAVE);
    const { op, p } = ponto();
    expect(alterarPonto(op, p, { consultas: {
      car: { estado: 'encontrado', quando: hojeAs(8), fonte: 'manual', detalhe: 'MT-9/2019' },
      ti: { estado: 'vazio', quando: '2020-01-01T12:00:00.000Z', fonte: 'manual' },
      uc: { estado: 'vazio', quando: '2020-01-01T12:00:00.000Z', fonte: 'automatica' },
    } })).toBeNull();
    const { f } = servidor((q) => (camada(q) === 'Geoportal:UNIDADES_CONSERVACAO' ? { status: 403 } : camada(q) === 'Geoportal:MVW_REQUERIMENTO_ATP' ? feicao({ NUMEROESTADUAL: 'MT1/2000', SITUACAO: 'ATIVO' }) : undefined));
    const aviso = await consultarBasesDoPonto(op, p, f);
    const c = obterOperacoes()[0].pontos[0].consultas!;
    expect(c.car).toMatchObject({ fonte: 'manual', detalhe: 'MT-9/2019' }); // manual de hoje fica
    expect(aviso).toContain('Mantive o registro manual mais recente de: CAR/SIMCAR');
    expect(c.ti).toMatchObject({ estado: 'vazio', fonte: 'automatica' }); // manual antigo é trocado
    expect(c.uc).toMatchObject({ estado: 'vazio', quando: '2020-01-01T12:00:00.000Z' }); // falha não apaga o que estava bom
    expect(aviso).toContain('A consulta falhou e mantive o registro anterior de: Unidades de Conservação');
    expect(c.embargos).toMatchObject({ estado: 'vazio', fonte: 'automatica' });
    expect(obterOperacoes()[0].pontos[0].geo).toBeDefined();
  });
});

describe('validação tolerante de dados derivados', () => {
  it('consulta, proximidade e geo corrompidos: a operação abre, só o registro ruim some ("não consultada") e há aviso', () => {
    const r = criarOperacao({ nome: 'Brasnorte', inicio: '', fim: '', origem: '' }, '2026-09-01T00:00:00Z');
    if (!r.ok) throw new Error('operação');
    incluirPontos(r.id, [{ coordenada: COORD, municipio: 'Brasnorte', notas: '', demandas: [], situacao: 'planejado' }]);
    const id = obterOperacoes()[0].pontos[0].id;
    const boa = { estado: 'vazio', quando: '2026-10-20T12:00:00.000Z', fonte: 'manual' };
    const lista = JSON.parse(localStorage.getItem(CHAVE_OPERACOES)!);
    lista[0].pontos[0].consultas = {
      car: { estado: 'nunca-visto', quando: 'ontem', fonte: 'robo' },
      autos: { ...boa, estado: 'encontrado', proximidade: [{ m: -5, texto: 'x' }] },
      uc: 42,
      inventada: boa,
      ti: boa,
    };
    lista[0].pontos[0].geo = 'lixo';
    localStorage.setItem(CHAVE_OPERACOES, JSON.stringify(lista));
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const [op] = obterOperacoes();
    expect(op).toBeDefined();
    const ponto = op.pontos.find((p) => p.id === id)!;
    expect(Object.keys(ponto.consultas ?? {})).toEqual(['ti']);
    expect(ponto.geo).toBeUndefined();
    expect(consultaDe(ponto, 'car')).toBeUndefined(); // a tela mostra "não consultada"
    expect(textoDoRelatorio(op, ponto)).toContain('[CONSULTAS NÃO REALIZADAS:');
    expect(aviso).toHaveBeenCalled();
    expect(aviso.mock.calls.flat().join(' ')).not.toContain(CHAVE);
  });
});
