import { fireEvent, render, screen, within } from '@testing-library/react';
import { Atalhos } from './Atalhos.tsx';
import { CHAVE_ATALHOS } from './atalhos.ts';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

const link = (nome: string) => screen.getByRole('link', { name: `${nome} (abre em nova aba)` });

describe('tela Atalhos', () => {
  it('mostra os três sistemas, abrindo em nova aba sem dar acesso à página do GUARÁ', () => {
    render(<Atalhos />);
    for (const nome of ['SIGPAS', 'SIGADOC', 'Portal SEMA']) {
      expect(link(nome)).toHaveAttribute('target', '_blank');
      expect(link(nome)).toHaveAttribute('rel', 'noopener noreferrer');
    }
    expect(link('SIGADOC')).toHaveAttribute('href', 'https://www.sigadoc.mt.gov.br/siga/app/principal');
    expect(screen.getByText(/Não salve senhas aqui/)).toBeInTheDocument();
  });

  it('inclui um atalho pelo formulário', () => {
    render(<Atalhos />);
    const form = screen.getByRole('region', { name: 'Incluir atalho' });
    fireEvent.change(within(form).getByLabelText('Nome'), { target: { value: 'SIMCAR' } });
    fireEvent.change(within(form).getByLabelText('Endereço'), { target: { value: 'https://exemplo.mt.gov.br/simcar' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Incluir atalho' }));
    expect(link('SIMCAR')).toHaveAttribute('href', 'https://exemplo.mt.gov.br/simcar');
    expect(within(form).getByLabelText('Nome')).toHaveValue('');
    expect(localStorage.getItem(CHAVE_ATALHOS)).toContain('SIMCAR');
  });

  it('mostra o erro e não inclui endereço perigoso', () => {
    render(<Atalhos />);
    const form = screen.getByRole('region', { name: 'Incluir atalho' });
    fireEvent.change(within(form).getByLabelText('Nome'), { target: { value: 'Ruim' } });
    fireEvent.change(within(form).getByLabelText('Endereço'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Incluir atalho' }));
    expect(screen.getByRole('alert')).toHaveTextContent('https://');
    expect(screen.queryByRole('link', { name: /Ruim/ })).not.toBeInTheDocument();
  });

  it('edita o nome de um atalho, e Cancelar não muda nada', () => {
    render(<Atalhos />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar o atalho SIGPAS' }));
    const item = screen.getByTestId('atalho-sigpas');
    fireEvent.change(within(item).getByLabelText('Nome'), { target: { value: 'SIGPAS (SEPLAG)' } });
    fireEvent.click(within(item).getByRole('button', { name: 'Salvar' }));
    expect(link('SIGPAS (SEPLAG)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Editar o atalho SIGADOC' }));
    fireEvent.change(within(screen.getByTestId('atalho-sigadoc')).getByLabelText('Nome'), { target: { value: 'Outro' } });
    fireEvent.click(within(screen.getByTestId('atalho-sigadoc')).getByRole('button', { name: 'Cancelar' }));
    expect(link('SIGADOC')).toBeInTheDocument();
  });

  it('exclui só depois de confirmar', () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Atalhos />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir o atalho Portal SEMA' }));
    expect(confirmar).toHaveBeenLastCalledWith('Excluir o atalho Portal SEMA?');
    expect(link('Portal SEMA')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir o atalho Portal SEMA' }));
    expect(screen.queryByRole('link', { name: /Portal SEMA/ })).not.toBeInTheDocument();
  });

  it('sem atalhos, mostra o estado vazio e restaura os iniciais', () => {
    localStorage.setItem(CHAVE_ATALHOS, '[]');
    render(<Atalhos />);
    expect(screen.getByText('Nenhum atalho por aqui.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar os atalhos iniciais' }));
    expect(link('SIGPAS')).toBeInTheDocument();
  });
});
