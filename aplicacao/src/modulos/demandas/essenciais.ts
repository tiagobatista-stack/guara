// Campos essenciais: o que falta preencher em cada demanda em aberto (ideia do TOCA, `perguntas.py`).
// Regra pura. A lista mostra só o NOME do campo que falta, nunca o conteúdo.
// - tarefa comum: prazo e responsável;
// - demanda (ou natureza não definida): natureza, tipo, prazo e responsável;
// - demanda: também o processo administrativo.
// Concluída não cobra nada.

import type { Demanda } from './modelo.ts';

export const CAMPOS_ESSENCIAIS = ['natureza', 'tipo', 'prazo', 'responsavel', 'processo', 'vistoria'] as const;
export type CampoEssencial = (typeof CAMPOS_ESSENCIAIS)[number];

export const ROTULOS_ESSENCIAL: Record<CampoEssencial, string> = {
  natureza: 'natureza',
  tipo: 'tipo',
  prazo: 'prazo',
  responsavel: 'responsável',
  processo: 'processo',
  vistoria: 'vistoria',
};

/** Os campos essenciais que valem para a demanda, na ordem de CAMPOS_ESSENCIAIS. A vistoria vale só para tipo campo. */
export function essenciaisAplicaveis(d: Pick<Demanda, 'natureza' | 'tipo'>): CampoEssencial[] {
  const base: CampoEssencial[] =
    d.natureza === 'comum' ? ['prazo', 'responsavel']
    : d.natureza === 'demanda' ? ['tipo', 'prazo', 'responsavel', 'processo']
    : ['natureza', 'tipo', 'prazo', 'responsavel'];
  return d.tipo === 'campo' ? [...base, 'vistoria'] : base;
}

const vazio = (v: unknown) => v === undefined || (typeof v === 'string' && v.trim() === '');

/** O que falta preencher; vazio quando está completa ou concluída. */
export function camposQueFaltam(d: Pick<Demanda, 'status' | CampoEssencial>): CampoEssencial[] {
  // "Em aberto" é uma resposta: só falta a vistoria quando o campo nunca foi informado.
  if (d.status === 'Concluída') return [];
  return essenciaisAplicaveis(d).filter((c) => vazio(d[c]));
}

/** "Falta: tipo, prazo." ou null. */
export function textoFalta(d: Pick<Demanda, 'status' | CampoEssencial>): string | null {
  const faltam = camposQueFaltam(d);
  return faltam.length ? `Falta: ${faltam.map((c) => ROTULOS_ESSENCIAL[c]).join(', ')}.` : null;
}
