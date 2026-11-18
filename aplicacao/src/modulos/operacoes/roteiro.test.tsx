// Roteiro de vistoria imprimível: bloco do POP só nos pontos com o bloco ativo; texto escapado; botão por viagem.

import { fireEvent, render, screen } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';
import { ITENS_POP } from './pop-supressao.ts';
import { htmlDoRoteiro } from './roteiro.ts';

beforeEach(() => localStorage.clear());
const base = { coordenada: { lat: -12.1, lon: -58.2 }, municipio: 'Brasnorte', notas: '', demandas: [] as string[], situacao: 'planejado' as const, equipe: 'A', saida: '2026-10-05', retorno: '2026-10-09' };

function operacaoComPontos(pontos: object[]) {
  const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação');
  incluirPontos(r.id, pontos.map((p, i) => ({ ...base, coordenada: { lat: -12.1 - i, lon: -58.2 }, ...p })));
  const op = obterOperacoes()[0];
  return { op, viagem: op.viagens[0] };
}

describe('htmlDoRoteiro', () => {
  it('bloco do POP só nos pontos com o bloco ativo; Formulário A inteiro com caixas e item citado; sem Formulário B', () => {
    const { op, viagem } = operacaoComPontos([{ tipoDano: 'Desmatamento' }, { tipoDano: 'Cerca' }, { tipoDano: 'Queimada', popAtivo: true }]);
    const html = htmlDoRoteiro({ operacao: op, viagem, pontos: op.pontos, demandas: [], geradoEm: '2026-11-18' });
    const folhas = html.split(/<article class="folha[^"]*">/).slice(1); // capa + 3 frentes + 2 pontos × 2 páginas do POP
    expect(folhas).toHaveLength(8);
    expect(html.match(/Caracterização do dano \(POP\) · 1\/2/g)).toHaveLength(2); // pontos 1 e 3
    expect(html.match(/Caracterização do dano \(POP\) · 2\/2/g)).toHaveLength(2);
    const verso = folhas.filter((f) => f.includes('Caracterização do dano (POP) ·')).slice(0, 2).join('');
    for (const it of ITENS_POP.filter((i) => i.formulario === 'A')) expect(verso.split(`<b>${it.id}.</b>`)).toHaveLength(2); // cada item uma vez só
    expect(verso).not.toContain('<b>B-1.</b>');
    // desvios do POP em texto, só os que pulam itens
    expect(verso).toContain('Se "Não", pule para A-18.');
    expect(verso).toContain('Se "Não houve alteração perceptível da camada superficial do solo", pule para A-18.');
    expect(verso).not.toContain('Se "Arraste"');
    expect(verso).toContain('class="cx"');
    expect(html).toContain('Fotos nº');
    expect(html).toContain('Roteiro de vistoria</h1>');
    expect(html).toContain('1 de 3 · Brasnorte'); // "N de T · operação"
    expect(html).toContain('(graus decimais, EPSG:4674)');
    expect(html).toContain('18/11/2026');
  });

  it('escapa texto do usuário, lista demandas ligadas e deixa de fora ponto cancelado', () => {
    const { op, viagem } = operacaoComPontos([{ municipio: '<b>x</b>', demandas: ['d1'] }, { situacao: 'cancelado' }]);
    const html = htmlDoRoteiro({ operacao: op, viagem, pontos: op.pontos, demandas: [{ id: 'd1', titulo: 'Vistoria & cia', processo: 'FIC-1' }], geradoEm: '2026-11-18' });
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
    expect(html).toContain('Vistoria &amp; cia');
    expect(html).toContain('FIC-1');
    expect(html.match(/<h2>Ponto /g)).toHaveLength(1);
  });
});

describe('constatação de embargo', () => {
  it('só em ponto com demanda de embargo ligada (sem demanda ou com demanda de outro tipo: sem as opções de embargo)', () => {
    const { op, viagem } = operacaoComPontos([{}, { demandas: ['d1'] }, { demandas: ['d2'] }]);
    const demandas = [{ id: 'd1', titulo: 'Vistoria de desmate' }, { id: 'd2', titulo: 'Descumprimento de embargo', processo: 'FIC-2' }];
    const frentes = htmlDoRoteiro({ operacao: op, viagem, pontos: op.pontos, demandas, geradoEm: '2026-11-18' }).split(/<article class="folha[^"]*">/).slice(2); // sem a capa
    expect(frentes[0]).not.toContain('embargo descumprido'); // sem demanda
    expect(frentes[1]).not.toContain('embargo descumprido'); // demanda de outro tipo
    expect(frentes[1]).toContain('regeneração');
    expect(frentes[2]).toContain('embargo respeitado');
    expect(frentes[2]).toContain('embargo descumprido');
  });
});

describe('botão na viagem', () => {
  it('abre o roteiro numa aba nova com o HTML da viagem', async () => {
    operacaoComPontos([{ tipoDano: 'Desmatamento' }]);
    let blob: Blob | undefined;
    URL.createObjectURL = ((b: Blob) => { blob = b; return 'blob:x'; }) as typeof URL.createObjectURL;
    const abrir = vi.spyOn(window, 'open').mockReturnValue(null);
    const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
    fireEvent.click(screen.getByRole('button', { name: /^Roteiro de vistoria da viagem / }));
    expect(abrir).toHaveBeenCalledWith('blob:x', '_blank');
    expect(await blob!.text()).toContain('Roteiro de vistoria · Brasnorte');
  });
});
