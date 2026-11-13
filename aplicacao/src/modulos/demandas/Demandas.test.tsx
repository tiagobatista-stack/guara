// Tela Demandas (P04): criar → editar → recarregar → conferir → excluir com confirmação.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from './armazem.ts';
import { Demandas } from './Demandas.tsx';

function montar() {
  let n = 0;
  const armazem = criarArmazem(localStorage, { gerarId: () => `id-${++n}`, exemplos: () => [] });
  render(
    <ContextoArmazem.Provider value={armazem}>
      <Demandas />
    </ContextoArmazem.Provider>,
  );
  return armazem;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('tela Demandas', () => {
  it('cria uma demanda pelo formulário e mostra sucesso só depois de gravar', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Revisar checklist de laboratório' } });
    fireEvent.change(screen.getByLabelText('Responsável'), { target: { value: 'Equipe A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Demanda criada e gravada.');
    expect(screen.getByText('Revisar checklist de laboratório', { selector: 'strong' })).toBeInTheDocument();
    expect(localStorage.getItem('guara:demandas:v1')).toContain('Revisar checklist de laboratório');
  });

  it('mostra erro de validação e não grava título curto', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText(/pelo menos 3 caracteres/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toHaveAttribute('aria-invalid', 'true');
    expect(JSON.parse(localStorage.getItem('guara:demandas:v1')!).demandas).toHaveLength(0);
  });

  it('edita, persiste após remontar e exclui somente com confirmação', () => {
    const armazem = montar();
    act(() => { armazem.criar({ titulo: 'Atualizar manual', descricao: '', responsavel: 'Equipe B', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
    fireEvent.click(screen.getByRole('button', { name: /Editar Atualizar manual/ }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Atualizar manual de atendimento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Alterações gravadas.');

    // "Recarregar": novo armazém lendo o mesmo localStorage.
    const recarregado = criarArmazem(localStorage, { exemplos: () => [] });
    expect(recarregado.obter().demandas[0].titulo).toBe('Atualizar manual de atendimento');

    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(confirmar).toHaveBeenCalled();
    expect(armazem.obter().demandas).toHaveLength(1);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(armazem.obter().demandas).toHaveLength(0);
    expect(screen.getByText('Nenhuma demanda cadastrada.')).toBeInTheDocument();
  });

  it('filtra a lista por status', () => {
    const armazem = montar();
    act(() => {
      armazem.criar({ titulo: 'Demanda A', descricao: '', responsavel: 'X', prioridade: 'Alta', status: 'A Fazer', prazo: '' });
      armazem.criar({ titulo: 'Demanda B', descricao: '', responsavel: 'Y', prioridade: 'Baixa', status: 'Concluída', prazo: '' });
    });
    const filtros = screen.getByRole('search');
    fireEvent.change(within(filtros).getByLabelText('Status'), { target: { value: 'Concluída' } });
    const lista = screen.getByRole('list', { name: 'Lista de demandas' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1);
    expect(within(lista).getByText('Demanda B', { selector: 'strong' })).toBeInTheDocument();
  });

  it('aviso de armazenamento corrompido sem apagar dados', () => {
    localStorage.setItem('guara:demandas:v1', 'corrompido');
    render(
      <ContextoArmazem.Provider value={criarArmazem(localStorage, { exemplos: () => [] })}>
        <Demandas />
      </ContextoArmazem.Provider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('corrompidos');
    expect(screen.queryByRole('button', { name: 'Nova demanda' })).toBeNull();
    expect(localStorage.getItem('guara:demandas:v1')).toBe('corrompido');
  });
});
