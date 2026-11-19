// Providências sugeridas na Inspeção de agrotóxicos: lembretes de PROCEDIMENTO, em dados, sobre as respostas. Sem base legal: enquadramento e multa
// vêm do SIGA Autuação; o GUARÁ não guarda nem sugere norma, artigo ou valor. O fiscal marca "feito" ou "não aplicável" e decide.
// Novas regras entram na lista REGRAS.

import type { Ponto } from './modelo.ts';
import { marcadas, respondido, type Caracterizacao } from './pop-supressao.ts';

export type EstadoProvidencia = 'feito' | 'nao-aplicavel';
export const ESTADOS_PROVIDENCIA: readonly EstadoProvidencia[] = ['feito', 'nao-aplicavel'];

/** Documento que a providência pode gerar; o número lavrado fica em `Ponto.lavrados`. */
export type DocumentoLavrado = 'notificacao' | 'auto';
export interface Providencia { id: string; texto: string; motivo: string; documento: DocumentoLavrado }
interface Regra { quando: (r: (id: string) => string) => string | null; providencia: Omit<Providencia, 'motivo'> }

const REGRAS: readonly Regra[] = [
  {
    quando: (r) => (r('C-2.2') === 'Sim' && r('C-2.2.3') === 'Não' ? 'CTF: inscrito, sem Certificado de Regularidade atualizado (C-2.2.3 = Não)' : null),
    providencia: { id: 'ctf-notificacao', texto: 'Notificar para apresentação do certificado de regularidade do CTF (prazo 24 h), antes da autuação.', documento: 'notificacao' },
  },
  {
    quando: (r) => (r('C-2.2') === 'Não' ? 'CTF: sem inscrição (C-2.2 = Não)' : null),
    providencia: { id: 'ctf-auto', texto: 'Avaliar autuação no SIGA Autuação.', documento: 'auto' },
  },
];

export const IDS_PROVIDENCIA = new Set(REGRAS.map((r) => r.providencia.id));

/** Providências sugeridas pelas respostas do ponto (campo prevalece sobre a conferência prévia). */
export function providenciasSugeridas(p: Pick<Ponto, 'inspecao' | 'conferenciaPrevia'>): Providencia[] {
  const ef: Caracterizacao = { ...(p.conferenciaPrevia ?? {}) };
  for (const [id, r] of Object.entries(p.inspecao ?? {})) if (respondido(r)) ef[id] = r;
  const r = (id: string) => marcadas(ef[id])[0] ?? '';
  return REGRAS.flatMap((x) => { const motivo = x.quando(r); return motivo ? [{ ...x.providencia, motivo }] : []; });
}

/** Documento ligado a cada providência (mesmo sem a regra disparar agora), para o relatório conferir o número. */
export const DOCUMENTO_DA_PROVIDENCIA: Record<string, DocumentoLavrado> = Object.fromEntries(REGRAS.map((r) => [r.providencia.id, r.providencia.documento]));

export const providenciasValidas = (x: unknown): boolean =>
  typeof x === 'object' && x !== null && !Array.isArray(x) && Object.entries(x).every(([id, v]) => IDS_PROVIDENCIA.has(id) && ESTADOS_PROVIDENCIA.includes(v as EstadoProvidencia));

/** Números dos documentos lavrados (texto livre curto; sem enquadramento). */
export const lavradosValidos = (x: unknown): boolean =>
  typeof x === 'object' && x !== null && !Array.isArray(x)
  && Object.entries(x).every(([k, v]) => (k === 'notificacao' || k === 'auto') && typeof v === 'string' && v.length <= 100);
