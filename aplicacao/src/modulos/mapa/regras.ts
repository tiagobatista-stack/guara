// Regras puras do mapa (sem Leaflet): que itens têm lugar no mapa, legenda e enquadramento.

import { coordenadaValida, type Coordenada } from '../demandas/coordenadas.ts';
import { MOTIVOS_BLOQUEIO, type Demanda } from '../demandas/modelo.ts';
import type { Operacao } from '../operacoes/modelo.ts';
import { SITUACOES_ACOMPANHAMENTO } from '../operacoes/modelo.ts';
import { faseDoPonto, pontoTravado, pontoVencido, ROTULO_FASE, situacaoDoPonto, viagemDoPonto, type PrazosDeElaboracao } from '../operacoes/regras.ts';

export interface ItemMapa {
  id: string;
  tipo: 'demanda' | 'ponto';
  rotulo: string;
  /** Status da demanda ou situação de acompanhamento do ponto (situacaoDoPonto). */
  situacao: string;
  /** Ponto em aberto cuja viagem já voltou: alerta derivado, não situação. */
  vencido?: boolean;
  /** Ponto com bloqueio ativo (motivo por extenso e detalhe, se houver): contorno tracejado. */
  travado?: { motivo: string; detalhe?: string };
  municipio?: string;
  /** Prazo da demanda ou datas da viagem, já formatados; vazio se não houver. */
  quando: string;
  coordenada: Coordenada;
}

/** Cor por situação; a forma (círculo = demanda, quadrado = ponto) não depende dela. Desconhecida: cinza. */
export const COR_SITUACAO: Record<string, string> = {
  'A Fazer': '#d97706', 'Em Andamento': '#2563eb', 'Em Validação': '#7c3aed', 'Concluída': '#16a34a',
  planejado: '#2563eb', 'resultado-pendente': '#7c3aed', finalizado: '#16a34a', 'a-reprogramar': '#dc2626', reprogramado: '#0891b2', cancelado: '#6b7280',
  // Fase pós-campo do ponto: em elaboração (relatório a enviar) e concluído (relatório enviado no SIGA-MT).
  elaboracao: '#ca8a04', concluido: '#16a34a',
};
/** Contorno de alerta do ponto vencido. */
export const COR_VENCIDO = '#b91c1c';

/** Texto da situação para balão e legenda: a fase ou situação do ponto (com "vencido") ou o status da demanda. */
export const rotuloDaSituacao = (i: Pick<ItemMapa, 'tipo' | 'situacao' | 'vencido'>) =>
  i.tipo === 'ponto'
    ? `${(i.situacao === 'elaboracao' || i.situacao === 'concluido' ? ROTULO_FASE[i.situacao] : SITUACOES_ACOMPANHAMENTO[i.situacao as keyof typeof SITUACOES_ACOMPANHAMENTO]) ?? i.situacao}${i.vencido ? ' · vencido' : ''}`
    : i.situacao;
export const corDaSituacao = (s: string) => COR_SITUACAO[s] ?? '#6b7280';

/** Centro de Mato Grosso, para quando não há nada a mostrar. */
export const CENTRO_MT = { lat: -12.6, lon: -55.9, zoom: 6 } as const;

const dataBr = (d?: string) => (d ? d.split('-').reverse().join('/') : '');

export function itensDoMapa(
  demandas: readonly Pick<Demanda, 'id' | 'titulo' | 'status' | 'prazo' | 'coordenada'>[],
  operacoes: readonly Operacao[],
  hoje = '',
  prazos: PrazosDeElaboracao = {},
): { noMapa: ItemMapa[]; semLocal: { id: string; titulo: string }[] } {
  const noMapa: ItemMapa[] = [];
  const semLocal: { id: string; titulo: string }[] = [];
  for (const d of demandas) {
    if (coordenadaValida(d.coordenada)) {
      noMapa.push({ id: d.id, tipo: 'demanda', rotulo: d.titulo, situacao: d.status, quando: d.prazo ? `prazo ${dataBr(d.prazo)}` : '', coordenada: d.coordenada });
    } else semLocal.push({ id: d.id, titulo: d.titulo });
  }
  for (const o of operacoes) {
    for (const p of o.pontos) {
      const v = viagemDoPonto(o, p);
      const datas = [v?.saida, v?.retorno].filter(Boolean).map(dataBr).join(' a ');
      noMapa.push({
        id: p.id,
        tipo: 'ponto',
        rotulo: `${o.nome} · ponto ${p.numero ?? ''}`.trim() + (v?.equipe ? ` · ${v.equipe}` : ''),
        // Depois do campo, a cor e o rótulo vêm da fase (em elaboração / concluído); antes, da situação.
        situacao: ((f) => (f === 'elaboracao' || f === 'concluido' ? f : situacaoDoPonto(p)))(faseDoPonto(p)),
        vencido: !!hoje && pontoVencido(o, p, hoje, prazos),
        ...(pontoTravado(p) ? { travado: { motivo: MOTIVOS_BLOQUEIO[p.bloqueio!.motivo], ...(p.bloqueio!.detalhe ? { detalhe: p.bloqueio!.detalhe } : {}) } } : {}),
        municipio: p.municipio,
        quando: datas,
        coordenada: p.coordenada,
      });
    }
  }
  return { noMapa, semLocal };
}

export function legenda(itens: readonly ItemMapa[]): { tipo: ItemMapa['tipo']; situacao: string; vencido: boolean; n: number }[] {
  const conta = new Map<string, { tipo: ItemMapa['tipo']; situacao: string; vencido: boolean; n: number }>();
  for (const i of itens) {
    const k = `${i.tipo}|${i.situacao}|${!!i.vencido}`;
    conta.set(k, { tipo: i.tipo, situacao: i.situacao, vencido: !!i.vencido, n: (conta.get(k)?.n ?? 0) + 1 });
  }
  return [...conta.values()];
}

/** [[sul, oeste], [norte, leste]], ou null sem itens. Com um item só o quadro é um ponto: quem desenha limita o zoom. */
export function limitesDosItens(itens: readonly ItemMapa[]): [[number, number], [number, number]] | null {
  if (itens.length === 0) return null;
  const lats = itens.map((i) => i.coordenada.lat);
  const lons = itens.map((i) => i.coordenada.lon);
  return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
}

/**
 * Situação de uma fonte de imagens a partir dos pedidos de tile desde que a camada foi ligada.
 * O servidor da SEMA limita a 15 pedidos por janela e atrasa os excedentes: erro depois de carga é lentidão,
 * não queda; só 3 erros sem nenhuma carga indicam fonte fora do ar.
 */
export function estadoDaFonte(erros: number, cargas: number): 'normal' | 'devagar' | 'indisponivel' {
  if (cargas > 0) return erros > 0 ? 'devagar' : 'normal';
  return erros >= 3 ? 'indisponivel' : 'normal';
}
