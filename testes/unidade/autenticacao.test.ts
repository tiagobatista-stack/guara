// Login Google pelo Supabase Auth: configuração, escopos e mensagens (cliente FALSO, sem rede).

import {
  entrarComGoogle, lerConfiguracao, ouvirSessao, sair, sessaoAtual, type ClienteAuth,
} from '../../aplicacao/src/nucleo/autenticacao.ts';

/** JWT de mentira (assinatura qualquer) só com o papel: serve para testar a recusa da service_role. */
const jwtFalso = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.assinatura-falsa`;

function clienteFalso(opcoes: { sessao?: { user: { id: string; email?: string | null } } | null; erro?: string } = {}) {
  const chamadas: unknown[] = [];
  let ouvinte: ((e: string, s: { user: { id: string; email?: string | null } } | null) => void) | null = null;
  const cliente: ClienteAuth = {
    auth: {
      getSession: async () => ({ data: { session: opcoes.sessao ?? null } }),
      onAuthStateChange: (f) => { ouvinte = f; return { data: { subscription: { unsubscribe: () => { ouvinte = null; } } } }; },
      signInWithOAuth: async (p) => { chamadas.push(p); return { error: opcoes.erro ? { message: opcoes.erro } : null }; },
      signOut: async () => { chamadas.push('signOut'); return { error: opcoes.erro ? { message: opcoes.erro } : null }; },
    },
  };
  return { cliente, chamadas, disparar: (s: { user: { id: string; email?: string | null } } | null) => ouvinte?.('X', s), ouvindo: () => ouvinte !== null };
}

describe('lerConfiguracao', () => {
  it('sem as duas variáveis, o login fica desligado (o app funciona como antes)', () => {
    expect(lerConfiguracao({})).toEqual({ tipo: 'desligado' });
    expect(lerConfiguracao({ VITE_SUPABASE_URL: ' ', VITE_SUPABASE_ANON_KEY: '' })).toEqual({ tipo: 'desligado' });
  });
  it('só uma das variáveis, endereço inválido ou http fora da máquina local: inválido', () => {
    expect(lerConfiguracao({ VITE_SUPABASE_URL: 'https://exemplo.supabase.co' }).tipo).toBe('invalido');
    expect(lerConfiguracao({ VITE_SUPABASE_URL: 'não é url', VITE_SUPABASE_ANON_KEY: 'sb_publishable_x' }).tipo).toBe('invalido');
    expect(lerConfiguracao({ VITE_SUPABASE_URL: 'http://exemplo.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_publishable_x' })).toEqual({ tipo: 'invalido', motivo: 'VITE_SUPABASE_URL precisa usar https.' });
  });
  it('recusa chave secreta: sb_secret_ ou JWT com papel service_role', () => {
    const motivo = 'A chave informada é secreta (service_role). No navegador só vale a chave pública.';
    expect(lerConfiguracao({ VITE_SUPABASE_URL: 'https://exemplo.supabase.co', VITE_SUPABASE_ANON_KEY: 'sb_secret_abc' })).toEqual({ tipo: 'invalido', motivo });
    expect(lerConfiguracao({ VITE_SUPABASE_URL: 'https://exemplo.supabase.co', VITE_SUPABASE_ANON_KEY: jwtFalso('service_role') })).toEqual({ tipo: 'invalido', motivo });
  });
  it('aceita chave pública (sb_publishable_ ou JWT anon), https ou máquina local, e guarda só a origem', () => {
    expect(lerConfiguracao({ VITE_SUPABASE_URL: 'https://exemplo.supabase.co/', VITE_SUPABASE_ANON_KEY: 'sb_publishable_abc' }))
      .toEqual({ tipo: 'ok', config: { url: 'https://exemplo.supabase.co', chavePublica: 'sb_publishable_abc' } });
    expect(lerConfiguracao({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY: jwtFalso('anon') }).tipo).toBe('ok');
  });
});

describe('entrar, sair e sessão', () => {
  it('entrar pede só o provedor Google e a volta para a página; nenhum escopo extra (Drive, Agenda, Gmail)', async () => {
    const f = clienteFalso();
    expect(await entrarComGoogle(f.cliente, 'https://guara.exemplo/')).toEqual({ ok: true });
    expect(f.chamadas).toEqual([{ provider: 'google', options: { redirectTo: 'https://guara.exemplo/' } }]);
    expect(JSON.stringify(f.chamadas)).not.toMatch(/scope/i);
  });
  it('erro do serviço vira mensagem genérica, sem os detalhes', async () => {
    const f = clienteFalso({ erro: 'provider is not enabled: client_id=123' });
    const r = await entrarComGoogle(f.cliente, 'https://guara.exemplo/');
    expect(r).toEqual({ ok: false, mensagem: 'Não foi possível iniciar o login com Google. Tente de novo mais tarde.' });
    expect(JSON.stringify(await sair(f.cliente))).not.toContain('client_id');
  });
  it('sessão atual e ouvinte (com parada)', async () => {
    const f = clienteFalso({ sessao: { user: { id: 'u1', email: 'pessoa@exemplo.invalid' } } });
    expect(await sessaoAtual(f.cliente)).toEqual({ id: 'u1', email: 'pessoa@exemplo.invalid' });
    const vistos: unknown[] = [];
    const parar = ouvirSessao(f.cliente, (u) => vistos.push(u));
    f.disparar(null);
    expect(vistos).toEqual([null]);
    parar();
    expect(f.ouvindo()).toBe(false);
  });
});
