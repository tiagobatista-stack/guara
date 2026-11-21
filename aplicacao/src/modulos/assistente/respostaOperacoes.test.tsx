// Comando "operações" (item 10): mesmos números do Dashboard, rótulos de natureza, botões e rota de cada botão.

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from '../operacoes/Operacoes.tsx';
import { criarOperacao, definirDiasPadraoElaboracao, incluirPontos, obterOperacoes, registrarResultado, travarPonto } from '../operacoes/armazem.ts';
import { Painel } from '../painel/Painel.tsx';
import { PainelAssistente } from './PainelAssistente.tsx';
import { classificar } from './classificar.ts';
import { limparConversa, validarConversa } from './conversa.ts';
import { respostaDeOperacoes } from './respostaOperacoes.ts';

// Domingo, 15/11/2026, no fuso do navegador (como `dataLocal`).
const AGORA = () => new Date(2026, 10, 15, 10, 0);
const base = { coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Município Fictício', notas: '', demandas: [], situacao: 'planejado' as const, equipe: 'Equipe A' };
const sem = (resultado: '' | 'sim' | 'nao') => ({ resultado, motivo: resultado === 'nao' ? 'Área sem acesso' : '', protocolo: '', observacao: '', dataVistoria: '' });

function nova(nome: string, inicio: string, fim: string, saida: string, retorno: string, pontos: number): string {
  const r = criarOperacao({ nome, inicio, fim, origem: '' }, 'x');
  if (!r.ok) throw new Error(r.erro);
  incluirPontos(r.id, Array.from({ length: pontos }, () => ({ ...base, saida, retorno })));
  return r.id;
}

/** Dados com os quatro tipos de pendência, uma operação em andamento e uma próxima. */
function semear() {
  definirDiasPadraoElaboracao(3);
  const norte = nova('Vistoria Norte (fictícia)', '2026-09-18', '2026-09-25', '2026-09-18', '2026-09-22', 5);
  const [p1, p2, p3, p4, p5] = obterOperacoes().find((o) => o.id === norte)!.pontos;
  registrarResultado(norte, p2.id, sem('nao'), '2026-11-15'); // a reprogramar
  registrarResultado(norte, p4.id, sem('sim'), '2026-11-15'); // elaboração, prazo (22/09 + 3 dias) vencido
  registrarResultado(norte, p5.id, sem('sim'), '2026-11-15');
  travarPonto(norte, p3.id, 'documento', '', '2026-11-10T12:00:00.000Z'); // sem resultado e travado
  void p1;
  nova('Em curso (fictícia)', '2026-11-14', '2026-11-20', '2026-11-14', '2026-11-20', 4);
  nova('Próxima (fictícia)', '2026-12-01', '2026-12-05', '2026-12-01', '2026-12-05', 2);
  return norte;
}

const numero = (texto: string, padrao: RegExp) => Number(texto.match(padrao)?.[1] ?? 0);

beforeEach(() => { localStorage.clear(); limparConversa(); });
afterEach(() => { vi.restoreAllMocks(); window.location.hash = ''; });

describe('resposta do comando "operações"', () => {
  it('sem operação: "Nenhuma operação cadastrada neste navegador." e o botão "Nova operação"', () => {
    const [m, ...resto] = respostaDeOperacoes([], [], AGORA(), '15/11/2026');
    expect(resto).toHaveLength(0);
    expect(m.natureza).toBe('fato');
    expect(m.fonte).toBe('operações deste navegador · 15/11/2026');
    expect(m.texto).toBe('Nenhuma operação cadastrada neste navegador.');
    expect(m.acoes).toEqual([{ rotulo: 'Nova operação', comando: 'nova operação', rota: '#/operacoes' }]);
  });

  it('ordem: pendências (fato), operações em curso (fato), sugestão (a decisão é sua)', () => {
    semear();
    const r = respostaDeOperacoes(obterOperacoes(), [], AGORA(), '15/11/2026');
    expect(r.map((m) => m.natureza)).toEqual(['fato', 'fato', 'sugestão']);
    expect(r[0].fonte).toBe('operações deste navegador · 15/11/2026');
    expect(r[0].texto).toContain('Pendências de campo:');
    expect(r[0].texto).toContain('• 2 pontos sem resultado depois do retorno da viagem (Vistoria Norte (fictícia)).');
    expect(r[0].texto).toContain('• 1 ponto não fiscalizado a reprogramar em outra operação.');
    expect(r[0].texto).toContain('• 1 ponto travado:');
    expect(r[0].texto).toMatch(/– \S+-03: falta documento, parado há 5 dias\./);
    expect(r[0].texto).toContain('• 2 pontos com o prazo de elaboração do relatório vencido.');
    expect(r[1].texto).toBe('2 operações em andamento ou próximas:\n• Em curso (fictícia) (14/11/2026 a 20/11/2026): 0 de 4 pontos encerrados.\n• Próxima (fictícia) (01/12/2026 a 05/12/2026): 0 de 2 pontos encerrados.');
    expect(r[2].fonte).toContain('a decisão é sua');
    expect(r[2].texto).toBe([
      'Sugestões (a decisão é sua):',
      '• Registrar o resultado dos pontos de Vistoria Norte (fictícia)',
      '• Reprogramar o ponto MUNICIPIOFICTICIO202609-02 em outra operação',
      '• Ver o motivo do bloqueio de MUNICIPIOFICTICIO202609-03',
      '• Enviar o relatório do ponto MUNICIPIOFICTICIO202609-04',
    ].join('\n'));
  });

  it('só traz o que existe: sem pendência não há sugestão; sem operação em curso não há a segunda fala', () => {
    nova('Só planejada (fictícia)', '2026-12-01', '2026-12-05', '2026-12-01', '2026-12-05', 1);
    const r = respostaDeOperacoes(obterOperacoes(), [], AGORA());
    expect(r.map((m) => m.natureza)).toEqual(['fato', 'fato']);
    expect(r[0].texto).toMatch(/^Nenhuma pendência de campo/);
    expect(r[1].texto).toContain('Só planejada (fictícia)');
    expect(r.some((m) => m.natureza === 'sugestão')).toBe(false);
  });

  it('botões: "Abrir Operações" e "Abrir <operação>" (a da primeira pendência), com rotas aceitas pela conversa gravada', () => {
    const norte = semear();
    const r = respostaDeOperacoes(obterOperacoes(), [], AGORA());
    const acoes = r[r.length - 1].acoes!;
    expect(acoes).toEqual([
      { rotulo: 'Abrir Operações', comando: 'abrir operações', rota: '#/operacoes' },
      { rotulo: 'Abrir Vistoria Norte (fictícia)', comando: 'abrir operação Vistoria Norte (fictícia)', rota: `#/operacoes?abrir=${norte}` },
    ]);
    const [gravada] = validarConversa([{ autor: 'assistente', texto: 'x', acoes }]);
    expect(gravada.acoes?.map((a) => a.rota)).toEqual(acoes.map((a) => a.rota));
  });

  it('as frases do enunciado chegam ao comando "operações"', () => {
    for (const frase of ['operações', 'operacoes', 'operação', 'pontos', 'campo', 'viagens', 'o que falta das operações', 'pontos pendentes']) {
      expect(classificar(frase)?.id, frase).toBe('operacoes');
    }
    expect(classificar('prazos')?.id).toBe('prazos');
    expect(classificar('pendências')?.id).toBe('prazos');
  });

  it('os números da conversa são os da "Linha do tempo de prazos" do Dashboard (mesmos dados)', () => {
    semear();
    const armazem = criarArmazem(localStorage, { gerarId: () => 'id', exemplos: () => [] });
    const { unmount } = render(<ContextoArmazem.Provider value={armazem}><Painel agora={AGORA} /></ContextoArmazem.Provider>);
    const doDashboard = {
      semResultado: numero(screen.getByTestId('pontos-sem-resultado').textContent ?? '', /^(\d+)/),
      relatorios: numero(screen.getByTestId('relatorios-atrasados').textContent ?? '', /^(\d+)/),
      travados: numero(screen.getByTestId('pontos-travados').textContent ?? '', /^(\d+)/),
      aReprogramar: numero(screen.getByTestId('pontos-a-reprogramar').textContent ?? '', /^(\d+)/),
    };
    unmount();
    const texto = respostaDeOperacoes(obterOperacoes(), armazem.obter().demandas, AGORA())[0].texto;
    expect({
      semResultado: numero(texto, /^• (\d+) pontos? sem resultado/m),
      relatorios: numero(texto, /^• (\d+) pontos? com o prazo/m),
      travados: numero(texto, /^• (\d+) pontos? travados?/m),
      aReprogramar: numero(texto, /^• (\d+) pontos? não fiscalizados?/m),
    }).toEqual(doDashboard);
    expect(doDashboard).toEqual({ semResultado: 2, relatorios: 2, travados: 1, aReprogramar: 1 });
  });
});

describe('comando "operações" no painel do assistente', () => {
  function montar() {
    const armazem = criarArmazem(localStorage, { gerarId: () => 'id', exemplos: () => [] });
    return render(<ContextoArmazem.Provider value={armazem}><PainelAssistente agora={AGORA} /></ContextoArmazem.Provider>);
  }
  const enviar = (c: string) => {
    fireEvent.change(screen.getByLabelText('Mensagem ao assistente'), { target: { value: c } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  };

  it('sem operação: responde e oferece "Nova operação"', () => {
    const { container } = montar();
    enviar('operações');
    const falas = container.querySelectorAll('.conversa li.fala');
    const fala = falas[falas.length - 1] as HTMLElement;
    expect(fala).toHaveTextContent('Nenhuma operação cadastrada neste navegador.');
    expect(fala).toHaveTextContent('fato · fonte: operações deste navegador · 15/11/2026');
    const botoes = within(fala).getAllByRole('button').map((b) => b.textContent);
    expect(botoes).toContain('Nova operação');
    expect(botoes.length).toBeGreaterThanOrEqual(2);
    expect(botoes.length).toBeLessThanOrEqual(4);
  });

  it('com dados: "Abrir Operações" navega para #/operacoes e "Abrir <operação>" leva ao detalhe', () => {
    const norte = semear();
    const { container } = montar();
    enviar('o que falta das operações');
    const falas = container.querySelectorAll('.conversa li.fala');
    const fala = falas[falas.length - 1] as HTMLElement;
    expect(fala).toHaveTextContent('a decisão é sua');
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    fireEvent.click(within(fala).getByRole('button', { name: 'Abrir Operações' }));
    fireEvent.click(within(fala).getByRole('button', { name: 'Abrir Vistoria Norte (fictícia)' }));
    expect(assign.mock.calls).toEqual([['#/operacoes'], [`#/operacoes?abrir=${norte}`]]);
    vi.unstubAllGlobals();
  });
});

describe('tela Operações: rota "abrir"', () => {
  it('"#/operacoes?abrir=<id>" abre o detalhe da operação e limpa o endereço', () => {
    const norte = semear();
    window.location.hash = `#/operacoes?abrir=${norte}`;
    const armazem = criarArmazem(localStorage, { gerarId: () => 'id', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={AGORA} /></ContextoArmazem.Provider>);
    expect(screen.getByRole('button', { name: 'Voltar às operações' })).toBeInTheDocument();
    expect(window.location.hash).toBe('#/operacoes');
  });

  it('id que não existe cai na lista de operações', () => {
    semear();
    window.location.hash = '#/operacoes?abrir=op-nao-existe';
    const armazem = criarArmazem(localStorage, { gerarId: () => 'id', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={AGORA} /></ContextoArmazem.Provider>);
    expect(screen.queryByRole('button', { name: 'Voltar às operações' })).toBeNull();
    expect(screen.getByRole('list', { name: 'Lista de operações' })).toBeInTheDocument();
  });
});
