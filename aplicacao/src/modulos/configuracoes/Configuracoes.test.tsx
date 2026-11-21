import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAVE_MASCOTE, escolherPrincipal, obterPreferencias } from '../../compartilhado/preferencias-mascote.ts';
import { CHAVE_LIMITE_AVISOS, LIMITE_AVISOS_PADRAO, obterLimiteDeAvisos } from '../assistente/preferencias-avisos.ts';
import { PainelAssistente } from '../assistente/PainelAssistente.tsx';
import { Configuracoes } from './Configuracoes.tsx';

beforeEach(() => localStorage.clear());

describe('Configurações: avisos do assistente', () => {
  it('o limite começa em 5, grava a escolha e ignora valor inválido guardado', () => {
    const { unmount } = render(<Configuracoes />);
    const seletor = screen.getByRole('combobox', { name: /Avisos listados de uma vez/ });
    expect(seletor).toHaveValue('5');
    fireEvent.change(seletor, { target: { value: '8' } });
    expect(localStorage.getItem(CHAVE_LIMITE_AVISOS)).toBe('8');
    expect(obterLimiteDeAvisos()).toBe(8);
    unmount();
    localStorage.setItem(CHAVE_LIMITE_AVISOS, '999');
    expect(obterLimiteDeAvisos()).toBe(LIMITE_AVISOS_PADRAO);
  });
});

describe('Configurações: mascotes', () => {
  it('mostra os três mascotes, com a capivara como principal e os campos de nome vazios', () => {
    render(<Configuracoes />);
    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
    for (const especie of ['ariranha', 'lobo-guara', 'capivara']) {
      expect(within(screen.getByTestId(`mascote-${especie}`)).getByRole('img')).toBeInTheDocument();
    }
    expect(within(screen.getByTestId('mascote-capivara')).getByRole('radio')).toBeChecked();
    expect(within(screen.getByTestId('mascote-lobo-guara')).getByRole('radio')).not.toBeChecked();
    expect(screen.getByLabelText('Nome do mascote Capivara')).toHaveValue('');
  });

  it('dar nome com espaço no meio funciona, grava na hora e muda o que o leitor de tela anuncia', () => {
    render(<Configuracoes />);
    const campo = screen.getByLabelText('Nome do mascote Capivara');
    fireEvent.change(campo, { target: { value: 'Dona ' } });
    expect(campo).toHaveValue('Dona ');
    fireEvent.change(campo, { target: { value: 'Dona Cida' } });
    expect(campo).toHaveValue('Dona Cida');
    expect(JSON.parse(localStorage.getItem(CHAVE_MASCOTE)!).nomes).toEqual({ capivara: 'Dona Cida' });
    expect(screen.getByRole('img', { name: 'Dona Cida, Capivara (Pantanal), tranquilo' })).toBeInTheDocument();
  });

  it('a escolha e o nome aparecem no painel do assistente, que não tem mais o seletor', () => {
    render(
      <>
        <Configuracoes />
        <PainelAssistente />
      </>,
    );
    // O único seletor da tela é o limite de avisos (Configurações); o painel não tem seletor de mascote.
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.getByRole('combobox', { name: /Avisos listados de uma vez/ })).toBeInTheDocument();
    expect(screen.getByTestId('nome-do-mascote')).toHaveTextContent('Capivara');

    fireEvent.click(within(screen.getByTestId('mascote-lobo-guara')).getByRole('radio'));
    expect(screen.getByTestId('nome-do-mascote')).toHaveTextContent('Lobo-guará');
    expect(screen.getByRole('img', { name: 'Lobo-guará (Cerrado), atento' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome do mascote Lobo-guará'), { target: { value: 'Tobias' } });
    expect(screen.getByTestId('nome-do-mascote')).toHaveTextContent('Tobias');
    expect(screen.getByRole('img', { name: 'Tobias, Lobo-guará (Cerrado), atento' })).toBeInTheDocument();
    // a fala do assistente passa a ser atribuída ao nome escolhido
    expect(document.querySelector('li.fala')).toHaveTextContent('Tobias:');
  });

  it('as preferências continuam depois de recarregar a tela', () => {
    const primeira = render(<Configuracoes />);
    fireEvent.click(within(screen.getByTestId('mascote-ariranha')).getByRole('radio'));
    fireEvent.change(screen.getByLabelText('Nome do mascote Ariranha'), { target: { value: 'Nina' } });
    primeira.unmount();

    render(<Configuracoes />);
    expect(within(screen.getByTestId('mascote-ariranha')).getByRole('radio')).toBeChecked();
    expect(screen.getByLabelText('Nome do mascote Ariranha')).toHaveValue('Nina');
  });
});

describe('Configurações: armazenamento bloqueado', () => {
  it('sem gravação, avisa que as mudanças valem só até fechar a página; com gravação de volta, o aviso some', () => {
    render(<Configuracoes />);
    expect(screen.queryByTestId('aviso-preferencias-sem-gravacao')).toBeNull();

    const gravar = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cota excedida', 'QuotaExceededError');
    });
    fireEvent.click(within(screen.getByTestId('mascote-ariranha')).getByRole('radio'));
    expect(screen.getByRole('alert')).toHaveTextContent('As mudanças valem só até fechar ou recarregar a página.');
    // A escolha vale nesta página mesmo sem gravar.
    expect(obterPreferencias().principal).toBe('ariranha');
    expect(within(screen.getByTestId('mascote-ariranha')).getByRole('radio')).toBeChecked();

    gravar.mockRestore();
    fireEvent.click(within(screen.getByTestId('mascote-capivara')).getByRole('radio'));
    expect(screen.queryByTestId('aviso-preferencias-sem-gravacao')).toBeNull();
    expect(JSON.parse(localStorage.getItem(CHAVE_MASCOTE)!).principal).toBe('capivara');
    escolherPrincipal('capivara');
  });
});
