// Login Google pelo Supabase Auth (planejamento, seção 11; branch login-google).
// Só identifica a pessoa: os dados continuam no localStorage deste navegador até a
// persistência no Supabase (com RLS testada) existir. Sem as variáveis VITE_SUPABASE_*,
// o login fica desligado e o app funciona exatamente como antes.
//
// Escopos: só os padrões do login (openid, email, profile). Drive, Agenda e Gmail exigem
// escopos e consentimentos próprios (seção 11) e NÃO são pedidos aqui.

export interface ConfiguracaoAuth {
  url: string;
  /** Chave pública (anon/publishable). Nunca a service_role. */
  chavePublica: string;
}

export interface Usuario {
  id: string;
  email: string | null;
}

/** O pedaço do cliente Supabase que o GUARÁ usa (facilita testar com um cliente falso). */
export interface ClienteAuth {
  auth: {
    getSession(): Promise<{ data: { session: { user: { id: string; email?: string | null } } | null } }>;
    onAuthStateChange(
      ouvinte: (evento: string, sessao: { user: { id: string; email?: string | null } } | null) => void,
    ): { data: { subscription: { unsubscribe(): void } } };
    signInWithOAuth(p: { provider: 'google'; options: { redirectTo: string } }): Promise<{ error: { message: string } | null }>;
    signOut(): Promise<{ error: { message: string } | null }>;
  };
}

export type LeituraConfiguracao =
  | { tipo: 'desligado' }
  | { tipo: 'invalido'; motivo: string }
  | { tipo: 'ok'; config: ConfiguracaoAuth };

/** Partes da chave JWT antiga (anon/service_role) trazem o papel; a service_role nunca pode chegar ao navegador. */
function papelDoJwt(chave: string): string | null {
  const partes = chave.split('.');
  if (partes.length !== 3) return null;
  try {
    const json = atob(partes[1].replace(/-/g, '+').replace(/_/g, '/'));
    const papel = (JSON.parse(json) as { role?: unknown }).role;
    return typeof papel === 'string' ? papel : null;
  } catch {
    return null;
  }
}

/** Lê e confere a configuração. Sem as duas variáveis, o login fica desligado. */
export function lerConfiguracao(env: { VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string }): LeituraConfiguracao {
  const url = (env.VITE_SUPABASE_URL ?? '').trim();
  const chave = (env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  if (!url && !chave) return { tipo: 'desligado' };
  if (!url || !chave) return { tipo: 'invalido', motivo: 'Falta VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY.' };
  let endereco: URL;
  try {
    endereco = new URL(url);
  } catch {
    return { tipo: 'invalido', motivo: 'VITE_SUPABASE_URL não é um endereço válido.' };
  }
  const local = endereco.hostname === '127.0.0.1' || endereco.hostname === 'localhost';
  if (endereco.protocol !== 'https:' && !local) return { tipo: 'invalido', motivo: 'VITE_SUPABASE_URL precisa usar https.' };
  // Chaves novas: sb_publishable_ (pública) e sb_secret_ (secreta).
  if (chave.startsWith('sb_secret_') || papelDoJwt(chave) === 'service_role') {
    return { tipo: 'invalido', motivo: 'A chave informada é secreta (service_role). No navegador só vale a chave pública.' };
  }
  return { tipo: 'ok', config: { url: endereco.origin, chavePublica: chave } };
}

/** Carrega a biblioteca do Supabase só quando o login está configurado (sem login, o app não a baixa). */
export async function criarClienteAuth(config: ConfiguracaoAuth): Promise<ClienteAuth> {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(config.url, config.chavePublica, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  }) as unknown as ClienteAuth;
}

const paraUsuario = (u: { id: string; email?: string | null }): Usuario => ({ id: u.id, email: u.email ?? null });

export async function sessaoAtual(cliente: ClienteAuth): Promise<Usuario | null> {
  const { data } = await cliente.auth.getSession();
  return data.session ? paraUsuario(data.session.user) : null;
}

/** Avisa a cada entrada ou saída; devolve a função que para de ouvir. */
export function ouvirSessao(cliente: ClienteAuth, aoMudar: (u: Usuario | null) => void): () => void {
  const { data } = cliente.auth.onAuthStateChange((_evento, sessao) => aoMudar(sessao ? paraUsuario(sessao.user) : null));
  return () => data.subscription.unsubscribe();
}

/** Redireciona para o Google. Volta para a mesma página (sem o #), que precisa estar nas URLs de retorno do Supabase. */
export async function entrarComGoogle(cliente: ClienteAuth, origem: string): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const { error } = await cliente.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: origem } });
  // A mensagem do serviço não é exibida: pode trazer detalhes de configuração.
  return error ? { ok: false, mensagem: 'Não foi possível iniciar o login com Google. Tente de novo mais tarde.' } : { ok: true };
}

export async function sair(cliente: ClienteAuth): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  const { error } = await cliente.auth.signOut();
  return error ? { ok: false, mensagem: 'Não foi possível sair. Tente de novo.' } : { ok: true };
}
