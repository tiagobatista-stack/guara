// Botão de conta no rodapé do menu: entrar com Google ou sair (autenticacao.ts).
// Sem configuração, fica o botão "Sair" desativado de antes. O login só identifica a
// pessoa; os dados continuam neste navegador.

import { useEffect, useState } from 'react';
import { Icone } from '../compartilhado/Icone.tsx';
import {
  criarClienteAuth, entrarComGoogle, lerConfiguracao, ouvirSessao, sair, sessaoAtual,
  type ClienteAuth, type ConfiguracaoAuth, type LeituraConfiguracao, type Usuario,
} from './autenticacao.ts';

const AVISO_DADOS = 'O login identifica você. Os dados continuam neste navegador.';

interface Props {
  /** Para testes; no app vem das variáveis VITE_SUPABASE_*. */
  leitura?: LeituraConfiguracao;
  criarCliente?: (c: ConfiguracaoAuth) => Promise<ClienteAuth>;
  /** Para onde o Google devolve a pessoa (precisa estar nas URLs de retorno do Supabase). */
  origem?: () => string;
}

export function Conta({
  leitura = lerConfiguracao(import.meta.env),
  criarCliente = criarClienteAuth,
  origem = () => `${window.location.origin}${window.location.pathname}`,
}: Props) {
  const url = leitura.tipo === 'ok' ? leitura.config.url : '';
  const chavePublica = leitura.tipo === 'ok' ? leitura.config.chavePublica : '';
  const [cliente, setCliente] = useState<ClienteAuth | null>(null);
  // undefined = ainda conferindo a sessão.
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let ativo = true;
    let parar = () => {};
    criarCliente({ url, chavePublica }).then((c) => {
      if (!ativo) return;
      setCliente(c);
      parar = ouvirSessao(c, (u) => setUsuario(u));
      sessaoAtual(c).then((u) => { if (ativo) setUsuario(u); }, () => { if (ativo) setUsuario(null); });
    }, () => {
      if (ativo) setErro('Não foi possível carregar o login com Google.');
    });
    return () => { ativo = false; parar(); };
  }, [url, chavePublica]); // criarCliente fica fora: trocá-lo não deve recriar a sessão

  if (leitura.tipo === 'desligado') {
    return (
      <button type="button" className="menu-item" disabled title="Sair (sem autenticação nesta versão)">
        <Icone nome="sair" /> <span className="menu-rotulo">Sair</span>
      </button>
    );
  }
  if (leitura.tipo === 'invalido') {
    return (
      <button type="button" className="menu-item" disabled title={`Login Google indisponível: ${leitura.tipo === 'invalido' ? leitura.motivo : 'configuração ausente.'}`}>
        <Icone nome="entrar" /> <span className="menu-rotulo">Login indisponível</span>
      </button>
    );
  }

  const entrar = async () => {
    if (!cliente) return;
    setErro(null);
    const r = await entrarComGoogle(cliente, origem());
    if (!r.ok) setErro(r.mensagem);
  };
  const terminar = async () => {
    if (!cliente) return;
    setErro(null);
    const r = await sair(cliente);
    if (!r.ok) setErro(r.mensagem);
  };

  return (
    <>
      {usuario ? (
        <button type="button" className="menu-item" onClick={terminar} aria-label={`Sair da conta ${usuario.email ?? 'Google'}`} title={`Conectado como ${usuario.email ?? 'usuário sem e-mail'}. ${AVISO_DADOS}`}>
          <Icone nome="sair" /> <span className="menu-rotulo">Sair</span>
        </button>
      ) : (
        <button type="button" className="menu-item" onClick={entrar} disabled={!cliente || usuario === undefined} title={AVISO_DADOS}>
          <Icone nome="entrar" /> <span className="menu-rotulo">Entrar com Google</span>
        </button>
      )}
      {erro && <p role="alert" className="texto-pequeno texto--falha">{erro}</p>}
    </>
  );
}
