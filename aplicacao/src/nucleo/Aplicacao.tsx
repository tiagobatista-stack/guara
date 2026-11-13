// Layout em três áreas (seção 7.4): menu lateral, área central e painel contextual.
// Desktop: menu completo + painel do assistente à direita.
// Tablet (md): menu recolhido só com ícones; assistente em gaveta.
// Smartphone: barra inferior com os módulos principais, menu completo em gaveta
// e botão flutuante para a conversa.

import { useEffect, useState } from 'react';
import { Icone } from '../compartilhado/Icone.tsx';
import { modulos, moduloDaRota } from './registro-modulos.ts';
import { Painel } from '../modulos/painel/Painel.tsx';
import { Demandas } from '../modulos/demandas/Demandas.tsx';
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
  if (rota === 'saude-do-sistema') return <SaudeDoSistema />;
  const m = modulos.find((x) => x.id === rota);
  return <EmConstrucao titulo={m?.rotulo ?? rota} />;
}

export function Aplicacao() {
  const [rota, navegar] = useRota();
  const [menuAberto, setMenuAberto] = useState(false);
  const [conversaAberta, setConversaAberta] = useState(false);
  const ativos = modulos.filter((m) => m.ativo);

  const itemMenu = (id: string, compacto: boolean) => {
    const m = modulos.find((x) => x.id === id)!;
    const atual = rota === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => { navegar(id); setMenuAberto(false); }}
        aria-current={atual ? 'page' : undefined}
        title={m.rotulo}
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium ${
          atual ? 'bg-guara-100 text-guara-700 dark:bg-guara-700/30 dark:text-guara-100' : 'hover:bg-stone-100 dark:hover:bg-stone-800'
        } ${compacto ? 'justify-center lg:justify-start' : ''}`}
      >
        <Icone nome={m.icone} />
        <span className={compacto ? 'hidden lg:inline' : ''}>{m.rotulo}</span>
      </button>
    );
  };

  return (
    <div className="flex min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Pular para o conteúdo
      </a>

      {/* Menu lateral: recolhido (ícones) no tablet, completo no desktop */}
      <nav aria-label="Menu principal" className="sticky top-0 hidden h-dvh w-16 shrink-0 flex-col gap-1 border-r border-stone-200 bg-white p-2 md:flex lg:w-60 dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-4 flex items-center gap-2 px-2 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-guara-500 font-bold text-white" aria-hidden="true">G</span>
          <span className="hidden lg:block">
            <span className="block text-base font-bold">GUARÁ</span>
            <span className="block text-xs text-stone-500 dark:text-stone-400">Estagiário digital</span>
          </span>
        </div>
        {ativos.map((m) => itemMenu(m.id, true))}
        <div className="mt-auto flex flex-col gap-1 border-t border-stone-200 pt-2 dark:border-stone-800">
          <button type="button" disabled title="Configurações (não implementado)" className="flex min-h-11 items-center justify-center gap-3 rounded-lg px-3 text-sm text-stone-400 lg:justify-start">
            <Icone nome="configuracoes" /> <span className="hidden lg:inline">Configurações</span>
          </button>
          <button type="button" disabled title="Sair (autenticação ainda não configurada)" className="flex min-h-11 items-center justify-center gap-3 rounded-lg px-3 text-sm text-stone-400 lg:justify-start">
            <Icone nome="sair" /> <span className="hidden lg:inline">Sair</span>
          </button>
        </div>
      </nav>

      {/* Área central */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90">
          <span className="font-bold md:hidden">GUARÁ</span>
          <label className="relative flex-1">
            <span className="sr-only">Buscar demanda</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"><Icone nome="busca" className="h-4 w-4" /></span>
            <input
              type="search"
              placeholder="Buscar demanda (em breve)"
              disabled
              className="min-h-10 w-full rounded-lg border border-stone-300 bg-stone-50 pl-9 pr-3 text-sm dark:border-stone-700 dark:bg-stone-800"
            />
          </label>
          <span className="hidden rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 sm:inline dark:bg-amber-950 dark:text-amber-200">
            Dados fictícios
          </span>
          <button
            type="button"
            onClick={() => setConversaAberta(true)}
            className="hidden min-h-10 items-center gap-2 rounded-lg border border-stone-300 px-3 text-sm md:flex xl:hidden dark:border-stone-700"
          >
            <Icone nome="conversa" /> Assistente
          </button>
        </header>

        <main id="conteudo" className="flex-1 px-4 pb-24 pt-4 md:pb-8 lg:px-8">
          <Conteudo rota={rota} />
        </main>
      </div>

      {/* Painel do assistente: coluna no desktop largo */}
      <aside aria-label="Assistente e notificações" className="sticky top-0 hidden h-dvh w-80 shrink-0 border-l border-stone-200 bg-white xl:flex dark:border-stone-800 dark:bg-stone-900">
        <PainelAssistente />
      </aside>

      {/* Gaveta do assistente (tablet e smartphone) */}
      {conversaAberta && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/40 xl:hidden" role="dialog" aria-modal="true" aria-label="Assistente">
          <div className="flex h-full w-full max-w-sm flex-col bg-white dark:bg-stone-900">
            <div className="flex justify-end p-2">
              <button type="button" onClick={() => setConversaAberta(false)} className="grid h-11 w-11 place-items-center rounded-lg" aria-label="Fechar assistente">
                <Icone nome="fechar" />
              </button>
            </div>
            <PainelAssistente />
          </div>
        </div>
      )}

      {/* Botão flutuante da conversa (smartphone) */}
      <button
        type="button"
        onClick={() => setConversaAberta(true)}
        className="fixed bottom-20 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-guara-500 text-white shadow-lg md:hidden"
        aria-label="Abrir assistente"
      >
        <Icone nome="conversa" className="h-6 w-6" />
      </button>

      {/* Barra inferior (smartphone) */}
      <nav aria-label="Navegação inferior" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white md:hidden dark:border-stone-800 dark:bg-stone-900">
        {ativos.filter((m) => m.principal).slice(0, 4).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => navegar(m.id)}
            aria-current={rota === m.id ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${rota === m.id ? 'text-guara-600' : 'text-stone-500'}`}
          >
            <Icone nome={m.icone} />
            {m.rotulo === 'Saúde do sistema' ? 'Saúde' : m.rotulo}
          </button>
        ))}
        <button type="button" onClick={() => setMenuAberto(true)} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] text-stone-500">
          <Icone nome="mais" /> Mais
        </button>
      </nav>

      {/* Gaveta com o menu completo (smartphone) */}
      {menuAberto && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu completo">
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 dark:bg-stone-900">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold">Menu</span>
              <button type="button" onClick={() => setMenuAberto(false)} className="grid h-11 w-11 place-items-center" aria-label="Fechar menu">
                <Icone nome="fechar" />
              </button>
            </div>
            <div className="flex flex-col gap-1">{ativos.map((m) => itemMenu(m.id, false))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
