// Armazém único de demandas: a fonte de verdade de lista, Kanban, detalhe,
// dashboard e alertas (PLANO.md, regra 8). Toda mudança grava primeiro no
// localStorage; só depois o estado em memória e a interface são atualizados.

import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Demanda, EntradaDemanda, Status } from './modelo.ts';
import { criarDemanda, editarDemanda, mudarStatus, type ErrosValidacao } from './regras.ts';
import { RepositorioLocal } from './repositorio-local.ts';
import { demandasExemplo } from './exemplos.ts';

export interface EstadoArmazem {
  demandas: readonly Demanda[];
  /** Preenchido quando o armazenamento está corrompido; gravações ficam bloqueadas. */
  erroArmazenamento: string | null;
  conteudoBruto: string | null;
}

export type RespostaAcao = { ok: true; demanda?: Demanda } | { ok: false; erros?: ErrosValidacao; mensagem: string };

export interface OpcoesArmazem {
  agora?: () => Date;
  gerarId?: () => string;
  exemplos?: () => Demanda[];
}

export function criarArmazem(armazenamento: Storage, opcoes: OpcoesArmazem = {}) {
  const agora = opcoes.agora ?? (() => new Date());
  const gerarId = opcoes.gerarId ?? (() => crypto.randomUUID());
  const exemplos = opcoes.exemplos ?? demandasExemplo;
  const repo = new RepositorioLocal(armazenamento);
  const ouvintes = new Set<() => void>();

  let estado: EstadoArmazem = { demandas: [], erroArmazenamento: null, conteudoBruto: null };

  function carregar() {
    const carga = repo.carregar();
    if (carga.tipo === 'vazio') {
      // Exemplos fictícios só na primeira inicialização.
      const iniciais = exemplos();
      repo.salvar(iniciais);
      estado = { demandas: iniciais, erroArmazenamento: null, conteudoBruto: null };
    } else if (carga.tipo === 'ok') {
      estado = { demandas: carga.demandas, erroArmazenamento: null, conteudoBruto: null };
    } else {
      estado = { demandas: [], erroArmazenamento: carga.motivo, conteudoBruto: carga.bruto };
    }
  }
  carregar();

  function publicar(demandas: readonly Demanda[]) {
    estado = { ...estado, demandas };
    ouvintes.forEach((o) => o());
  }

  /** Grava antes de publicar: sucesso só é exibido depois de gravar. */
  function gravar(demandas: Demanda[]): RespostaAcao | null {
    if (estado.erroArmazenamento) {
      return { ok: false, mensagem: 'Armazenamento corrompido: resolva o aviso antes de gravar.' };
    }
    try {
      repo.salvar(demandas);
    } catch {
      return { ok: false, mensagem: 'O navegador recusou a gravação (cota cheia ou modo privado).' };
    }
    publicar(demandas);
    return null;
  }

  const iso = () => agora().toISOString();

  return {
    obter: () => estado,
    assinar(ouvinte: () => void) {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    criar(entrada: EntradaDemanda): RespostaAcao {
      const r = criarDemanda(entrada, iso(), gerarId);
      if (!r.ok) return { ok: false, erros: r.erros, mensagem: 'Corrija os campos destacados.' };
      return gravar([...estado.demandas, r.valor]) ?? { ok: true, demanda: r.valor };
    },
    editar(id: string, entrada: EntradaDemanda): RespostaAcao {
      const atual = estado.demandas.find((d) => d.id === id);
      if (!atual) return { ok: false, mensagem: 'Demanda não encontrada.' };
      const r = editarDemanda(atual, entrada, iso());
      if (!r.ok) return { ok: false, erros: r.erros, mensagem: 'Corrija os campos destacados.' };
      if (r.valor === atual) return { ok: true, demanda: atual };
      return gravar(estado.demandas.map((d) => (d.id === id ? r.valor : d))) ?? { ok: true, demanda: r.valor };
    },
    mudarStatus(id: string, status: Status): RespostaAcao {
      const atual = estado.demandas.find((d) => d.id === id);
      if (!atual) return { ok: false, mensagem: 'Demanda não encontrada.' };
      const nova = mudarStatus(atual, status, iso());
      if (nova === atual) return { ok: true, demanda: atual };
      return gravar(estado.demandas.map((d) => (d.id === id ? nova : d))) ?? { ok: true, demanda: nova };
    },
    excluir(id: string): RespostaAcao {
      if (!estado.demandas.some((d) => d.id === id)) return { ok: false, mensagem: 'Demanda não encontrada.' };
      return gravar(estado.demandas.filter((d) => d.id !== id)) ?? { ok: true };
    },
    /** Substitui tudo pelos exemplos (a confirmação fica na interface). Também resolve corrupção. */
    restaurarExemplos(): RespostaAcao {
      try {
        const iniciais = exemplos();
        repo.salvar(iniciais);
        estado = { demandas: iniciais, erroArmazenamento: null, conteudoBruto: null };
        ouvintes.forEach((o) => o());
        return { ok: true };
      } catch {
        return { ok: false, mensagem: 'O navegador recusou a gravação.' };
      }
    },
    recarregar() {
      carregar();
      ouvintes.forEach((o) => o());
    },
  };
}

export type Armazem = ReturnType<typeof criarArmazem>;

let padrao: Armazem | null = null;
/** Armazém do app, criado sob demanda sobre o localStorage do navegador. */
export function armazemPadrao(): Armazem {
  padrao ??= criarArmazem(window.localStorage);
  return padrao;
}

export const ContextoArmazem = createContext<Armazem | null>(null);

export function useArmazem(): Armazem {
  return useContext(ContextoArmazem) ?? armazemPadrao();
}

export function useEstadoDemandas(): EstadoArmazem {
  const armazem = useArmazem();
  return useSyncExternalStore(armazem.assinar, armazem.obter);
}
