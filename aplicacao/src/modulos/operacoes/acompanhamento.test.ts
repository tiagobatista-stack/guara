// Etapa 2 (15/11/2026): código do ponto, tipo de dano, resultado (FISCALIZADO_AUTUADO), situação de acompanhamento,
// pendências de campo e reprogramação dos pontos "Não".

import assert from 'node:assert/strict';
import * as R from './regras.ts';
import * as A from './armazem.ts';
import * as C from './importar-csv.ts';

const base = { coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Juína', notas: '', demandas: [] as string[], situacao: 'planejado' as const };
const vazio = { motivo: '', protocolo: '', observacao: '', dataVistoria: '' };
const HOJE = '2026-11-15';
beforeEach(() => localStorage.clear());

function novaOp(nome = 'Op', inicio = '2026-10-05', fim = '2026-10-12') {
  const r = A.criarOperacao({ nome, inicio, fim, origem: '' }, '2026-09-01T00:00:00Z');
  assert.ok(r.ok);
  return (r as { id: string }).id;
}
const pontos = (i = 0) => A.obterOperacoes()[i].pontos;

it('código: MUNICIPIO+AAAAMM-NN, sem acento nem espaço; null sem município, início ou número', () => {
  assert.equal(R.gerarCodigo('Juína', '2026-10-05', 1), 'JUINA202610-01');
  assert.equal(R.gerarCodigo('São José do Rio Claro', '2026-10-05', 12), 'SAOJOSEDORIOCLARO202610-12');
  assert.equal(R.gerarCodigo('Juína', '2026-10-05', 123), 'JUINA202610-123');
  assert.equal(R.gerarCodigo('', '2026-10-05', 1), null);
  assert.equal(R.gerarCodigo('Juína', undefined, 1), null);
  assert.equal(R.gerarCodigo('Juína', '2026-10-05', undefined), null);
});

it('incluir pontos: número livre para quem não tem, código gerado e o da planilha preservado', () => {
  const id = novaOp();
  assert.equal(A.incluirPontos(id, [{ ...base, numero: 3 }, base, { ...base, codigo: 'JUINA202610-99' }, { ...base, municipio: 'Castanheira' }]), null);
  assert.deepEqual(pontos().map((p) => [p.numero, p.codigo]), [[3, 'JUINA202610-03'], [4, 'JUINA202610-04'], [5, 'JUINA202610-99'], [6, 'CASTANHEIRA202610-06']]);
});

it('código fixo: mudar período ou município depois não muda; sem início, o código vem quando o período é definido', () => {
  const id = novaOp('Sem período', '', '');
  A.incluirPontos(id, [{ ...base, numero: 1 }]);
  assert.equal(pontos()[0].codigo, undefined);
  assert.equal(A.alterarPeriodo(id, '2026-10-05', '2026-10-12'), null);
  assert.equal(pontos()[0].codigo, 'JUINA202610-01');
  assert.equal(A.alterarPeriodo(id, '2026-11-01', '2026-11-08'), null);
  assert.equal(A.alterarPonto(id, pontos()[0].id, { municipio: 'Castanheira' }), null);
  assert.equal(pontos()[0].codigo, 'JUINA202610-01');
});

it('código único: o da planilha repetido recusa a importação; o gerado repetido fica sem código e a tela explica', () => {
  const a = novaOp('A');
  A.incluirPontos(a, [{ ...base, numero: 1 }]);
  const b = novaOp('B');
  assert.equal(A.incluirPontos(b, [{ ...base, codigo: 'juina202610-01' }]), 'O código juina202610-01 já existe (A).');
  assert.equal(A.incluirPontos(b, [{ ...base, codigo: 'X-1' }, { ...base, codigo: 'X-1' }]), 'O código X-1 já existe (B).');
  assert.equal(A.incluirPontos(b, [{ ...base, numero: 1 }]), null);
  const opB = A.obterOperacoes()[1];
  assert.equal(opB.pontos[0].codigo, undefined);
  assert.equal(A.conflitoDeCodigo(opB, opB.pontos[0]), 'O código JUINA202610-01 já existe (A). Mude o número do ponto para gerar outro.');
  assert.equal(A.alterarPonto(b, opB.pontos[0].id, { numero: 2 }), null);
  assert.equal(pontos(1)[0].codigo, 'JUINA202610-02');
  // Número repetido na mesma operação é recusado.
  A.incluirPontos(b, [{ ...base, numero: 5 }]);
  assert.equal(A.alterarPonto(b, pontos(1)[1].id, { numero: 2 }), 'Já existe o ponto 2 nesta operação.');
});

it('resultado: motivo obrigatório para "Não" e "Fiscalizado não autuado"; data futura recusada; situação calculada', () => {
  const id = novaOp();
  A.incluirPontos(id, [base, base, base, base]);
  const [p1, p2, p3, p4] = pontos();
  assert.equal(A.registrarResultado(id, p1.id, { ...vazio, resultado: 'nao' }, HOJE), 'Informe o motivo de não fiscalizar ou não autuar.');
  assert.equal(A.registrarResultado(id, p1.id, { ...vazio, resultado: 'sim', dataVistoria: '2026-11-16' }, HOJE), 'A data da vistoria não pode ser futura.');
  assert.equal(A.registrarResultado(id, p1.id, { ...vazio, resultado: 'sim', protocolo: ' SEMA-PRO-2026/0001 ', dataVistoria: '2026-10-07' }, HOJE), null);
  assert.equal(A.registrarResultado(id, p2.id, { ...vazio, resultado: 'fiscalizado-nao-autuado', motivo: 'Infrator não localizado' }, HOJE), null);
  assert.equal(A.registrarResultado(id, p3.id, { ...vazio, resultado: 'nao', motivo: 'Área sem acesso' }, HOJE), null);
  assert.deepEqual(pontos().map((p) => R.situacaoDoPonto(p)), ['finalizado', 'finalizado', 'a-reprogramar', 'planejado']);
  assert.deepEqual(pontos()[0], { ...pontos()[0], situacao: 'vistoriado', resultado: 'sim', protocolo: 'SEMA-PRO-2026/0001', dataVistoria: '2026-10-07' });
  assert.equal(pontos()[2].situacao, 'planejado');
  // Apagar o resultado volta a planejado e limpa o pós-campo.
  assert.equal(A.registrarResultado(id, p1.id, { ...vazio, resultado: '' }, HOJE), null);
  assert.ok(!('resultado' in pontos()[0]) && !('protocolo' in pontos()[0]));
  assert.equal(R.situacaoDoPonto(pontos()[0]), 'planejado');
  // Legado: "vistoriado" sem resultado = resultado pendente.
  assert.equal(R.situacaoDoPonto({ situacao: 'vistoriado' }), 'resultado-pendente');
  assert.equal(R.situacaoDoPonto({ situacao: 'cancelado', resultado: 'sim' }), 'cancelado');
  void p4;
});

it('encerramento e pendências de campo: viagem que já voltou com ponto sem resultado, e pontos a reprogramar', () => {
  const id = novaOp();
  A.incluirPontos(id, [{ ...base, equipe: 'A', saida: '2026-10-05', retorno: '2026-10-08' }, { ...base, equipe: 'A', saida: '2026-10-05', retorno: '2026-10-08' }, base]);
  const [p1, p2, p3] = pontos();
  let o = A.obterOperacoes()[0];
  let pend = R.pendenciasDeCampo([o], HOJE);
  assert.deepEqual(pend.semResultado.map((x) => x.ponto.id), [p1.id, p2.id]); // p3 sem viagem: não conta
  assert.equal(R.pendenciasDeCampo([o], '2026-10-08').semResultado.length, 0); // no dia do retorno, ainda não
  A.registrarResultado(id, p1.id, { ...vazio, resultado: 'sim' }, HOJE);
  A.registrarResultado(id, p2.id, { ...vazio, resultado: 'nao', motivo: 'Área sem acesso' }, HOJE);
  o = A.obterOperacoes()[0];
  pend = R.pendenciasDeCampo([o], HOJE);
  assert.deepEqual([pend.semResultado.length, pend.aReprogramar.map((x) => x.ponto.id)], [0, [p2.id]]);
  assert.equal(R.operacaoEncerrada(o), false);
  A.alterarPonto(id, p3.id, { situacao: 'cancelado' });
  assert.equal(R.operacaoEncerrada(A.obterOperacoes()[0]), false); // p2 ainda a reprogramar
  // Planejamento (sem viagem) não conta mais para ponto com resultado.
  assert.equal(R.contarPontosPendentes(A.obterOperacoes()), 0);
});

it('reprogramar: o ponto "Não" vira ponto planejado na outra operação, com código novo; o original sai das pendências', () => {
  const a = novaOp('Outubro');
  A.incluirPontos(a, [{ ...base, demandas: ['d1'], tipoDano: 'Desmatamento' }]);
  const b = novaOp('Novembro', '2026-11-20', '2026-11-27');
  const p = pontos(0)[0];
  assert.equal(A.reprogramarPonto(a, p.id, b), 'Só ponto com resultado "Não" (não fiscalizado) pode ser reprogramado.');
  A.registrarResultado(a, p.id, { ...vazio, resultado: 'nao', motivo: 'Área sem acesso' }, HOJE);
  assert.equal(A.reprogramarPonto(a, p.id, a), 'Escolha outra operação.');
  assert.equal(A.reprogramarPonto(a, p.id, b), null);
  const [opA, opB] = A.obterOperacoes();
  const novo = opB.pontos[0];
  assert.deepEqual(opA.pontos[0].reprogramado, { operacao: b, ponto: novo.id });
  assert.equal(R.situacaoDoPonto(opA.pontos[0]), 'reprogramado');
  assert.equal(R.operacaoEncerrada(opA), true);
  assert.deepEqual([novo.codigo, novo.demandas, novo.tipoDano, novo.situacao], ['JUINA202611-01', ['d1'], 'Desmatamento', 'planejado']);
  assert.equal(novo.notas, 'Reprogramado de JUINA202610-01 (Área sem acesso).');
  assert.equal(R.pendenciasDeCampo(A.obterOperacoes(), HOJE).aReprogramar.length, 0);
  assert.equal(A.registrarResultado(a, p.id, { ...vazio, resultado: 'sim' }, HOJE), 'Este ponto já foi reprogramado em outra operação: registre o resultado lá.');
});

it('importação: lê CODIGO_PONTO, NUMERO_DO_PONTO, NOTA_PLANEJAMENTO e TIPO_DANO da planilha da SEMA', () => {
  const csv = 'MES_PPROG;CODIGO_PONTO;NUMERO_DO_PONTO;EQUIPE;COORD_X;COORD_Y;MUNICIPIO;DATA_SAIDA ; NOTA_PLANEJAMENTO ;TIPO_DANO\n'
    + '202610;JUINA202610-07;7;Equipe A;58° 38\' 26,123" W;10° 49\' 49,809" S;Juína;05/10/2026;Hot spot;Desmatamento';
  const r = C.importarPontosCsv(csv);
  assert.deepEqual(r.linhas[0].erros, []);
  assert.deepEqual(
    { numero: r.linhas[0].ponto!.numero, codigo: r.linhas[0].ponto!.codigo, notas: r.linhas[0].ponto!.notas, tipoDano: r.linhas[0].ponto!.tipoDano, saida: r.linhas[0].ponto!.saida },
    { numero: 7, codigo: 'JUINA202610-07', notas: 'Hot spot', tipoDano: 'Desmatamento', saida: '2026-10-05' },
  );
});

it('dataLocal usa o fuso do navegador', () => {
  assert.equal(R.dataLocal(new Date(2026, 10, 15, 23, 30)), '2026-11-15');
});

it('pontoVencido: retorno (ou saída) antes de hoje, só planejado ou sem resultado; sem viagem ou datas não vence', () => {
  const viagem = (v: { retorno?: string; saida?: string }) => ({ viagens: [{ id: 'v', equipe: 'A', integrantes: [], veiculos: [], notas: '', ...v }] });
  const ponto = (extra = {}) => ({ ...base, viagem: 'v', ...extra });
  assert.equal(R.pontoVencido(viagem({ retorno: HOJE }), ponto(), HOJE), false); // retorno hoje
  assert.equal(R.pontoVencido(viagem({ retorno: '2026-11-14' }), ponto(), HOJE), true); // ontem
  assert.equal(R.pontoVencido(viagem({ saida: '2026-11-14' }), ponto(), HOJE), true); // sem retorno: vale a saída
  assert.equal(R.pontoVencido(viagem({ saida: HOJE }), ponto(), HOJE), false);
  assert.equal(R.pontoVencido(viagem({ retorno: '2026-11-14' }), ponto({ situacao: 'vistoriado' }), HOJE), true); // resultado pendente
  assert.equal(R.pontoVencido(viagem({ retorno: '2026-11-14' }), ponto({ resultado: 'sim' }), HOJE), false); // finalizado
  assert.equal(R.pontoVencido(viagem({ retorno: '2026-11-14' }), ponto({ resultado: 'nao' }), HOJE), false); // a reprogramar
  assert.equal(R.pontoVencido(viagem({ retorno: '2026-11-14' }), ponto({ situacao: 'cancelado' }), HOJE), false);
  assert.equal(R.pontoVencido({ viagens: [] }, { ...base }, HOJE), false); // sem viagem
  assert.equal(R.pontoVencido(viagem({}), ponto(), HOJE), false); // viagem sem datas
});

it('criarOperacaoComPontos: valida tudo antes; ponto recusado ou lista vazia não cria nada', () => {
  const d = { nome: 'Nova', inicio: '', fim: '', origem: '' };
  const ok = { ...base, codigo: 'X-01' };
  novaOp('Outra');
  A.incluirPontos(A.obterOperacoes()[0].id, [{ ...base, codigo: 'X-01' }]);
  const antes = JSON.stringify(A.obterOperacoes());
  assert.equal(A.criarOperacaoComPontos(d, '2026-11-18T00:00:00Z', []).ok, false);
  const r = A.criarOperacaoComPontos(d, '2026-11-18T00:00:00Z', [{ ...base, municipio: 'Outro' }, ok]); // código repetido
  assert.equal(r.ok, false);
  assert.equal(JSON.stringify(A.obterOperacoes()), antes);
  const certo = A.criarOperacaoComPontos(d, '2026-11-18T00:00:00Z', [{ ...base, equipe: 'A', saida: '2026-12-07', retorno: '2026-12-11' }]);
  assert.ok(certo.ok);
  const nova = A.obterOperacoes()[1];
  assert.deepEqual([nova.inicio, nova.fim, nova.viagens.length, nova.pontos.length], ['2026-12-07', '2026-12-11', 1, 1]);
});

it('diasDaViagem e dataForaDaViagem: viagem de 4 dias, só saída, sem datas, limites e fora', () => {
  const v = { saida: '2026-10-06', retorno: '2026-10-09' };
  assert.deepEqual(R.diasDaViagem(v), ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']);
  assert.deepEqual(R.diasDaViagem({ saida: '2026-10-31', retorno: '2026-11-02' }), ['2026-10-31', '2026-11-01', '2026-11-02']);
  assert.deepEqual(R.diasDaViagem({ saida: '2026-10-06' }), ['2026-10-06']);
  assert.deepEqual(R.diasDaViagem({}), []);
  assert.deepEqual(R.diasDaViagem(undefined), []);
  assert.deepEqual(R.diasDaViagem({ saida: '2026-10-09', retorno: '2026-10-06' }), []);
  assert.equal(R.dataForaDaViagem(v, '2026-10-06'), false); // = saída
  assert.equal(R.dataForaDaViagem(v, '2026-10-09'), false); // = retorno
  assert.equal(R.dataForaDaViagem(v, '2026-10-05'), true);
  assert.equal(R.dataForaDaViagem(v, '2026-10-18'), true);
  assert.equal(R.dataForaDaViagem({ saida: '2026-10-06' }, '2026-10-07'), true); // só saída: só aquele dia
  assert.equal(R.dataForaDaViagem({}, '2026-10-18'), false); // sem datas
  assert.equal(R.dataForaDaViagem(v, ''), false);
  assert.equal(R.textoPeriodoViagem(v), '06/10 a 09/10/2026');
});
