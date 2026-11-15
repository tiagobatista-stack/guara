// Vistoria da demanda de campo (pedido do responsável, 15/11/2026): a data em que a equipe vai ao local,
// ou "em aberto" quando a demanda ainda não foi encaixada numa vistoria. Serve ao calendário e ao mapa, que virão depois.
// Regra pura. Demanda de campo antiga, sem o campo, aparece como "não informada" (sem migração).

import type { Demanda } from './modelo.ts';

/** 'agendada' tem data; 'aberta' foi marcada como em aberto; 'nao-informada' = demanda de campo sem o campo. */
export type SituacaoVistoria = 'agendada' | 'aberta' | 'nao-informada';

/** Só a demanda de campo tem vistoria: as outras devolvem null. */
export function situacaoVistoria(d: Pick<Demanda, 'tipo' | 'vistoria'>): SituacaoVistoria | null {
  if (d.tipo !== 'campo') return null;
  if (!d.vistoria) return 'nao-informada';
  return d.vistoria.data ? 'agendada' : 'aberta';
}

/** Demandas de campo não concluídas que ainda não têm data de vistoria, da criada há mais tempo para a mais nova. */
export function listarSemVistoria<T extends Pick<Demanda, 'tipo' | 'vistoria' | 'status' | 'criadaEm'>>(demandas: readonly T[]): T[] {
  return demandas
    .filter((d) => d.status !== 'Concluída' && (situacaoVistoria(d) === 'aberta' || situacaoVistoria(d) === 'nao-informada'))
    .sort((a, b) => Date.parse(a.criadaEm) - Date.parse(b.criadaEm));
}

/** "Vistoria em 12/12/2026", "Vistoria em aberto" ou "Vistoria não informada"; null fora do campo. */
export function textoVistoria(d: Pick<Demanda, 'tipo' | 'vistoria'>): string | null {
  const s = situacaoVistoria(d);
  if (!s) return null;
  if (s === 'agendada') {
    const [a, m, dia] = d.vistoria!.data!.split('-');
    return `${dia}/${m}/${a}`;
  }
  return s === 'aberta' ? 'em aberto' : 'não informada';
}
