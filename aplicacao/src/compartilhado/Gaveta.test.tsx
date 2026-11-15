import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Gaveta } from './Gaveta.tsx';

function Tela() {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)}>Abrir</button>
      {aberta && (
        <Gaveta rotulo="Assistente" rotuloFechar="Fechar assistente" aoFechar={() => setAberta(false)}>
          <input aria-label="Mensagem" />
          <button type="button">Enviar</button>
        </Gaveta>
      )}
    </>
  );
}

describe('gaveta modal', () => {
  it('ao abrir, o foco vai para o botão de fechar; ao fechar, volta para quem abriu', () => {
    render(<Tela />);
    const abrir = screen.getByRole('button', { name: 'Abrir' });
    abrir.focus();
    fireEvent.click(abrir);
    expect(screen.getByRole('dialog', { name: 'Assistente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar assistente' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar assistente' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(abrir).toHaveFocus();
  });

  it('Esc fecha a gaveta', () => {
    render(<Tela />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('toque no fundo escuro fecha; toque dentro da gaveta, não', () => {
    render(<Tela />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    fireEvent.click(screen.getByLabelText('Mensagem'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Tab circula só dentro da gaveta', () => {
    render(<Tela />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    const enviar = screen.getByRole('button', { name: 'Enviar' });
    enviar.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Fechar assistente' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(enviar).toHaveFocus();
  });
});
