// Armazém único de demandas: a fonte de verdade de lista, Kanban, detalhe,
// dashboard e alertas (PLANO.md, regra 8). Toda mudança grava primeiro no
// localStorage; só depois o estado em memória e a interface são atualizados.

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { CHAVE_DEMANDAS as CHAVE_DEMANDAS_ARMAZEM, LIMITES, type Demanda, type EntradaDemanda, type MotivoBloqueio, type Status } from './modelo.ts';
import { confirmarBloqueio, criarDemanda, destravarDemanda, editarDemanda, limparDetalheBloqueio, mudarStatus, travarDemanda, type ErrosValidacao } from './regras.ts';
import { RepositorioLocal } from './repositorio-local.ts';
import { demandasExemplo } from './exemplos.ts';
import { DIAS_INATIVIDADE_PADRAO } from '../alertas/inatividade.ts';
import { diasValidos, type DadosPortaveis } from '../alertas/dados-portaveis.ts';
import { CHAVE_FERIADOS, FERIADOS_VAZIOS, paraAjuste, validarFeriados, type ConfiguracaoFeriados } from '../alertas/feriados-locais.ts';
import type { AjusteFeriados } from '../alertas/dias-uteis.ts';

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
  /** Texto do backup que o desfazer recusa (demandas ilegíveis ou backup quebrado), para baixar pela interface. */
  conteudoIlegivelDoBackup: string | null;
  /** Feriados locais e datas nacionais removidas (feriados-locais.ts). */
  feriados: ConfiguracaoFeriados;
  /** A gravação dos feriados locais estava ilegível; vale a lista vazia até gravar de novo. */
  feriadosIlegiveis: boolean;
}

export type RespostaAcao = { ok: true; demanda?: Demanda } | { ok: false; erros?: ErrosValidacao; mensagem: string };

type Backup = { conteudo: string | null; diasInatividade: number };

/** Classifica o backup da importação com o mesmo critério do carregamento (nada é gravado). */
function avaliarBackup(bruto: string): { tipo: 'ok'; b: Backup } | { tipo: 'estrutura' } | { tipo: 'demandas'; conteudo: string } {
  let b: Backup;
  try {
    b = JSON.parse(bruto);
    if (typeof b !== 'object' || b === null || Array.isArray(b)) throw new Error('backup inválido');
    // Valida a forma antes de gravar: JSON válido com estrutura errada também é ilegível.
    if ((b.conteudo !== null && typeof b.conteudo !== 'string') || !diasValidos(b.diasInatividade)) {
      throw new Error('backup inválido');
    }
  } catch {
    return { tipo: 'estrutura' };
  }
  // Só aceita demandas que o carregamento aceitaria.
  if (b.conteudo !== null) {
    const teste = criarArmazenamentoEmMemoria();
    teste.setItem(CHAVE_DEMANDAS_ARMAZEM, b.conteudo);
    if (new RepositorioLocal(teste).carregar().tipo !== 'ok') return { tipo: 'demandas', conteudo: b.conteudo };
  }
  return { tipo: 'ok', b };
}

function conteudoIlegivel(bruto: string | null): string | null {
  if (bruto === null) return null;
  const r = avaliarBackup(bruto);
  return r.tipo === 'ok' ? null : r.tipo === 'demandas' ? r.conteudo : bruto;
}

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
    conteudoIlegivelDoBackup: null, feriados: FERIADOS_VAZIOS, feriadosIlegiveis: false,
  };
  const AVISO_SEM_GRAVACAO =
    'Este navegador não permitiu gravar os dados (modo privado, cota cheia ou bloqueio). As alterações valem só até fechar a página.';
  // Fica ligado até fechar a página: recarregar não torna o armazenamento persistente.
  let semPersistencia = false;

  function lerDias(): number {
    try {
      const n = JSON.parse(armazenamento.getItem(CHAVE_CONFIGURACAO) ?? 'null')?.diasInatividade;
      return diasValidos(n) ? n : DIAS_INATIVIDADE_PADRAO;
    } catch {
      return DIAS_INATIVIDADE_PADRAO;
    }
  }

  function lerFeriados(): Pick<EstadoArmazem, 'feriados' | 'feriadosIlegiveis'> {
    const bruto = armazenamento.getItem(CHAVE_FERIADOS);
    if (bruto === null) return { feriados: FERIADOS_VAZIOS, feriadosIlegiveis: false };
    try {
      const c = validarFeriados(JSON.parse(bruto));
      return c ? { feriados: c, feriadosIlegiveis: false } : { feriados: FERIADOS_VAZIOS, feriadosIlegiveis: true };
    } catch {
      return { feriados: FERIADOS_VAZIOS, feriadosIlegiveis: true };
    }
  }

  function carregar() {
    let extras: Pick<EstadoArmazem, 'diasInatividade' | 'temBackup' | 'avisoPersistencia' | 'conteudoIlegivelDoBackup' | 'feriados' | 'feriadosIlegiveis'>;
    let carga: ReturnType<RepositorioLocal['carregar']>;
    try {
      const backup = armazenamento.getItem(CHAVE_BACKUP);
      extras = {
        diasInatividade: lerDias(), temBackup: backup !== null, avisoPersistencia: semPersistencia ? AVISO_SEM_GRAVACAO : null,
        conteudoIlegivelDoBackup: conteudoIlegivel(backup),
        ...lerFeriados(),
      };
      carga = repo.carregar();
    } catch {
      // Leitura bloqueada: o app abre com os exemplos em memória, sem quebrar.
      semPersistencia = true;
      estado = { ...estado, demandas: exemplos(), erroArmazenamento: null, conteudoBruto: null, avisoPersistencia: AVISO_SEM_GRAVACAO };
      return;
    }
    if (carga.tipo === 'vazio') {
      // Exemplos fictícios só na primeira inicialização.
      const iniciais = exemplos();
      try {
        repo.salvar(iniciais);
      } catch {
        semPersistencia = true;
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
      semPersistencia = true;
      estado = { ...estado, avisoPersistencia: AVISO_SEM_GRAVACAO };
      ouvintes.forEach((o) => o());
      return { ok: false, mensagem: 'O navegador recusou a gravação (cota cheia ou modo privado).' };
    }
    publicar(demandas);
    return null;
  }

  const iso = () => agora().toISOString();

  /** Aplica uma transição pura a uma demanda e grava; mesma identidade = nada mudou. */
  function aplicar(id: string, transicao: (d: Demanda) => Demanda | null, recusa: string): RespostaAcao {
    const atual = estado.demandas.find((d) => d.id === id);
    if (!atual) return { ok: false, mensagem: 'Demanda não encontrada.' };
    const nova = transicao(atual);
    if (!nova) return { ok: false, mensagem: recusa };
    if (nova === atual) return { ok: true, demanda: atual };
    return gravar(estado.demandas.map((d) => (d.id === id ? nova : d))) ?? { ok: true, demanda: nova };
  }

  /** Tenta voltar as chaves à fotografia; revertido = o armazenamento ficou igual a ela (lido de volta). */
  function reverter(chaves: string[], antes: (string | null)[]): boolean {
    chaves.forEach((k, i) => {
      try {
        const valor = antes[i];
        if (valor === null) armazenamento.removeItem(k);
        else armazenamento.setItem(k, valor);
      } catch {
        // Uma escrita recusada não basta para dizer que falhou: se nada mudou, já está revertido.
      }
    });
    try {
      return chaves.every((k, i) => armazenamento.getItem(k) === antes[i]);
    } catch {
      return false;
    }
  }

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
    travar(id: string, motivo: MotivoBloqueio, detalhe = ''): RespostaAcao {
      const limpo = limparDetalheBloqueio(detalhe);
      if (limpo.length > LIMITES.detalheBloqueioMax) {
        return { ok: false, mensagem: `O detalhe do bloqueio tem no máximo ${LIMITES.detalheBloqueioMax} caracteres.` };
      }
      return aplicar(id, (d) => travarDemanda(d, motivo, iso(), limpo), 'Demanda concluída não pode ser travada.');
    },
    destravar(id: string): RespostaAcao {
      return aplicar(id, (d) => destravarDemanda(d, iso()), '');
    },
    /** "Ainda travada": registra a reavaliação como ação relevante. */
    confirmarBloqueio(id: string): RespostaAcao {
      return aplicar(id, (d) => confirmarBloqueio(d, iso()), '');
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
    /** Grava os feriados locais (validados antes; a tela confirma a remoção). */
    definirFeriados(c: ConfiguracaoFeriados): RespostaAcao {
      const valida = validarFeriados(c);
      if (!valida) return { ok: false, mensagem: 'Feriados inválidos; nada foi gravado.' };
      try {
        armazenamento.setItem(CHAVE_FERIADOS, JSON.stringify(valida));
      } catch {
        return { ok: false, mensagem: 'O navegador recusou a gravação.' };
      }
      estado = { ...estado, feriados: valida, feriadosIlegiveis: false };
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
        const revertido = reverter(chaves, antes);
        semPersistencia = true;
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
      // Mesmo padrão do importar: fotografa as chaves e reverte se uma gravação falhar no meio.
      const chaves = [CHAVE_DEMANDAS_ARMAZEM, CHAVE_CONFIGURACAO, CHAVE_BACKUP];
      let antes: (string | null)[];
      try {
        antes = chaves.map((k) => armazenamento.getItem(k));
      } catch {
        // Mesmo tratamento de gravar(): liga o aviso sem trocar os dados em memória.
        semPersistencia = true;
        estado = { ...estado, avisoPersistencia: AVISO_SEM_GRAVACAO };
        ouvintes.forEach((o) => o());
        return { ok: false, mensagem: 'O navegador não permitiu ler os dados atuais; nada foi alterado.' };
      }
      const bruto = antes[2];
      if (bruto === null) return { ok: false, mensagem: 'Não há backup de importação.' };
      const avaliacao = avaliarBackup(bruto);
      if (avaliacao.tipo === 'estrutura') return { ok: false, mensagem: 'Backup ilegível; nada foi alterado.' };
      // O backup fica guardado para não perder o conteúdo.
      if (avaliacao.tipo === 'demandas') {
        return {
          ok: false,
          mensagem: 'O backup contém demandas ilegíveis (já estavam corrompidas antes da importação ou foram alteradas); nada foi alterado e o backup foi mantido.',
        };
      }
      const b = avaliacao.b;
      try {
        if (b.conteudo === null) armazenamento.removeItem(CHAVE_DEMANDAS_ARMAZEM);
        else armazenamento.setItem(CHAVE_DEMANDAS_ARMAZEM, b.conteudo);
        armazenamento.setItem(CHAVE_CONFIGURACAO, JSON.stringify({ diasInatividade: b.diasInatividade }));
        armazenamento.removeItem(CHAVE_BACKUP);
      } catch {
        const revertido = reverter(chaves, antes);
        semPersistencia = true;
        carregar();
        ouvintes.forEach((o) => o());
        return {
          ok: false,
          mensagem: revertido
            ? 'O navegador recusou a gravação; o desfazer foi cancelado e os dados importados foram mantidos.'
            : 'O navegador recusou a gravação e não foi possível reverter tudo; confira os dados antes de continuar.',
        };
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
      semPersistencia = true;
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

/** Ajuste de feriados para as contas de dias úteis (feriados locais gravados neste navegador). */
export function useAjusteFeriados(agora: Date): AjusteFeriados {
  const { feriados } = useEstadoDemandas();
  const ano = agora.getFullYear();
  return useMemo(() => paraAjuste(feriados, ano), [feriados, ano]);
}
