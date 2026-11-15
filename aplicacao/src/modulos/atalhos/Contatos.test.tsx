import { fireEvent, render, screen, within } from '@testing-library/react';
import { Contatos } from './Contatos.tsx';
import { CHAVE_CONTATOS, CONTATO_VAZIO, incluirContato } from './contatos.ts';

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

function preencher(form: HTMLElement, campos: Record<string, string>) {
  for (const [rotulo, valor] of Object.entries(campos)) fireEvent.change(within(form).getByLabelText(rotulo), { target: { value: valor } });
}

describe('lista de contatos', () => {
  it('começa vazia, com o aviso de dados pessoais', () => {
    render(<Contatos />);
    expect(screen.getByText('Nenhum contato por aqui.')).toBeInTheDocument();
    expect(screen.getByText(/São dados pessoais/)).toBeInTheDocument();
  });

  it('inclui um contato com todos os campos, com links de e-mail e telefone', () => {
    render(<Contatos />);
    const form = screen.getByRole('region', { name: 'Incluir contato' });
    preencher(form, {
      Nome: 'Ana Fictícia', 'Instituição/empresa': 'SEMA-MT', 'Setor/função': 'Analista (fictícia)',
      'E-mail': 'ana@exemplo.invalid', Celular: '65999991234', Observações: 'Prefere e-mail.',
    });
    fireEvent.click(within(form).getByRole('button', { name: 'Incluir contato' }));

    expect(screen.getByText('Ana Fictícia')).toBeInTheDocument();
    expect(screen.getByText('SEMA-MT · Analista (fictícia)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enviar e-mail para Ana Fictícia: ana@exemplo.invalid' })).toHaveAttribute('href', 'mailto:ana@exemplo.invalid');
    expect(screen.getByRole('link', { name: 'Ligar para Ana Fictícia: (65) 99999-1234' })).toHaveAttribute('href', 'tel:+5565999991234');
    expect(screen.getByText('Prefere e-mail.')).toBeInTheDocument();
    expect(within(form).getByLabelText('Nome')).toHaveValue('');
    expect(localStorage.getItem(CHAVE_CONTATOS)).toContain('Ana Fictícia');
  });

  it('mostra o erro de e-mail inválido e não inclui', () => {
    render(<Contatos />);
    const form = screen.getByRole('region', { name: 'Incluir contato' });
    preencher(form, { Nome: 'Beto Fictício', 'E-mail': 'sem-arroba' });
    fireEvent.click(within(form).getByRole('button', { name: 'Incluir contato' }));
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail inválido');
    expect(screen.getByText('Nenhum contato por aqui.')).toBeInTheDocument();
  });

  it('edita um contato, mantendo o celular formatado no formulário', () => {
    incluirContato({ ...CONTATO_VAZIO, nome: 'Ana Fictícia', celular: '65999991234' });
    render(<Contatos />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar o contato Ana Fictícia' }));
    const lista = screen.getByRole('list', { name: 'Contatos' });
    expect(within(lista).getByLabelText('Celular')).toHaveValue('(65) 99999-1234');
    preencher(lista, { 'Setor/função': 'Gabinete (fictício)' });
    fireEvent.click(within(lista).getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Gabinete (fictício)')).toBeInTheDocument();
  });

  it('exclui só depois de confirmar', () => {
    incluirContato({ ...CONTATO_VAZIO, nome: 'Ana Fictícia' });
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Contatos />);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir o contato Ana Fictícia' }));
    expect(confirmar).toHaveBeenLastCalledWith('Excluir o contato Ana Fictícia?');
    expect(screen.getByText('Ana Fictícia')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir o contato Ana Fictícia' }));
    expect(screen.queryByText('Ana Fictícia')).not.toBeInTheDocument();
  });

  it('busca filtra a lista e avisa quando não encontra', () => {
    incluirContato({ ...CONTATO_VAZIO, nome: 'Ana Fictícia', instituicao: 'SEMA-MT' });
    incluirContato({ ...CONTATO_VAZIO, nome: 'Beto Fictício', instituicao: 'Prefeitura (fictícia)' });
    render(<Contatos />);
    fireEvent.change(screen.getByLabelText('Buscar contato'), { target: { value: 'prefeitura' } });
    expect(screen.getByText('Beto Fictício')).toBeInTheDocument();
    expect(screen.queryByText('Ana Fictícia')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar contato'), { target: { value: 'ninguém' } });
    expect(screen.getByRole('status')).toHaveTextContent('Nenhum contato encontrado');
  });
});
