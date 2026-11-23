// Estado visível dos formulários do ponto (POP e Inspeção): contagem N de M só com as perguntas aplicáveis, selo e texto exportável.
// "Completo com pendências" = tudo que não depende de condição está respondido, mas falta alguma subpergunta condicional exigida.

import type { Operacao, Ponto } from './modelo.ts';
import { BASES_CONSULTA } from './modelo.ts';
import { itensAplicaveis, marcadas, respondido, textoCaracterizacao, type Caracterizacao, type ItemPop } from './pop-supressao.ts';
import { ITENS_INSPECAO } from './inspecao-agrotoxicos.ts';
import { consultada, consultaDe, textoDoRelatorio } from './relatorio.ts';

export type Selo = 'nao-iniciado' | 'em-preenchimento' | 'completo' | 'completo-pendencias';
export interface EstadoFormulario { selo: Selo; n: number; m: number }
export const ROTULO_SELO: Record<Selo, string> = {
  'nao-iniciado': 'Não iniciado', 'em-preenchimento': 'Em preenchimento', completo: 'Completo', 'completo-pendencias': 'Completo com pendências ⚠',
};

function estado(aplicaveis: readonly ItemPop[], resp: Caracterizacao): EstadoFormulario {
  const exigidas = aplicaveis.filter((it) => !it.opcional);
  const n = exigidas.filter((it) => respondido(resp[it.id])).length;
  const m = exigidas.length;
  const faltam = exigidas.filter((it) => !respondido(resp[it.id]));
  const selo: Selo = n === 0 ? 'nao-iniciado' : faltam.length === 0 ? 'completo' : faltam.every((it) => it.se) ? 'completo-pendencias' : 'em-preenchimento';
  return { selo, n, m };
}

export const estadoPop = (p: Pick<Ponto, 'caracterizacao'>): EstadoFormulario => {
  const resp = p.caracterizacao ?? {};
  return estado(itensAplicaveis(resp), resp);
};

const doEmbargo = (id: string) => Number(/^C-2\.13\.(\d+)\./.exec(id)?.[1] ?? 0);
/** Prévia e campo juntos (campo prevalece); sem os "@fonte" e sem os pares de embargo além do último aberto (mínimo 1). */
export function estadoInspecao(p: Pick<Ponto, 'inspecao' | 'conferenciaPrevia'>): EstadoFormulario {
  const juntas: Caracterizacao = { ...(p.conferenciaPrevia ?? {}), ...(p.inspecao ?? {}) };
  const aberto = Math.max(1, ...Object.keys(p.inspecao ?? {}).filter((id) => respondido(p.inspecao![id])).map(doEmbargo));
  return estado(itensAplicaveis(juntas, ITENS_INSPECAO).filter((it) => !it.id.includes('@') && doEmbargo(it.id) <= aberto), juntas);
}

/** Texto das respostas da inspeção (prévia e campo), para exportar. Vazio se não houver resposta. */
export function textoInspecao(p: Pick<Ponto, 'inspecao' | 'conferenciaPrevia'>): string {
  const juntas: Caracterizacao = { ...(p.conferenciaPrevia ?? {}), ...(p.inspecao ?? {}) };
  const linhas = itensAplicaveis(juntas, ITENS_INSPECAO).filter((it) => !it.id.includes('@') && respondido(juntas[it.id])).map((it) => `${it.id}. ${it.texto}: ${marcadas(juntas[it.id]).join('; ')}`);
  return linhas.length ? ['Inspeção de agrotóxicos:', ...linhas].join('\n') : '';
}
export const textoPop = (p: Pick<Ponto, 'caracterizacao'>) => textoCaracterizacao(p.caracterizacao);

export function resumoConsultas(p: Ponto): { feitas: number; total: number; ultima?: string } {
  const cs = BASES_CONSULTA.map((b) => consultaDe(p, b)).filter(consultada);
  const ultima = cs.map((c) => c.quando).sort().at(-1);
  return { feitas: cs.length, total: BASES_CONSULTA.length, ...(ultima ? { ultima } : {}) };
}

/** O que sairá como marcador no relatório: [PENDENTE…] e [DIVERGÊNCIA…] do texto e as consultas não realizadas. */
export function resumoDoRelatorio(o: Operacao, p: Ponto): { pendencias: number; naoConsultadas: number } {
  const c = resumoConsultas(p);
  return { pendencias: (textoDoRelatorio(o, p, { completo: true }).match(/\[(PENDENTE|DIVERGÊNCIA)/g) ?? []).length, naoConsultadas: c.total - c.feitas };
}
