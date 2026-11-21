// Prioridades do dia para o analista (etapa 1 da lógica de apoio do mascote, 21/11/2026).
// Regra pura, sem IA e sem armazenamento: lê as demandas deste navegador e devolve, para cada uma
// que pede atenção, a pontuação, os MOTIVOS dela (um por sinal, com os pontos) e uma próxima ação
// SUGERIDA. Os pesos são fixos e públicos (PESOS): o analista confere e pode discordar. Nada aqui
// altera uma demanda; decidir e encaminhar é sempre do profissional.
// Mesmas regras das outras telas: prazo em dias úteis com feriados, inatividade pelo limiar gravado.

import type { Demanda, Prioridade } from '../demandas/modelo.ts';
import { MOTIVOS_BLOQUEIO } from '../demandas/modelo.ts';
import { camposQueFaltam, ROTULOS_ESSENCIAL } from '../demandas/essenciais.ts';
import { PRAZO_SUGERIDO_DIAS_UTEIS } from '../alertas/triagem.ts';
import { dataLocal, diasUteis, rotuloDias, situacaoDaDemanda, type AjusteFeriados } from '../alertas/dias-uteis.ts';
import { diasParado, estaInativa } from '../alertas/inatividade.ts';
import { DIAS_PRAZO_PROXIMO } from './avisos.ts';

export type Sinal = 'vencida' | 'prazo-proximo' | 'vistoria-proxima' | 'parada' | 'bloqueada' | 'sem-prazo' | 'campos-faltando';

/** Pesos fixos. Quem tem prazo estourado vem antes de quem só está parado. */
export const PESOS = {
  vencida: { base: 50, porDia: 2, maxDias: 10 },
  'prazo-proximo': { base: 20, porDiaQueSobra: 3 },
  'vistoria-proxima': { base: 25 },
  parada: { base: 15, porDia: 1, maxDias: 10 },
  bloqueada: { base: 10 },
  'sem-prazo': { base: 10 },
  'campos-faltando': { base: 5 },
  /** Soma só quando já há algum sinal: prioridade alta sem problema nenhum não entra na fila. */
  prioridade: { Alta: 20, Média: 8, Baixa: 0 } satisfies Record<Prioridade, number>,
} as const;

/** A vistoria agendada entra na fila quando faltam até tantos dias úteis (inclui hoje). */
export const DIAS_VISTORIA_PROXIMA = 2;

export interface Motivo {
  sinal: Sinal | 'prioridade';
  pontos: number;
  texto: string;
  /** Como o texto deve ser lido: dado gravado ou conta sobre ele, como o atraso do prazo (fato), ou palpite por regra, como "parada" (inferência). */
  natureza: 'fato' | 'inferência';
}

export type TipoDeAcao = 'cobrar' | 'decidir' | 'registrar' | 'comecar' | 'concluir-validacao' | 'planejar' | 'preparar-vistoria' | 'definir-prazo' | 'preencher';

export interface ProximaAcao {
  tipo: TipoDeAcao;
  texto: string;
  natureza: 'sugestão';
}

export interface ItemDePrioridade {
  id: string;
  titulo: string;
  pontos: number;
  motivos: Motivo[];
  proximaAcao: ProximaAcao;
}

const dia = (n: number) => (n === 1 ? '1 dia' : `${n} dias`);

/** Sinais da demanda, na ordem em que pesam; vazio quando não pede atenção (ou está concluída). */
export function motivosDaDemanda(d: Demanda, agora: Date, limiarDias: number, ajuste: AjusteFeriados = {}): Motivo[] {
  if (d.status === 'Concluída') return [];
  const motivos: Motivo[] = [];
  const prazo = situacaoDaDemanda(d, agora, ajuste);

  if (prazo?.vencido) {
    const atraso = Math.max(0, -prazo.diasUteis);
    const p = PESOS.vencida;
    motivos.push({ sinal: 'vencida', pontos: p.base + Math.min(atraso, p.maxDias) * p.porDia, texto: `prazo: ${prazo.texto}`, natureza: 'fato' });
  } else if (prazo && prazo.diasUteis <= DIAS_PRAZO_PROXIMO) {
    const p = PESOS['prazo-proximo'];
    motivos.push({ sinal: 'prazo-proximo', pontos: p.base + (DIAS_PRAZO_PROXIMO - prazo.diasUteis) * p.porDiaQueSobra, texto: `prazo: ${prazo.texto}`, natureza: 'fato' });
  }

  // Só a demanda de campo com data marcada (vistoria.ts, 'agendada'); "em aberto" ou em operação não tem data.
  if (d.tipo === 'campo' && d.vistoria?.data) {
    const hoje = dataLocal(agora);
    const n = diasUteis(hoje, d.vistoria.data, ajuste);
    if (d.vistoria.data >= hoje && n <= DIAS_VISTORIA_PROXIMA) {
      const quando = d.vistoria.data === hoje ? 'hoje' : n === 0 ? 'sem dia útil antes' : `em ${rotuloDias(n)}`;
      motivos.push({ sinal: 'vistoria-proxima', pontos: PESOS['vistoria-proxima'].base, texto: `vistoria ${quando}`, natureza: 'fato' });
    }
  }

  if (estaInativa(d, limiarDias, agora)) {
    const dias = diasParado(d, agora);
    const p = PESOS.parada;
    motivos.push({ sinal: 'parada', pontos: p.base + Math.min(dias, p.maxDias) * p.porDia, texto: `parada há ${dia(dias)} sem ação relevante`, natureza: 'inferência' });
  }

  if (d.bloqueio) {
    const desde = dataLocal(new Date(d.bloqueio.desde));
    const n = Math.max(0, diasUteis(desde, dataLocal(agora), ajuste));
    const tempo = n === 0 ? 'hoje' : `há ${rotuloDias(n)}`;
    motivos.push({ sinal: 'bloqueada', pontos: PESOS.bloqueada.base, texto: `travada ${tempo}: ${MOTIVOS_BLOQUEIO[d.bloqueio.motivo]}`, natureza: 'fato' });
  }

  const faltam = camposQueFaltam(d);
  if (faltam.includes('prazo')) {
    motivos.push({ sinal: 'sem-prazo', pontos: PESOS['sem-prazo'].base, texto: 'sem prazo definido', natureza: 'fato' });
  }
  const outros = faltam.filter((c) => c !== 'prazo');
  if (outros.length) {
    motivos.push({ sinal: 'campos-faltando', pontos: PESOS['campos-faltando'].base, texto: `falta preencher: ${outros.map((c) => ROTULOS_ESSENCIAL[c]).join(', ')}`, natureza: 'fato' });
  }

  if (motivos.length === 0) return [];
  const extra = PESOS.prioridade[d.prioridade];
  if (extra > 0) motivos.push({ sinal: 'prioridade', pontos: extra, texto: `prioridade ${d.prioridade.toLowerCase()}`, natureza: 'fato' });
  return motivos;
}

/** Tabela de decisão: a primeira linha que casa vence. Só sugere; não altera a demanda. */
export function proximaAcao(d: Pick<Demanda, 'status' | 'bloqueio'>, motivos: readonly Motivo[]): ProximaAcao | null {
  const tem = (s: Sinal) => motivos.some((m) => m.sinal === s);
  const sugerir = (tipo: TipoDeAcao, texto: string): ProximaAcao => ({ tipo, texto, natureza: 'sugestão' });
  const cobrar = () => sugerir('cobrar', `Cobrar o retorno: ${d.bloqueio ? MOTIVOS_BLOQUEIO[d.bloqueio.motivo] : 'bloqueio'}.`);

  if (tem('vencida') && d.bloqueio) return cobrar();
  if (tem('vencida')) return sugerir('decidir', 'Decidir: prorrogar o prazo ou concluir.');
  if (tem('vistoria-proxima')) return sugerir('preparar-vistoria', 'Preparar a vistoria: conferir equipe, veículo e documentos.');
  if (tem('bloqueada') && d.bloqueio) return cobrar();
  if (tem('parada')) {
    if (d.status === 'Em Andamento') return sugerir('registrar', 'Registrar a última ação ou travar a demanda com o motivo.');
    if (d.status === 'Em Validação') return sugerir('concluir-validacao', 'Concluir a validação ou devolver para Em Andamento.');
    return sugerir('comecar', 'Começar a demanda ou travá-la com o motivo.');
  }
  if (tem('prazo-proximo')) return sugerir('planejar', 'Planejar a entrega antes do prazo.');
  if (tem('sem-prazo')) return sugerir('definir-prazo', `Definir o prazo (sugestão: ${PRAZO_SUGERIDO_DIAS_UTEIS} dias úteis).`);
  const preencher = motivos.find((m) => m.sinal === 'campos-faltando');
  if (preencher) return sugerir('preencher', `Preencher: ${preencher.texto.replace('falta preencher: ', '')}.`);
  return null;
}

/**
 * Demandas que pedem atenção, da mais urgente para a menos. Empate: prazo mais próximo primeiro
 * (sem prazo por último) e depois o código da demanda. Concluídas e demandas sem sinal ficam fora.
 */
export function priorizarDemandas(
  demandas: readonly Demanda[],
  agora: Date,
  limiarDias: number,
  ajuste: AjusteFeriados = {},
): ItemDePrioridade[] {
  const itens: (ItemDePrioridade & { prazo: string })[] = [];
  for (const d of demandas) {
    const motivos = motivosDaDemanda(d, agora, limiarDias, ajuste);
    const acao = proximaAcao(d, motivos);
    if (!acao) continue;
    itens.push({ id: d.id, titulo: d.titulo, pontos: motivos.reduce((s, m) => s + m.pontos, 0), motivos, proximaAcao: acao, prazo: d.prazo ?? '9999-12-31' });
  }
  return itens
    .sort((a, b) => b.pontos - a.pontos || a.prazo.localeCompare(b.prazo) || a.id.localeCompare(b.id))
    .map(({ prazo: _prazo, ...item }) => {
      void _prazo;
      return item;
    });
}

const TAMANHO_MAXIMO_TITULO = 60;
const SUFIXO_FICTICIO = /\s*\(fict[ií]ci[ao]\)\s*$/i;

/** Título longo cortado NO MEIO ("Renovação de licença … Rio Claro (FICTÍCIA)"), guardando o fim e o sufixo "(FICTÍCIA)". */
export function encurtarTitulo(titulo: string, maximo = TAMANHO_MAXIMO_TITULO): string {
  const t = titulo.trim();
  if (t.length <= maximo) return t;
  const sufixo = SUFIXO_FICTICIO.exec(t)?.[0].trim() ?? '';
  const corpo = sufixo ? t.slice(0, t.length - SUFIXO_FICTICIO.exec(t)![0].length).trimEnd() : t;
  const reserva = sufixo ? sufixo.length + 1 : 0;
  const sobra = maximo - reserva - 3; // " … " ocupa 3 caracteres
  const inicio = Math.ceil(sobra * 0.6);
  const fim = sobra - inicio;
  const cortado = `${corpo.slice(0, inicio).trimEnd()} … ${corpo.slice(corpo.length - fim).trimStart()}`;
  return sufixo ? `${cortado} ${sufixo}` : cortado;
}

/** "vencido há 2 dias úteis + parada há 4 dias + prioridade alta": o porquê da posição, em uma linha. */
export const resumoDosMotivos = (motivos: readonly Motivo[]): string => motivos.map((m) => m.texto).join(' + ');
