// Providências sugeridas na Inspeção de agrotóxicos: regras sobre as respostas, em dados. Hoje só a do CTF; novas regras entram na lista REGRAS.
// É sugestão: o fiscal marca "feito" ou "não aplicável" e decide. O sistema não lavra nada e não calcula multa (a faixa legal é só referência).

import type { Ponto } from './modelo.ts';
import { marcadas, respondido, type Caracterizacao } from './pop-supressao.ts';

export type EstadoProvidencia = 'feito' | 'nao-aplicavel';
export const ESTADOS_PROVIDENCIA: readonly EstadoProvidencia[] = ['feito', 'nao-aplicavel'];

export interface Providencia {
  id: string;
  tipo: 'Notificação' | 'Auto de infração';
  prazo?: string;
  /** Texto da descrição a lavrar, como no questionário. */
  descricao: string;
  /** Por que foi sugerida (resposta que a disparou). */
  motivo: string;
  /** Id em referencia-legal.ts. */
  norma: string;
}
interface Regra { quando: (r: (id: string) => string) => string | null; providencia: Omit<Providencia, 'motivo'> }

const REGRAS: readonly Regra[] = [
  {
    // C-2.2 = Não (sem inscrição) ou C-2.2.3 = Não (sem certificado atualizado): notificação prévia de 24 h.
    quando: (r) => (r('C-2.2') === 'Não' ? 'CTF: sem inscrição (C-2.2 = Não)' : r('C-2.2.3') === 'Não' ? 'CTF: sem Certificado de Regularidade atualizado (C-2.2.3 = Não)' : null),
    providencia: { id: 'ctf-notificacao', tipo: 'Notificação', prazo: '24 horas', descricao: 'Apresentar Certificado de Regularidade do Cadastro Técnico Federal, de que trata o art. 17 da Lei nº 6.938/1981.', norma: 'lei-6938-art-17' },
  },
  {
    // Só se não está inscrito: auto de infração (o código da atividade o fiscal preenche).
    quando: (r) => (r('C-2.2') === 'Não' ? 'CTF: sem inscrição (C-2.2 = Não)' : null),
    providencia: { id: 'ctf-auto', tipo: 'Auto de infração', descricao: 'Deixar de se inscrever no Cadastro Técnico Federal de que trata o art. 17 da Lei nº 6.938/1981 – atividade código ___.', norma: 'decreto-6514-art-76' },
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

export const providenciasValidas = (x: unknown): boolean =>
  typeof x === 'object' && x !== null && !Array.isArray(x) && Object.entries(x).every(([id, v]) => IDS_PROVIDENCIA.has(id) && ESTADOS_PROVIDENCIA.includes(v as EstadoProvidencia));
