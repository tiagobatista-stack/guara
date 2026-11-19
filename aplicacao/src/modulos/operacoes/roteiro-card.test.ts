// Botão "Gerar roteiro" do card: visibilidade por data e aviso de cronograma antigo (carimbos gravados em armazem.ts).

import assert from 'node:assert/strict';
import * as R from './regras.ts';
import * as A from './armazem.ts';

const base = { coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Juína', notas: '', demandas: [] as string[], situacao: 'planejado' as const };
const HOJE = '2026-11-19';
const op = (inicio: string | undefined, pontos: unknown[] = [{ id: 'p', ...base }]) => ({ inicio, viagens: [], pontos }) as never;
beforeEach(() => localStorage.clear());

it('podeGerarRoteiro: início ontem não, hoje e amanhã sim; sem início não', () => {
  assert.equal(R.podeGerarRoteiro(op('2026-11-18'), HOJE), false);
  assert.equal(R.podeGerarRoteiro(op('2026-11-19'), HOJE), true);
  assert.equal(R.podeGerarRoteiro(op('2026-11-20'), HOJE), true);
  assert.equal(R.podeGerarRoteiro(op(undefined), HOJE), false);
});

it('podeGerarRoteiro: encerrada não (mesmo com início futuro); reprogramada para o futuro volta', () => {
  const encerrada = op('2026-11-20', [{ id: 'p', ...base, situacao: 'cancelado' }]);
  assert.equal(R.podeGerarRoteiro(encerrada, HOJE), false);
  assert.equal(R.podeGerarRoteiro(op('2026-12-01'), HOJE), true);
});

const v = { id: 'v', equipe: 'A', integrantes: [], veiculos: [], notas: '' };
it('cronogramaDesatualizado: sem viagem, sem carimbo, igual e ponto alterado depois', () => {
  const o = { viagens: [v], criadaEm: '2026-11-01T00:00:00Z' };
  assert.equal(R.cronogramaDesatualizado({ ...o, viagens: [] }), true);
  assert.equal(R.cronogramaDesatualizado(o), false);
  assert.equal(R.cronogramaDesatualizado({ ...o, cronogramaAtualizadoEm: '2026-11-05T00:00:00Z', operacaoAlteradaEm: '2026-11-05T00:00:00Z' }), false);
  assert.equal(R.cronogramaDesatualizado({ ...o, cronogramaAtualizadoEm: '2026-11-05T00:00:00Z', operacaoAlteradaEm: '2026-11-06T00:00:00Z' }), true);
  assert.equal(R.cronogramaDesatualizado({ ...o, operacaoAlteradaEm: '2026-11-06T00:00:00Z' }), true); // antiga: vale a criação
});

const nova = (nome: string) => (A.criarOperacao({ nome, inicio: '2026-11-20', fim: '2026-11-25', origem: '' }, '2026-11-01T00:00:00Z') as { id: string }).id;

it('carimbos: viagem → cronograma; estrutura do ponto → operação; status/resultado não carimba', async () => {
  const r = A.criarOperacao({ nome: 'Op', inicio: '2026-11-20', fim: '2026-11-25', origem: '' }, '2026-11-01T00:00:00Z');
  const id = (r as { id: string }).id;
  const get = () => A.obterOperacoes()[0];
  const espera = () => new Promise((ok) => setTimeout(ok, 5));

  const nv = A.criarViagem(id, { equipe: 'A', integrantes: ['x', 'y'], veiculos: ['v'], saida: '2026-11-20', retorno: '2026-11-22', notas: '' });
  assert.ok(nv.ok);
  const c1 = get().cronogramaAtualizadoEm;
  assert.ok(c1 && !get().operacaoAlteradaEm);

  await espera();
  assert.equal(A.incluirPontos(id, [{ ...base }]), null);
  const o1 = get().operacaoAlteradaEm;
  assert.ok(o1 && R.cronogramaDesatualizado(get()));
  const pid = get().pontos[0].id;

  await espera();
  assert.equal(A.alterarPonto(id, pid, { notas: 'só nota' }), null);
  assert.equal(get().operacaoAlteradaEm, o1);
  assert.equal(A.travarPonto(id, pid, 'outro' as never, 'x', '2026-11-19T00:00:00Z'), null);
  assert.equal(get().operacaoAlteradaEm, o1);

  await espera();
  assert.equal(A.definirViagem(id, [pid], (nv as { id: string }).id), null); // troca a viagem do ponto
  assert.ok(get().operacaoAlteradaEm! > o1!);

  await espera();
  A.conferirCronograma(id);
  assert.equal(R.cronogramaDesatualizado(get()), false);

  await espera();
  A.excluirViagem(id, (nv as { id: string }).id); // viagem e ponto mudam juntos: vale o cronograma
  assert.ok(get().cronogramaAtualizadoEm! > c1!);
  assert.ok(get().cronogramaAtualizadoEm! >= get().operacaoAlteradaEm!);
});

it('reprogramar marca a operação de destino como alterada; operação criada com pontos nasce em dia', () => {
  const o1 = (A.criarOperacaoComPontos({ nome: 'Origem', inicio: '2026-11-20', fim: '2026-11-25', origem: '' }, '2026-11-01T00:00:00Z', [{ ...base, equipe: 'A', saida: '2026-11-20', retorno: '2026-11-22' }]) as { id: string }).id;
  assert.equal(R.cronogramaDesatualizado(A.obterOperacoes()[0]), false); // nasce em dia
  const o2 = nova('Destino');
  const pid = A.obterOperacoes()[0].pontos[0].id;
  assert.equal(A.registrarResultado(o1, pid, { resultado: 'nao', motivo: 'Área sem acesso', protocolo: '', observacao: '', dataVistoria: '' }, '2026-11-25'), null);
  assert.equal(A.reprogramarPonto(o1, pid, o2), null);
  const destino = A.obterOperacoes().find((o) => o.id === o2)!;
  assert.ok(destino.operacaoAlteradaEm);
});
