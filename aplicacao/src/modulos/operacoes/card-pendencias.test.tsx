// Janela Operações (apresentação): plural, fase da operação, linhas do card e aviso do mascote com Abrir direto no ponto.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { plural } from '../../compartilhado/plural.ts';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes, registrarResultado, reprogramarPonto, travarPonto } from './armazem.ts';
import { faseDaOperacao, progressoDeCampo } from './regras.ts';

const HOJE = '2026-11-18';
beforeEach(() => localStorage.clear());

const ponto = (saida = '2026-10-05', retorno = '2026-10-09') => ({ coordenada: { lat: -12.1, lon: -58.2 }, municipio: 'Brasnorte', notas: '', demandas: [], situacao: 'planejado' as const, equipe: 'A', saida, retorno });
function operacao(nome: string, n: number, inicio = '2026-10-05', fim = '2026-10-12') {
  const r = criarOperacao({ nome, inicio, fim, origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação não criada');
  incluirPontos(r.id, Array.from({ length: n }, () => ponto(inicio, fim)));
  return r.id;
}
const montar = () => {
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
};

it('plural: 1 no singular; 0 e mais de 1 no plural', () => {
  expect([plural(1, 'ponto', 'pontos'), plural(2, 'ponto', 'pontos'), plural(0, 'viagem', 'viagens'), plural(10, 'vencido', 'vencidos')]).toEqual(['1 ponto', '2 pontos', '0 viagens', '10 vencidos']);
});

describe('faseDaOperacao', () => {
  const o = (inicio: string | undefined, fim: string | undefined, pontos: unknown[] = []) => ({ inicio, fim, viagens: [], pontos } as never);
  it('planejada antes do início, em campo do início ao fim (inclusive), pós-campo depois do fim', () => {
    expect(faseDaOperacao(o('2026-11-19', '2026-11-25'), HOJE)).toBe('planejada');
    expect(faseDaOperacao(o('2026-11-18', '2026-11-25'), HOJE)).toBe('em-campo');
    expect(faseDaOperacao(o('2026-11-10', '2026-11-18'), HOJE)).toBe('em-campo');
    expect(faseDaOperacao(o('2026-11-10', '2026-11-17'), HOJE)).toBe('pos-campo');
  });
  it('sem nenhuma data, valem os pontos: sem resultado planejada; com resultado pós-campo; com resultado e tudo encerrado concluída', () => {
    const feito = { situacao: 'planejado', resultado: 'sim', relatorio: { enviadoEm: '2026-11-15' }, demandas: [] };
    const aberto = { situacao: 'planejado', demandas: [] };
    expect(faseDaOperacao(o(undefined, undefined), HOJE)).toBe('planejada');
    expect(faseDaOperacao(o(undefined, undefined, [aberto]), HOJE)).toBe('planejada');
    expect(faseDaOperacao(o(undefined, undefined, [{ ...feito, relatorio: undefined }, aberto]), HOJE)).toBe('pos-campo');
    expect(faseDaOperacao(o(undefined, undefined, [feito]), HOJE)).toBe('concluida');
  });
  it('sem fim, vale a última data das viagens; concluída só com tudo encerrado', () => {
    expect(faseDaOperacao({ inicio: '2026-11-10', viagens: [{ saida: '2026-11-10', retorno: '2026-11-20' }], pontos: [] } as never, HOJE)).toBe('em-campo');
    const feito = { situacao: 'planejado', resultado: 'sim', relatorio: { enviadoEm: '2026-11-15' }, demandas: [] };
    expect(faseDaOperacao(o('2026-11-01', '2026-11-05', [feito]), HOJE)).toBe('concluida');
    expect(faseDaOperacao(o('2026-11-01', '2026-11-05', [feito, { ...feito, relatorio: undefined }]), HOJE)).toBe('pos-campo');
  });
});

it('progressoDeCampo: resolvidos, vencidos e a reprogramar', () => {
  const id = operacao('Op', 3);
  const [p1] = obterOperacoes()[0].pontos;
  travarPonto(id, p1.id, 'campo', '', '2026-11-10T12:00:00Z');
  expect(progressoDeCampo(obterOperacoes()[0], HOJE)).toEqual({ total: 3, feitos: 0, vencidos: 3, aReprogramar: 0 });
});

const dados = (resultado: 'sim' | 'nao') => ({ resultado, motivo: resultado === 'nao' ? 'Área sem acesso' : '', protocolo: '', observacao: '', dataVistoria: '' });

it('"a reprogramar" não conta como resolvido até o ponto ser movido para outra operação', () => {
  const id = operacao('Origem', 4);
  const destino = operacao('Destino', 1, '2026-12-01', '2026-12-05');
  const [p1, p2] = obterOperacoes().find((o) => o.id === id)!.pontos;
  registrarResultado(id, p1.id, dados('sim'), HOJE);
  registrarResultado(id, p2.id, dados('nao'), HOJE);
  const origem = () => obterOperacoes().find((o) => o.id === id)!;
  expect(progressoDeCampo(origem(), HOJE)).toEqual({ total: 4, feitos: 1, vencidos: 2, aReprogramar: 1 });
  expect(reprogramarPonto(id, p2.id, destino)).toBeNull();
  expect(progressoDeCampo(origem(), HOJE)).toEqual({ total: 4, feitos: 2, vencidos: 2, aReprogramar: 0 });
});

it('denominador é o total de pontos: 12 pontos, 2 com resultado → "2 de 12 · 10 vencidos" e "Relatório 0 de 12 · 2 em elaboração"', () => {
  const id = operacao('Brasnorte', 12);
  for (const p of obterOperacoes()[0].pontos.slice(0, 2)) registrarResultado(id, p.id, dados('sim'), HOJE);
  montar();
  expect(screen.getByTestId(`progresso-${id}`)).toHaveTextContent('Campo2 de 12· 10 vencidosRelatório0 de 12· 2 em elaboração');
});

describe('card e aviso do mascote', () => {
  it('Brasnorte com 10 vencidos: "10 vencidos" e "Campo 0 de 10"; sem "sem viagem" quando N = 0; 1 viagem no singular', () => {
    const id = operacao('Amazônia Brasnorte', 10);
    montar();
    const card = screen.getByTestId(`operacao-${id}`);
    expect(card).toHaveTextContent('1 viagem');
    expect(card).not.toHaveTextContent('1 viagens');
    expect(card).not.toHaveTextContent('sem viagem');
    expect(screen.getByTestId(`progresso-${id}`)).toHaveTextContent('Campo0 de 10· 10 vencidos');
    expect(screen.getByTestId(`progresso-${id}`)).toHaveTextContent('Relatório0 de 10');
    expect(screen.getByTestId(`pendencia-${id}`)).toHaveTextContent('Amazônia Brasnorte10 sem resultado');
    expect(screen.getByTestId('pendencias-campo')).not.toHaveTextContent('Operação Operação');
  });

  it('mais de 3 operações: só as 3 com mais pendências, "Ver todas" mostra as outras', () => {
    const ids = [1, 4, 2, 3, 5].map((n) => operacao(`Op ${n}`, n));
    montar();
    const nomes = () => within(screen.getByRole('list', { name: 'Operações com pendências' })).getAllByRole('listitem').map((li) => li.querySelector('strong')!.textContent);
    expect(nomes()).toEqual(['Op 5', 'Op 4', 'Op 3']);
    fireEvent.click(screen.getByRole('button', { name: 'Ver todas (5)' }));
    expect(nomes()).toEqual(['Op 5', 'Op 4', 'Op 3', 'Op 2', 'Op 1']);
    expect(ids).toHaveLength(5);
  });

  it('Travados: código · operação · motivo · há N dias; Abrir leva direto ao ponto, já expandido', () => {
    const id = operacao('Juína', 2);
    const [p1] = obterOperacoes()[0].pontos;
    travarPonto(id, p1.id, 'autuado', '', '2026-11-17T12:00:00Z');
    montar();
    const linha = screen.getByTestId(`travado-${p1.id}`);
    expect(linha).toHaveTextContent('Juína · aguardando dados do autuado');
    expect(linha).toHaveTextContent('há 1 dia');
    expect(linha).not.toHaveTextContent('1 dias');
    fireEvent.click(within(linha).getByRole('button', { name: /Abrir/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Juína' })).toBeInTheDocument();
    expect(within(screen.getByTestId(`ponto-${p1.id}`)).getByRole('button', { expanded: true })).toBeInTheDocument();
    expect(within(screen.getByTestId(`ponto-${obterOperacoes()[0].pontos[1].id}`)).getByRole('button', { expanded: false })).toBeInTheDocument();
  });
});
