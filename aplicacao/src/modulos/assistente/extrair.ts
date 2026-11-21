// Extração de dados de uma frase do assistente (21/11/2026): funções puras, sem IA e sem estado.
// Hoje só reconhece o código de demanda fictícia (DEM-FIC-nnnn), em qualquer parte da frase.

import { palavras } from './normalizar.ts';

/** DEM-FIC-0001, dem-fic-1, "dem fic 3" ou "demfic0003": letras sem distinção de maiúsculas. */
const PADRAO_ID = /(?<![a-z0-9])dem[\s_-]*fic[\s_-]*(\d{1,4})(?![a-z0-9])/gi;

/** Códigos de demanda citados na frase, no formato exato DEM-FIC-nnnn, na ordem e sem repetir. */
export function extrairIds(texto: string): string[] {
  const ids: string[] = [];
  for (const m of texto.matchAll(PADRAO_ID)) {
    const id = `DEM-FIC-${m[1].padStart(4, '0')}`;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

// ---------- "Quando" de um lembrete ----------


export type Quando = { ate: Date } | { motivo: 'sem-horario' | 'passado' };

const HORA_PADRAO = 8;
const MAXIMO_DE_HORAS = 168; // "em N horas": até uma semana
/** Índice de Date#getDay() de cada dia da semana útil, já normalizado (sem acento). */
const DIAS_UTEIS: Record<string, number> = { segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5 };

/** "14h" ou "14h30" → [14, 30]; qualquer outra coisa, null. */
function lerHora(palavra: string | undefined): [number, number] | null {
  const m = palavra?.match(/^(\d{1,2})h(\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  return h < 24 && min < 60 ? [h, min] : null;
}

/**
 * Quando a pessoa quer ser lembrada, lido da frase. Regras fixas:
 *   "em N horas" / "em uma hora"  → agora + N horas (até 168);
 *   "amanhã"                       → amanhã às 8h;
 *   "segunda" … "sexta"            → a PRÓXIMA ocorrência, às 8h (dito numa segunda, "segunda" é a da semana que vem);
 *   "hoje às 14h"                  → hoje, só se o horário ainda não passou;
 *   "14h" sozinho                  → a próxima 14h (hoje se ainda não passou, senão amanhã);
 *   "às 14h" depois do dia         → troca as 8h pelo horário dito ("segunda às 14h", "amanhã às 9h30").
 * Sem nenhum desses, devolve 'sem-horario' (o assistente pergunta); horário de hoje já passado, 'passado'.
 */
export function extrairQuando(texto: string, agora: Date): Quando {
  const ps = palavras(texto);
  const hora = ps.map(lerHora).find((h) => h !== null) ?? null;
  const em = ps.indexOf('em');
  if (em >= 0) {
    const n = ps[em + 1] === 'uma' ? 1 : Number(ps[em + 1]);
    if (Number.isInteger(n) && n >= 1 && n <= MAXIMO_DE_HORAS && ['hora', 'horas'].includes(ps[em + 2])) {
      return { ate: new Date(agora.getTime() + n * 3_600_000) };
    }
  }
  const [h, min] = hora ?? [HORA_PADRAO, 0];
  const no = (dias: number) => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + dias, h, min, 0, 0);
  if (ps.includes('amanha')) return { ate: no(1) };
  const dia = ps.find((p) => p in DIAS_UTEIS);
  if (dia) return { ate: no(((DIAS_UTEIS[dia] - agora.getDay() + 7) % 7) || 7) };
  if (ps.includes('hoje') && hora) {
    const hoje = no(0);
    return hoje > agora ? { ate: hoje } : { motivo: 'passado' };
  }
  if (hora) {
    const hoje = no(0);
    return { ate: hoje > agora ? hoje : no(1) };
  }
  return { motivo: 'sem-horario' };
}
