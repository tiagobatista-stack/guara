// Paginação do roteiro: capa sempre com número par de páginas; ficha com POP em página ímpar, POP logo depois;
// ficha sem POP divide a folha. O HTML é medido por marcadores (a conta de páginas está em roteiro.ts); o PDF real foi conferido no Edge.

import assert from 'node:assert/strict';
import { htmlDoRoteiro } from './roteiro.ts';

const viagem = { id: 'v', equipe: 'A', integrantes: [], veiculos: [], saida: '2026-12-07', retorno: '2026-12-11', notas: '' };
const ponto = (i: number, tipoDano: string) => ({ id: `p${i}`, numero: i, tipoDano, coordenada: { lat: -11.5 - i / 100, lon: -58.5 }, municipio: 'Castanheira', notas: '', demandas: [], situacao: 'planejado' as const, viagem: 'v' });
const gerar = (pontos: ReturnType<typeof ponto>[]) =>
  htmlDoRoteiro({ operacao: { id: 'o', nome: 'Op', viagens: [viagem], pontos, criadaEm: '2026-11-01T00:00:00Z' } as never, viagem, pontos: pontos as never, demandas: [], geradoEm: '2026-11-19' });
/** Sequência de blocos na ordem em que saem: capa, página em branco, ficha com POP, POP e ficha sem POP. */
const sequencia = (html: string) =>
  [...html.matchAll(/class="(folha capa|branca|folha ficha ficha--pop|folha folha--pop|folha ficha)"/g)].map((m) => ({ 'folha capa': 'C', branca: 'B', 'folha ficha ficha--pop': 'F', 'folha folha--pop': 'P', 'folha ficha': 'f' })[m[1]]).join('');

it('caso misto: ficha com POP sempre em página ímpar, com o POP logo depois', () => {
  // capa 2 páginas; ponto 1 (POP) pág. 3-4; ponto 2 (sem POP) pág. 5 sozinha; ponto 3 (POP) precisa de ímpar: branca na 6, pág. 7-8
  assert.equal(sequencia(gerar([ponto(1, 'Desmatamento'), ponto(2, 'Cerca'), ponto(3, 'Desmatamento')])), 'CCFPfBFP');
});

it('3 pontos sem POP: nenhuma página em branco, as 3 fichas seguem a capa (2 na folha, a 3ª na seguinte)', () => {
  assert.equal(sequencia(gerar([ponto(1, 'Cerca'), ponto(2, 'Cerca'), ponto(3, 'Cerca')])), 'CCfff');
});

it('capa: o total de páginas é sempre par, de 0 a 100 pontos', () => {
  for (const n of [0, 1, 5, 18, 19, 33, 46, 60, 100]) {
    const capa = sequencia(gerar(Array.from({ length: n }, (_, i) => ponto(i + 1, 'Cerca')))).match(/^C+/)![0].length;
    assert.equal(capa % 2, 0, `${n} pontos: capa com ${capa} páginas`);
    assert.ok(capa >= 2);
  }
});
