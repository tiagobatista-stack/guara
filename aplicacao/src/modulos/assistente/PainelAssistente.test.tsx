import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { escolherPrincipal, nomearMascote } from '../../compartilhado/preferencias-mascote.ts';
import { PainelAssistente } from './PainelAssistente.tsx';

function enviar(comando: string) {
  fireEvent.change(screen.getByLabelText('Mensagem ao assistente'), { target: { value: comando } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
}

beforeEach(() => localStorage.clear());

describe('painel do assistente: mascote', () => {
  it('com aviso pendente, o mascote fica atento e diz o motivo em texto', () => {
    render(<PainelAssistente />);
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), atento' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Atento: 1 aviso abaixo.');
    expect(screen.getByText('DEM-FIC-0002: prazo em 1 dia (fictício).')).toBeInTheDocument();
  });

  it('comando não reconhecido deixa o mascote curioso; um comando conhecido devolve ao estado dos avisos', () => {
    render(<PainelAssistente />);
    enviar('bom dia');
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), curioso' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Curioso');
    enviar('ajuda');
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), atento' })).toBeInTheDocument();
  });

  it('cada fala do assistente leva o rosto do mascote e o nome para o leitor de tela; a do usuário, não', () => {
    const { container } = render(<PainelAssistente />);
    enviar('ajuda');
    const falas = container.querySelectorAll('li.fala');
    expect(falas).toHaveLength(2);
    falas.forEach((fala) => {
      expect(fala.querySelector('svg.mascote[aria-hidden="true"]')).not.toBeNull();
      expect(fala).toHaveTextContent('Capivara:');
    });
    const doUsuario = container.querySelector('li.mensagem--usuario')!;
    expect(doUsuario.querySelector('svg')).toBeNull();
    expect(doUsuario).toHaveTextContent('Você: ajuda');
  });

  it('o mascote principal e o nome vêm das preferências; o painel não tem seletor', () => {
    escolherPrincipal('lobo-guara');
    nomearMascote('lobo-guara', 'Tobias');
    const { container } = render(<PainelAssistente />);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('img', { name: 'Tobias, Lobo-guará (Cerrado), atento' })).toBeInTheDocument();
    expect(screen.getByTestId('nome-do-mascote')).toHaveTextContent('Tobias');
    expect(container.querySelector('li.fala svg')!.getAttribute('data-especie')).toBe('lobo-guara');
    expect(container.querySelector('li.fala')).toHaveTextContent('Tobias:');
  });
});
