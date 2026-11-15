// Lembretes do assistente: o que a pessoa fez com cada aviso (ciente ou adiado), em `guara:avisos:v1`.
// Decisão do responsável (14/11/2026): "ciente" apaga só o aviso no assistente, não a necessidade
// de lembrar; o aviso volta quando a demanda muda de situação (status ou tipo do aviso). "Adiar"
// esconde só o lembrete até as 8h ou as 14h seguintes. Dashboard e Alertas seguem mostrando tudo.
// Mesmo desenho das preferências do mascote: localStorage com validação e memória quando bloqueado.

import { useSyncExternalStore } from 'react';
import type { Aviso } from './avisos.ts';

export const CHAVE_LEMBRETES = 'guara:avisos:v1';
/** Horas do dia em que um lembrete adiado volta. */
export const HORAS_DE_RETORNO = [8, 14] as const;
const MAXIMO_DE_REGISTROS = 5000;

export interface Lembrete {
  /** Situação da demanda quando a pessoa decidiu: tipo do aviso e status. Mudou, o aviso volta. */
  situacao: string;
  /** Quando foi marcado ciente (ISO). */
  cienteEm?: string;
  /** Até quando o lembrete fica adiado (ISO). */
  adiadoAte?: string;
}

export type Lembretes = Record<string, Lembrete>;

const dataValida = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));

export function validarLembretes(x: unknown): Lembretes {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return {};
  const saida: Lembretes = {};
  for (const [id, bruto] of Object.entries(x as Record<string, unknown>).slice(0, MAXIMO_DE_REGISTROS)) {
    if (typeof bruto !== 'object' || bruto === null) continue;
    const b = bruto as Record<string, unknown>;
    if (typeof b.situacao !== 'string' || !b.situacao) continue;
    const l: Lembrete = { situacao: b.situacao };
    if (dataValida(b.cienteEm)) l.cienteEm = b.cienteEm;
    if (dataValida(b.adiadoAte)) l.adiadoAte = b.adiadoAte;
    if (l.cienteEm || l.adiadoAte) saida[id] = l;
  }
  return saida;
}

export type MotivoOculto = 'ciente' | 'adiado';

/** Avisos que o assistente mostra agora e os que estão escondidos por decisão da pessoa. */
export function separarAvisos(avisos: readonly Aviso[], lembretes: Lembretes, agora: Date) {
  const visiveis: Aviso[] = [];
  const ocultos: { aviso: Aviso; motivo: MotivoOculto; ate?: Date }[] = [];
  for (const aviso of avisos) {
    const l = lembretes[aviso.id];
    if (!l || l.situacao !== aviso.situacao) {
      visiveis.push(aviso);
    } else if (l.adiadoAte && new Date(l.adiadoAte) > agora) {
      ocultos.push({ aviso, motivo: 'adiado', ate: new Date(l.adiadoAte) });
    } else if (l.cienteEm) {
      ocultos.push({ aviso, motivo: 'ciente' });
    } else {
      visiveis.push(aviso); // adiamento vencido sem ciente: o lembrete voltou
    }
  }
  return { visiveis, ocultos };
}

/** Próximas ocasiões de retorno (8h e 14h), a partir de agora, uma por hora configurada, em ordem. */
export function opcoesDeAdiamento(agora: Date): { ate: Date; rotulo: string }[] {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const opcoes: { ate: Date; rotulo: string }[] = [];
  for (const hora of HORAS_DE_RETORNO) {
    const ate = new Date(hoje);
    ate.setHours(hora, 0, 0, 0);
    if (ate <= agora) ate.setDate(ate.getDate() + 1);
    const dia = ate.getDate() === agora.getDate() && ate.getMonth() === agora.getMonth() ? 'Hoje' : 'Amanhã';
    opcoes.push({ ate, rotulo: `${dia} às ${hora}h` });
  }
  return opcoes.sort((a, b) => a.ate.getTime() - b.ate.getTime());
}

/** "hoje às 14h" ou "amanhã às 8h" ou "17/11 às 8h". */
export function textoDoRetorno(ate: Date, agora: Date): string {
  const mesmoDia = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  const hora = `${ate.getHours()}h`;
  if (mesmoDia(ate, agora)) return `hoje às ${hora}`;
  if (mesmoDia(ate, amanha)) return `amanhã às ${hora}`;
  return `${ate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
}

// ---------- Armazém ----------

const VAZIO: Lembretes = {};
const ouvintes = new Set<() => void>();
let brutoLido: string | null | undefined;
let atual: Lembretes = VAZIO;
let soNaMemoria = false;

function lerBruto(): string | null | undefined {
  try {
    return window.localStorage.getItem(CHAVE_LEMBRETES);
  } catch {
    return undefined;
  }
}

export function obterLembretes(): Lembretes {
  if (soNaMemoria) return atual;
  const bruto = lerBruto();
  if (bruto === undefined) {
    soNaMemoria = true;
    return atual;
  }
  if (bruto !== brutoLido) {
    brutoLido = bruto;
    try {
      atual = bruto === null ? VAZIO : validarLembretes(JSON.parse(bruto));
    } catch {
      atual = VAZIO;
    }
  }
  return atual;
}

function gravar(novo: Lembretes) {
  atual = novo;
  const bruto = JSON.stringify(novo);
  try {
    window.localStorage.setItem(CHAVE_LEMBRETES, bruto);
    brutoLido = bruto;
    soNaMemoria = false;
  } catch {
    soNaMemoria = true;
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Marca o aviso como ciente: some do assistente até a demanda mudar de situação. */
export function marcarCiente(aviso: Aviso, agora: Date) {
  gravar({ ...obterLembretes(), [aviso.id]: { situacao: aviso.situacao, cienteEm: agora.toISOString() } });
}

/** Adia o lembrete até a data dada; some do assistente até lá ou até a demanda mudar de situação. */
export function adiarLembrete(aviso: Aviso, ate: Date) {
  gravar({ ...obterLembretes(), [aviso.id]: { situacao: aviso.situacao, adiadoAte: ate.toISOString() } });
}

/** Desfaz ciente ou adiamento: o aviso volta a aparecer. */
export function mostrarDeNovo(id: string) {
  const { [id]: _removido, ...resto } = obterLembretes();
  gravar(resto);
}

/** Tira registros de demandas que não geram mais aviso (concluídas ou excluídas), para o armazém não crescer. */
export function limparLembretesSemAviso(avisos: readonly Aviso[]) {
  const ids = new Set(avisos.map((a) => a.id));
  const atuais = obterLembretes();
  const restantes = Object.fromEntries(Object.entries(atuais).filter(([id]) => ids.has(id)));
  if (Object.keys(restantes).length !== Object.keys(atuais).length) gravar(restantes);
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  window.addEventListener('storage', ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener('storage', ouvinte);
  };
}

export function useLembretes(): Lembretes {
  return useSyncExternalStore(assinar, obterLembretes);
}
