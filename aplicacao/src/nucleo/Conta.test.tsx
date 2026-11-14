// Botão de conta (login Google) com cliente FALSO: nenhuma chamada ao Supabase ou ao Google.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ClienteAuth } from './autenticacao.ts';
import { Conta } from './Conta.tsx';

type Sessao = { user: { id: string; email?: string | null } } | null;

function clienteFalso(sessaoInicial: Sessao, erro?: string) {
  const chamadas: unknown[] = [];
  let ouvinte: ((e: string, s: Sessao) => void) | null = null;
  const cliente: ClienteAuth = {
    auth: {
      getSession: async () => ({ data: { session: sessaoInicial } }),
      onAuthStateChange: (f) => { ouvinte = f; return { data: { subscription: { unsubscribe: () => { ouvinte = null; } } } }; },
      signInWithOAuth: async (p) => { chamadas.push(p); return { error: erro ? { message: erro } : null }; },
      signOut: async () => { chamadas.push('signOut'); ouvinte?.('SIGNED_OUT', null); return { error: null }; },
    },
  };
  return { cliente, chamadas };
}

const OK = { tipo: 'ok' as const, config: { url: 'https://exemplo.supabase.co', chavePublica: 'sb_publishable_teste' } };

describe('Conta', () => {
  it('sem configuração: o botão "Sair" desativado de antes', () => {
    render(<Conta leitura={{ tipo: 'desligado' }} />);
    expect(screen.getByRole('button', { name: 'Sair' })).toBeDisabled();
    expect(screen.queryByText('Entrar com Google')).toBeNull();
  });

  it('configuração inválida: "Login indisponível" com o motivo, sem carregar o cliente', () => {
    const criar = vi.fn();
    render(<Conta leitura={{ tipo: 'invalido', motivo: 'Falta VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY.' }} criarCliente={criar} />);
    const botao = screen.getByRole('button', { name: 'Login indisponível' });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute('title', 'Login Google indisponível: Falta VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY.');
    expect(criar).not.toHaveBeenCalled();
  });

  it('sem sessão: "Entrar com Google" leva ao Google com a volta para a página', async () => {
    const f = clienteFalso(null);
    render(<Conta leitura={OK} criarCliente={async () => f.cliente} origem={() => 'https://guara.exemplo/'} />);
    const entrar = await screen.findByRole('button', { name: 'Entrar com Google' });
    await waitFor(() => expect(entrar).toBeEnabled());
    expect(entrar).toHaveAttribute('title', 'O login identifica você. Os dados continuam neste navegador.');
    await act(async () => { fireEvent.click(entrar); });
    expect(f.chamadas).toEqual([{ provider: 'google', options: { redirectTo: 'https://guara.exemplo/' } }]);
  });

  it('com sessão: "Sair" com o e-mail; ao sair, volta "Entrar com Google"', async () => {
    const f = clienteFalso({ user: { id: 'u1', email: 'pessoa@exemplo.invalid' } });
    render(<Conta leitura={OK} criarCliente={async () => f.cliente} />);
    const sairBotao = await screen.findByRole('button', { name: 'Sair da conta pessoa@exemplo.invalid' });
    await act(async () => { fireEvent.click(sairBotao); });
    expect(f.chamadas).toEqual(['signOut']);
    expect(await screen.findByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument();
  });

  it('erro ao iniciar o login: mensagem genérica, sem detalhes do serviço', async () => {
    const f = clienteFalso(null, 'Unsupported provider: provider is not enabled');
    render(<Conta leitura={OK} criarCliente={async () => f.cliente} />);
    const entrar = await screen.findByRole('button', { name: 'Entrar com Google' });
    await waitFor(() => expect(entrar).toBeEnabled());
    await act(async () => { fireEvent.click(entrar); });
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível iniciar o login com Google. Tente de novo mais tarde.');
    expect(screen.getByRole('alert')).not.toHaveTextContent('provider');
  });
});
