// Anotações, Bloqueio e formulários do ponto: o campo só aparece ao clicar, Cancelar descarta e sair com texto digitado pergunta.

import { act, fireEvent, render, screen } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Demandas } from '../demandas/Demandas.tsx';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes } from './armazem.ts';

beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
const clicar = (nome: string | RegExp) => fireEvent.click(screen.getByRole('button', { name: nome }));

function demandas() {
  const armazem = criarArmazem(localStorage, { gerarId: () => 'id-1', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Demandas /></ContextoArmazem.Provider>);
  act(() => { armazem.criar({ titulo: 'Analisar parecer', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
  clicar('Detalhes de Analisar parecer');
  return armazem;
}

describe('demanda: anotações e bloqueio só abrem ao clicar', () => {
  it('anotação: sem campo até clicar; Cancelar descarta; sair com texto pergunta', () => {
    const armazem = demandas();
    expect(screen.getByText('Nenhuma anotação.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova anotação')).toBeNull();
    clicar('+ Anotação');
    fireEvent.change(screen.getByLabelText('Nova anotação'), { target: { value: 'rascunho' } });
    clicar('Cancelar');
    expect(screen.queryByLabelText('Nova anotação')).toBeNull();
    expect(armazem.obter().demandas[0].anotacoes ?? []).toHaveLength(0);

    clicar('+ Anotação');
    fireEvent.change(screen.getByLabelText('Nova anotação'), { target: { value: 'ainda não salvei' } });
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    clicar('Voltar à lista');
    expect(screen.getByLabelText('Nova anotação')).toHaveValue('ainda não salvei'); // recusou: continua
    clicar('Voltar à lista');
    expect(confirmar).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText('Nova anotação')).toBeNull();
    expect(armazem.obter().demandas[0].anotacoes ?? []).toHaveLength(0);
  });

  it('bloqueio: sem caixa até clicar em Travar; Cancelar descarta; travado vira texto com [Destravar]; sair com texto pergunta', () => {
    const armazem = demandas();
    expect(screen.getByText('Não está travada.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Motivo do bloqueio')).toBeNull();
    clicar('Travar');
    fireEvent.change(screen.getByLabelText('Detalhe do bloqueio (opcional)'), { target: { value: 'rascunho' } });
    clicar('Cancelar');
    expect(screen.queryByLabelText('Motivo do bloqueio')).toBeNull();
    expect(armazem.obter().demandas[0].bloqueio).toBeUndefined();

    clicar('Travar');
    fireEvent.change(screen.getByLabelText('Detalhe do bloqueio (opcional)'), { target: { value: 'Aguardando ofício' } });
    clicar('Salvar');
    expect(screen.getByTestId('bloqueio-resumo')).toHaveTextContent(/desde \d{2}\/\d{2}, hoje/);
    expect(screen.getByText('Aguardando ofício', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Destravar' })).toBeInTheDocument();

    clicar('Editar bloqueio');
    fireEvent.change(screen.getByLabelText('Detalhe do bloqueio (opcional)'), { target: { value: 'mudei' } });
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    clicar('Voltar à lista');
    expect(confirmar).toHaveBeenCalled();
    expect(screen.getByLabelText('Detalhe do bloqueio (opcional)')).toHaveValue('mudei');
  });
});

describe('ponto: Editar planejamento e Editar resultado', () => {
  function ponto() {
    const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
    if (!r.ok) throw new Error('operação');
    incluirPontos(r.id, [{ coordenada: { lat: -12.1, lon: -58.2 }, municipio: 'Brasnorte', notas: '', demandas: [], situacao: 'planejado', equipe: 'A', saida: '2026-10-05', retorno: '2026-10-09' }]);
    const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
    clicar('Abrir Brasnorte');
    clicar('Expandir todos');
  }

  it('planejamento alterado e não salvo: Voltar às operações pergunta; sem alteração não pergunta', () => {
    ponto();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    clicar('Editar planejamento do Ponto 1');
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'anotei algo' } });
    clicar('Voltar às operações');
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Notas')).toHaveValue('anotei algo');
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: '' } }); // igual ao original
    clicar('Voltar às operações');
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('heading', { level: 2, name: 'Brasnorte' })).toBeNull();
    expect(obterOperacoes()[0].pontos[0].notas).toBe('');
  });

  it('resultado alterado e não salvo: Voltar às operações pergunta', () => {
    ponto();
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    clicar('Registrar resultado do Ponto 1');
    fireEvent.change(screen.getByLabelText('Resultado (fiscalizado/autuado)'), { target: { value: 'sim' } });
    clicar('Voltar às operações');
    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(obterOperacoes()[0].pontos[0].resultado).toBeUndefined();
  });
});
