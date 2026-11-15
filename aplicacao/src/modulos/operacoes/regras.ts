// Regras puras das operações: validação, o que falta encaixar, distância e "local já visitado".

import { coordenadaValida, type Coordenada } from '../demandas/coordenadas.ts';
import { dataValida } from '../demandas/regras.ts';
import { LIMITES_OPERACAO, SITUACOES_PONTO, type Operacao, type Ponto } from './modelo.ts';

// ---------- Validação ----------

/** Texto de data brasileiro (DD/MM/AAAA) ou ISO (AAAA-MM-DD) para ISO; null se não for data válida. */
export function lerData(texto: string): string | null {
  const t = texto.trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const iso = br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : t;
  return dataValida(iso) ? iso : null;
}

/** Problemas de datas de um ponto dentro da janela da operação; lista vazia = ok. */
export function problemasDeDatas(p: Pick<Ponto, 'saida' | 'retorno'>, janela?: { inicio: string; fim: string }): string[] {
  const erros: string[] = [];
  if (p.saida && !dataValida(p.saida)) erros.push('Data de saída inválida.');
  if (p.retorno && !dataValida(p.retorno)) erros.push('Data de retorno inválida.');
  if (erros.length) return erros;
  if (p.saida && p.retorno && p.retorno < p.saida) erros.push('O retorno é anterior à saída.');
  if (janela) {
    for (const [nome, d] of [['saída', p.saida], ['retorno', p.retorno]] as const) {
      if (d && (d < janela.inicio || d > janela.fim)) erros.push(`A data de ${nome} fica fora do período da operação.`);
    }
  }
  return erros;
}

const texto = (x: unknown, max: number) => typeof x === 'string' && x.length <= max;

function pontoValido(x: unknown): x is Ponto {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === 'string' && p.id.length > 0 &&
    (p.numero === undefined || (typeof p.numero === 'number' && Number.isInteger(p.numero) && p.numero >= 0)) &&
    coordenadaValida(p.coordenada) &&
    texto(p.municipio, LIMITES_OPERACAO.municipio) &&
    (p.equipe === undefined || texto(p.equipe, LIMITES_OPERACAO.equipe)) &&
    (p.saida === undefined || (typeof p.saida === 'string' && dataValida(p.saida))) &&
    (p.retorno === undefined || (typeof p.retorno === 'string' && dataValida(p.retorno))) &&
    texto(p.notas, LIMITES_OPERACAO.notas) &&
    (p.grupo === undefined || texto(p.grupo, LIMITES_OPERACAO.grupo)) &&
    Array.isArray(p.demandas) && p.demandas.length <= LIMITES_OPERACAO.demandasPorPonto && p.demandas.every((d) => typeof d === 'string') &&
    SITUACOES_PONTO.includes(p.situacao as never)
  );
}

export function operacaoValida(x: unknown): x is Operacao {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === 'string' && o.id.length > 0 &&
    typeof o.nome === 'string' && o.nome.trim().length > 0 && o.nome.length <= LIMITES_OPERACAO.nome &&
    typeof o.inicio === 'string' && dataValida(o.inicio) &&
    typeof o.fim === 'string' && dataValida(o.fim) && o.fim >= o.inicio &&
    (o.origem === undefined || texto(o.origem, LIMITES_OPERACAO.origem)) &&
    typeof o.criadaEm === 'string' && !Number.isNaN(Date.parse(o.criadaEm)) &&
    Array.isArray(o.pontos) && o.pontos.length <= LIMITES_OPERACAO.pontos && o.pontos.every(pontoValido)
  );
}

/** Lista gravada: só as operações válidas; qualquer coisa que não seja lista vira vazia. */
export function validarListaOperacoes(x: unknown): Operacao[] {
  return Array.isArray(x) ? x.filter(operacaoValida).slice(0, LIMITES_OPERACAO.operacoes) : [];
}

// ---------- O que falta encaixar ----------

const ativo = (p: Pick<Ponto, 'situacao'>) => p.situacao === 'planejado';

/** Pontos ainda planejados e sem equipe. */
export const pontosSemEquipe = <T extends Pick<Ponto, 'situacao' | 'equipe'>>(pontos: readonly T[]): T[] =>
  pontos.filter((p) => ativo(p) && !p.equipe?.trim());

/** Pontos ainda planejados e sem data de saída. */
export const pontosSemData = <T extends Pick<Ponto, 'situacao' | 'saida'>>(pontos: readonly T[]): T[] =>
  pontos.filter((p) => ativo(p) && !p.saida);

/** Pontos planejados sem equipe ou sem data, de todas as operações (aviso do Painel). */
export function contarPontosPendentes(operacoes: readonly Operacao[]): number {
  return operacoes.reduce((n, o) => n + o.pontos.filter((p) => ativo(p) && (!p.equipe?.trim() || !p.saida)).length, 0);
}

// ---------- Mesmo local ----------

const RAIO_TERRA_M = 6_371_000;
/** Distância padrão abaixo da qual dois pontos contam como o mesmo local. */
export const RAIO_PADRAO_M = 200;

/** Distância em metros entre duas coordenadas (haversine). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface LocalProximo {
  origem: 'operacao' | 'demanda';
  /** Nome da operação ou título da demanda. */
  rotulo: string;
  distanciaM: number;
  equipe?: string;
  /** AAAA-MM-DD: retorno, ou saída, do ponto; ausente se não houver data. */
  data?: string;
  situacao?: Ponto['situacao'];
  /** Id do ponto ou da demanda. */
  id: string;
}

export interface DemandaComLocal {
  id: string;
  titulo: string;
  coordenada?: Coordenada;
}

/**
 * Outros pontos de operação e demandas a até `raioM` do ponto, do mais perto ao mais longe.
 * É sugestão com origem e data: quem decide se é o mesmo local é o analista.
 */
export function pontosProximos(
  ponto: Pick<Ponto, 'id' | 'coordenada'>,
  operacoes: readonly Operacao[],
  demandas: readonly DemandaComLocal[] = [],
  raioM = RAIO_PADRAO_M,
): LocalProximo[] {
  const achados: LocalProximo[] = [];
  for (const o of operacoes) {
    for (const p of o.pontos) {
      if (p.id === ponto.id) continue;
      const d = distanciaMetros(ponto.coordenada, p.coordenada);
      if (d <= raioM) {
        achados.push({
          origem: 'operacao', rotulo: o.nome, distanciaM: d, id: p.id, situacao: p.situacao,
          ...(p.equipe ? { equipe: p.equipe } : {}),
          ...((p.retorno ?? p.saida) ? { data: (p.retorno ?? p.saida)! } : {}),
        });
      }
    }
  }
  for (const dm of demandas) {
    if (!dm.coordenada) continue;
    const d = distanciaMetros(ponto.coordenada, dm.coordenada);
    if (d <= raioM) achados.push({ origem: 'demanda', rotulo: dm.titulo, distanciaM: d, id: dm.id });
  }
  return achados.sort((a, b) => a.distanciaM - b.distanciaM);
}

/** "Operação X: equipe A, vistoriado, 22/09/2023, a 35 m". */
export function textoLocalProximo(l: LocalProximo): string {
  const partes = [l.origem === 'operacao' ? `Operação ${l.rotulo}` : `Demanda ${l.rotulo}`];
  if (l.equipe) partes.push(l.equipe);
  if (l.situacao) partes.push(l.situacao);
  if (l.data) partes.push(l.data.split('-').reverse().join('/'));
  partes.push(`a ${Math.round(l.distanciaM)} m`);
  return partes.join(', ');
}
