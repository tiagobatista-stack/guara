// Providências sugeridas na Inspeção de agrotóxicos: lembretes de PROCEDIMENTO, em dados, sobre as respostas. Sem base legal: enquadramento e multa
// vêm do SIGA Autuação; o GUARÁ não guarda nem sugere norma, artigo ou valor. O fiscal marca o desfecho e decide. Novas regras entram em REGRAS.

import type { Ponto } from './modelo.ts';
import { marcadas, respondido, type Caracterizacao } from './pop-supressao.ts';

export type EstadoProvidencia = 'feito' | 'autuado' | 'nao-autuado' | 'nao-aplicavel';
export type DocumentoLavrado = 'auto' | 'notificacao' | 'embargo';
export const DOCUMENTOS_LAVRADOS: readonly DocumentoLavrado[] = ['auto', 'notificacao', 'embargo'];

const ROTULO_ESTADO: Record<EstadoProvidencia, string> = { feito: 'Feito', autuado: 'Autuado', 'nao-autuado': 'Não autuado', 'nao-aplicavel': 'Não aplicável' };
export interface Providencia { id: string; texto: string; motivo: string; estados: { valor: EstadoProvidencia; rotulo: string }[] }
interface Regra {
  quando: (r: (id: string) => string) => string | null;
  id: string;
  texto: string;
  estados: EstadoProvidencia[];
  /** Só este desfecho exige o n.º do documento lavrado; sem número, o relatório traz [PENDENTE]. Os outros desfechos não geram frase nem pendente. */
  exige: { estado: EstadoProvidencia; documento: DocumentoLavrado };
}

const REGRAS: readonly Regra[] = [
  {
    id: 'ctf-notificacao', texto: 'Notificar para apresentação do certificado de regularidade do CTF (prazo 24 h), antes da autuação.',
    quando: (r) => (r('C-2.2') === 'Sim' && r('C-2.2.3') === 'Não' ? 'CTF: inscrito, sem Certificado de Regularidade atualizado (C-2.2.3 = Não)' : null),
    estados: ['feito', 'nao-aplicavel'], exige: { estado: 'feito', documento: 'notificacao' },
  },
  {
    id: 'ctf-auto', texto: 'Avaliar autuação no SIGA Autuação.',
    quando: (r) => (r('C-2.2') === 'Não' ? 'CTF: sem inscrição (C-2.2 = Não)' : null),
    estados: ['autuado', 'nao-autuado', 'nao-aplicavel'], exige: { estado: 'autuado', documento: 'auto' },
  },
];

export const IDS_PROVIDENCIA = new Set(REGRAS.map((r) => r.id));
/** Para o relatório: por providência, o desfecho que exige número e de qual documento. */
export const EXIGENCIA_DA_PROVIDENCIA: Record<string, { estado: EstadoProvidencia; documento: DocumentoLavrado }> = Object.fromEntries(REGRAS.map((r) => [r.id, r.exige]));

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

export const MAX_NUMEROS_POR_DOCUMENTO = 20;
/** Documentos lavrados no ponto: por tipo, um ou mais números (texto curto; sem enquadramento). */
export const lavradosValidos = (x: unknown): boolean =>
  typeof x === 'object' && x !== null && !Array.isArray(x)
  && Object.entries(x).every(([k, v]) => (DOCUMENTOS_LAVRADOS as readonly string[]).includes(k) && Array.isArray(v) && v.length >= 1 && v.length <= MAX_NUMEROS_POR_DOCUMENTO
    && v.every((n) => typeof n === 'string' && n.trim() !== '' && n.length <= 50));

/** "123/2026; 124/2026, 125" → ['123/2026', '124/2026', '125'] (sem repetidos e sem vazios). */
export const numerosDoTexto = (t: string): string[] => [...new Set(t.split(/[;,\n]/).map((n) => n.trim()).filter(Boolean))];
