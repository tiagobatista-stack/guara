// Lacunas do roteiro (18/11/2026): imóvel, área, CAR, etiquetas, motorista e sugestões do POP.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { itensDoMapa } from '../mapa/regras.ts';
import { Operacoes } from './Operacoes.tsx';
import { alterarPonto, alterarViagem, criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';
import { importarPontosCsv } from './importar-csv.ts';
import { sugestoesPop } from './pop-supressao.ts';
import { validarListaOperacoes } from './regras.ts';
import { htmlDoRoteiro } from './roteiro.ts';

beforeEach(() => localStorage.clear());
const base = { coordenada: { lat: -12.1, lon: -58.2 }, municipio: 'Brasnorte', notas: '', demandas: [] as string[], situacao: 'planejado' as const, equipe: 'A', saida: '2026-10-05', retorno: '2026-10-09', integrantes: ['Ana', 'Beto'] };

function montar(extra: object = {}) {
  const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação');
  incluirPontos(r.id, [{ ...base, ...extra }]);
  const op = obterOperacoes()[0];
  return { id: r.id, op, pid: op.pontos[0].id, vid: op.viagens[0].id };
}
const ponto = () => obterOperacoes()[0].pontos[0];
const dadosViagem = (v: { equipe: string; integrantes: string[]; veiculos: string[]; saida?: string; retorno?: string }) =>
  ({ equipe: v.equipe, integrantes: v.integrantes, veiculos: v.veiculos, saida: v.saida ?? '', retorno: v.retorno ?? '', notas: '' });

describe('planejamento do ponto: imóvel, área, CAR, etiquetas', () => {
  it('grava, arredonda a área para 1 casa, apara os textos e limpa o que ficou vazio', () => {
    const { id, pid } = montar();
    expect(alterarPonto(id, pid, { imovel: '  Fazenda Exemplo ', areaHa: 70.26, car: 'MT-0000000/EXEMPLO', situacaoCar: 'com-car', etiquetas: ['hot spot', 'Hot Spot', ' DLA suspeita '] })).toBeNull();
    expect(ponto()).toMatchObject({ imovel: 'Fazenda Exemplo', areaHa: 70.3, car: 'MT-0000000/EXEMPLO', situacaoCar: 'com-car', etiquetas: ['hot spot', 'DLA suspeita'] });
    alterarPonto(id, pid, { imovel: '', car: '', areaHa: undefined, situacaoCar: undefined, etiquetas: [] });
    for (const k of ['imovel', 'car', 'areaHa', 'situacaoCar', 'etiquetas']) expect(ponto()).not.toHaveProperty(k);
  });

  it('recusa área zero ou negativa, imóvel e CAR longos e mais de 10 etiquetas; etiqueta de mais de 30 é cortada', () => {
    const { id, pid } = montar();
    expect(alterarPonto(id, pid, { areaHa: 0 })).toMatch(/maior que zero/);
    expect(alterarPonto(id, pid, { areaHa: -3 })).toMatch(/maior que zero/);
    expect(alterarPonto(id, pid, { imovel: 'x'.repeat(121) })).toMatch(/120/);
    expect(alterarPonto(id, pid, { car: 'x'.repeat(61) })).toMatch(/60/);
    expect(alterarPonto(id, pid, { etiquetas: Array.from({ length: 11 }, (_, i) => `e${i}`) })).toMatch(/10 etiquetas/);
    expect(alterarPonto(id, pid, { etiquetas: ['x'.repeat(40)] })).toBeNull();
    expect(ponto().etiquetas![0]).toHaveLength(30);
  });

  it('dados lidos do navegador com valor inválido são recusados', () => {
    const { op } = montar();
    const copia = (m: object) => JSON.parse(JSON.stringify([{ ...op, pontos: [{ ...op.pontos[0], ...m }] }]));
    expect(validarListaOperacoes(copia({ areaHa: 12.5, situacaoCar: 'sem-car', etiquetas: ['a'] }))).toHaveLength(1);
    expect(validarListaOperacoes(copia({ areaHa: 0 }))).toHaveLength(0);
    expect(validarListaOperacoes(copia({ situacaoCar: 'talvez' }))).toHaveLength(0);
    expect(validarListaOperacoes(copia({ etiquetas: Array.from({ length: 11 }, (_, i) => `e${i}`) }))).toHaveLength(0);
  });
});

describe('importação: etiquetas só da coluna ETIQUETAS', () => {
  const cab = 'CODIGO_PONTO;NUMERO_DO_PONTO;EQUIPE;COORD_X;COORD_Y;MUNICIPIO;DATA_SAIDA;NOTA_PLANEJAMENTO';
  const lin = ';1;Equipe A;58° 38\' 26,123" W;10° 49\' 49,809" S;Juína;05/10/2026;hot spot, fora de CAR';
  it('sem a coluna, as notas não viram etiquetas; com a coluna, vira lista limpa', () => {
    const sem = importarPontosCsv(`${cab}\n${lin}`);
    expect(sem.linhas[0].ponto!.notas).toBe('hot spot, fora de CAR');
    expect(sem.linhas[0].ponto!.etiquetas).toBeUndefined();
    const com = importarPontosCsv(`${cab};ETIQUETAS\n${lin};"hot spot, DLA suspeita ,hot spot"`);
    expect(com.linhas[0].ponto!.etiquetas).toEqual(['hot spot', 'DLA suspeita']);
  });
});

describe('motorista da viagem', () => {
  it('só vale se for integrante; sai se o integrante sair', () => {
    const { id, vid, op } = montar();
    const dados = dadosViagem(op.viagens[0]);
    expect(alterarViagem(id, vid, { ...dados, motorista: 'Ana' })).toBeNull();
    expect(obterOperacoes()[0].viagens[0].motorista).toBe('Ana');
    alterarViagem(id, vid, { ...dados, motorista: 'Fulano' });
    expect(obterOperacoes()[0].viagens[0]).not.toHaveProperty('motorista');
    alterarViagem(id, vid, { ...dados, motorista: 'Beto' });
    alterarViagem(id, vid, { ...dados, integrantes: ['Ana'], motorista: 'Beto' });
    expect(obterOperacoes()[0].viagens[0]).not.toHaveProperty('motorista');
  });
});

describe('sugestões do POP pelo ponto', () => {
  it('sem CAR ou "fora de CAR" sugere Não em B-3; "perto de TI" sugere a proteção legal de A-6; nada mais', () => {
    expect(sugestoesPop({ situacaoCar: 'sem-car' })).toEqual({ 'B-3': 'Não' });
    expect(sugestoesPop({ etiquetas: ['Fora de CAR'] })).toEqual({ 'B-3': 'Não' });
    expect(sugestoesPop({ etiquetas: ['perto de TI'] })).toEqual({ 'A-6': 'Espaços especialmente protegidos (RL, APP, área de uso restrito, UC ou TI)' });
    expect(sugestoesPop({ situacaoCar: 'com-car', etiquetas: ['hot spot'] })).toEqual({});
  });
});

describe('roteiro com as lacunas', () => {
  it('imprime imóvel, área, CAR, situação, etiquetas, motorista e a sugestão do A-6 marcada como "conferir"', () => {
    const { id, pid, vid, op } = montar({ tipoDano: 'Desmatamento' });
    alterarPonto(id, pid, { imovel: 'Fazenda Exemplo', areaHa: 70, car: 'MT-1/EXEMPLO', situacaoCar: 'sem-car', etiquetas: ['perto de TI', 'hot spot'] });
    alterarViagem(id, vid, { ...dadosViagem(op.viagens[0]), motorista: 'Beto' });
    const o = obterOperacoes()[0];
    const html = htmlDoRoteiro({ operacao: o, viagem: o.viagens[0], pontos: o.pontos, demandas: [], geradoEm: '2026-11-18' });
    for (const t of ['Fazenda Exemplo', '<dt>Desmate (ha)</dt><dd>70</dd>', 'MT-1/EXEMPLO', 'sem CAR', 'perto de TI, hot spot', 'Demanda / etiquetas', '<b>Beto</b>']) expect(html).toContain(t);
    expect(html.match(/\(sugerido — conferir\)/g)).toHaveLength(1); // só A-6, uma opção
    expect(html).not.toContain('<b>B-3.</b>'); // Formulário B não vai no roteiro
  });

  it('ponto sem os dados novos mostra "—" e sem motorista fica a linha', () => {
    const { op } = montar();
    const html = htmlDoRoteiro({ operacao: op, viagem: op.viagens[0], pontos: op.pontos, demandas: [], geradoEm: '2026-11-18' });
    expect(html).not.toContain('Imóvel / local'); // campo vazio some da ficha
    expect(html).toContain('<dt>Código</dt>');
    expect(html).not.toContain('<b>Beto</b>');
  });
});

describe('mapa', () => {
  it('o item do ponto leva imóvel, área e etiquetas ao balão e ao filtro', () => {
    const { id, pid } = montar();
    alterarPonto(id, pid, { imovel: 'Sítio Modelo', areaHa: 12.5, etiquetas: ['hot spot'] });
    expect(itensDoMapa([], obterOperacoes()).noMapa[0]).toMatchObject({ imovel: 'Sítio Modelo', areaHa: 12.5, etiquetas: ['hot spot'] });
  });
});

describe('tela do ponto', () => {
  function abrir(extra: object = {}) {
    const m = montar(extra);
    const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    return m;
  }

  it('Editar planejamento grava imóvel, área (vírgula), CAR, situação e etiquetas; o cartão mostra', () => {
    const { pid } = abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Editar planejamento do Ponto 1' }));
    const form = screen.getByRole('form', { name: 'Editar planejamento do Ponto 1' });
    fireEvent.change(within(form).getByLabelText('Imóvel / local'), { target: { value: 'Fazenda Exemplo' } });
    fireEvent.change(within(form).getByLabelText('Desmate (ha)'), { target: { value: '70,5' } });
    fireEvent.change(within(form).getByLabelText('CAR estadual'), { target: { value: 'MT-1/EXEMPLO' } });
    fireEvent.change(within(form).getByLabelText('Situação do CAR'), { target: { value: 'sem-car' } });
    fireEvent.change(within(form).getByLabelText('Incluir em etiquetas'), { target: { value: 'hot spot' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Confirmar inclusão em etiquetas' }));
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar ponto' }));
    expect(ponto()).toMatchObject({ imovel: 'Fazenda Exemplo', areaHa: 70.5, car: 'MT-1/EXEMPLO', situacaoCar: 'sem-car', etiquetas: ['hot spot'] });
    expect(screen.getByTestId(`imovel-${pid}`)).toHaveTextContent('Fazenda Exemplo');
    expect(screen.getByTestId(`area-${pid}`)).toHaveTextContent('70,5');
    expect(screen.getByTestId(`car-${pid}`)).toHaveTextContent('MT-1/EXEMPLO · sem CAR');
    expect(screen.getByTestId(`etiquetas-${pid}`)).toHaveTextContent('hot spot');
  });

  it('área zero na tela é recusada', () => {
    abrir();
    fireEvent.click(screen.getByRole('button', { name: 'Editar planejamento do Ponto 1' }));
    const form = screen.getByRole('form', { name: 'Editar planejamento do Ponto 1' });
    fireEvent.change(within(form).getByLabelText('Desmate (ha)'), { target: { value: '0' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Salvar ponto' }));
    expect(screen.getByRole('alert')).toHaveTextContent('maior que zero');
    expect(ponto()).not.toHaveProperty('areaHa');
  });

  it('o POP mostra "Sugerido — conferir" sem responder sozinho; "Usar sugestão" grava a resposta', () => {
    const { id, pid } = abrir({ tipoDano: 'Desmatamento' });
    act(() => { alterarPonto(id, pid, { situacaoCar: 'sem-car' }); });
    expect(screen.getByTestId('sugestao-B-3')).toHaveTextContent('Sugerido — conferir (B-3): Não.');
    expect(ponto().caracterizacao).toBeUndefined();
    fireEvent.click(within(screen.getByTestId('sugestao-B-3')).getByRole('button', { name: 'Usar sugestão' }));
    expect(ponto().caracterizacao).toEqual({ 'B-3': 'Não' });
    expect(screen.queryByTestId('sugestao-B-3')).toBeNull();
  });
});
