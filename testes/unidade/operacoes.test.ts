import type { Operacao, Ponto } from '../../aplicacao/src/modulos/operacoes/modelo.ts';
import {
  contarPontosPendentes, distanciaMetros, lerData, operacaoValida, pontosProximos, pontosSemData, pontosSemEquipe,
  agruparPontos, demandasEncaixadas, nomesDeGrupos, periodoDosPontos, problemasDeDatas, textoLocalProximo, vinculosDasDemandas, validarListaOperacoes,
} from '../../aplicacao/src/modulos/operacoes/regras.ts';
import {
  alterarPeriodo, alterarPonto, criarOperacao, definirGrupo, desvincularDemandaDePonto, incluirDemandaComoPonto, vincularDemandaAPonto, excluirOperacao, excluirPonto, incluirPontos, obterOperacoes,
} from '../../aplicacao/src/modulos/operacoes/armazem.ts';

const ponto = (id: string, extra: Partial<Ponto> = {}): Ponto => ({
  id, coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Município Fictício', notas: '', demandas: [], situacao: 'planejado', ...extra,
});
const operacao = (pontos: Ponto[], extra: Partial<Operacao> = {}): Operacao => ({
  id: 'op1', nome: 'Operação fictícia', inicio: '2026-09-18', fim: '2026-09-25', pontos, criadaEm: '2026-09-01T12:00:00.000Z', ...extra,
});

describe('datas', () => {
  it.each([
    ['2026-09-18', '2026-09-18'],
    ['18/09/2026', '2026-09-18'],
    ['8/9/2026', '2026-09-08'],
    ['30/02/2026', null],
    ['', null],
    ['amanhã', null],
  ] as [string, string | null][])('lerData(%j) = %j', (entrada, saida) => expect(lerData(entrada)).toBe(saida));

  it('retorno antes da saída e datas fora do período são problemas', () => {
    expect(problemasDeDatas({ saida: '2026-09-22', retorno: '2026-09-18' })).toEqual(['O retorno é anterior à saída.']);
    const janela = { inicio: '2026-09-18', fim: '2026-09-25' };
    expect(problemasDeDatas({ saida: '2026-09-17' }, janela)).toEqual(['A data de saída fica fora do período da operação.']);
    expect(problemasDeDatas({ saida: '2026-09-18', retorno: '2026-09-22' }, janela)).toEqual([]);
    expect(problemasDeDatas({})).toEqual([]);
  });
});

describe('validação do que vem do armazenamento', () => {
  it('aceita operação bem formada e recusa o resto', () => {
    expect(operacaoValida(operacao([ponto('p1', { equipe: 'Equipe A', saida: '2026-09-18' })]))).toBe(true);
    expect(operacaoValida(operacao([], { fim: '2026-09-01' }))).toBe(false);
    expect(operacaoValida(operacao([], { nome: ' ' }))).toBe(false);
    expect(operacaoValida(operacao([ponto('p1', { situacao: 'x' as never })]))).toBe(false);
    expect(operacaoValida(operacao([ponto('p1', { coordenada: { lat: 200, lon: 0 } })]))).toBe(false);
    expect(operacaoValida(operacao([ponto('p1', { saida: '2026-13-01' })]))).toBe(false);
  });
  it('lista corrompida vira vazia e item inválido é descartado', () => {
    expect(validarListaOperacoes('texto')).toEqual([]);
    expect(validarListaOperacoes([operacao([]), { lixo: true }])).toHaveLength(1);
  });
});

describe('o que falta encaixar', () => {
  const pontos = [
    ponto('a', { equipe: 'Equipe A', saida: '2026-09-18' }),
    ponto('b', { saida: '2026-09-18' }),
    ponto('c', { equipe: 'Equipe A' }),
    ponto('d'),
    ponto('e', { situacao: 'vistoriado' }),
    ponto('f', { situacao: 'cancelado' }),
    ponto('g', { equipe: '  ' }),
  ];
  it('sem equipe e sem data consideram só os planejados', () => {
    expect(pontosSemEquipe(pontos).map((p) => p.id)).toEqual(['b', 'd', 'g']);
    expect(pontosSemData(pontos).map((p) => p.id)).toEqual(['c', 'd', 'g']);
  });
  it('contagem do Painel soma as operações', () => {
    expect(contarPontosPendentes([operacao(pontos), operacao([ponto('x')], { id: 'op2' })])).toBe(5);
  });
});

describe('mesmo local', () => {
  it('distância (haversine): um grau de latitude vale cerca de 111,2 km', () => {
    expect(distanciaMetros({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111_195, -2);
    expect(distanciaMetros({ lat: -11.5, lon: -58.5 }, { lat: -11.5, lon: -58.5 })).toBe(0);
  });
  it('acha pontos de outras operações e demandas dentro do raio, do mais perto ao mais longe', () => {
    const alvo = ponto('alvo');
    const perto = ponto('perto', { coordenada: { lat: -11.5003, lon: -58.5 }, equipe: 'Equipe B', retorno: '2025-09-22', situacao: 'vistoriado' }); // ~33 m
    const longe = ponto('longe', { coordenada: { lat: -11.6, lon: -58.5 } });
    const outra = operacao([perto, longe], { id: 'op0', nome: 'Operação 2025' });
    const demandas = [
      { id: 'd1', titulo: 'Demanda fictícia', coordenada: { lat: -11.5, lon: -58.5008 } }, // ~87 m
      { id: 'd2', titulo: 'Sem coordenada' },
    ];
    const r = pontosProximos(alvo, [operacao([alvo]), outra], demandas);
    expect(r.map((x) => x.id)).toEqual(['perto', 'd1']);
    expect(textoLocalProximo(r[0])).toBe('Operação Operação 2025, Equipe B, vistoriado, 22/09/2025, a 33 m');
    expect(pontosProximos(alvo, [outra], demandas, 10)).toEqual([]);
  });
  it('não conta o próprio ponto', () => {
    const alvo = ponto('alvo');
    expect(pontosProximos(alvo, [operacao([alvo])])).toEqual([]);
  });
});

describe('período opcional', () => {
  beforeEach(() => localStorage.clear());
  const { id: _id, ...base } = ponto('x');

  it('operação sem período é válida; com os dois lados, o fim não pode vir antes', () => {
    const { inicio: _a, fim: _b, ...semPeriodo } = operacao([]);
    expect(operacaoValida(semPeriodo)).toBe(true);
    expect(operacaoValida({ ...semPeriodo, inicio: '2026-09-18' })).toBe(true);
    expect(operacaoValida({ ...semPeriodo, inicio: '2026-09-18', fim: '2026-09-01' })).toBe(false);
    expect(operacaoValida({ ...semPeriodo, fim: '2026-13-01' })).toBe(false);
  });
  it('janela com um lado só confere apenas esse lado', () => {
    expect(problemasDeDatas({ saida: '2026-01-01' }, { fim: '2026-09-25' })).toEqual([]);
    expect(problemasDeDatas({ saida: '2026-12-01' }, { fim: '2026-09-25' })).toEqual(['A data de saída fica fora do período da operação.']);
  });
  it('periodoDosPontos: menor e maior data; vazio sem datas', () => {
    expect(periodoDosPontos([{ saida: '2026-09-20', retorno: '2026-09-22' }, { saida: '2026-09-18' }, {}])).toEqual({ inicio: '2026-09-18', fim: '2026-09-22' });
    expect(periodoDosPontos([{}])).toEqual({});
  });
  it('criar sem datas; só um lado; fim antes do início ainda é erro', () => {
    expect(criarOperacao({ nome: 'A', inicio: '', fim: '', origem: '' }, 'x').ok).toBe(true);
    expect(obterOperacoes()[0]).not.toHaveProperty('inicio');
    expect(criarOperacao({ nome: 'B', inicio: '2026-09-18', fim: '', origem: '' }, 'x').ok).toBe(true);
    expect(obterOperacoes()[1]).toMatchObject({ inicio: '2026-09-18' });
    expect(criarOperacao({ nome: 'C', inicio: '2026-09-25', fim: '2026-09-18', origem: '' }, 'x')).toEqual({ ok: false, erro: 'O fim da operação não pode ser antes do início.' });
    expect(criarOperacao({ nome: 'D', inicio: 'abc', fim: '', origem: '' }, 'x')).toEqual({ ok: false, erro: 'Informe datas válidas para o período.' });
  });
  it('incluirPontos completa só o lado que falta e mantém o informado', () => {
    const r = criarOperacao({ nome: 'A', inicio: '2026-09-10', fim: '', origem: '' }, 'x');
    if (!r.ok) throw new Error();
    expect(incluirPontos(r.id, [{ ...base, saida: '2026-09-18', retorno: '2026-09-22' }])).toBeNull();
    expect(obterOperacoes()[0]).toMatchObject({ inicio: '2026-09-10', fim: '2026-09-22' });
  });
  it('alterarPeriodo define, limpa e recusa período que deixa pontos de fora', () => {
    const r = criarOperacao({ nome: 'A', inicio: '', fim: '', origem: '' }, 'x');
    if (!r.ok) throw new Error();
    incluirPontos(r.id, [{ ...base, saida: '2026-09-18', retorno: '2026-09-22' }]);
    expect(alterarPeriodo(r.id, '2026-09-20', '2026-09-25')).toBe('Há pontos com data fora desse período: ajuste as datas dos pontos primeiro.');
    expect(alterarPeriodo(r.id, '2026-09-01', '2026-09-30')).toBeNull();
    expect(obterOperacoes()[0]).toMatchObject({ inicio: '2026-09-01', fim: '2026-09-30' });
    expect(alterarPeriodo(r.id, '', '')).toBeNull();
    expect(obterOperacoes()[0]).not.toHaveProperty('inicio');
    expect(obterOperacoes()[0]).not.toHaveProperty('fim');
  });
});

describe('armazém', () => {
  beforeEach(() => localStorage.clear());

  it('cria operação, recusa dados ruins e persiste', () => {
    expect(criarOperacao({ nome: '', inicio: '2026-09-18', fim: '2026-09-25', origem: '' }, 'x')).toEqual({ ok: false, erro: 'Informe o nome da operação.' });
    expect(criarOperacao({ nome: 'Op', inicio: '2026-09-25', fim: '2026-09-18', origem: '' }, 'x')).toEqual({ ok: false, erro: 'O fim da operação não pode ser antes do início.' });
    const r = criarOperacao({ nome: ' Op fictícia ', inicio: '2026-09-18', fim: '2026-09-25', origem: ' Órgão X ' }, '2026-09-01T12:00:00.000Z');
    expect(r.ok).toBe(true);
    expect(obterOperacoes()[0]).toMatchObject({ nome: 'Op fictícia', origem: 'Órgão X', pontos: [] });
    expect(JSON.parse(localStorage.getItem('guara:operacoes:v1')!)).toHaveLength(1);
  });

  it('inclui pontos, atribui equipe e datas, agrupa, liga a demanda e exclui', () => {
    const r = criarOperacao({ nome: 'Op', inicio: '2026-09-18', fim: '2026-09-25', origem: '' }, '2026-09-01T12:00:00.000Z');
    if (!r.ok) throw new Error();
    const { id: _id, ...base } = ponto('x');
    expect(incluirPontos(r.id, [base, base])).toBeNull();
    const [p1, p2] = obterOperacoes()[0].pontos;
    expect(p1.id).not.toBe(p2.id);

    expect(alterarPonto(r.id, p1.id, { equipe: 'Equipe A', saida: '2026-09-18', retorno: '2026-09-22', grupo: 'Fazenda X', demandas: ['d1', 'd2'] })).toBeNull();
    expect(obterOperacoes()[0].pontos[0]).toMatchObject({ equipe: 'Equipe A', grupo: 'Fazenda X', demandas: ['d1', 'd2'] });
    expect(alterarPonto(r.id, p1.id, { retorno: '2026-09-10' })).toBe('O retorno é anterior à saída.');
    expect(alterarPonto(r.id, p1.id, { saida: '2026-10-01', retorno: '2026-10-02' })).toBe('A data de saída fica fora do período da operação.');

    // Apagar o texto remove o campo.
    expect(alterarPonto(r.id, p1.id, { grupo: '', equipe: '' })).toBeNull();
    expect(obterOperacoes()[0].pontos[0]).not.toHaveProperty('grupo');
    expect(obterOperacoes()[0].pontos[0]).not.toHaveProperty('equipe');

    expect(alterarPonto(r.id, p2.id, { situacao: 'vistoriado' })).toBeNull();
    excluirPonto(r.id, p1.id);
    expect(obterOperacoes()[0].pontos.map((p) => p.id)).toEqual([p2.id]);
    excluirOperacao(r.id);
    expect(obterOperacoes()).toEqual([]);
  });

  it('ponto com data fora do período não entra', () => {
    const r = criarOperacao({ nome: 'Op', inicio: '2026-09-18', fim: '2026-09-25', origem: '' }, 'x');
    if (!r.ok) throw new Error();
    const { id: _id, ...base } = ponto('x', { saida: '2026-12-01' });
    expect(incluirPontos(r.id, [base])).toBe('A data de saída fica fora do período da operação.');
    expect(obterOperacoes()[0].pontos).toEqual([]);
  });

  it('gravação corrompida volta a vazio', () => {
    localStorage.setItem('guara:operacoes:v1', '{isto não é json');
    expect(obterOperacoes()).toEqual([]);
  });
});

describe('vínculo com demandas', () => {
  beforeEach(() => localStorage.clear());
  const nova = () => {
    const r = criarOperacao({ nome: 'Op', inicio: '2026-09-18', fim: '2026-09-25', origem: '' }, 'x');
    if (!r.ok) throw new Error();
    return r.id;
  };

  it('vinculosDasDemandas e demandasEncaixadas ignoram ponto cancelado', () => {
    const op = operacao([
      ponto('a', { demandas: ['d1', 'd2'] }),
      ponto('b', { demandas: ['d1'], situacao: 'vistoriado' }),
      ponto('c', { demandas: ['d3'], situacao: 'cancelado' }),
    ]);
    const mapa = vinculosDasDemandas([op]);
    expect(mapa.get('d1')?.map((v) => v.ponto.id)).toEqual(['a', 'b']);
    expect(mapa.has('d3')).toBe(false);
    expect([...demandasEncaixadas([op])].sort()).toEqual(['d1', 'd2']);
  });

  it('agendar cria ponto planejado, sem equipe e sem data, ligado à demanda; não duplica', () => {
    const id = nova();
    expect(incluirDemandaComoPonto(id, { demandaId: 'd1', coordenada: { lat: -11.5, lon: -58.5 }, municipio: ' Lugar ' })).toBeNull();
    const p = obterOperacoes()[0].pontos[0];
    expect(p).toMatchObject({ coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Lugar', demandas: ['d1'], situacao: 'planejado' });
    expect(p).not.toHaveProperty('equipe');
    expect(p).not.toHaveProperty('saida');
    expect(incluirDemandaComoPonto(id, { demandaId: 'd1', coordenada: p.coordenada, municipio: '' })).toBe('Esta demanda já está nesta operação.');
    expect(incluirDemandaComoPonto('inexistente', { demandaId: 'd1', coordenada: p.coordenada, municipio: '' })).toBe('Operação não encontrada.');
    expect(obterOperacoes()[0].pontos).toHaveLength(1);
  });

  it('cancelado não impede agendar de novo na mesma operação', () => {
    const id = nova();
    const c = { lat: -11.5, lon: -58.5 };
    incluirDemandaComoPonto(id, { demandaId: 'd1', coordenada: c, municipio: '' });
    alterarPonto(id, obterOperacoes()[0].pontos[0].id, { situacao: 'cancelado' });
    expect(incluirDemandaComoPonto(id, { demandaId: 'd1', coordenada: c, municipio: '' })).toBeNull();
  });

  it('vincular a ponto existente, recusar repetido e desvincular', () => {
    const id = nova();
    const { id: _x, ...base } = ponto('x', { situacao: 'vistoriado' });
    incluirPontos(id, [base]);
    const pid = obterOperacoes()[0].pontos[0].id;
    expect(vincularDemandaAPonto(id, pid, 'd1')).toBeNull();
    expect(vincularDemandaAPonto(id, pid, 'd1')).toBe('Esta demanda já está ligada a este ponto.');
    expect(vincularDemandaAPonto(id, 'nada', 'd1')).toBe('Ponto não encontrado.');
    expect(obterOperacoes()[0].pontos[0].demandas).toEqual(['d1']);
    expect(desvincularDemandaDePonto(id, pid, 'd1')).toBeNull();
    expect(obterOperacoes()[0].pontos[0].demandas).toEqual([]);
  });

  it('respeita o limite de demandas por ponto', () => {
    const id = nova();
    const { id: _x, ...base } = ponto('x');
    incluirPontos(id, [{ ...base, demandas: Array.from({ length: 20 }, (_, i) => `d${i}`) }]);
    expect(vincularDemandaAPonto(id, obterOperacoes()[0].pontos[0].id, 'extra')).toBe('O limite é de 20 demandas por ponto.');
  });
});

describe('grupos de pontos', () => {
  beforeEach(() => localStorage.clear());

  it('agruparPontos: grupos em ordem alfabética, "sem grupo" por último, equipes distintas; sem grupo nenhum, vazio', () => {
    const pontos = [
      ponto('a', { grupo: 'Fazenda Z', equipe: 'Equipe B' }),
      ponto('b', { grupo: 'Fazenda X', equipe: 'Equipe A' }),
      ponto('c', { grupo: 'Fazenda X', equipe: 'Equipe B' }),
      ponto('d'),
      ponto('e', { grupo: 'Fazenda X', equipe: 'Equipe A' }),
    ];
    const g = agruparPontos(pontos);
    expect(g.map((x) => x.nome)).toEqual(['Fazenda X', 'Fazenda Z', '']);
    expect(g[0].pontos.map((p) => p.id)).toEqual(['b', 'c', 'e']);
    expect(g[0].equipes).toEqual(['Equipe A', 'Equipe B']);
    expect(g[2].pontos.map((p) => p.id)).toEqual(['d']);
    expect(agruparPontos([ponto('x'), ponto('y')])).toEqual([]);
    expect(nomesDeGrupos(pontos)).toEqual(['Fazenda X', 'Fazenda Z']);
  });

  const comTresPontos = () => {
    const r = criarOperacao({ nome: 'Op', inicio: '', fim: '', origem: '' }, 'x');
    if (!r.ok) throw new Error();
    const { id: _x, ...base } = ponto('x');
    incluirPontos(r.id, [base, base, base]);
    return { id: r.id, ids: obterOperacoes()[0].pontos.map((p) => p.id) };
  };

  it('definirGrupo põe vários pontos no grupo de uma vez e só eles', () => {
    const { id, ids } = comTresPontos();
    expect(definirGrupo(id, [ids[0], ids[2]], '  Fazenda   X ')).toBeNull();
    const pontos = obterOperacoes()[0].pontos;
    expect(pontos.map((p) => p.grupo)).toEqual(['Fazenda X', undefined, 'Fazenda X']);
    expect(pontos[1]).not.toHaveProperty('grupo');
  });

  it('nome vazio tira do grupo; recusa seleção vazia, nome longo e operação inexistente', () => {
    const { id, ids } = comTresPontos();
    definirGrupo(id, ids, 'G');
    expect(definirGrupo(id, [ids[1]], '')).toBeNull();
    expect(obterOperacoes()[0].pontos.map((p) => p.grupo)).toEqual(['G', undefined, 'G']);
    expect(definirGrupo(id, [], 'G')).toBe('Selecione ao menos um ponto.');
    expect(definirGrupo(id, ids, 'x'.repeat(41))).toBe('O nome do grupo pode ter no máximo 40 caracteres.');
    expect(definirGrupo('nada', ids, 'G')).toBe('Operação não encontrada.');
  });
});
