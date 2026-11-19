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

// ---- Inspeção de agrotóxicos: ficha + POP + páginas da inspeção fecham sempre em número par de páginas ----
const sequenciaComInspecao = (html: string) =>
  [...html.matchAll(/class="(folha capa|branca|folha ficha ficha--pop|folha folha--pop folha--insp|folha folha--pop|folha ficha)"/g)]
    .map((m) => ({ 'folha capa': 'C', branca: 'B', 'folha ficha ficha--pop': 'F', 'folha folha--pop folha--insp': 'I', 'folha folha--pop': 'P', 'folha ficha': 'f' })[m[1]]).join('');

it('ponto com POP e inspeção: ficha, POP e inspeção de 2 páginas fixas (4 no total); bloco par e ficha seguinte em página ímpar', () => {
  const s = sequenciaComInspecao(gerar([ponto(1, 'Desmatamento químico'), ponto(2, 'Cerca'), ponto(3, 'Aplicação irregular de agrotóxico')]));
  assert.match(s, /^CCFPIIf/); // exatamente 4 páginas: ficha + POP + 2 da inspeção
  // após o bloco par (capa 2 + bloco par), a ficha sem bloco ocupa uma página ímpar; o ponto 3 precisa de ímpar: branca antes
  assert.match(s, /f(B)?FPII$/);
});

it('inspeção ativada à mão em ponto sem POP: ficha + 2 da inspeção + 1 de anotações = 4 páginas', () => {
  const p = { ...ponto(1, 'Cerca'), inspecaoAtiva: true };
  const s = sequenciaComInspecao(gerar([p as never]));
  const bloco = s.replace(/^C+/, '');
  assert.equal(bloco, 'FIII');
});

it('só os itens de campo vão para o papel; a prévia entra como resumo, sem dado pessoal; checklist na capa', () => {
  const p = { ...ponto(1, 'Desmatamento químico'), conferenciaPrevia: { 'C-2.2': 'Não', 'C-2.2@fonte': 'SIGA', 'C-2.5': 'Sim', 'C-2.5.1': '321' } };
  const html = gerar([p as never]);
  assert.match(html, /<b>Conferido antes:<\/b>/);
  assert.match(html, /C-2\.2 [^<]*CTF[^<]*: <b>Não<\/b> \(SIGA\)/);
  assert.match(html, /<b>C-4\.1<\/b>/); // campo
  assert.doesNotMatch(html, /<b>C-2\.2<\/b>/); // prévia: só no resumo
  assert.match(html, /<b>C-6\.1<\/b>[\s\S]*se aplicável: C-5\.2 = Sim/);
  assert.match(html, /EPI da equipe/);
  assert.match(html, /Material de coleta de amostra/);
  assert.match(html, /Lacres/);
  assert.match(html, /Termo de apreensão\/depósito/);
  assert.doesNotMatch(gerar([ponto(1, 'Cerca')]), /EPI da equipe/);
});

it('inspeção impressa: tabela pergunta | Sim | Não | N.A. | nº/obs., 2 páginas fixas, todos os itens de campo uma vez, fonte mínima de 8 pt', () => {
  const html = gerar([ponto(1, 'Aplicação irregular de agrotóxico')]);
  const paginas = html.split('class="folha folha--pop folha--insp"').slice(1);
  assert.equal(paginas.length, 2);
  for (const pg of paginas) assert.match(pg, /<th>Pergunta<\/th><th class="c">Sim<\/th><th class="c">Não<\/th><th class="c">N\.A\.<\/th><th>nº \/ obs\.<\/th>/);
  const ids = [...html.matchAll(/<tr(?: class="se")?><td><b>(C-[\d.]+)<\/b>/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length); // nenhum item repetido
  assert.ok(ids.includes('C-4.1') && ids.includes('C-7.5') && ids.length === 107, `${ids.length} itens`);
  assert.doesNotMatch(html, /C-2\.13\.4\.1/); // só 3 pares de embargo no papel
  const css = html.match(/\.tab-insp\{.*/)![0];
  for (const m of css.matchAll(/font-size:([\d.]+)pt/g)) assert.ok(Number(m[1]) >= 8, `fonte ${m[1]} pt`);
});
