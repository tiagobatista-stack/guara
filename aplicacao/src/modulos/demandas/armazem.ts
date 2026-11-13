// Armazém único de demandas: a fonte de verdade de lista, Kanban, detalhe,
// dashboard e alertas (PLANO.md, regra 8). Toda mudança grava primeiro no
// localStorage; só depois o estado em memória e a interface são atualizados.

import { createContext, useContext, useSyncExternalStore } from 'react';
import { CHAVE_DEMANDAS as CHAVE_DEMANDAS_ARMAZEM, type Demanda, type EntradaDemanda, type Status } from './modelo.ts';
import { criarDemanda, editarDemanda, mudarStatus, type ErrosValidacao } from './regras.ts';
import { RepositorioLocal } from './repositorio-local.ts';
import { demandasExemplo } from './exemplos.ts';
import { DIAS_INATIVIDADE_PADRAO } from '../alertas/inatividade.ts';
import { diasValidos, type DadosPortaveis } from '../alertas/dados-portaveis.ts';

export const CHAVE_CONFIGURACAO = 'guara:configuracao:v1';
export const CHAVE_BACKUP = 'guara:backup-antes-importacao:v1';

export interface EstadoArmazem {
  demandas: readonly Demanda[];
  /** Preenchido quando o armazenamento está corrompido; gravações ficam bloqueadas. */
  erroArmazenamento: string | null;
  conteudoBruto: string | null;
  /** Limiar de inatividade em dias corridos, persistido (padrão 3). */
  diasInatividade: number;
  /** Há backup lógico gravado antes da última importação. */
  temBackup: boolean;
  /** Preenchido quando o navegador não permite gravar (modo privado, cota cheia, bloqueio). */
  avisoPersistencia: string | null;
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

  let estado: EstadoArmazem = {
    demandas: [], erroArmazenamento: null, conteudoBruto: null,
    diasInatividade: DIAS_INATIVIDADE_PADRAO, temBackup: false, avisoPersistencia: null,
  };
  const AVISO_SEM_GRAVACAO =
    'Este navegador não permitiu gravar os dados (modo privado, cota cheia ou bloqueio). As alterações valem só até fechar a página.';

  function lerDias(): number {
    try {
      const n = JSON.parse(armazenamento.getItem(CHAVE_CONFIGURACAO) ?? 'null')?.diasInatividade;
      return diasValidos(n) ? n : DIAS_INATIVIDADE_PADRAO;
    } catch {
      return DIAS_INATIVIDADE_PADRAO;
    }
  }

  function carregar() {
    let extras: Pick<EstadoArmazem, 'diasInatividade' | 'temBackup' | 'avisoPersistencia'>;
    let carga: ReturnType<RepositorioLocal['carregar']>;
    try {
      extras = { diasInatividade: lerDias(), temBackup: armazenamento.getItem(CHAVE_BACKUP) !== null, avisoPersistencia: null };
      carga = repo.carregar();
    } catch {
      // Leitura bloqueada: o app abre com os exemplos em memória, sem quebrar.
      estado = { ...estado, demandas: exemplos(), erroArmazenamento: null, conteudoBruto: null, avisoPersistencia: AVISO_SEM_GRAVACAO };
      return;
    }
    if (carga.tipo === 'vazio') {
      // Exemplos fictícios só na primeira inicialização.
      const iniciais = exemplos();
      try {
        repo.salvar(iniciais);
      } catch {
        extras.avisoPersistencia = AVISO_SEM_GRAVACAO;
      }
      estado = { demandas: iniciais, erroArmazenamento: null, conteudoBruto: null, ...extras };
    } else if (carga.tipo === 'ok') {
      estado = { demandas: carga.demandas, erroArmazenamento: null, conteudoBruto: null, ...extras };
    } else {
      estado = { demandas: [], erroArmazenamento: carga.motivo, conteudoBruto: carga.bruto, ...extras };
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
      estado = { ...estado, avisoPersistencia: AVISO_SEM_GRAVACAO };
      ouvintes.forEach((o) => o());
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
        estado = { ...estado, demandas: iniciais, erroArmazenamento: null, conteudoBruto: null };
        ouvintes.forEach((o) => o());
        return { ok: true };
      } catch {
        return { ok: false, mensagem: 'O navegador recusou a gravação.' };
      }
    },
    /** Grava o limiar de inatividade (1 a 365 dias corridos). */
    definirDiasInatividade(dias: number): RespostaAcao {
      if (!diasValidos(dias)) return { ok: false, mensagem: 'Informe um número inteiro de 1 a 365 dias.' };
      try {
        armazenamento.setItem(CHAVE_CONFIGURACAO, JSON.stringify({ diasInatividade: dias }));
      } catch {
        return { ok: false, mensagem: 'O navegador recusou a gravação.' };
      }
      estado = { ...estado, diasInatividade: dias };
      ouvintes.forEach((o) => o());
      return { ok: true };
    },
    /** Substitui os dados pelos importados, gravando antes um backup lógico (a confirmação fica na interface). */
    importar(dados: DadosPortaveis): RespostaAcao {
      // Fotografia das três chaves para desfazer tudo se qualquer gravação falhar no meio.
      const chaves = [CHAVE_DEMANDAS_ARMAZEM, CHAVE_CONFIGURACAO, CHAVE_BACKUP];
      let antes: (string | null)[];
      try {
        antes = chaves.map((k) => armazenamento.getItem(k));
      } catch {
        return { ok: false, mensagem: 'O navegador não permitiu ler os dados atuais; nada foi importado.' };
      }
      try {
        armazenamento.setItem(CHAVE_BACKUP, JSON.stringify({ salvoEm: iso(), conteudo: antes[0], diasInatividade: estado.diasInatividade }));
        repo.salvar(dados.demandas);
        armazenamento.setItem(CHAVE_CONFIGURACAO, JSON.stringify({ diasInatividade: dados.configuracao.diasInatividade }));
      } catch {
        let revertido = true;
        chaves.forEach((k, i) => {
          try {
            const valor = antes[i];
            if (valor === null) armazenamento.removeItem(k);
            else armazenamento.setItem(k, valor);
          } catch {
            revertido = false;
          }
        });
        carregar();
        ouvintes.forEach((o) => o());
        return {
          ok: false,
          mensagem: revertido
            ? 'O navegador recusou a gravação; a importação foi desfeita e os dados anteriores foram mantidos.'
            : 'O navegador recusou a gravação e não foi possível desfazer tudo; confira os dados e use "Desfazer última importação".',
        };
      }
      carregar();
      ouvintes.forEach((o) => o());
      return { ok: true };
    },
    /** Desfaz a última importação, restaurando o backup lógico. */
    restaurarBackup(): RespostaAcao {
      const bruto = armazenamento.getItem(CHAVE_BACKUP);
      if (bruto === null) return { ok: false, mensagem: 'Não há backup de importação.' };
      try {
        const b = JSON.parse(bruto) as { conteudo: string | null; diasInatividade: number };
        if (b.conteudo === null) armazenamento.removeItem(CHAVE_DEMANDAS_ARMAZEM);
        else armazenamento.setItem(CHAVE_DEMANDAS_ARMAZEM, b.conteudo);
        armazenamento.setItem(CHAVE_CONFIGURACAO, JSON.stringify({ diasInatividade: b.diasInatividade }));
        armazenamento.removeItem(CHAVE_BACKUP);
      } catch {
        return { ok: false, mensagem: 'Backup ilegível; nada foi alterado.' };
      }
      carregar();
      ouvintes.forEach((o) => o());
      return { ok: true };
    },
    recarregar() {
      carregar();
      ouvintes.forEach((o) => o());
    },
    /** Usado quando o localStorage está bloqueado e o app roda em memória. */
    marcarSemPersistencia() {
      estado = { ...estado, avisoPersistencia: AVISO_SEM_GRAVACAO };
      ouvintes.forEach((o) => o());
    },
    /** Sincroniza com outras abas: recarrega quando outra aba grava uma chave do GUARÁ. */
    escutarOutrasAbas(alvo: Pick<Window, 'addEventListener' | 'removeEventListener'>): () => void {
      const aoMudar = (e: Event) => {
        const chave = (e as StorageEvent).key;
        if (chave === null || chave.startsWith('guara:')) {
          carregar();
          ouvintes.forEach((o) => o());
        }
      };
      alvo.addEventListener('storage', aoMudar);
      return () => alvo.removeEventListener('storage', aoMudar);
    },
  };
}

/** Storage em memória, usado quando o navegador bloqueia o localStorage. */
export function criarArmazenamentoEmMemoria(): Storage {
  const dados = new Map<string, string>();
  return {
    get length() { return dados.size; },
    clear: () => dados.clear(),
    getItem: (k: string) => dados.get(k) ?? null,
    key: (i: number) => [...dados.keys()][i] ?? null,
    removeItem: (k: string) => { dados.delete(k); },
    setItem: (k: string, v: string) => { dados.set(k, String(v)); },
  };
}

/** Devolve o localStorage, ou um armazenamento em memória se o navegador o bloquear. */
export function obterArmazenamento(janela: { readonly localStorage: Storage }): { armazenamento: Storage; persistente: boolean } {
  try {
    const ls = janela.localStorage;
    const teste = 'guara:teste-de-escrita';
    ls.setItem(teste, '1');
    ls.removeItem(teste);
    return { armazenamento: ls, persistente: true };
  } catch {
    return { armazenamento: criarArmazenamentoEmMemoria(), persistente: false };
  }
}

export type Armazem = ReturnType<typeof criarArmazem>;

let padrao: Armazem | null = null;
/** Armazém do app, criado sob demanda sobre o localStorage do navegador. */
export function armazemPadrao(): Armazem {
  if (!padrao) {
    const { armazenamento, persistente } = obterArmazenamento(window);
    padrao = criarArmazem(armazenamento);
    if (!persistente) padrao.marcarSemPersistencia();
    padrao.escutarOutrasAbas(window);
  }
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
