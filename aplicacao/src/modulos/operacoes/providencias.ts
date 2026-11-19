// Providências sugeridas na Inspeção de agrotóxicos: lembretes de PROCEDIMENTO, em dados, sobre as respostas. Sem base legal: enquadramento e multa
// vêm do SIGA Autuação; o GUARÁ não guarda nem sugere norma, artigo ou valor. O fiscal marca o desfecho e decide. Novas regras entram em REGRAS.

import type { Ponto } from './modelo.ts';
import { marcadas, respondido, type Caracterizacao } from './pop-supressao.ts';
import { MAX_LAVRADOS, NOMES_LAVRADOS } from './tipos-lavrados.ts';

export type EstadoProvidencia = 'feito' | 'autuado' | 'nao-autuado' | 'nao-aplicavel';

const ROTULO_ESTADO: Record<EstadoProvidencia, string> = { feito: 'Feito', autuado: 'Autuado', 'nao-autuado': 'Não autuado', 'nao-aplicavel': 'Não aplicável' };
export interface Providencia { id: string; texto: string; motivo: string; estados: { valor: EstadoProvidencia; rotulo: string }[] }
interface Regra {
  quando: (r: (id: string) => string) => string | null;
  id: string;
  texto: string;
  estados: EstadoProvidencia[];
  /** Só este desfecho exige o n.º do documento lavrado; sem número, o relatório traz [PENDENTE]. Os outros desfechos não geram frase nem pendente. */
  exige: { estado: EstadoProvidencia; tipo: string };
}

const REGRAS: readonly Regra[] = [
  {
    id: 'ctf-notificacao', texto: 'Notificar para apresentação do certificado de regularidade do CTF (prazo 24 h), antes da autuação.',
    quando: (r) => (r('C-2.2') === 'Sim' && r('C-2.2.3') === 'Não' ? 'CTF: inscrito, sem Certificado de Regularidade atualizado (C-2.2.3 = Não)' : null),
    estados: ['feito', 'nao-aplicavel'], exige: { estado: 'feito', tipo: 'Notificação' },
  },
  {
    id: 'ctf-auto', texto: 'Avaliar autuação no SIGA Autuação.',
    quando: (r) => (r('C-2.2') === 'Não' ? 'CTF: sem inscrição (C-2.2 = Não)' : null),
    estados: ['autuado', 'nao-autuado', 'nao-aplicavel'], exige: { estado: 'autuado', tipo: 'Auto de infração' },
  },
];

export const IDS_PROVIDENCIA = new Set(REGRAS.map((r) => r.id));
/** Para o relatório: por providência, o desfecho que exige número e de qual documento. */
export const EXIGENCIA_DA_PROVIDENCIA: Record<string, { estado: EstadoProvidencia; tipo: string }> = Object.fromEntries(REGRAS.map((r) => [r.id, r.exige]));

/** Providências sugeridas pelas respostas do ponto (campo prevalece sobre a conferência prévia). */
export function providenciasSugeridas(p: Pick<Ponto, 'inspecao' | 'conferenciaPrevia'>): Providencia[] {
  const ef: Caracterizacao = { ...(p.conferenciaPrevia ?? {}) };
  for (const [id, r] of Object.entries(p.inspecao ?? {})) if (respondido(r)) ef[id] = r;
  const r = (id: string) => marcadas(ef[id])[0] ?? '';
  return REGRAS.flatMap((x) => { const motivo = x.quando(r); return motivo ? [{ id: x.id, texto: x.texto, motivo, estados: x.estados.map((valor) => ({ valor, rotulo: ROTULO_ESTADO[valor] })) }] : []; });
}

export const providenciasValidas = (x: unknown): boolean =>
  typeof x === 'object' && x !== null && !Array.isArray(x)
  && Object.entries(x).every(([id, v]) => REGRAS.some((r) => r.id === id && r.estados.includes(v as EstadoProvidencia)));

/** Documentos lavrados no ponto: lista de {tipo (lista fechada), número, data opcional}; sem enquadramento. */
export const lavradosValidos = (x: unknown): boolean =>
  Array.isArray(x) && x.length >= 1 && x.length <= MAX_LAVRADOS && x.every((d) =>
    typeof d === 'object' && d !== null && !Array.isArray(d)
    && Object.keys(d).every((k) => k === 'tipo' || k === 'numero' || k === 'data')
    && NOMES_LAVRADOS.includes((d as Record<string, unknown>).tipo as string)
    && typeof (d as Record<string, unknown>).numero === 'string' && ((d as Record<string, string>).numero.trim() !== '') && (d as Record<string, string>).numero.length <= 50
    && (((d as Record<string, unknown>).data) === undefined || (typeof (d as Record<string, unknown>).data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test((d as Record<string, string>).data) && !Number.isNaN(Date.parse((d as Record<string, string>).data)))));

const TIPOS_DO_FORMATO_ANTIGO: [string, string][] = [['notificacao', 'Notificação'], ['auto', 'Auto de infração'], ['embargo', 'Termo de embargo / Interdição']];

/**
 * Formato antigo ({notificacao?, auto?, embargo?}: um número ou uma lista de números por tipo) -> lista nova, com data vazia.
 * Devolve o valor como veio se não for esse formato ou se algo estiver ilegível (aí vai para a quarentena); undefined se não havia número algum.
 */
export function migrarLavrados(x: unknown): unknown {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return x;
  const o = x as Record<string, unknown>;
  if (!Object.keys(o).every((k) => TIPOS_DO_FORMATO_ANTIGO.some(([c]) => c === k))) return x;
  const lista: { tipo: string; numero: string }[] = [];
  for (const [chave, tipo] of TIPOS_DO_FORMATO_ANTIGO) {
    const v = o[chave];
    if (v === undefined) continue;
    const numeros = Array.isArray(v) ? v : [v];
    if (!numeros.every((n) => typeof n === 'string')) return x;
    for (const n of numeros as string[]) if (n.trim() !== '') lista.push({ tipo, numero: n.trim() });
  }
  return lista.length ? lista : undefined;
}
