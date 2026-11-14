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

  it('marca como travada pelo detalhe, mostra na lista e no filtro, e destrava', () => {
    const armazem = montar();
    act(() => { armazem.criar({ titulo: 'Analisar processo FIC-0002', descricao: '', responsavel: 'Equipe A', prioridade: 'Média', status: 'Em Andamento', prazo: '' }); });
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Analisar processo FIC-0002' }));
    expect(screen.getByTestId('bloqueio-detalhe')).toHaveTextContent('não está travada');
    fireEvent.change(screen.getByLabelText('Motivo do bloqueio'), { target: { value: 'campo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como travada' }));
    expect(screen.getByRole('status')).toHaveTextContent('Demanda marcada como travada.');
    expect(screen.getByTestId('bloqueio-detalhe')).toHaveTextContent('⛔ travada hoje: depende de campo');
    expect(screen.getByRole('button', { name: 'Mudar motivo' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    expect(screen.getByTestId('bloqueio-id-1')).toHaveTextContent('depende de campo');
    fireEvent.change(screen.getByLabelText('Bloqueio'), { target: { value: 'livres' } });
    expect(screen.getByText('Nenhuma demanda corresponde aos filtros.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Bloqueio'), { target: { value: 'travadas' } });

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Analisar processo FIC-0002' }));
    fireEvent.click(screen.getByRole('button', { name: 'Destravou' }));
    expect(screen.getByRole('status')).toHaveTextContent('Demanda destravada.');
    expect(screen.getByTestId('bloqueio-detalhe')).toHaveTextContent('não está travada');
    expect(armazem.obter().demandas[0]).not.toHaveProperty('bloqueio');
  });

  it('demanda concluída não oferece travar', () => {
    const armazem = montar();
    act(() => { armazem.criar({ titulo: 'Arquivar processo FIC-0003', descricao: '', responsavel: '', prioridade: 'Baixa', status: 'Concluída', prazo: '' }); });
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Arquivar processo FIC-0003' }));
    expect(screen.queryByLabelText('Motivo do bloqueio')).toBeNull();
  });

  describe('aviso de demanda parecida', () => {
    const preencher = (titulo: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
      fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: titulo } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    };
    const total = () => JSON.parse(localStorage.getItem('guara:demandas:v1')!).demandas.length;

    it('avisa antes de gravar; "Criar mesmo assim" grava a segunda', () => {
      const armazem = montar();
      act(() => { armazem.criar({ titulo: 'Resposta ofício 2', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
      preencher('resposta oficio 2');
      expect(screen.getByTestId('aviso-parecida')).toHaveTextContent('Já existe uma demanda em aberto parecida: “Resposta ofício 2” (A Fazer; mesmo título)');
      expect(total()).toBe(1);
      fireEvent.click(screen.getByRole('button', { name: 'Criar mesmo assim' }));
      expect(screen.getByRole('status')).toHaveTextContent('Demanda criada e gravada.');
      expect(total()).toBe(2);
    });

    it('"Ver a existente" abre o detalhe sem gravar; mexer no título retira o aviso', () => {
      const armazem = montar();
      act(() => { armazem.criar({ titulo: 'Entregar relatório mensal', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
      preencher('Relatório mensal');
      expect(screen.getByTestId('aviso-parecida')).toHaveTextContent('o título digitado está inteiro no título dela');
      fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Relatório anual' } });
      expect(screen.queryByTestId('aviso-parecida')).toBeNull();
      fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Relatório mensal' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      fireEvent.click(screen.getByRole('button', { name: 'Ver a existente (descarta este cadastro)' }));
      expect(screen.getByRole('heading', { name: 'Entregar relatório mensal' })).toBeInTheDocument();
      expect(total()).toBe(1);
    });

    it('título inválido mostra o erro, não o aviso; editar não avisa', () => {
      const armazem = montar();
      act(() => { armazem.criar({ titulo: 'Resposta ofício 2', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
      preencher('ab');
      expect(screen.getByText(/pelo menos 3 caracteres/)).toBeInTheDocument();
      expect(screen.queryByTestId('aviso-parecida')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      fireEvent.click(screen.getByRole('button', { name: 'Editar Resposta ofício 2' }));
      fireEvent.change(screen.getByLabelText('Responsável'), { target: { value: 'Equipe B' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(screen.queryByTestId('aviso-parecida')).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Alterações gravadas.');
    });
  });

  it('três números: erro no campo certo, gravação normalizada e exibição na lista e no detalhe', () => {
    const armazem = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Responder ofício fictício' } });
    fireEvent.change(screen.getByLabelText('Processo administrativo'), { target: { value: 'fic-2026-0042' } });
    fireEvent.change(screen.getByLabelText(/^SIMP/), { target: { value: '12-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByLabelText(/^SIMP/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/NNNNNN-NNN\/AAAA \(ex\.: 000001-001\/2099\)/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('guara:demandas:v1')!).demandas).toHaveLength(0);

    fireEvent.change(screen.getByLabelText(/^SIMP/), { target: { value: 'SIMP 000001-001/2099' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Demanda criada e gravada.');
    expect(armazem.obter().demandas[0]).toMatchObject({ processo: 'FIC-2026-0042', simp: '000001-001/2099' });
    expect(armazem.obter().demandas[0]).not.toHaveProperty('judicial');
    expect(screen.getByTestId('processo-id-1')).toHaveTextContent('FIC-2026-0042');

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Responder ofício fictício' }));
    expect(screen.getByText('Processo judicial (CNJ)').nextElementSibling).toHaveTextContent('—');
  });
});
