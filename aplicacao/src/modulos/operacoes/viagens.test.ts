// Viagens do cronograma (15/11/2026): migração do ponto com equipe e datas, importação, edição em lote,
// período, conflito de agenda por pessoa e veículo, pendências, exportação e organização da lista.

import assert from 'node:assert/strict';
import * as R from './regras.ts';
import * as A from './armazem.ts';
import * as C from './importar-csv.ts';
import * as E from './exportar.ts';

const base = { coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Juína', notas: '', demandas: [] as string[], situacao: 'planejado' as const };
beforeEach(() => localStorage.clear());

function novaOp(nome = 'Op', inicio = '2026-09-18', fim = '2026-09-25') {
  const r = A.criarOperacao({ nome, inicio, fim, origem: '' }, '2026-09-01T00:00:00Z');
  assert.ok(r.ok);
  return (r as { id: string }).id;
}

it('migração: ponto antigo com equipe e datas vira viagem; mesma equipe e datas = mesma viagem', () => {
  const antigo = [{ id: 'op-1', nome: 'Antiga', criadaEm: '2026-09-01T00:00:00Z', pontos: [
    { id: 'pt-1', ...base, equipe: 'Equipe A', saida: '2026-09-18', retorno: '2026-09-22' },
    { id: 'pt-2', ...base, equipe: 'equipe  a', saida: '2026-09-18', retorno: '2026-09-22' },
    { id: 'pt-3', ...base, equipe: 'Equipe B', saida: '2026-09-19' },
    { id: 'pt-4', ...base },
  ] }];
  localStorage.setItem('guara:operacoes:v1', JSON.stringify(antigo));
  const [o] = A.obterOperacoes();
  assert.equal(o.viagens.length, 2);
  assert.deepEqual(o.viagens[0], { id: 'vg-1', equipe: 'Equipe A', integrantes: [], veiculos: [], notas: '', saida: '2026-09-18', retorno: '2026-09-22' });
  assert.equal(o.pontos[0].viagem, 'vg-1');
  assert.equal(o.pontos[1].viagem, 'vg-1');
  assert.equal(o.pontos[2].viagem, 'vg-2');
  assert.equal(o.pontos[3].viagem, undefined);
  for (const p of o.pontos) for (const k of ['equipe', 'saida', 'retorno']) assert.ok(!(k in p), `${k} saiu do ponto`);
  // Ler de novo dá o mesmo resultado (ids determinísticos).
  localStorage.setItem('guara:operacoes:v1', JSON.stringify(antigo) + ' ');
  assert.deepEqual(A.obterOperacoes()[0].viagens.map((v) => v.id), ['vg-1', 'vg-2']);
});

it('migração: ponto com viagem inexistente fica sem viagem; formato atual passa intacto', () => {
  localStorage.setItem('guara:operacoes:v1', JSON.stringify([{ id: 'op-1', nome: 'X', criadaEm: '2026-09-01T00:00:00Z', viagens: [], pontos: [{ id: 'pt-1', ...base, viagem: 'vg-9' }] }]));
  assert.equal(A.obterOperacoes()[0].pontos[0].viagem, undefined);
  localStorage.setItem('guara:operacoes:v1', JSON.stringify([{ id: 'op-1', nome: 'X', criadaEm: '2026-09-01T00:00:00Z', viagens: [{ id: 'vg-1', equipe: 'E', integrantes: ['a', 'b'], veiculos: ['v'], notas: '' }], pontos: [{ id: 'pt-1', ...base, viagem: 'vg-1' }] }]));
  assert.equal(A.obterOperacoes()[0].pontos[0].viagem, 'vg-1');
  // Viagem com retorno antes da saída invalida a operação gravada.
  localStorage.setItem('guara:operacoes:v1', JSON.stringify([{ id: 'op-1', nome: 'X', criadaEm: '2026-09-01T00:00:00Z', viagens: [{ id: 'vg-1', equipe: 'E', integrantes: [], veiculos: [], notas: '', saida: '2026-09-20', retorno: '2026-09-19' }], pontos: [] }]));
  assert.equal(A.obterOperacoes().length, 0);
});

it('importação: linhas com a mesma equipe e datas formam uma viagem; a segunda importação reaproveita', () => {
  const id = novaOp();
  const csv = 'N_PONTO;EQUIPE;COORD_X;COORD_Y;MUNICIPIO;DAT_SAIDA;DAT_RETOR\n1;Equipe A;58.5 W;11.5 S;Juína;18/09/2026;22/09/2026\n2;Equipe A;58.6 W;11.6 S;Castanheira;18/09/2026;22/09/2026\n3;;58.7 W;11.7 S;Juína;;';
  const r = C.importarPontosCsv(csv, { inicio: '2026-09-18', fim: '2026-09-25' });
  assert.equal(A.incluirPontos(id, r.linhas.map((l) => l.ponto!)), null);
  let o = A.obterOperacoes()[0];
  assert.equal(o.viagens.length, 1);
  assert.deepEqual(o.pontos.map((p) => !!p.viagem), [true, true, false]);
  assert.equal(A.incluirPontos(id, [{ ...base, equipe: 'Equipe A', saida: '2026-09-18', retorno: '2026-09-22' }]), null);
  o = A.obterOperacoes()[0];
  assert.equal(o.viagens.length, 1);
  assert.equal(o.pontos[3].viagem, o.viagens[0].id);
  assert.equal(R.pontosSemViagem(o).length, 1);
});

it('viagem: criar, validar datas, completar, excluir sem apagar pontos', () => {
  const id = novaOp();
  const vazia = { equipe: '', integrantes: [], veiculos: [], saida: '', retorno: '', notas: '' };
  assert.deepEqual(A.criarViagem(id, { ...vazia, saida: '2026-09-20', retorno: '2026-09-19' }), { ok: false, erro: 'O retorno é anterior à saída.' });
  assert.deepEqual(A.criarViagem(id, { ...vazia, saida: '2026-10-20' }), { ok: false, erro: 'A data de saída fica fora do período da operação.' });
  const r = A.criarViagem(id, { equipe: ' Equipe  A ', integrantes: ['Fulano Fictício', ' fulano  fictício', ''], veiculos: [], saida: '2026-09-18', retorno: '', notas: '' });
  assert.ok(r.ok);
  let o = A.obterOperacoes()[0];
  const v = o.viagens[0];
  assert.equal(v.equipe, 'Equipe A');
  assert.deepEqual(v.integrantes, ['Fulano Fictício']);
  assert.deepEqual(R.faltasDaViagem(v), ['integrantes (mínimo 2)', 'veículo', 'data de retorno']);
  assert.equal(A.alterarViagem(id, v.id, { equipe: 'Equipe A', integrantes: ['Fulano Fictício', 'Beltrana Fictícia'], veiculos: ['Hilux FIC-0001'], saida: '2026-09-18', retorno: '2026-09-22', notas: '' }), null);
  o = A.obterOperacoes()[0];
  assert.deepEqual(R.faltasDaViagem(o.viagens[0]), []);
  A.incluirPontos(id, [base, base]);
  o = A.obterOperacoes()[0];
  assert.equal(A.definirViagem(id, o.pontos.map((p) => p.id), v.id), null);
  assert.ok(A.obterOperacoes()[0].pontos.every((p) => p.viagem === v.id));
  assert.equal(A.definirViagem(id, [], v.id), 'Selecione ao menos um ponto.');
  assert.equal(A.definirViagem(id, [o.pontos[0].id], 'vg-nao-existe'), 'Viagem não encontrada.');
  A.excluirViagem(id, v.id);
  o = A.obterOperacoes()[0];
  assert.equal(o.viagens.length, 0);
  assert.equal(o.pontos.length, 2);
  assert.ok(o.pontos.every((p) => p.viagem === undefined));
});

it('período: recusa o que deixa viagem de fora', () => {
  const id = novaOp();
  A.criarViagem(id, { equipe: 'E', integrantes: [], veiculos: [], saida: '2026-09-18', retorno: '2026-09-22', notas: '' });
  assert.equal(A.alterarPeriodo(id, '2026-09-19', '2026-09-25'), 'Há viagens com data fora desse período: ajuste as datas das viagens primeiro.');
  assert.equal(A.alterarPeriodo(id, '2026-09-18', '2026-09-30'), null);
});

it('conflito de agenda: mesma pessoa ou veículo em datas sobrepostas, em operações diferentes', () => {
  const a = novaOp('Op A');
  const b = novaOp('Op B', '2026-09-20', '2026-09-30');
  A.criarViagem(a, { equipe: 'A', integrantes: ['Fulano Fictício', 'Ciclana'], veiculos: ['Hilux FIC-0001'], saida: '2026-09-18', retorno: '2026-09-22', notas: '' });
  A.criarViagem(b, { equipe: 'B', integrantes: ['fulano ficticio', 'Outra'], veiculos: ['S10 FIC-0002'], saida: '2026-09-22', retorno: '2026-09-24', notas: '' });
  A.criarViagem(b, { equipe: 'C', integrantes: ['Ciclana'], veiculos: ['Hilux FIC-0001'], saida: '2026-09-23', retorno: '2026-09-25', notas: '' });
  const ops = A.obterOperacoes();
  const mapa = R.conflitosDeAgenda(ops);
  const va = ops[0].viagens[0];
  const lista = mapa.get(R.chaveAgenda(ops[0].id, va.id))!;
  assert.equal(lista.length, 1); // só a B (22/09 encosta); a C começa depois do retorno
  assert.deepEqual(lista[0].pessoas, ['Fulano Fictício']);
  assert.equal(lista[0].operacao, 'Op B');
  assert.equal(mapa.get(R.chaveAgenda(ops[1].id, ops[1].viagens[1].id)), undefined);
  assert.deepEqual(R.sugestoesDeViagem(ops).integrantes, ['Ciclana', 'Fulano Fictício', 'Outra']);
});

it('pendências, alterarPonto e local próximo usam a viagem', () => {
  const id = novaOp();
  A.incluirPontos(id, [{ ...base, equipe: 'Equipe A', saida: '2026-09-18', retorno: '2026-09-22' }, base, { ...base, equipe: 'Equipe B' }]);
  let o = A.obterOperacoes()[0];
  assert.equal(R.contarPontosPendentes([o]), 2); // sem viagem + viagem sem saída
  assert.equal(A.alterarPonto(id, o.pontos[1].id, { viagem: o.pontos[0].viagem, grupo: '  ' }), null);
  o = A.obterOperacoes()[0];
  assert.equal(o.pontos[1].viagem, o.pontos[0].viagem);
  assert.ok(!('grupo' in o.pontos[1]));
  assert.equal(A.alterarPonto(id, o.pontos[1].id, { viagem: '' }), null);
  assert.ok(!('viagem' in A.obterOperacoes()[0].pontos[1]));
  assert.equal(A.alterarPonto(id, o.pontos[1].id, { viagem: 'x' }), 'Viagem não encontrada.');
  const prox = R.pontosProximos(A.obterOperacoes()[0].pontos[1], A.obterOperacoes());
  assert.equal(R.textoLocalProximo(prox[0]), 'Operação Op, Equipe A, planejado, 22/09/2026, a 0 m');
});

it('exportação: equipe e datas vêm da viagem; colunas da planilha mantidas', () => {
  const id = novaOp();
  A.incluirPontos(id, [{ ...base, numero: 1, equipe: 'Equipe A', saida: '2026-09-18', retorno: '2026-09-22' }, { ...base, numero: 2 }]);
  const o = A.obterOperacoes()[0];
  const linhas = E.exportarCsv(o).replace(/^﻿/, '').trim().split('\r\n');
  assert.equal(linhas[0], 'N_PONTO,EQUIPE,COORD_X,COORD_Y,MUNICIPIO,DAT_SAIDA,DAT_RETOR,NOT_PLANEJ,SITUACAO,GRUPO,OPERACAO,N_DEMANDAS');
  assert.equal(linhas[1], '1,Equipe A,-58.5,-11.5,Juína,2026-09-18,2026-09-22,,planejado,,Op,0');
  assert.equal(linhas[2], '2,,-58.5,-11.5,Juína,,,,planejado,,Op,0');
  const g = JSON.parse(E.exportarGeoJson(o));
  assert.equal(g.features[0].properties.EQUIPE, 'Equipe A');
  assert.equal(g.features[1].properties.DAT_SAIDA, null);
  // O CSV exportado volta a importar na mesma viagem.
  const r = C.importarPontosCsv(E.exportarCsv(o));
  assert.equal(r.linhas.filter((l) => l.ponto).length, 2);
  assert.equal(r.linhas[0].ponto!.equipe, 'Equipe A');
});

it('organização: por viagem na ordem do cronograma, sem viagem por último; grupo com equipe da viagem', () => {
  const id = novaOp();
  A.incluirPontos(id, [{ ...base, equipe: 'Tarde', saida: '2026-09-20' }, { ...base, equipe: 'Cedo', saida: '2026-09-18' }, { ...base, grupo: 'Fazenda X' }]);
  const o = A.obterOperacoes()[0];
  const secoes = R.pontosPorViagem(o, o.pontos);
  assert.deepEqual(secoes.map((s) => s.viagem?.equipe ?? 'sem'), ['Cedo', 'Tarde', 'sem']);
  const g = R.agruparPontos(o.pontos, (p) => R.viagemDoPonto(o, p)?.equipe);
  assert.deepEqual(g.map((x) => [x.nome, x.equipes]), [['Fazenda X', []], ['', ['Cedo', 'Tarde']]]);
});

it('histórico do pedido: criação e cada mudança de período, com o anterior, o novo e o motivo; sem mudança, sem evento', () => {
  const id = novaOp();
  assert.deepEqual(A.obterOperacoes()[0].historico, [{ quando: '2026-09-01T00:00:00Z', acao: 'criada' }]);
  assert.equal(A.alterarPeriodo(id, '2026-09-18', '2026-09-25', { quando: '2026-09-02T00:00:00Z' }), null); // igual: nada muda
  assert.equal(A.obterOperacoes()[0].historico!.length, 1);
  assert.equal(A.alterarPeriodo(id, '2026-10-01', '2026-10-08', { quando: '2026-09-03T00:00:00Z', motivo: 'adiada' }), null);
  assert.equal(A.alterarPeriodo(id, '', '', { quando: '2026-09-04T00:00:00Z' }), null);
  assert.deepEqual(A.obterOperacoes()[0].historico!.slice(1), [
    { quando: '2026-09-03T00:00:00Z', acao: 'periodo', de: { inicio: '2026-09-18', fim: '2026-09-25' }, para: { inicio: '2026-10-01', fim: '2026-10-08' }, motivo: 'adiada' },
    { quando: '2026-09-04T00:00:00Z', acao: 'periodo', de: { inicio: '2026-10-01', fim: '2026-10-08' }, para: {} },
  ]);
  // Histórico inválido na gravação invalida a operação; ausente continua válido.
  const gravada = JSON.parse(localStorage.getItem('guara:operacoes:v1')!);
  localStorage.setItem('guara:operacoes:v1', JSON.stringify([{ ...gravada[0], historico: [{ quando: 'x', acao: 'criada' }] }]));
  assert.equal(A.obterOperacoes().length, 0);
  const { historico: _h, ...semHistorico } = gravada[0];
  localStorage.setItem('guara:operacoes:v1', JSON.stringify([semHistorico]));
  assert.equal(A.obterOperacoes().length, 1);
});

it('períodos: unir (ampliar), conter e texto', () => {
  assert.deepEqual(R.unirPeriodos({ inicio: '2026-09-20', fim: '2026-09-25' }, { inicio: '2026-09-18', fim: '2026-09-22' }), { inicio: '2026-09-18', fim: '2026-09-25' });
  assert.deepEqual(R.unirPeriodos({ inicio: '2026-09-20' }, { inicio: '2026-09-18', fim: '2026-12-01' }), { inicio: '2026-09-18' });
  assert.equal(R.dentroDoPeriodo('2026-09-17', { inicio: '2026-09-18' }), false);
  assert.equal(R.dentroDoPeriodo('2030-01-01', { inicio: '2026-09-18' }), true);
  assert.equal(R.textoDoPeriodo({ inicio: '2026-09-18' }), '18/09/2026 a …');
  assert.equal(R.textoDoPeriodo({}), 'sem período definido');
});
