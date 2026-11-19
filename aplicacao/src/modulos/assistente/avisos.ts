// Avisos do assistente a partir das demandas deste navegador (etapa 4 do plano dos mascotes).
// Mesmas regras das outras telas: vencida como no Dashboard, dias úteis com os feriados locais
// e inatividade pelo limiar gravado. Cada demanda gera no máximo um aviso, o mais urgente.

import type { Demanda } from '../demandas/modelo.ts';
import { situacaoDaDemanda, type AjusteFeriados } from '../alertas/dias-uteis.ts';
import { diasParado, estaInativa } from '../alertas/inatividade.ts';
import { plural } from '../../compartilhado/plural.ts';

/** Prazo próximo: vence em até tantos dias úteis (inclui "vence hoje"). */
export const DIAS_PRAZO_PROXIMO = 3;

export type TipoAviso = 'vencida' | 'prazo-proximo' | 'parada' | 'backup';

export interface Aviso {
  tipo: TipoAviso;
  id: string;
  texto: string;
  /** Tipo do aviso e status da demanda: quando muda, "ciente" e "adiar" deixam de valer. */
  situacao: string;
}

const ORDEM: Record<TipoAviso, number> = { vencida: 0, 'prazo-proximo': 1, parada: 2, backup: 3 };

export function avisosDoDia(demandas: readonly Demanda[], agora: Date, limiarDias: number, ajuste: AjusteFeriados = {}): Aviso[] {
  const avisos: (Aviso & { chave: number })[] = [];
  for (const d of demandas) {
    if (d.status === 'Concluída') continue;
    const prazo = situacaoDaDemanda(d, agora, ajuste);
    const novo = (tipo: TipoAviso, texto: string, chave: number) =>
      avisos.push({ tipo, id: d.id, texto, chave, situacao: `${tipo}|${d.status}` });
    if (prazo?.vencido) {
      novo('vencida', `${d.titulo}: ${prazo.texto}.`, prazo.diasUteis);
    } else if (prazo && prazo.diasUteis <= DIAS_PRAZO_PROXIMO) {
      novo('prazo-proximo', `${d.titulo}: ${prazo.texto}.`, prazo.diasUteis);
    } else if (estaInativa(d, limiarDias, agora)) {
      const dias = diasParado(d, agora);
      novo('parada', `${d.titulo}: parada há ${plural(dias, 'dia', 'dias')} sem ação relevante.`, -dias);
    }
  }
  // Mais urgente primeiro: vencidas há mais tempo, prazos mais curtos, paradas há mais tempo.
  return avisos
    .sort((a, b) => ORDEM[a.tipo] - ORDEM[b.tipo] || a.chave - b.chave || a.id.localeCompare(b.id))
    .map(({ tipo, id, texto, situacao }) => ({ tipo, id, texto, situacao }));
}

/** Lembrete de backup: só quando há dados e o último backup tem mais de `limiteDias` dias (ou nunca foi feito). */
export function avisoDeBackup(ultimoBackup: string | null, temDados: boolean, agora: Date, limiteDias: number): Aviso | null {
  if (!temDados) return null;
  const dias = ultimoBackup ? Math.floor((agora.getTime() - Date.parse(ultimoBackup)) / 86_400_000) : null;
  if (dias !== null && dias <= limiteDias) return null;
  const texto = dias === null
    ? 'Você ainda não exportou um backup dos seus dados. Em Configurações, use "Exportar backup".'
    : `O último backup tem ${plural(dias, 'dia', 'dias')}. Em Configurações, use "Exportar backup".`;
  return { tipo: 'backup', id: 'backup', texto, situacao: 'backup' };
}

const CONTAGEM: Record<TipoAviso, [string, string]> = {
  vencida: ['1 vencida', 'vencidas'],
  'prazo-proximo': ['1 com prazo próximo', 'com prazo próximo'],
  parada: ['1 parada', 'paradas'],
  backup: ['1 lembrete de backup', 'lembretes de backup'],
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
