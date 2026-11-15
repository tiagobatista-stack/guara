import type { Operacao, Ponto } from '../../aplicacao/src/modulos/operacoes/modelo.ts';
import {
  contarPontosPendentes, distanciaMetros, lerData, operacaoValida, pontosProximos, pontosSemData, pontosSemEquipe,
  problemasDeDatas, textoLocalProximo, validarListaOperacoes,
} from '../../aplicacao/src/modulos/operacoes/regras.ts';
import {
  alterarPonto, criarOperacao, excluirOperacao, excluirPonto, incluirPontos, obterOperacoes,
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
