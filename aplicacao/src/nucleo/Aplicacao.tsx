// Layout em três áreas (seção 7.4): menu lateral, área central e painel contextual.
// Desktop: menu completo + painel do assistente à direita (≥ 1280px).
// Tablet (768–1023px): menu recolhido só com ícones; assistente em gaveta.
// Smartphone: barra inferior com os módulos principais, menu completo em gaveta
// e botão flutuante para a conversa. Regras de layout em estilos.css.

import { useEffect, useState } from 'react';
import { Icone } from '../compartilhado/Icone.tsx';
import { modulos, moduloDaRota } from './registro-modulos.ts';
import { Painel } from '../modulos/painel/Painel.tsx';
import { Demandas } from '../modulos/demandas/Demandas.tsx';
import { Kanban } from '../modulos/kanban/Kanban.tsx';
import { SaudeDoSistema } from '../modulos/saude-do-sistema/SaudeDoSistema.tsx';
import { PainelAssistente } from '../modulos/assistente/PainelAssistente.tsx';
import { EmConstrucao } from '../compartilhado/EmConstrucao.tsx';

function useRota(): [string, (id: string) => void] {
  const [rota, setRota] = useState(() => moduloDaRota(window.location.hash));
  useEffect(() => {
    const aoMudar = () => setRota(moduloDaRota(window.location.hash));
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);
  return [rota, (id) => { window.location.hash = `/${id}`; setRota(id); }];
}

function Conteudo({ rota }: { rota: string }) {
  if (rota === 'painel') return <Painel />;
  if (rota === 'demandas') return <Demandas />;
  if (rota === 'kanban') return <Kanban />;
  if (rota === 'saude-do-sistema') return <SaudeDoSistema />;
  const m = modulos.find((x) => x.id === rota);
  return <EmConstrucao titulo={m?.rotulo ?? rota} />;
}

export function Aplicacao() {
  const [rota, navegar] = useRota();
  const [menuAberto, setMenuAberto] = useState(false);
  const [conversaAberta, setConversaAberta] = useState(false);
  const ativos = modulos.filter((m) => m.ativo);

  const itemMenu = (id: string) => {
    const m = modulos.find((x) => x.id === id)!;
    return (
      <button
        key={id}
        type="button"
        className="menu-item"
        onClick={() => { navegar(id); setMenuAberto(false); }}
        aria-current={rota === id ? 'page' : undefined}
        title={m.rotulo}
      >
        <Icone nome={m.icone} />
        <span className="menu-rotulo">{m.rotulo}</span>
      </button>
    );
  };

  return (
    <div className="app">
      <a href="#conteudo" className="pular-conteudo">Pular para o conteúdo</a>

      <nav aria-label="Menu principal" className="menu-lateral">
        <div className="marca">
          <span className="marca-simbolo" aria-hidden="true">G</span>
          <span className="marca-texto">
            <span className="marca-nome">GUARÁ</span>
            <span className="marca-descricao">Estagiário digital</span>
          </span>
        </div>
        {ativos.map((m) => itemMenu(m.id))}
        <div className="menu-rodape">
          <button type="button" className="menu-item" disabled title="Configurações (não implementado)">
            <Icone nome="configuracoes" /> <span className="menu-rotulo">Configurações</span>
          </button>
          <button type="button" className="menu-item" disabled title="Sair (sem autenticação nesta versão)">
            <Icone nome="sair" /> <span className="menu-rotulo">Sair</span>
          </button>
        </div>
      </nav>

      <div className="area-central">
        <header className="cabecalho">
          <span className="cabecalho-nome">GUARÁ</span>
          <label className="busca">
            <span className="sr-only">Buscar demanda</span>
            <Icone nome="busca" className="icone icone--pequeno" />
            <input type="search" placeholder="Buscar demanda (em breve)" disabled />
          </label>
          <span className="selo-ficticio">Dados fictícios</span>
          <button type="button" className="botao-assistente" onClick={() => setConversaAberta(true)}>
            <Icone nome="conversa" /> Assistente
          </button>
        </header>

        <main id="conteudo" className="conteudo">
          <Conteudo rota={rota} />
        </main>
      </div>

      <aside aria-label="Assistente e notificações" className="painel-assistente">
        <PainelAssistente />
      </aside>

      {conversaAberta && (
        <div className="gaveta-fundo" role="dialog" aria-modal="true" aria-label="Assistente">
          <div className="gaveta">
            <div className="gaveta-topo">
              <span />
              <button type="button" className="botao-icone" onClick={() => setConversaAberta(false)} aria-label="Fechar assistente">
                <Icone nome="fechar" />
              </button>
            </div>
            <PainelAssistente />
          </div>
        </div>
      )}

      <button type="button" className="botao-flutuante" onClick={() => setConversaAberta(true)} aria-label="Abrir assistente">
        <Icone nome="conversa" className="icone icone--grande" />
      </button>

      <nav aria-label="Navegação inferior" className="barra-inferior">
        {ativos.filter((m) => m.principal).slice(0, 4).map((m) => (
          <button
            key={m.id}
            type="button"
            className="barra-item"
            onClick={() => navegar(m.id)}
            aria-current={rota === m.id ? 'page' : undefined}
          >
            <Icone nome={m.icone} />
            {m.rotulo === 'Saúde do sistema' ? 'Saúde' : m.rotulo}
          </button>
        ))}
        <button type="button" className="barra-item" onClick={() => setMenuAberto(true)}>
          <Icone nome="mais" /> Mais
        </button>
      </nav>

      {menuAberto && (
        <div className="gaveta-fundo" role="dialog" aria-modal="true" aria-label="Menu completo">
          <div className="gaveta gaveta--inferior">
            <div className="gaveta-topo">
              <strong>Menu</strong>
              <button type="button" className="botao-icone" onClick={() => setMenuAberto(false)} aria-label="Fechar menu">
                <Icone nome="fechar" />
              </button>
            </div>
            <div className="menu-gaveta">{ativos.map((m) => itemMenu(m.id))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
