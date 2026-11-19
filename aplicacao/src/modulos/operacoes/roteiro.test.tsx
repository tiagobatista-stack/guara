// Roteiro de vistoria imprimível: bloco do POP só nos pontos com o bloco ativo; texto escapado; botão por viagem.

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';
import { ITENS_POP } from './pop-supressao.ts';
import { qrSvg } from './qr.ts';
import { htmlDoRoteiro, urlDoMapa } from './roteiro.ts';

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
    const folhas = html.split(/<article class="folha[^"]*">/).slice(1); // capa (2 páginas) + 3 fichas + 2 páginas de POP (1 página por ponto)
    expect(folhas).toHaveLength(7);
    expect(html.match(/Caracterização do dano \(POP\)/g)).toHaveLength(2); // pontos 1 e 3
    const verso = folhas.filter((f) => f.includes('Caracterização do dano (POP)')).slice(0, 1).join('');
    expect(html).toContain('<th>Visitado</th><th>Data</th>');
    expect(html.match(/class="branca"/g)).toHaveLength(1); // capa = pág. 1-2, ponto 1 (POP) pág. 3-4, ponto 2 sozinho na 5, branca na 6, ponto 3 na 7
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
    const frentes = htmlDoRoteiro({ operacao: op, viagem, pontos: op.pontos, demandas, geradoEm: '2026-11-18' }).split(/<article class="folha[^"]*">/).slice(3); // sem as 2 páginas da capa
    expect(frentes[0]).not.toContain('embargo descumprido'); // sem demanda
    expect(frentes[1]).not.toContain('embargo descumprido'); // demanda de outro tipo
    expect(frentes[1]).toContain('regeneração');
    expect(frentes[2]).toContain('embargo respeitado');
    expect(frentes[2]).toContain('embargo descumprido');
  });
});

describe('QR do ponto e sem croqui', () => {
  it('a URL do Google Maps: lat,lon com 6 casas, ponto decimal e sinal', () => {
    expect(urlDoMapa({ lat: -12.1, lon: -58.2 })).toBe('https://www.google.com/maps/search/?api=1&query=-12.100000,-58.200000');
    expect(urlDoMapa({ lat: 3.123456789, lon: 0.5 })).toBe('https://www.google.com/maps/search/?api=1&query=3.123457,0.500000');
  });

  it('o SVG do QR vem do gerador local e a legenda "Abrir no Google Maps" fica na folha de cada ponto', () => {
    const svg = qrSvg('https://www.google.com/maps/search/?api=1&query=-12.100000,-58.200000');
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('viewBox');
    const { op, viagem } = operacaoComPontos([{}, { tipoDano: 'Cerca' }]);
    const chamadas: string[] = [];
    const html = htmlDoRoteiro({ operacao: op, viagem, pontos: op.pontos, demandas: [], geradoEm: '2026-11-18', qrSvg: (t) => { chamadas.push(t); return '<svg id="qr-teste"></svg>'; } });
    expect(chamadas).toEqual([urlDoMapa(op.pontos[0].coordenada), urlDoMapa(op.pontos[1].coordenada)]);
    expect(html.match(/<svg id="qr-teste">/g)).toHaveLength(2);
    expect(html.match(/Abrir no Google Maps/g)).toHaveLength(2);
    expect(html).toContain('.qr svg{display:block;width:22mm;height:22mm}');
  });

  it('sem coordenada válida ou sem gerador: sem QR; e o croqui não existe mais', () => {
    const { op, viagem } = operacaoComPontos([{}]);
    const invalido = { ...op.pontos[0], coordenada: { lat: NaN, lon: 0 } };
    const comQr = htmlDoRoteiro({ operacao: op, viagem, pontos: [invalido], demandas: [], geradoEm: '2026-11-18', qrSvg: () => '<svg id="qr-teste"></svg>' });
    expect(comQr).not.toContain('qr-teste');
    const semGerador = htmlDoRoteiro({ operacao: op, viagem, pontos: op.pontos, demandas: [], geradoEm: '2026-11-18' });
    expect(semGerador).not.toContain('class="qr"');
    expect(semGerador).not.toMatch(/Croqui/i);
    expect(semGerador).toContain('Observações de campo');
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
    await waitFor(() => expect(abrir).toHaveBeenCalledWith('blob:x', '_blank')); // o QR carrega por import dinâmico
    const html = await blob!.text();
    expect(html).toContain('Roteiro de vistoria · Brasnorte');
    expect(html).toContain('<svg'); // QR gerado localmente
  });
});
