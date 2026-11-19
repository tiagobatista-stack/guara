// Inspeção de agrotóxicos: dados, condicionais, ausência de dado pessoal, divergência prévia × campo, tela do ponto.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';
import { validarListaOperacoes } from './regras.ts';
import { caracterizacaoValida, divergencias, type Caracterizacao, itensAplicaveis, itensDeCampoSemResposta, ITENS_POP } from './pop-supressao.ts';
import { inspecaoAtiva, ITENS_INSPECAO, SECOES_INSPECAO, sugestoesInspecao } from './inspecao-agrotoxicos.ts';

beforeEach(() => localStorage.clear());
const ids = (r = {}) => itensAplicaveis(r, ITENS_INSPECAO).map((i) => i.id);

describe('itens da inspeção', () => {
  it('ids únicos, sete seções, condicionais apontam para itens que existem, Sim/Não/N.A. com as três opções', () => {
    const todos = ITENS_INSPECAO.map((i) => i.id);
    expect(new Set(todos).size).toBe(todos.length);
    expect([...new Set(ITENS_INSPECAO.map((i) => i.secao))]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(Object.keys(SECOES_INSPECAO)).toHaveLength(7);
    for (const it of ITENS_INSPECAO) {
      expect(it.formulario).toBe('C');
      expect(it.id).toMatch(/^C-[1-7](\.\d+)+$/);
      if (it.se) expect(todos).toContain(it.se.item);
      if (it.tipo === 'simnao') expect(it.opcoes!.map((o) => o.texto)).toEqual(['Sim', 'Não', 'N.A.']);
    }
    expect(new Set(ITENS_INSPECAO.map((i) => i.tipo))).toEqual(new Set(['simnao', 'numero', 'texto', 'data', 'unica', 'multipla']));
  });

  it('o POP não mudou: nenhum item da inspeção misturado nele', () => {
    expect(ITENS_POP.every((i) => i.formulario !== 'C')).toBe(true);
    expect(itensAplicaveis({}).length).toBe(ITENS_POP.length);
  });
});

describe('condicionais', () => {
  const AEREOS = ['C-3.6', 'C-3.7', 'C-3.8', 'C-3.9', 'C-5.2.1', 'C-6.1', 'C-6.4.1', 'C-6.4.2', 'C-6.4.3', 'C-6.4.4'];
  it('bloco da aplicação aérea (COA, ANAC, SAE, SGSO, operador, pátio) só com aplicação aérea = Sim', () => {
    for (const r of [{}, { 'C-5.2': 'Não' }, { 'C-5.2': 'N.A.' }]) for (const id of AEREOS) expect(ids(r)).not.toContain(id);
    for (const id of AEREOS) expect(ids({ 'C-5.2': 'Sim' })).toContain(id);
  });

  it('pátio de descontaminação: o detalhe só aparece se existir pátio (e só na aplicação aérea)', () => {
    expect(ids({ 'C-5.2': 'Sim' })).not.toContain('C-6.2');
    expect(ids({ 'C-5.2': 'Sim', 'C-6.1': 'Sim' })).toEqual(expect.arrayContaining(['C-6.2', 'C-6.2.1', 'C-6.2.2', 'C-6.3']));
    expect(ids({ 'C-6.1': 'Sim' })).not.toContain('C-6.2'); // sem aérea, o pai não se aplica
  });

  it('aeródromo: o depósito só aparece se houver aeródromo', () => {
    expect(ids()).not.toContain('C-4.2.1');
    expect(ids({ 'C-4.2': 'Não' })).not.toContain('C-4.2.1');
    expect(ids({ 'C-4.2': 'Sim' })).toContain('C-4.2.1');
  });

  it('produtos vencidos: quantidade, lotes e "vencido há menos de 6 meses" só com vencidos = Sim', () => {
    for (const id of ['C-4.3.1', 'C-4.3.2', 'C-4.3.3']) {
      expect(ids({ 'C-4.3': 'Não' })).not.toContain(id);
      expect(ids({ 'C-4.3': 'Sim' })).toContain(id);
    }
  });

  it('licença: tipo, número e validade só se Sim; "Outro" pede a especificação', () => {
    for (const id of ['C-2.3.1', 'C-2.3.3', 'C-2.3.4']) {
      expect(ids({ 'C-2.3': 'Não' })).not.toContain(id);
      expect(ids({ 'C-2.3': 'Sim' })).toContain(id);
    }
    expect(ids({ 'C-2.3': 'Sim', 'C-2.3.1': 'LO' })).not.toContain('C-2.3.2');
    expect(ids({ 'C-2.3': 'Sim', 'C-2.3.1': 'Outro' })).toContain('C-2.3.2');
  });

  it('autorizações ambientais: uma pergunta Sim/Não por autorização e o número só se Sim', () => {
    const principais = ITENS_INSPECAO.filter((i) => /^C-2\.4\.\d$/.test(i.id));
    expect(principais).toHaveLength(6);
    expect(principais.every((i) => i.tipo === 'simnao')).toBe(true);
    expect(ids()).not.toContain('C-2.4.1.1');
    expect(ids({ 'C-2.4.1': 'Sim' })).toContain('C-2.4.1.1');
  });

  it('só a fase "campo" conta em "sem resposta"; complemento condicional não conta', () => {
    const faltando = itensDeCampoSemResposta({}, ITENS_INSPECAO).map((i) => i.id);
    expect(faltando).toContain('C-1.2');
    expect(faltando).not.toContain('C-2.1'); // prévia
    expect(faltando).not.toContain('C-2.7.2'); // complemento
    expect(faltando).not.toContain('C-3.6'); // não é aérea
    expect(itensDeCampoSemResposta({ 'C-5.2': 'Sim' }, ITENS_INSPECAO).map((i) => i.id)).toContain('C-3.6');
  });
});

describe('dados pessoais', () => {
  const PESSOAL = /\b(cpf|cnpj|telefone|e-?mail|endere[cç]o|nomes?\b.*(propriet|respons|pessoa|gerente|capataz|operador)|nome d[oa])/i;
  it('nenhum campo de texto, número, data ou lista pede nome, CPF/CNPJ, telefone, e-mail ou endereço; só perguntas Sim/Não/N.A. de conferência', () => {
    for (const it of ITENS_INSPECAO) {
      if (PESSOAL.test(it.texto)) expect(it.tipo, it.id).toBe('simnao');
    }
    const item = (id: string) => ITENS_INSPECAO.find((i) => i.id === id)!;
    for (const [id, trecho] of [
      ['C-1.5', 'Documento do responsável conferido e fotografado'], ['C-1.6', 'Endereço para correspondência confirmado'],
      ['C-1.9', 'Pessoas presentes qualificadas no auto de inspeção'], ['C-1.7', 'Atualização cadastral no SIGA solicitada'],
    ] as const) {
      expect(item(id).tipo).toBe('simnao');
      expect(item(id).texto).toContain(trecho);
    }
    // o único texto livre com "nome": o nome comercial do produto
    expect(ITENS_INSPECAO.filter((i) => i.tipo === 'texto' && /nome/i.test(i.texto)).map((i) => i.id)).toEqual(['C-5.4.1']);
  });

  it('o armazém recusa dado fora do modelo (não há campo para guardar CPF, telefone ou nome)', () => {
    expect(caracterizacaoValida({ 'C-1.5': 'Sim' }, ITENS_INSPECAO)).toBe(true);
    expect(caracterizacaoValida({ cpf: '000.000.000-00' }, ITENS_INSPECAO)).toBe(false);
    expect(caracterizacaoValida({ 'C-1.5': 'José da Silva' }, ITENS_INSPECAO)).toBe(false);
  });
});

describe('validação de tipos', () => {
  it('número, data e opções', () => {
    const v = (x: object) => caracterizacaoValida(x, ITENS_INSPECAO);
    expect(v({ 'C-5.8': '120,5', 'C-5.9': '2026-11-10', 'C-5.7.1': 'L/ha', 'C-4.3': 'N.A.' })).toBe(true);
    expect(v({ 'C-5.8': 'muito' })).toBe(false);
    expect(v({ 'C-5.9': '10/11/2026' })).toBe(false);
    expect(v({ 'C-5.9': '2026-13-45' })).toBe(false);
    expect(v({ 'C-5.7.1': 'g/ha' })).toBe(false);
    expect(v({ 'A-1': 'Cerrado' })).toBe(false); // id do POP não vale na inspeção
    expect(caracterizacaoValida({ 'C-5.8': '1' })).toBe(false); // nem o da inspeção no POP
  });
});

describe('divergência prévia × campo', () => {
  it('só há divergência quando os dois lados foram respondidos e diferem', () => {
    const d = (p: Caracterizacao, c: Caracterizacao) => divergencias(p, c, ITENS_INSPECAO).map((i) => i.id);
    expect(d({ 'C-2.5': 'Sim' }, { 'C-2.5': 'Não' })).toEqual(['C-2.5']);
    expect(d({ 'C-2.5': 'Sim' }, { 'C-2.5': 'Sim' })).toEqual([]);
    expect(d({ 'C-2.5': 'Sim' }, {})).toEqual([]);
    expect(d({}, { 'C-2.5': 'Sim' })).toEqual([]);
    expect(d({ 'C-2.13.2': ['IBAMA', 'SEMA'] }, { 'C-2.13.2': ['SEMA', 'IBAMA'] })).toEqual([]); // ordem não importa
    expect(d({ 'C-1.2': 'Sim' }, { 'C-1.2': 'Não' })).toEqual([]); // item de campo não tem "conferido antes"
  });
});

describe('sugestões da consulta automática', () => {
  const consulta = (estado: 'encontrado' | 'vazio', detalhe?: string) => ({ estado, quando: '2026-11-19T10:00:00Z', fonte: 'automatica' as const, ...(detalhe ? { detalhe } : {}) });
  it('CAR e embargos', () => {
    expect(sugestoesInspecao({ consultas: { car: consulta('encontrado', 'MT123'), embargos: consulta('encontrado', 'Embargo 77') } })).toEqual({ 'C-1.11': 'Sim', 'C-1.11.1': 'MT123', 'C-2.13': 'Sim', 'C-2.13.1': 'Embargo 77' });
    expect(sugestoesInspecao({ situacaoCar: 'sem-car', consultas: { embargos: consulta('vazio') } })).toEqual({ 'C-1.11': 'Não', 'C-2.13': 'Não' });
    expect(sugestoesInspecao({})).toEqual({});
  });
});

describe('tipo de dano', () => {
  it('"Desmatamento químico" e "Aplicação irregular de agrotóxico" trazem a inspeção (e o POP); outros, não', () => {
    expect(inspecaoAtiva({ tipoDano: 'Desmatamento químico' })).toBe(true);
    expect(inspecaoAtiva({ tipoDano: 'aplicacao irregular de agrotoxico' })).toBe(true);
    expect(inspecaoAtiva({ tipoDano: 'Desmatamento' })).toBe(false);
    expect(inspecaoAtiva({ tipoDano: 'Cerca', inspecaoAtiva: true })).toBe(true);
  });
});

const base = { coordenada: { lat: -12.1, lon: -58.2 }, municipio: 'Brasnorte', notas: '', demandas: [] as string[], situacao: 'planejado' as const, equipe: 'A', saida: '2026-10-05', retorno: '2026-10-09' };
function montar(pontos: Array<{ tipoDano?: string; inspecaoAtiva?: boolean }>) {
  const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação não criada');
  incluirPontos(r.id, pontos.map((p, i) => ({ ...base, numero: i + 1, coordenada: { lat: -12.1 - i, lon: -58.2 }, ...p })));
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
  return obterOperacoes()[0].pontos;
}

describe('tela do ponto', () => {
  it('nos tipos de agrotóxico a inspeção e o POP aparecem juntos; nos outros há o botão "Adicionar inspeção de agrotóxicos"', () => {
    const pontos = montar([{ tipoDano: 'Aplicação irregular de agrotóxico' }, { tipoDano: 'Cerca' }]);
    expect(screen.getByTestId(`inspecao-${pontos[0].id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`caracterizacao-${pontos[0].id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`inspecao-${pontos[1].id}`)).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Adicionar inspeção de agrotóxicos' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar inspeção de agrotóxicos' }));
    expect(obterOperacoes()[0].pontos[1].inspecaoAtiva).toBe(true);
    expect(screen.getByTestId(`inspecao-${pontos[1].id}`)).toBeInTheDocument();
  });

  it('remover: livre se vazia; com respostas pede confirmação; ponto de tipo agrotóxico não tem o botão', () => {
    const pontos = montar([{ tipoDano: 'Cerca', inspecaoAtiva: true }, { tipoDano: 'Desmatamento químico' }]);
    const b0 = screen.getByTestId(`inspecao-${pontos[0].id}`);
    expect(within(screen.getByTestId(`inspecao-${pontos[1].id}`)).queryByRole('button', { name: 'Remover inspeção de agrotóxicos' })).toBeNull();
    fireEvent.click(within(b0).getByRole('button', { name: 'Em campo' }));
    fireEvent.change(within(b0).getByLabelText(/^C-1\.2\./), { target: { value: 'Sim' } });
    expect(obterOperacoes()[0].pontos[0].inspecao).toEqual({ 'C-1.2': 'Sim' });
    fireEvent.click(within(b0).getByRole('button', { name: 'Remover inspeção de agrotóxicos' }));
    expect(obterOperacoes()[0].pontos[0].inspecaoAtiva).toBe(true); // pediu confirmação
    fireEvent.click(within(b0).getByRole('button', { name: 'Manter' }));
    fireEvent.change(within(b0).getByLabelText(/^C-1\.2\./), { target: { value: '' } });
    expect(obterOperacoes()[0].pontos[0].inspecao).toBeUndefined();
    fireEvent.click(within(b0).getByRole('button', { name: 'Remover inspeção de agrotóxicos' })); // vazia: remove direto
    expect(obterOperacoes()[0].pontos[0].inspecaoAtiva).toBeUndefined();
    expect(screen.queryByTestId(`inspecao-${pontos[0].id}`)).toBeNull();
  });

  it('remover com respostas, após confirmar, apaga tudo', () => {
    const pontos = montar([{ tipoDano: 'Cerca', inspecaoAtiva: true }]);
    const b = screen.getByTestId(`inspecao-${pontos[0].id}`);
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    fireEvent.change(within(b).getByLabelText(/^C-1\.2\./), { target: { value: 'Sim' } });
    fireEvent.click(within(b).getByRole('button', { name: 'Remover inspeção de agrotóxicos' }));
    fireEvent.click(within(b).getByRole('button', { name: 'Remover e apagar respostas' }));
    expect(obterOperacoes()[0].pontos[0]).not.toHaveProperty('inspecao');
    expect(obterOperacoes()[0].pontos[0].inspecaoAtiva).toBeUndefined();
  });

  it('conferência prévia: "conferido antes" em campo e [DIVERGÊNCIA]; tudo grava no ponto e passa na validação', () => {
    const pontos = montar([{ tipoDano: 'Desmatamento químico' }]);
    const b = screen.getByTestId(`inspecao-${pontos[0].id}`);
    // aba prévia: só itens de fase prévia
    expect(within(b).getByLabelText(/^C-2\.5\. Possui/)).toBeInTheDocument();
    expect(within(b).queryByLabelText(/^C-1\.2\./)).toBeNull();
    fireEvent.change(within(b).getByLabelText(/^C-2\.5\. Possui/), { target: { value: 'Sim' } });
    expect(obterOperacoes()[0].pontos[0].conferenciaPrevia).toEqual({ 'C-2.5': 'Sim' });
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    expect(within(b).getByTestId('antes-C-2.5')).toHaveTextContent('conferido antes: Sim');
    expect(within(b).queryByTestId('divergencias')).toBeNull();
    fireEvent.change(within(b).getByLabelText(/^C-2\.5\. Possui/), { target: { value: 'Não' } });
    expect(within(b).getByTestId('divergencias')).toHaveTextContent('[DIVERGÊNCIA] C-2.5: conferido antes: Sim; em campo: Não.');
    expect(within(b).getByText(/1 divergência/)).toBeInTheDocument();
    expect(validarListaOperacoes(JSON.parse(JSON.stringify(obterOperacoes())))).toHaveLength(1);
  });

  it('aplicação aérea no campo revela o bloco (COA etc.); "Não" o esconde', () => {
    const pontos = montar([{ tipoDano: 'Desmatamento químico' }]);
    const b = screen.getByTestId(`inspecao-${pontos[0].id}`);
    fireEvent.click(within(b).getByRole('button', { name: 'Em campo' }));
    expect(within(b).queryByLabelText(/^C-3\.6\./)).toBeNull();
    fireEvent.change(within(b).getByLabelText(/^C-5\.2\. Há/), { target: { value: 'Sim' } });
    expect(within(b).getByLabelText(/^C-3\.6\./)).toBeInTheDocument();
    fireEvent.change(within(b).getByLabelText(/^C-5\.2\. Há/), { target: { value: 'Não' } });
    expect(within(b).queryByLabelText(/^C-3\.6\./)).toBeNull();
  });

  it('o imóvel / local do ponto aparece na inspeção e edita o mesmo valor do planejamento', () => {
    const pontos = montar([{ tipoDano: 'Desmatamento químico' }]);
    expect(ITENS_INSPECAO.some((i) => i.id === 'C-1.1')).toBe(false);
    const b = screen.getByTestId(`inspecao-${pontos[0].id}`);
    const campo = within(b).getByLabelText(/^Imóvel \/ local/);
    fireEvent.change(campo, { target: { value: 'Fazenda Teste' } });
    fireEvent.blur(campo);
    expect(obterOperacoes()[0].pontos[0].imovel).toBe('Fazenda Teste');
    fireEvent.click(screen.getByRole('button', { name: 'Editar planejamento do Ponto 1' }));
    expect(screen.getByLabelText('Imóvel / local')).toHaveValue('Fazenda Teste');
  });

  it('licença: existência, tipo, número e validade na prévia; condicionantes e observação em campo', () => {
    const f = (id: string) => ITENS_INSPECAO.find((i) => i.id === id)!;
    for (const id of ['C-2.3', 'C-2.3.1', 'C-2.3.3', 'C-2.3.4']) expect(f(id).fase).toBe('previa');
    expect(f('C-2.3.5')).toMatchObject({ fase: 'campo', tipo: 'unica', opcional: false });
    expect(f('C-2.3.5').opcoes!.map((o) => o.texto)).toEqual(['Conformes', 'Não conformes', 'N.A.']);
    expect(f('C-2.3.6')).toMatchObject({ fase: 'campo', tipo: 'texto' });
    expect(ids({ 'C-2.3': 'Não' })).not.toContain('C-2.3.5');
    expect(ids({ 'C-2.3': 'Sim' })).toEqual(expect.arrayContaining(['C-2.3.5', 'C-2.3.6']));
    expect(itensDeCampoSemResposta({ 'C-2.3': 'Sim' }, ITENS_INSPECAO).map((i) => i.id)).toContain('C-2.3.5');
  });

  it('aviso ao salvar o tipo de dano que acrescenta POP e inspeção', () => {
    const pontos = montar([{ tipoDano: 'Cerca' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Editar planejamento do Ponto 1' }));
    fireEvent.change(screen.getByLabelText('Tipo de dano'), { target: { value: 'Aplicação irregular de agrotóxico' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar ponto' }));
    expect(screen.getByTestId(`aviso-tipo-${pontos[0].id}`)).toHaveTextContent('acrescenta ao ponto o POP e a Inspeção de agrotóxicos');
    expect(screen.getByTestId(`inspecao-${pontos[0].id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`caracterizacao-${pontos[0].id}`)).toBeInTheDocument();
  });

  it('as duas opções aparecem na lista de tipos de dano do planejamento', () => {
    montar([{ tipoDano: 'Cerca' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Editar planejamento do Ponto 1' }));
    const lista = document.getElementById(screen.getByLabelText('Tipo de dano').getAttribute('list')!)!;
    expect([...lista.querySelectorAll('option')].map((x) => x.getAttribute('value'))).toEqual(expect.arrayContaining(['Desmatamento químico', 'Aplicação irregular de agrotóxico']));
  });
});
