// Etapa 3 (15/11/2026): planilha de controle da SEMA nos dois sentidos — importação das colunas novas,
// reimportação que atualiza pelo código (o sistema prevalece no planejamento) e exportação no layout da SEMA.

import assert from 'node:assert/strict';
import * as A from './armazem.ts';
import * as C from './importar-csv.ts';
import * as E from './exportar.ts';
import * as P from './reimportar.ts';
import * as R from './regras.ts';

const CAB = 'MES_PPROG;CODIGO_PONTO;NUMERO_DO_PONTO;EQUIPE;COORD_X;COORD_Y;MUNICIPIO;DATA_SAIDA ;DATA_RETORNO; NOTA_PLANEJAMENTO ;SERVIDOR_EQUIPE;'
  + 'FISCALIZADO_AUTUADO;MOTIVO DE NÃO FISCALIZAR/AUTUAR ;NUM_PROTOCOLO;OBSERVACAO;LONGITUDE;LATITUDE;AG_FISCALIZACAO;TIPO_DANO';
const linha = (campos: Partial<Record<string, string>>) => [
  '202610', campos.codigo ?? '', campos.numero ?? '1', campos.equipe ?? 'Equipe A', campos.x ?? '58° 38\' 26,123" W', campos.y ?? '10° 49\' 49,809" S',
  campos.municipio ?? 'Juína', campos.saida ?? '05/10/2026', campos.retorno ?? '09/10/2026', campos.notas ?? 'Hot spot', campos.servidores ?? 'Fulano Fictício / Beltrana Fictícia',
  campos.resultado ?? '', campos.motivo ?? '', campos.protocolo ?? '', campos.observacao ?? '', campos.lon ?? '-58,64058972', campos.lat ?? '-10,8305025',
  campos.setor ?? 'DUDJUINA', campos.dano ?? '',
].join(';');
const csv = (...linhas: string[]) => [CAB, ...linhas].join('\r\n');

beforeEach(() => localStorage.clear());
function novaOp(nome = 'Op', inicio = '2026-10-05', fim = '2026-10-12') {
  const r = A.criarOperacao({ nome, inicio, fim, origem: '' }, '2026-09-01T00:00:00Z');
  assert.ok(r.ok);
  return (r as { id: string }).id;
}

it('importa a planilha da SEMA: resultado, motivo, protocolo, observação, servidores, setor e tipo de dano', () => {
  const r = C.importarPontosCsv(csv(linha({ codigo: 'JUINA202610-01', resultado: 'Fiscalizado não autuado', motivo: 'Infrator não localizado', protocolo: 'FIC-0001', observacao: 'Sem morador', dano: 'Desmatamento' })));
  assert.deepEqual(r.linhas[0].erros, []);
  assert.deepEqual(r.linhas[0].avisos, []);
  const p = r.linhas[0].ponto!;
  assert.deepEqual(
    [p.codigo, p.numero, p.resultado, p.motivo, p.protocolo, p.observacao, p.tipoDano, p.integrantes, p.situacao, p.notas],
    ['JUINA202610-01', 1, 'fiscalizado-nao-autuado', 'Infrator não localizado', 'FIC-0001', 'Sem morador', 'Desmatamento', ['Fulano Fictício', 'Beltrana Fictícia'], 'vistoriado', 'Hot spot'],
  );
  assert.equal(r.setor, 'DUDJUINA');
  assert.ok(R.distanciaMetros(p.coordenada, { lat: -10.8305025, lon: -58.64058972 }) < 1);
});

it('resultado: os quatro valores da planilha; desconhecido vira aviso e o ponto entra sem resultado; "Não" sem motivo é aviso', () => {
  assert.deepEqual(['Sim', 'fiscalizado não autuado', 'Não Cabe Atuação', 'NÃO', 'talvez'].map(R.resultadoDaPlanilha), ['sim', 'fiscalizado-nao-autuado', 'nao-cabe-atuacao', 'nao', null]);
  const r = C.importarPontosCsv(csv(linha({ resultado: 'Talvez' }), linha({ numero: '2', resultado: 'Não' })));
  assert.deepEqual(r.linhas[0].erros, []);
  assert.deepEqual(r.linhas[0].avisos, ["Resultado não reconhecido: 'Talvez'. Corrija na planilha ou registre no ponto."]);
  assert.equal(r.linhas[0].ponto!.resultado, undefined);
  assert.deepEqual(r.linhas[1].avisos, ['Resultado "Não" sem o motivo.']);
  assert.equal(r.linhas[1].ponto!.situacao, 'planejado');
});

it('coordenadas: avisa quando COORD_X/COORD_Y e LONGITUDE/LATITUDE divergem; só decimal também serve', () => {
  const r = C.importarPontosCsv(csv(linha({ lon: '-58,70' })));
  assert.equal(r.linhas[0].avisos.length, 1);
  assert.match(r.linhas[0].avisos[0], /a \d+ m um do outro; vale COORD_X\/COORD_Y/);
  const soDecimal = C.importarPontosCsv('LONGITUDE;LATITUDE\n-58,64058972;-10,8305025');
  assert.deepEqual(soDecimal.linhas[0].ponto!.coordenada, { lat: -10.830502, lon: -58.64059 });
});

it('número da linha: conta as linhas vazias descartadas e é a linha física onde o registro começa', () => {
  assert.deepEqual(C.importarPontosCsv('COORD_X;COORD_Y\n;\n58 W;abc').linhas.map((l) => l.linha), [3]);
  assert.deepEqual(C.importarPontosCsv('COORD_X;COORD_Y\r\n\r\n\r\n58 W;abc\r\n').linhas.map((l) => l.linha), [4]);
  // Quebra de linha dentro de aspas fica no mesmo registro; o seguinte começa duas linhas depois.
  assert.deepEqual(C.importarPontosCsv('NOTAS;COORD_X;COORD_Y\n"a\nb";1;2\n\nc;3;4').linhas.map((l) => l.linha), [2, 5]);
});

// Casos conferidos à mão pelo auditor na revisão de bbb4ece (R3): cada tipo de quebra, aspas, BOM e fim do arquivo.
const casosDeLinha: [string, string, number[]][] = [
  ['\\n com linhas vazias', 'COORD_X;COORD_Y\n\n1;2\n\n3;4', [3, 5]],
  ['\\r\\n com linha vazia', 'COORD_X;COORD_Y\r\n\r\n1;2', [3]],
  ['\\r sozinho', 'COORD_X;COORD_Y\r\r1;2\r3;4', [3, 4]],
  ['\\n dentro de aspas (3 linhas)', 'NOTAS;COORD_X;COORD_Y\n"a\nb\nc";1;2\nd;3;4', [2, 5]],
  ['\\r\\n dentro de aspas', 'NOTAS;COORD_X;COORD_Y\r\n"a\r\nb";1;2\r\nc;3;4', [2, 4]],
  ['\\r dentro de aspas', 'NOTAS;COORD_X;COORD_Y\r"a\rb";1;2\rc;3;4', [2, 4]],
  ['aspas "" escapadas com quebra e linha vazia', 'NOTAS;COORD_X;COORD_Y\n"diz ""a""\nb";1;2\n\nc;3;4', [2, 5]],
  ['sem quebra no fim', 'COORD_X;COORD_Y\n1;2', [2]],
  ['quebras sobrando no fim', 'COORD_X;COORD_Y\n1;2\n\n\n', [2]],
  ['com BOM', '﻿COORD_X;COORD_Y\n\n1;2', [3]],
  ['linha só com separadores', 'COORD_X;COORD_Y\n ; \n1;2', [3]],
  ['linhas em branco antes do cabeçalho (linha física, não "cabeçalho = 1")', '\n\nCOORD_X;COORD_Y\n58 W;abc', [4]],
];
for (const [nome, texto, esperado] of casosDeLinha) {
  it(`número da linha: ${nome}`, () => {
    assert.deepEqual(C.importarPontosCsv(texto).linhas.map((l) => l.linha), esperado);
  });
}

// R2 (auditor, revisão de bbb4ece): o separador sai da primeira linha com conteúdo, não da primeira linha do texto.
it('separador: linhas em branco antes do cabeçalho não escondem a vírgula nem a tabulação', () => {
  assert.deepEqual(C.lerCsv('\n\nCOORD_X,COORD_Y\n58 W,abc'), [['COORD_X', 'COORD_Y'], ['58 W', 'abc']]);
  assert.deepEqual(C.lerCsv('\r\n  \r\nCOORD_X\tCOORD_Y\r\n58 W\tabc'), [['COORD_X', 'COORD_Y'], ['58 W', 'abc']]);
  const r = C.importarPontosCsv('\n\nCOORD_X,COORD_Y\n58 W,abc');
  assert.equal(r.erro, undefined);
  assert.deepEqual(r.linhas.map((l) => l.linha), [4]);
});

it('separador: com \\r sozinho como quebra, só o cabeçalho conta (vírgulas no dado não mudam o separador)', () => {
  assert.deepEqual(C.lerCsv('COORD_X;COORD_Y\r1;a,b,c,d'), [['COORD_X', 'COORD_Y'], ['1', 'a,b,c,d']]);
});

it('servidores da equipe entram nos integrantes da viagem, sem repetir', () => {
  const id = novaOp();
  const r = C.importarPontosCsv(csv(linha({}), linha({ numero: '2', servidores: 'beltrana fictícia, Ciclano Fictício' })));
  assert.equal(A.incluirPontos(id, r.linhas.map((l) => l.ponto!)), null);
  assert.deepEqual(A.obterOperacoes()[0].viagens[0].integrantes, ['Fulano Fictício', 'Beltrana Fictícia', 'Ciclano Fictício']);
});

it('exporta no layout da SEMA: cabeçalho, ponto e vírgula, vírgula decimal, graus com 3 casas e ordem por número', () => {
  const id = novaOp();
  A.definirSetor(id, ' dudjuina ');
  A.incluirPontos(id, [
    { coordenada: { lat: -10.8305025, lon: -58.64058972 }, municipio: 'Juína', notas: 'Hot; "spot"', demandas: [], situacao: 'planejado', numero: 2, equipe: 'Equipe A', saida: '2026-10-05', retorno: '2026-10-09', integrantes: ['Fulano Fictício', 'Beltrana Fictícia'], tipoDano: 'Desmatamento' },
    { coordenada: { lat: -10.5, lon: -58.5 }, municipio: 'Castanheira', notas: '', demandas: [], situacao: 'planejado', numero: 1 },
  ]);
  const o = A.obterOperacoes()[0];
  A.registrarResultado(id, o.pontos[0].id, { resultado: 'sim', motivo: '', protocolo: 'FIC-AUTO-1', observacao: '', dataVistoria: '' }, '2026-11-15');
  const texto = E.exportarPlanilhaSema(A.obterOperacoes()[0]);
  assert.equal(texto.charCodeAt(0), 0xfeff);
  const [cab, l1, l2] = texto.slice(1).split('\r\n');
  assert.equal(cab, E.COLUNAS_SEMA.join(';'));
  assert.equal(cab.split(';').length, 19);
  assert.equal(l1, '202610;CASTANHEIRA202610-01;1;;"58° 30\' 0,000"" W";"10° 30\' 0,000"" S";Castanheira;;;;;;;;;-58,50000000;-10,50000000;DUDJUINA;');
  assert.equal(l2, '202610;JUINA202610-02;2;Equipe A;"58° 38\' 26,123"" W";"10° 49\' 49,809"" S";Juína;05/10/2026;09/10/2026;"Hot; ""spot""";Fulano Fictício / Beltrana Fictícia;Sim;;FIC-AUTO-1;;-58,64058972;-10,83050250;DUDJUINA;Desmatamento');
  assert.equal(E.gmsEixo(-58.5, 'E', 'W'), '58° 30\' 0,000" W');
  assert.equal(E.celulaPlanilha('-protocolo'), "'-protocolo");
});

it('ida e volta: a planilha exportada volta sem criar pontos nem mudar nada', () => {
  const id = novaOp();
  A.incluirPontos(id, [{ coordenada: { lat: -10.8305025, lon: -58.64058972 }, municipio: 'Juína', notas: '- nota', demandas: [], situacao: 'planejado', numero: 1, equipe: 'Equipe A', saida: '2026-10-05', retorno: '2026-10-09' }]);
  const o = A.obterOperacoes()[0];
  A.registrarResultado(id, o.pontos[0].id, { resultado: 'nao', motivo: 'Área sem acesso', protocolo: '', observacao: '', dataVistoria: '' }, '2026-11-15');
  const op = A.obterOperacoes()[0];
  const volta = C.importarPontosCsv(E.exportarPlanilhaSema(op));
  assert.deepEqual(volta.linhas.map((l) => [l.erros, l.avisos]), [[[], []]]);
  assert.equal(volta.linhas[0].ponto!.notas, '- nota');
  const plano = P.planejarImportacao(op, A.obterOperacoes(), volta.linhas);
  assert.deepEqual([plano.novas.length, plano.recusadas.length], [0, 0]);
  assert.deepEqual([plano.atualizacoes[0].mudancas, plano.atualizacoes[0].diferencas], [[], []]);
});

it('reimportação: preenche só o vazio; planejamento e valores já gravados prevalecem e viram diferença', () => {
  const id = novaOp();
  A.incluirPontos(id, [
    { coordenada: { lat: -10.8305025, lon: -58.64058972 }, municipio: 'Juína', notas: '', demandas: [], situacao: 'planejado', numero: 1, equipe: 'Equipe A', saida: '2026-10-05', retorno: '2026-10-09' },
    { coordenada: { lat: -10.9, lon: -58.7 }, municipio: 'Juína', notas: '', demandas: [], situacao: 'planejado', numero: 2, protocolo: 'SISTEMA-1' },
  ]);
  const op = A.obterOperacoes()[0];
  const r = C.importarPontosCsv(csv(
    linha({ codigo: 'JUINA202610-01', equipe: 'Equipe B', saida: '06/10/2026', resultado: 'Sim', protocolo: 'FIC-AUTO-1', dano: 'Queimada' }),
    linha({ numero: '2', x: '58° 42\' 0" W', y: '10° 54\' 0" S', lon: '-58,7', lat: '-10,9', resultado: 'Não Cabe Atuação', protocolo: 'PLANILHA-2', equipe: '', saida: '', retorno: '' }),
    linha({ numero: '3', codigo: '', x: '58° 0\' 0" W', y: '11° 0\' 0" S', lon: '-58', lat: '-11' }),
  ));
  const plano = P.planejarImportacao(op, A.obterOperacoes(), r.linhas);
  assert.equal(plano.novas.length, 1);
  const [a1, a2] = plano.atualizacoes;
  assert.deepEqual(a1.mudancas, ['resultado: Sim', 'protocolo: FIC-AUTO-1', 'tipo de dano: Queimada']);
  assert.deepEqual(a1.diferencas, ['equipe: planilha Equipe B, sistema Equipe A', 'saída: planilha 06/10/2026, sistema 05/10/2026']);
  assert.deepEqual(a1.preencher, { resultado: 'sim', protocolo: 'FIC-AUTO-1', tipoDano: 'Queimada', situacao: 'vistoriado' });
  assert.deepEqual(a2.diferencas, ['protocolo: planilha PLANILHA-2, sistema SISTEMA-1']);
  assert.equal(A.aplicarAtualizacoes(id, plano.atualizacoes.map((a) => ({ pontoId: a.ponto.id, preencher: a.preencher }))), null);
  const [p1, p2] = A.obterOperacoes()[0].pontos;
  assert.deepEqual([p1.resultado, p1.protocolo, p1.tipoDano, p1.situacao, R.viagemDoPonto(A.obterOperacoes()[0], p1)?.equipe], ['sim', 'FIC-AUTO-1', 'Queimada', 'vistoriado', 'Equipe A']);
  assert.deepEqual([p2.resultado, p2.protocolo], ['nao-cabe-atuacao', 'SISTEMA-1']);
});

it('reimportação: recusa código de outra operação, número com outro código e linha repetida', () => {
  const a = novaOp('A');
  A.incluirPontos(a, [{ coordenada: { lat: -10.8, lon: -58.6 }, municipio: 'Juína', notas: '', demandas: [], situacao: 'planejado', numero: 1 }]);
  const b = novaOp('B', '2026-11-02', '2026-11-09');
  A.incluirPontos(b, [{ coordenada: { lat: -10.8, lon: -58.6 }, municipio: 'Juína', notas: '', demandas: [], situacao: 'planejado', numero: 1 }]);
  const opB = A.obterOperacoes()[1];
  const r = C.importarPontosCsv(csv(linha({ codigo: 'JUINA202610-01' }), linha({ codigo: 'OUTRO-1', numero: '1' }), linha({ codigo: 'JUINA202611-01' }), linha({ codigo: 'juina202611-01' })));
  const plano = P.planejarImportacao(opB, A.obterOperacoes(), r.linhas);
  assert.deepEqual(plano.recusadas.map((x) => x.erro), [
    'O código JUINA202610-01 já existe em A.',
    'O ponto 1 já existe com o código JUINA202611-01, diferente de OUTRO-1.',
    'Outra linha do arquivo já atualiza o JUINA202611-01.',
  ]);
  assert.equal(plano.atualizacoes.length, 1);
});

it('setor: definido em maiúsculas, limpo com vazio e validado na leitura', () => {
  const id = novaOp();
  assert.equal(A.definirSetor(id, 'dud juina'), null);
  assert.equal(A.obterOperacoes()[0].setor, 'DUD JUINA');
  assert.equal(A.definirSetor(id, 'x'.repeat(41)), 'O setor pode ter no máximo 40 caracteres.');
  assert.equal(A.definirSetor(id, ''), null);
  assert.ok(!('setor' in A.obterOperacoes()[0]));
});
