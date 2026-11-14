// Resumo da demanda para tela compartilhada ou projetor (ideia do TOCA, `resumo.py`).
// Montado por LISTA BRANCA: só os campos abaixo são lidos. Responsável e descrição (texto livre,
// pode ter nomes) nunca entram. SIMP e processo judicial entram só como "tem"/"não tem":
// o número pode estar sob sigilo.

import type { Demanda } from './modelo.ts';
import { ROTULOS_NATUREZA, ROTULOS_TIPO } from './classificacao.ts';
import { situacaoDaDemanda } from '../alertas/dias-uteis.ts';
import { textoBloqueio } from '../alertas/bloqueio.ts';
import { textoEmAndamento } from '../alertas/inatividade.ts';

export interface Resumo {
  id: string;
  titulo: string;
  linhas: [rotulo: string, valor: string][];
}

/** Os ÚNICOS campos da demanda que o resumo lê. */
export const CAMPOS_DO_RESUMO = ['id', 'titulo', 'status', 'prioridade', 'prazo', 'tipo', 'natureza', 'bloqueio', 'processo', 'simp', 'judicial', 'ultimaAcaoRelevante'] as const;

type DemandaDoResumo = Pick<Demanda, (typeof CAMPOS_DO_RESUMO)[number]>;

const dataBr = (aaaammdd: string) => new Date(`${aaaammdd}T00:00:00`).toLocaleDateString('pt-BR');

/** Copia só os campos da lista branca: o resto da demanda nem chega às funções de texto. */
function filtrar(d: Demanda): DemandaDoResumo {
  const saida: Partial<Record<string, unknown>> = {};
  for (const c of CAMPOS_DO_RESUMO) if (d[c] !== undefined) saida[c] = d[c];
  return saida as DemandaDoResumo;
}

export function montarResumo(demanda: Demanda, agora: Date): Resumo {
  const d = filtrar(demanda);
  const linhas: Resumo['linhas'] = [['Status', d.status], ['Prioridade', d.prioridade]];
  const prazo = situacaoDaDemanda(d, agora);
  linhas.push(['Prazo', d.prazo ? `${dataBr(d.prazo)}${prazo ? ` · ${prazo.texto}` : ''}` : 'sem prazo']);
  if (d.tipo) linhas.push(['Tipo', ROTULOS_TIPO[d.tipo]]);
  if (d.natureza) linhas.push(['Natureza', ROTULOS_NATUREZA[d.natureza]]);
  const andamento = textoEmAndamento(d, agora);
  if (andamento) linhas.push(['Andamento', andamento]);
  const bloqueio = textoBloqueio(d, agora);
  if (bloqueio) linhas.push(['Bloqueio', bloqueio]);
  if (d.processo) linhas.push(['Processo', d.processo]);
  if (d.simp) linhas.push(['SIMP', 'tem (número fora do resumo)']);
  if (d.judicial) linhas.push(['Processo judicial', 'tem (número fora do resumo)']);
  return { id: d.id, titulo: d.titulo, linhas };
}

/** Demandas em aberto, do prazo mais próximo ao mais distante; sem prazo por último. */
export function resumosEmAberto(demandas: readonly Demanda[], agora: Date): Resumo[] {
  return demandas
    .filter((d) => d.status !== 'Concluída')
    .sort((a, b) => (a.prazo ?? '9999-99-99').localeCompare(b.prazo ?? '9999-99-99'))
    .map((d) => montarResumo(d, agora));
}
