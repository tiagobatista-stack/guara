// Avisos do assistente a partir das demandas deste navegador (etapa 4 do plano dos mascotes).
// Mesmas regras das outras telas: vencida como no Dashboard, dias úteis com os feriados locais
// e inatividade pelo limiar gravado. Cada demanda gera no máximo um aviso (passo 4, 21/11/2026): o tipo
// é o do sinal mais urgente, e o texto junta os demais (vencida e parada: "vencido há 3 dias úteis;
// parada há 5 dias"), em vez de esconder o menos urgente.

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
  /** Tipo do aviso e status da demanda: quando muda, "ciente" e "adiar" deixam de valer. */
  situacao: string;
}

const ORDEM: Record<TipoAviso, number> = { vencida: 0, 'prazo-proximo': 1, parada: 2 };

export function avisosDoDia(demandas: readonly Demanda[], agora: Date, limiarDias: number, ajuste: AjusteFeriados = {}): Aviso[] {
  const avisos: (Aviso & { chave: number })[] = [];
  for (const d of demandas) {
    if (d.status === 'Concluída') continue;
    const prazo = situacaoDaDemanda(d, agora, ajuste);
    // Sinais da demanda, do mais urgente para o menos; o prazo e a parada podem valer ao mesmo tempo.
    const sinais: { tipo: TipoAviso; texto: string; chave: number }[] = [];
    if (prazo?.vencido) {
      sinais.push({ tipo: 'vencida', texto: prazo.texto, chave: prazo.diasUteis });
    } else if (prazo && prazo.diasUteis <= DIAS_PRAZO_PROXIMO) {
      sinais.push({ tipo: 'prazo-proximo', texto: prazo.texto, chave: prazo.diasUteis });
    }
    if (estaInativa(d, limiarDias, agora)) {
      const dias = diasParado(d, agora);
      sinais.push({ tipo: 'parada', texto: `parada há ${dias} dia(s) sem ação relevante`, chave: -dias });
    }
    if (sinais.length === 0) continue;
    avisos.push({
      tipo: sinais[0].tipo,
      id: d.id,
      texto: `${d.titulo}: ${sinais.map((x) => x.texto).join('; ')}.`,
      chave: sinais[0].chave,
      // Um sinal novo (ex.: a demanda ficou parada) muda a situação e faz o "ciente" deixar de valer.
      situacao: `${sinais.map((x) => x.tipo).join('+')}|${d.status}`,
    });
  }
  // Mais urgente primeiro: vencidas há mais tempo, prazos mais curtos, paradas há mais tempo.
  return avisos
    .sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo] || a.chave - b.chave || a.id.localeCompare(b.id))
    .map(({ tipo, id, texto, situacao }) => ({ tipo, id, texto, situacao }));
}

/** Natureza do texto do aviso: prazo é fato (conta sobre a data gravada); "parada" é inferência por regra. */
export function naturezaDoAviso(a: Pick<Aviso, 'situacao'>): string {
  const tipos = a.situacao.split('|')[0].split('+');
  const parada = tipos.includes('parada');
  const prazo = tipos.some((t) => t !== 'parada');
  return parada && prazo ? 'fato (prazo) e inferência (parada)' : parada ? 'inferência' : 'fato';
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
