// Lembretes do assistente: o que a pessoa fez com cada aviso (ciente ou adiado), em `guara:avisos:v1`.
// Decisão do responsável (14/11/2026): "ciente" apaga só o aviso no assistente, não a necessidade
// de lembrar; o aviso volta quando a demanda muda de situação (status ou tipo do aviso). "Adiar"
// esconde só o lembrete por 2 horas ou até as 8h ou 14h seguintes. "Não mostrar para esta demanda" (passo 5)
// silencia o aviso até a pessoa pedir para mostrar de novo, mesmo que a situação mude. Dashboard,
// Alertas e a fila do dia seguem mostrando tudo.
// Mesmo desenho das preferências do mascote: localStorage com validação e memória quando bloqueado.

import { useSyncExternalStore } from 'react';
import type { Aviso } from './avisos.ts';
import { dataLocal, ehDiaUtil, feriadosEntre, type AjusteFeriados } from '../alertas/dias-uteis.ts';

export const CHAVE_LEMBRETES = 'guara:avisos:v1';
/** Horas do dia em que um lembrete adiado volta. */
export const HORAS_DE_RETORNO = [8, 14] as const;
/** Adiamento curto, em horas a partir de agora. */
export const HORAS_DO_ADIAMENTO_CURTO = 2;
const MAXIMO_DE_REGISTROS = 5000;

export interface Lembrete {
  /** Situação da demanda quando a pessoa decidiu: tipo do aviso e status. Mudou, o aviso volta. */
  situacao: string;
  /** Quando foi marcado ciente (ISO). */
  cienteEm?: string;
  /** Até quando o lembrete fica adiado (ISO). */
  adiadoAte?: string;
  /** "Não mostrar para esta demanda": vale até "Mostrar de novo", em qualquer situação. */
  silenciada?: true;
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
    if (b.silenciada === true) l.silenciada = true;
    if (dataValida(b.cienteEm)) l.cienteEm = b.cienteEm;
    if (dataValida(b.adiadoAte)) l.adiadoAte = b.adiadoAte;
    if (l.cienteEm || l.adiadoAte || l.silenciada) saida[id] = l;
  }
  return saida;
}

export type MotivoOculto = 'ciente' | 'adiado' | 'silenciado';

/** Avisos que o assistente mostra agora e os que estão escondidos por decisão da pessoa. */
export function separarAvisos(avisos: readonly Aviso[], lembretes: Lembretes, agora: Date) {
  const visiveis: Aviso[] = [];
  const ocultos: { aviso: Aviso; motivo: MotivoOculto; ate?: Date }[] = [];
  for (const aviso of avisos) {
    const l = lembretes[aviso.id];
    if (l?.silenciada) {
      ocultos.push({ aviso, motivo: 'silenciado' });
    } else if (!l || l.situacao !== aviso.situacao) {
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

/**
 * Próximas ocasiões de retorno (8h e 14h), a partir de agora, uma por hora configurada, em ordem.
 * Pula sábado, domingo e feriado (nacionais e locais), como os prazos em dias úteis.
 */
export function opcoesDeAdiamento(agora: Date, ajuste: AjusteFeriados = {}): { ate: Date; rotulo: string }[] {
  const inicio = dataLocal(agora);
  const limite = new Date(agora);
  limite.setDate(limite.getDate() + 30);
  const feriados = feriadosEntre(inicio, dataLocal(limite), ajuste);
  const opcoes: { ate: Date; rotulo: string }[] = [];
  const emDuasHoras = new Date(agora.getTime() + HORAS_DO_ADIAMENTO_CURTO * 3_600_000);
  for (const hora of HORAS_DE_RETORNO) {
    const ate = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), hora, 0, 0, 0);
    if (ate <= agora) ate.setDate(ate.getDate() + 1);
    while (!ehDiaUtil(dataLocal(ate), feriados)) ate.setDate(ate.getDate() + 1);
    opcoes.push({ ate, rotulo: `${diaDoRetorno(ate, agora)} às ${hora}h` });
  }
  // O adiamento curto vem primeiro: "Em 2 horas" não depende de dia útil nem de horário.
  return [{ ate: emDuasHoras, rotulo: `Em ${HORAS_DO_ADIAMENTO_CURTO} horas` }, ...opcoes.sort((a, b) => a.ate.getTime() - b.ate.getTime())];
}

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "Hoje", "Amanhã", "Segunda" (até 6 dias) ou a data. */
function diaDoRetorno(ate: Date, agora: Date): string {
  const dias = Math.round((Date.UTC(ate.getFullYear(), ate.getMonth(), ate.getDate()) - Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())) / 86_400_000);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  if (dias < 7) return DIAS_DA_SEMANA[ate.getDay()][0].toUpperCase() + DIAS_DA_SEMANA[ate.getDay()].slice(1);
  return ate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** "hoje às 14h", "amanhã às 8h", "segunda às 8h" ou "17/11 às 8h". */
export function textoDoRetorno(ate: Date, agora: Date): string {
  const dia = diaDoRetorno(ate, agora);
  return `${dia[0].toLowerCase()}${dia.slice(1)} às ${ate.getHours()}h`;
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

/** "Não mostrar para esta demanda": o aviso some do assistente até "Mostrar de novo". */
export function silenciarDemanda(aviso: Aviso, agora: Date) {
  gravar({ ...obterLembretes(), [aviso.id]: { situacao: aviso.situacao, cienteEm: agora.toISOString(), silenciada: true } });
}

/** Desfaz ciente, adiamento ou silêncio: o aviso volta a aparecer. */
export function mostrarDeNovo(id: string) {
  const { [id]: _removido, ...resto } = obterLembretes();
  gravar(resto);
}

/** Tira registros de demandas que não geram mais aviso (concluídas ou excluídas), para o armazém não crescer. */
export function limparLembretesSemAviso(avisos: readonly Aviso[]) {
  const ids = new Set(avisos.map((a) => a.id));
  const atuais = obterLembretes();
  // A demanda silenciada guarda o registro mesmo sem aviso hoje: o silêncio vale até a pessoa desfazer.
  const restantes = Object.fromEntries(Object.entries(atuais).filter(([id, l]) => ids.has(id) || l.silenciada));
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
