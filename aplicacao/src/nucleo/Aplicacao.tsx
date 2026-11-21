// Layout em três áreas (seção 7.4): menu lateral, área central e painel contextual.
// Desktop: menu completo + painel do assistente à direita (≥ 1280px).
// Tablet (768–1023px): menu recolhido só com ícones; assistente em gaveta.
// Smartphone: barra inferior com os módulos principais, menu completo em gaveta
// e botão flutuante para a conversa. Regras de layout em estilos.css.

import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Icone } from '../compartilhado/Icone.tsx';
import { modulos, moduloDaRota } from './registro-modulos.ts';
import { Painel } from '../modulos/painel/Painel.tsx';
import { Demandas } from '../modulos/demandas/Demandas.tsx';
import { Kanban } from '../modulos/kanban/Kanban.tsx';
import { Alertas } from '../modulos/alertas/Alertas.tsx';
import { listarInativas } from '../modulos/alertas/inatividade.ts';
import { useEstadoDemandas } from '../modulos/demandas/armazem.ts';
import { SaudeDoSistema } from '../modulos/saude-do-sistema/SaudeDoSistema.tsx';
import { pedirAba } from '../modulos/assistente/abas.ts';
import { useCompromissosParaAvisar } from '../modulos/agenda/avisosDeCompromissos.ts';
import { PainelAssistente, RostoDoAssistente, rotuloAbrirAssistente, useAvisosVisiveis } from '../modulos/assistente/PainelAssistente.tsx';
import { Configuracoes } from '../modulos/configuracoes/Configuracoes.tsx';
import { Operacoes } from '../modulos/operacoes/Operacoes.tsx';
import { Atalhos } from '../modulos/atalhos/Atalhos.tsx';
import { Agenda } from '../modulos/agenda/Agenda.tsx';
import { EmConstrucao } from '../compartilhado/EmConstrucao.tsx';
import { Gaveta } from '../compartilhado/Gaveta.tsx';
import { resumoDosAvisos } from '../modulos/assistente/avisos.ts';
import { CHAVE_MENU, CHAVE_PAINEL, useRecolhido } from './recolhimento.ts';

// O mapa (Leaflet e a malha municipal) só é baixado quando a tela abre.
const Mapa = lazy(() => import('../modulos/mapa/Mapa.tsx').then((m) => ({ default: m.Mapa })));

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
  if (rota === 'alertas') return <Alertas />;
  if (rota === 'saude-do-sistema') return <SaudeDoSistema />;
  if (rota === 'configuracoes') return <Configuracoes />;
  if (rota === 'atalhos') return <Atalhos />;
  if (rota === 'operacoes') return <Operacoes />;
  if (rota === 'agenda') return <Agenda />;
  if (rota === 'mapa') return <Suspense fallback={<p role="status" className="texto-suave pagina">Carregando o mapa…</p>}><Mapa /></Suspense>;
  const m = modulos.find((x) => x.id === rota);
  return <EmConstrucao titulo={m?.rotulo ?? rota} />;
}

export function Aplicacao() {
  const [rota, navegar] = useRota();
  const [menuAberto, setMenuAberto] = useState(false);
  const [conversaAberta, setConversaAberta] = useState(false);
  const [menuRecolhido, alternarMenu] = useRecolhido(CHAVE_MENU);
  const [painelRecolhido, alternarPainel] = useRecolhido(CHAVE_PAINEL);
  // Funções estáveis: a gaveta registra o ouvinte de teclado uma vez só.
  const fecharMenu = useCallback(() => setMenuAberto(false), []);
  const fecharConversa = useCallback(() => setConversaAberta(false), []);
  const ativos = modulos.filter((m) => m.ativo);
  const { demandas, diasInatividade, avisoPersistencia } = useEstadoDemandas();
  const totalAlertas = listarInativas(demandas, diasInatividade, new Date()).length;
  // Só os avisos que a pessoa ainda não marcou como cientes nem adiou.
  const { visiveis: avisos } = useAvisosVisiveis(new Date());
  const compromissosDoAviso = useCompromissosParaAvisar(new Date()).length;
  const rotuloAssistente = rotuloAbrirAssistente(avisos, compromissosDoAviso);
  // Abrir o assistente com um aviso urgente (demanda vencida) leva direto à aba "Avisos".
  const abrirAssistente = () => {
    if (avisos.some((a) => a.tipo === 'vencida')) pedirAba('avisos');
    setConversaAberta(true);
  };

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
        aria-label={m.rotulo}
      >
        <Icone nome={m.icone} />
        <span className="menu-rotulo">{m.rotulo}</span>
      </button>
    );
  };

  return (
    <div className={`app${menuRecolhido ? ' app--menu-recolhido' : ''}${painelRecolhido ? ' app--painel-recolhido' : ''}`}>
      <a href="#conteudo" className="pular-conteudo">Pular para o conteúdo</a>

      <nav aria-label="Menu principal" className="menu-lateral">
        <div className="marca">
          <span className="marca-simbolo" aria-hidden="true">G</span>
          <span className="marca-texto">
            <span className="marca-nome">GUARÁ</span>
            <span className="marca-descricao">Estagiário digital</span>
          </span>
        </div>
        {ativos.filter((m) => m.id !== 'configuracoes').map((m) => itemMenu(m.id))}
        <div className="menu-rodape">
          {itemMenu('configuracoes')}
          <button type="button" className="menu-item menu-alternar" aria-expanded={!menuRecolhido} onClick={alternarMenu}
            title={menuRecolhido ? 'Expandir menu' : 'Recolher menu'} aria-label={menuRecolhido ? 'Expandir menu' : 'Recolher menu'}>
            <span aria-hidden="true">{menuRecolhido ? '»' : '«'}</span> <span className="menu-rotulo">Recolher menu</span>
          </button>
          <button type="button" className="menu-item" disabled title="Sair (sem autenticação nesta versão)">
            <Icone nome="sair" /> <span className="menu-rotulo">Sair</span>
          </button>
        </div>
      </nav>

      <div className="area-central">
        <header className="cabecalho">
          <span className="cabecalho-nome">GUARÁ</span>
          <span className="selo-ficticio">Dados fictícios</span>
          <button
            type="button"
            className="sino"
            onClick={() => navegar('alertas')}
            aria-label={`Alertas: ${totalAlertas} demanda(s) inativa(s)`}
            title={`Alertas: ${totalAlertas} demanda(s) inativa(s). Os avisos do dia ficam no assistente.`}
          >
            <Icone nome="sino" />
            {totalAlertas > 0 && <span className="sino-contagem" aria-hidden="true">{totalAlertas}</span>}
          </button>
          <button type="button" className="botao-assistente" onClick={abrirAssistente} aria-label={rotuloAssistente}>
            <RostoDoAssistente tamanho={28} avisos={avisos} compromissos={compromissosDoAviso} /> Assistente
          </button>
        </header>

        <main id="conteudo" className="conteudo">
          {avisoPersistencia && <p role="alert" className="aviso aviso--topo">{avisoPersistencia}</p>}
          <Conteudo rota={rota} />
        </main>
      </div>

      <aside aria-label="Assistente e notificações" className="painel-assistente">
        {painelRecolhido ? (
          // Faixa estreita: o rosto do mascote (atento e com o pulinho de sempre quando chega aviso) e o contador dos avisos não vistos.
          <button type="button" className="painel-faixa" aria-expanded={false} onClick={alternarPainel} title="Expandir painel do assistente"
            aria-label={`Expandir painel do assistente${avisos.length ? `: ${resumoDosAvisos(avisos)}` : ''}`}>
            <RostoDoAssistente tamanho={40} avisos={avisos} compromissos={compromissosDoAviso} />
            {avisos.length > 0 && <span className="sino-contagem painel-faixa-contagem" data-testid="contador-faixa" aria-hidden="true">{avisos.length}</span>}
          </button>
        ) : (
          <>
            <button type="button" className="botao botao--pequeno painel-recolher" aria-expanded onClick={alternarPainel}>Recolher painel</button>
            <PainelAssistente />
          </>
        )}
      </aside>

      {conversaAberta && (
        <Gaveta rotulo="Assistente" rotuloFechar="Fechar assistente" aoFechar={fecharConversa}>
          <PainelAssistente />
        </Gaveta>
      )}

      {/* No celular, o mascote fica no botão flutuante: assim continua visível com o painel fechado. */}
      <button type="button" className="botao-flutuante" onClick={abrirAssistente} aria-label={rotuloAssistente}>
        <RostoDoAssistente tamanho={44} avisos={avisos} compromissos={compromissosDoAviso} />
        {avisos.length > 0 && <span className="sino-contagem botao-flutuante-contagem" aria-hidden="true">{avisos.length}</span>}
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
        <Gaveta rotulo="Menu completo" rotuloFechar="Fechar menu" aoFechar={fecharMenu} topo={<strong>Menu</strong>} inferior>
          <div className="menu-gaveta">{ativos.map((m) => itemMenu(m.id))}</div>
        </Gaveta>
      )}
    </div>
  );
}
