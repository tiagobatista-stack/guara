// Vistoria da demanda de campo (pedido do responsável, 15/11/2026): a data em que a equipe vai ao local,
// ou "em aberto" quando a demanda ainda não foi encaixada numa vistoria. Serve ao calendário e ao mapa, que virão depois.
// Regra pura. Demanda de campo antiga, sem o campo, aparece como "não informada" (sem migração).
// Encaixada numa operação (ponto ligado, operacoes/regras.ts) também conta como encaixada: a vistoria acontece
// no período da operação, e a data específica é a do relatório, registrada depois.

import type { Demanda } from './modelo.ts';

/**
 * 'agendada' tem data; 'em-operacao' está ligada a um ponto de operação (sem data específica ainda);
 * 'aberta' foi marcada como em aberto; 'nao-informada' = demanda de campo sem o campo.
 */
export type SituacaoVistoria = 'agendada' | 'em-operacao' | 'aberta' | 'nao-informada';

type DadosVistoria = Pick<Demanda, 'id' | 'tipo' | 'vistoria'>;

/** Só a demanda de campo tem vistoria: as outras devolvem null. `encaixadas` são os ids ligados a pontos de operação. */
export function situacaoVistoria(d: DadosVistoria, encaixadas?: ReadonlySet<string>): SituacaoVistoria | null {
  if (d.tipo !== 'campo') return null;
  if (d.vistoria?.data) return 'agendada';
  if (encaixadas?.has(d.id)) return 'em-operacao';
  return d.vistoria ? 'aberta' : 'nao-informada';
}

/** Demandas de campo não concluídas que ainda não foram encaixadas (sem data e sem operação), da criada há mais tempo para a mais nova. */
export function listarSemVistoria<T extends DadosVistoria & Pick<Demanda, 'status' | 'criadaEm'>>(
  demandas: readonly T[],
  encaixadas?: ReadonlySet<string>,
): T[] {
  return demandas
    .filter((d) => {
      const s = situacaoVistoria(d, encaixadas);
      return d.status !== 'Concluída' && (s === 'aberta' || s === 'nao-informada');
    })
    .sort((a, b) => Date.parse(a.criadaEm) - Date.parse(b.criadaEm));
}

/** "12/12/2026", "em operação", "em aberto" ou "não informada"; null fora do campo. */
export function textoVistoria(d: DadosVistoria, encaixadas?: ReadonlySet<string>): string | null {
  const s = situacaoVistoria(d, encaixadas);
  if (!s) return null;
  if (s === 'agendada') {
    const [a, m, dia] = d.vistoria!.data!.split('-');
    return `${dia}/${m}/${a}`;
  }
  return s === 'em-operacao' ? 'em operação (data a registrar)' : s === 'aberta' ? 'em aberto' : 'não informada';
}
