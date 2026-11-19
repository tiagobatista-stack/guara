// Seção "Formulários e relatório" do ponto: estado (N de M, selos), data de edição, botão de gerar texto e resumo.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { alterarPonto, criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';
import { estadoInspecao, estadoPop } from './estado-formularios.ts';
import { ITENS_INSPECAO } from './inspecao-agrotoxicos.ts';
import { itensAplicaveis, ITENS_POP, respondido, type Caracterizacao, type ItemPop } from './pop-supressao.ts';

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

const base = { municipio: 'Castanheira', notas: '', demandas: [] as string[], situacao: 'planejado' as const, dataVistoria: '2026-10-07' };
function montar(extra: object = {}) {
  const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação não criada');
  incluirPontos(r.id, [{ ...base, numero: 1, coordenada: { lat: -12.1, lon: -58.2 }, ...extra } as never]);
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
  const p = obterOperacoes()[0].pontos[0];
  return { op: r.id, p, s: screen.getByTestId(`relatorio-texto-${p.id}`) };
}

const resposta = (it: ItemPop) => (it.tipo === 'simnao' ? 'Sim' : it.tipo === 'texto' ? 'x' : it.tipo === 'numero' ? '1' : it.tipo === 'data' ? '2026-09-12' : it.tipo === 'multipla' ? [it.opcoes![0].texto] : it.opcoes![0].texto);

describe('estado dos formulários', () => {
  it('N de M conta só as perguntas aplicáveis: o que o desvio pula sai do M', () => {
    const vazio = estadoPop({});
    expect(vazio).toMatchObject({ selo: 'nao-iniciado', n: 0 });
    const item = ITENS_POP.find((it) => it.opcoes?.some((o) => o.vai && ITENS_POP.findIndex((x) => x.id === o.vai) > ITENS_POP.indexOf(it) + 1))!;
    const op = item.opcoes!.find((o) => o.vai && ITENS_POP.findIndex((x) => x.id === o.vai) > ITENS_POP.indexOf(item) + 1)!;
    const resp: Caracterizacao = { [item.id]: op.texto };
    const e = estadoPop({ caracterizacao: resp });
    expect(e.n).toBe(1);
    expect(e.selo).toBe('em-preenchimento');
    expect(e.m).toBeLessThan(vazio.m);
    expect(e.m).toBe(itensAplicaveis(resp).filter((it) => !it.opcional).length);
  });

  it('inspeção: completo com pendências quando só falta subpergunta condicional exigida; completo quando respondida', () => {
    const p: { inspecao: Caracterizacao } = { inspecao: {} };
    const passo = (comCondicionais: boolean) => {
      for (let i = 0; i < 12; i++) {
        const pendentes = itensAplicaveis({ ...p.inspecao }, ITENS_INSPECAO).filter((it) => !it.id.includes('@') && !respondido(p.inspecao[it.id]) && (comCondicionais || !it.se) && !/^C-2\.13\.([2-9]|10)\./.test(it.id));
        if (!pendentes.length) return;
        for (const it of pendentes) p.inspecao[it.id] = resposta(it);
      }
    };
    expect(estadoInspecao(p).selo).toBe('nao-iniciado');
    p.inspecao = { 'C-2.13': 'Sim' };
    passo(false);
    const e = estadoInspecao(p);
    expect(e.selo).toBe('completo-pendencias');
    expect(e.n).toBeLessThan(e.m);
    passo(true);
    expect(estadoInspecao(p)).toMatchObject({ selo: 'completo' });
    expect(estadoInspecao(p).n).toBe(estadoInspecao(p).m);
  });
});

describe('seção na tela', () => {
  it('lista os formulários com selo e "N de M"; o botão de gerar fica desabilitado, com dica, até haver resposta', () => {
    const { op, p, s } = montar({ tipoDano: 'Desmatamento químico' });
    expect(within(s).getByTestId('selo-pop')).toHaveTextContent('Não iniciado');
    expect(within(s).getByTestId('selo-inspecao')).toHaveTextContent('Não iniciado');
    expect(within(s).getByTestId('formulario-consultas')).toHaveTextContent('0 de 8 consultadas');
    expect(within(s).getByRole('button', { name: 'Gerar texto do relatório' })).toBeDisabled();
    expect(within(s).getByTestId('dica-relatorio')).toHaveTextContent('Preencha a caracterização do dano para gerar o texto');
    expect(within(s).queryByRole('button', { name: /^Exportar TXT/ })).toBeNull();
    act(() => { alterarPonto(op, p.id, { caracterizacao: { 'A-1': 'Cerrado' } }); });
    expect(within(s).getByTestId('selo-pop')).toHaveTextContent('Em preenchimento');
    expect(within(s).getByTestId('contagem-pop')).toHaveTextContent(/^1 de \d+$/);
    expect(within(s).getByRole('button', { name: 'Continuar Caracterização do dano (POP)' })).toBeInTheDocument();
    expect(within(s).getByRole('button', { name: 'Exportar TXT de Caracterização do dano (POP)' })).toBeInTheDocument();
    const gerar = within(s).getByRole('button', { name: 'Gerar texto do relatório' });
    expect(gerar).toBeEnabled();
    expect(within(s).getByTestId('resumo-relatorio')).toHaveTextContent(/pendência.* · 8 consultas não realizadas/);
    fireEvent.click(gerar);
    expect(within(s).getByLabelText(/^Relatório \(texto\) do/)).toBeInTheDocument();
  });

  it('"+ Adicionar inspeção de agrotóxicos" fica na seção (não mais na barra de ações) e some depois de ativada', () => {
    const { s } = montar({ tipoDano: 'Cerca' });
    expect(within(s).getByRole('button', { name: '+ Adicionar inspeção de agrotóxicos' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Adicionar inspeção de agrotóxicos/ })).toHaveLength(1);
    fireEvent.click(within(s).getByRole('button', { name: '+ Adicionar inspeção de agrotóxicos' }));
    expect(within(s).queryByRole('button', { name: '+ Adicionar inspeção de agrotóxicos' })).toBeNull();
    expect(within(s).getByTestId('selo-inspecao')).toBeInTheDocument();
  });

  it('data/hora da edição: grava ao mudar uma resposta e não muda quando nada mudou', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 18, 9, 5));
    const { op, p, s } = montar({ tipoDano: 'Desmatamento químico' });
    expect(obterOperacoes()[0].pontos[0].editadoEm).toBeUndefined();
    act(() => { alterarPonto(op, p.id, { caracterizacao: { 'A-1': 'Cerrado' } }); });
    const primeira = obterOperacoes()[0].pontos[0].editadoEm?.pop;
    expect(primeira).toBeDefined();
    expect(obterOperacoes()[0].pontos[0].editadoEm?.inspecao).toBeUndefined();
    expect(within(s).getByTestId('formulario-pop')).toHaveTextContent('editado em 18/11/2026 09:05');
    vi.setSystemTime(new Date(2026, 10, 18, 11, 30));
    act(() => { alterarPonto(op, p.id, { caracterizacao: { 'A-1': 'Cerrado' } }); }); // mesma resposta
    act(() => { alterarPonto(op, p.id, { notas: 'outra coisa' }); }); // outro campo
    expect(obterOperacoes()[0].pontos[0].editadoEm?.pop).toBe(primeira);
    act(() => { alterarPonto(op, p.id, { caracterizacao: { 'A-1': 'Amazônia' } }); });
    expect(obterOperacoes()[0].pontos[0].editadoEm?.pop).not.toBe(primeira);
    expect(within(s).getByTestId('formulario-pop')).toHaveTextContent('editado em 18/11/2026 11:30');
    act(() => { alterarPonto(op, p.id, { inspecao: { 'C-2.13': 'Sim' } }); });
    expect(obterOperacoes()[0].pontos[0].editadoEm?.inspecao).toBeDefined();
  });

  it('"Gerar texto do relatório" abre "Dados para o SIGA": coordenada no formato do SIGA, atividade sugerida editável e gravada só quando editada, copiar', () => {
    const { op, p, s } = montar({ tipoDano: 'Desmatamento químico' });
    act(() => { alterarPonto(op, p.id, { caracterizacao: { 'A-1': 'Cerrado' } }); });
    fireEvent.click(within(s).getByRole('button', { name: 'Gerar texto do relatório' }));
    const painel = within(s).getByTestId(`dados-siga-${p.id}`);
    expect(within(painel).getByTestId('siga-Latitude (S)')).toHaveTextContent('-12:06:00,00');
    expect(within(painel).getByTestId('siga-Longitude (W)')).toHaveTextContent('-58:12:00,00');
    expect(within(painel).getByTestId('siga-Município / UF')).toHaveTextContent('Castanheira / MT');
    const atividade = within(painel).getByRole('textbox', { name: /Atividade/ });
    expect(atividade).toHaveValue('Supressão por desmatamento químico');
    expect(within(painel).getByRole('textbox', { name: /Objetivo/ })).toHaveValue('FISCALIZAÇÃO DE ALERTAS DE DESMATAMENTO QUÍMICO BRASNORTE');
    fireEvent.change(atividade, { target: { value: 'Supressão com uso de herbicida' } });
    fireEvent.blur(atividade);
    expect(obterOperacoes()[0].pontos[0].siga).toEqual({ atividade: 'Supressão com uso de herbicida' });
    const de_novo = within(painel).getByRole('textbox', { name: /Atividade/ });
    fireEvent.change(de_novo, { target: { value: 'Supressão por desmatamento químico' } }); // volta à sugestão: nada gravado
    fireEvent.blur(de_novo);
    expect(obterOperacoes()[0].pontos[0].siga).toBeUndefined();
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: escrever } });
    fireEvent.click(within(painel).getByRole('button', { name: 'Copiar Latitude (S)' }));
    expect(escrever).toHaveBeenCalledWith('-12:06:00,00');
    expect(within(painel).getByRole('textbox', { name: /^Relatório \(texto\)/ })).toBeInTheDocument();
    expect(within(painel).getByLabelText('Incluir equipe e lavrados no texto')).not.toBeChecked();
  });
});
