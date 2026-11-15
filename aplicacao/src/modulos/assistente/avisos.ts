// Avisos do assistente a partir das demandas deste navegador (etapa 4 do plano dos mascotes).
// Mesmas regras das outras telas: vencida como no Dashboard, dias úteis com os feriados locais
// e inatividade pelo limiar gravado. Cada demanda gera no máximo um aviso, o mais urgente.

import type { Demanda } from '../demandas/modelo.ts';
import { situacaoDaDemanda, type AjusteFeriados } from '../alertas/dias-uteis.ts';
import { diasParado, estaInativa } from '../alertas/inatividade.ts';

/** Prazo próximo: vence em até tantos dias úteis (inclui "vence hoje"). */
export const DIAS_PRAZO_PROXIMO = 3;

export type TipoAviso = 'vencida' | 'prazo-proximo' | 'parada';

export interface Aviso {
  tipo: TipoAviso;
  id: string;
  texto: string;
}

const ORDEM: Record<TipoAviso, number> = { vencida: 0, 'prazo-proximo': 1, parada: 2 };

export function avisosDoDia(demandas: readonly Demanda[], agora: Date, limiarDias: number, ajuste: AjusteFeriados = {}): Aviso[] {
  const avisos: (Aviso & { chave: number })[] = [];
  for (const d of demandas) {
    if (d.status === 'Concluída') continue;
    const prazo = situacaoDaDemanda(d, agora, ajuste);
    if (prazo?.vencido) {
      avisos.push({ tipo: 'vencida', id: d.id, texto: `${d.titulo}: ${prazo.texto}.`, chave: prazo.diasUteis });
    } else if (prazo && prazo.diasUteis <= DIAS_PRAZO_PROXIMO) {
      avisos.push({ tipo: 'prazo-proximo', id: d.id, texto: `${d.titulo}: ${prazo.texto}.`, chave: prazo.diasUteis });
    } else if (estaInativa(d, limiarDias, agora)) {
      const dias = diasParado(d, agora);
      avisos.push({ tipo: 'parada', id: d.id, texto: `${d.titulo}: parada há ${dias} dia(s) sem ação relevante.`, chave: -dias });
    }
  }
  // Mais urgente primeiro: vencidas há mais tempo, prazos mais curtos, paradas há mais tempo.
  return avisos
    .sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo] || a.chave - b.chave || a.id.localeCompare(b.id))
    .map(({ tipo, id, texto }) => ({ tipo, id, texto }));
}

const CONTAGEM: Record<TipoAviso, [string, string]> = {
  vencida: ['1 vencida', 'vencidas'],
  'prazo-proximo': ['1 com prazo próximo', 'com prazo próximo'],
  parada: ['1 parada', 'paradas'],
};

/** "1 vencida, 2 com prazo próximo e 1 parada"; vazio quando não há aviso. */
export function resumoDosAvisos(avisos: readonly Aviso[]): string {
  const partes = (Object.keys(CONTAGEM) as TipoAviso[]).flatMap((tipo) => {
    const n = avisos.filter((a) => a.tipo === tipo).length;
    if (n === 0) return [];
    return [n === 1 ? CONTAGEM[tipo][0] : `${n} ${CONTAGEM[tipo][1]}`];
  });
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}` : (partes[0] ?? '');
}
