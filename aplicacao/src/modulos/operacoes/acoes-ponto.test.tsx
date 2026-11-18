// Cartão do ponto: ações por fase (pedido do responsável, 18/11/2026).

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { itensDoMapa } from '../mapa/regras.ts';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes, registrarRelatorio, registrarResultado, travarPonto } from './armazem.ts';

const ponto = { coordenada: { lat: -12.1, lon: -58.2 }, municipio: 'Brasnorte', notas: '', demandas: [], situacao: 'planejado' as const, equipe: 'A', saida: '2026-10-05', retorno: '2026-10-09' };
const RES = { resultado: 'sim' as const, motivo: '', protocolo: '', observacao: '', dataVistoria: '' };
beforeEach(() => localStorage.clear());

function montar(): { id: string; pid: string } {
  const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação não criada');
  incluirPontos(r.id, [ponto]);
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
  return { id: r.id, pid: obterOperacoes()[0].pontos[0].id };
}
const acao = (nome: string) => screen.queryByRole('button', { name: nome });
const principais = () => screen.queryAllByRole('button').filter((b) => b.classList.contains('botao--primario')).map((b) => b.getAttribute('aria-label')).filter((x): x is string => !!x);

describe('ações do cartão do ponto por fase', () => {
  it('campo: principal é Registrar resultado; sem relatório; Cancelar vistoria disponível', () => {
    montar();
    expect(principais()).toContain('Registrar resultado do Ponto 1');
    for (const n of ['Editar planejamento do Ponto 1', 'Travar Ponto 1', 'Converter Ponto 1 em demanda', 'Cancelar vistoria do Ponto 1', 'Excluir Ponto 1']) expect(acao(n)).toBeInTheDocument();
    expect(acao('Registrar relatório no SIGA do Ponto 1')).toBeNull();
    expect(screen.getByText('Demanda:')).toBeInTheDocument();
  });

  it('elaboração: principal é Registrar relatório no SIGA; Editar resultado; sem Cancelar vistoria', () => {
    const { id, pid } = montar();
    act(() => { registrarResultado(id, pid, RES, '2026-11-15'); });
    expect(principais()).toEqual(['Registrar relatório no SIGA do Ponto 1']);
    expect(acao('Editar resultado do Ponto 1')).toBeInTheDocument();
    expect(acao('Cancelar vistoria do Ponto 1')).toBeNull();
  });

  it('concluído: nenhum botão principal e o texto "Concluído em … · SIGA nº …"', () => {
    const { id, pid } = montar();
    act(() => {
      registrarResultado(id, pid, RES, '2026-11-15');
      registrarRelatorio(id, pid, { enviadoEm: '2026-11-16', protocoloSiga: 'FIC-1', notas: '' }, '2026-11-18');
    });
    expect(principais()).toEqual([]);
    expect(screen.getByTestId(`fase-${pid}`)).toHaveTextContent('Concluído em 16/11/2026 · SIGA nº FIC-1');
    expect(acao('Editar relatório no SIGA do Ponto 1')).toBeInTheDocument();
  });

  it('travado: Destravar ao lado do selo e "Editar bloqueio"; destravar remove o bloqueio', () => {
    const { id, pid } = montar();
    act(() => { travarPonto(id, pid, 'autuado', '', '2026-11-10T12:00:00Z'); });
    expect(acao('Travar Ponto 1')).toBeNull();
    expect(acao('Editar bloqueio do Ponto 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Destravar Ponto 1' }));
    expect(obterOperacoes()[0].pontos[0].bloqueio).toBeUndefined();
    expect(acao('Destravar Ponto 1')).toBeNull();
  });

  it('cancelar vistoria pede o motivo (Voltar não cancela); cancelado só mostra "Mais" (Reativar e Excluir)', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar vistoria do Ponto 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o motivo do cancelamento.');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(obterOperacoes()[0].pontos[0].situacao).toBe('planejado');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar vistoria do Ponto 1' }));
    fireEvent.change(screen.getByLabelText('Motivo do cancelamento'), { target: { value: 'área inacessível' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }));
    expect(obterOperacoes()[0].pontos[0]).toMatchObject({ situacao: 'cancelado', motivoCancelamento: 'área inacessível' });
    expect(screen.getByTestId(`motivo-cancelamento-${obterOperacoes()[0].pontos[0].id}`)).toHaveTextContent('área inacessível');
    expect(itensDoMapa([], obterOperacoes(), '2026-11-18').noMapa[0].motivoCancelamento).toBe('área inacessível');
    for (const n of ['Editar planejamento do Ponto 1', 'Travar Ponto 1', 'Converter Ponto 1 em demanda', 'Cancelar vistoria do Ponto 1']) expect(acao(n)).toBeNull();
    expect(screen.queryByRole('group', { name: 'Ações do Ponto 1' })).toBeNull();
    const mais = screen.getByText('Mais').closest('details')!;
    expect(within(mais).getByRole('button', { name: 'Reativar Ponto 1' })).toBeInTheDocument();
    expect(within(mais).getByRole('button', { name: 'Excluir Ponto 1' })).toBeInTheDocument();
    fireEvent.click(within(mais).getByRole('button', { name: 'Reativar Ponto 1' }));
    expect(obterOperacoes()[0].pontos[0].motivoCancelamento).toBeUndefined();
  });

  it('excluir só com confirmação', () => {
    montar();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Ponto 1' }));
    expect(obterOperacoes()[0].pontos).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Ponto 1' }));
    expect(obterOperacoes()[0].pontos).toHaveLength(0);
    confirmar.mockRestore();
  });
});

describe('cartão do ponto recolhido por padrão', () => {
  const montarRecolhido = () => {
    const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
    if (!r.ok) throw new Error('operação não criada');
    incluirPontos(r.id, [ponto, { ...ponto, coordenada: { lat: -12.5, lon: -58.9 } }]);
    const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
    return { id: r.id, pontos: obterOperacoes()[0].pontos };
  };
  const gatilho = (n: number) => screen.getByRole('button', { name: new RegExp(`^Ponto ${n}`) });

  it('começa recolhido: só a linha (gatilho, selo e botão principal da fase); expande e recolhe', () => {
    montarRecolhido();
    expect(gatilho(1)).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: 'Editar planejamento do Ponto 1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Registrar resultado do Ponto 1' })).toBeInTheDocument();
    fireEvent.click(gatilho(1));
    expect(gatilho(1)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'Editar planejamento do Ponto 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar planejamento do Ponto 2' })).toBeNull();
    fireEvent.click(gatilho(1));
    expect(screen.queryByRole('button', { name: 'Editar planejamento do Ponto 1' })).toBeNull();
  });

  it('Expandir todos e Recolher todos', () => {
    montarRecolhido();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
    expect(gatilho(1)).toHaveAttribute('aria-expanded', 'true');
    expect(gatilho(2)).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Recolher todos' }));
    expect(gatilho(1)).toHaveAttribute('aria-expanded', 'false');
    expect(gatilho(2)).toHaveAttribute('aria-expanded', 'false');
  });

  it('abre sozinho ao abrir um formulário pelo botão principal da linha', () => {
    montarRecolhido();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado do Ponto 1' }));
    expect(gatilho(1)).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('form', { name: 'Resultado do Ponto 1' })).toBeInTheDocument();
    expect(gatilho(2)).toHaveAttribute('aria-expanded', 'false');
  });

  it('o checkbox de seleção não expande o cartão', () => {
    montarRecolhido();
    fireEvent.click(screen.getByLabelText('Selecionar Ponto 1'));
    expect(screen.getByLabelText('Selecionar Ponto 1')).toBeChecked();
    expect(gatilho(1)).toHaveAttribute('aria-expanded', 'false');
  });

  it('selo da fase no cabeçalho: em elaboração e concluído (não "finalizado"); botão principal some no concluído', () => {
    const { id, pontos } = montarRecolhido();
    act(() => { registrarResultado(id, pontos[0].id, RES, '2026-11-15'); });
    expect(screen.getByTestId(`situacao-${pontos[0].id}`)).toHaveTextContent('em elaboração');
    expect(screen.getByRole('button', { name: 'Registrar relatório no SIGA do Ponto 1' })).toBeInTheDocument();
    act(() => { registrarRelatorio(id, pontos[0].id, { enviadoEm: '2026-11-16', protocoloSiga: '', notas: '' }, '2026-11-18'); });
    expect(screen.getByTestId(`situacao-${pontos[0].id}`)).toHaveTextContent('concluído');
    expect(screen.getByTestId(`situacao-${pontos[0].id}`)).not.toHaveTextContent('finalizado');
    expect(screen.queryByRole('button', { name: 'Registrar relatório no SIGA do Ponto 1' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registrar resultado do Ponto 1' })).toBeNull();
  });
});
