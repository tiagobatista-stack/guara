// Lembretes pessoais guardados neste navegador (`guara:lembretes-pessoais:v1`).
// Mesmo desenho da conversa e das preferências do mascote: localStorage validado na leitura,
// memória quando o armazenamento está bloqueado e aviso a quem assina (painel fixo e gaveta).
// Guarda o que a pessoa digitou: nada de dado real nos testes e nos exemplos.

import { useSyncExternalStore } from 'react';
import type { AjusteFeriados } from '../alertas/dias-uteis.ts';
import { aplicarResposta, avancarRelogio, type LembretePessoal, type RegistroOcorrencia, type Resposta } from './agendador.ts';
import type { PedidoLembrete, Regra } from './interpretar.ts';

export const CHAVE_LEMBRETES_PESSOAIS = 'guara:lembretes-pessoais:v1';
/** Encerrados e cancelados guardados (para "avisos" e "desfazer"); os mais antigos saem. */
const MAXIMO_INATIVOS = 30;
const MAXIMO_ATIVOS = 200;
const TEXTO_MAX = 300;

interface Estado {
  versao: 1;
  proximoNumero: number;
  itens: LembretePessoal[];
}

const VAZIO: Estado = { versao: 1, proximoNumero: 1, itens: [] };

// ---------- Validação ----------

const data = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));

function validarRegra(x: unknown): Regra | undefined {
  if (typeof x !== 'object' || x === null) return undefined;
  const r = x as Record<string, unknown>;
  if (r.tipo === 'intervalo' && typeof r.minutos === 'number' && r.minutos >= 1 && r.minutos <= 1440 * 31) return { tipo: 'intervalo', minutos: Math.round(r.minutos) };
  if (r.tipo === 'diario' || r.tipo === 'uteis') return { tipo: r.tipo };
  if (r.tipo === 'semanal' && Array.isArray(r.dias)) {
    const dias = r.dias.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6);
    if (dias.length) return { tipo: 'semanal', dias };
  }
  return undefined;
}

function validarRegistro(x: unknown): RegistroOcorrencia[] {
  if (!Array.isArray(x)) return [];
  return x.filter((r): r is RegistroOcorrencia => typeof r === 'object' && r !== null && data(r.previsto) && data(r.em)
    && ['feito', 'pulado', 'sem-resposta', 'perdido'].includes(r.resultado)).slice(-100);
}

function validarLembrete(x: unknown): LembretePessoal | null {
  if (typeof x !== 'object' || x === null) return null;
  const b = x as Record<string, unknown>;
  if (!Number.isInteger(b.numero) || (b.numero as number) < 1) return null;
  if (typeof b.texto !== 'string' || !b.texto.trim() || !data(b.criadoEm) || !data(b.proximo)) return null;
  if (b.estado !== 'ativo' && b.estado !== 'encerrado' && b.estado !== 'cancelado') return null;
  const l: LembretePessoal = {
    numero: b.numero as number,
    texto: b.texto.slice(0, TEXTO_MAX),
    criadoEm: b.criadoEm,
    inicio: data(b.inicio) ? b.inicio : b.proximo,
    proximo: b.proximo,
    firme: b.firme !== false,
    remedio: b.remedio === true,
    estado: b.estado,
    registro: validarRegistro(b.registro),
  };
  const regra = validarRegra(b.regra);
  if (regra) l.regra = regra;
  if (data(b.fim)) l.fim = b.fim;
  if (typeof b.demandaId === 'string' && b.demandaId) l.demandaId = b.demandaId.slice(0, 80);
  if (typeof b.demandaTitulo === 'string' && b.demandaTitulo) l.demandaTitulo = b.demandaTitulo.slice(0, 200);
  if (data(b.adiadoAte)) l.adiadoAte = b.adiadoAte;
  const d = b.disparo as Record<string, unknown> | undefined;
  if (d && typeof d === 'object' && data(d.previsto) && data(d.desde)) l.disparo = { previsto: d.previsto, desde: d.desde, ...(d.atrasado === true ? { atrasado: true } : {}) };
  return l;
}

export function validarEstado(x: unknown): Estado {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return VAZIO;
  const b = x as Record<string, unknown>;
  const itens = Array.isArray(b.itens) ? b.itens.map(validarLembrete).filter((l): l is LembretePessoal => l !== null) : [];
  const numeros = new Set<number>();
  const unicos = itens.filter((l) => (numeros.has(l.numero) ? false : (numeros.add(l.numero), true)));
  const maior = unicos.reduce((m, l) => Math.max(m, l.numero), 0);
  const proximoNumero = Number.isInteger(b.proximoNumero) && (b.proximoNumero as number) > maior ? (b.proximoNumero as number) : maior + 1;
  return { versao: 1, proximoNumero, itens: podar(unicos) };
}

function podar(itens: LembretePessoal[]): LembretePessoal[] {
  const ativos = itens.filter((l) => l.estado === 'ativo').slice(-MAXIMO_ATIVOS);
  const inativos = itens.filter((l) => l.estado !== 'ativo').slice(-MAXIMO_INATIVOS);
  return [...ativos, ...inativos].sort((a, b) => a.numero - b.numero);
}

// ---------- Armazém ----------

const ouvintes = new Set<() => void>();
let brutoLido: string | null | undefined;
let atual: Estado = VAZIO;
let soNaMemoria = false;

function lerBruto(): string | null | undefined {
  try {
    return window.localStorage.getItem(CHAVE_LEMBRETES_PESSOAIS);
  } catch {
    return undefined;
  }
}

function obterEstado(): Estado {
  if (soNaMemoria) return atual;
  const bruto = lerBruto();
  if (bruto === undefined) {
    soNaMemoria = true;
    return atual;
  }
  if (bruto !== brutoLido) {
    brutoLido = bruto;
    try {
      atual = bruto === null ? VAZIO : validarEstado(JSON.parse(bruto));
    } catch {
      atual = VAZIO;
    }
  }
  return atual;
}

function gravar(novo: Estado) {
  atual = { ...novo, itens: podar(novo.itens) };
  const bruto = JSON.stringify(atual);
  try {
    window.localStorage.setItem(CHAVE_LEMBRETES_PESSOAIS, bruto);
    brutoLido = bruto;
    soNaMemoria = false;
  } catch {
    soNaMemoria = true;
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function obterLembretesPessoais(): LembretePessoal[] {
  return obterEstado().itens;
}

/** Grava um pedido já interpretado; devolve o lembrete com o número que a pessoa vai usar. */
export function criarLembrete(pedido: PedidoLembrete, agora: Date, demanda?: { id: string; titulo: string }): LembretePessoal {
  const estado = obterEstado();
  const l: LembretePessoal = {
    numero: estado.proximoNumero,
    texto: pedido.texto.slice(0, TEXTO_MAX),
    criadoEm: agora.toISOString(),
    inicio: pedido.proximo.toISOString(),
    proximo: pedido.proximo.toISOString(),
    firme: pedido.firme,
    remedio: pedido.remedio,
    estado: 'ativo',
    registro: [],
  };
  if (pedido.regra) l.regra = pedido.regra;
  if (pedido.fim) l.fim = pedido.fim.toISOString();
  if (demanda) { l.demandaId = demanda.id; l.demandaTitulo = demanda.titulo.slice(0, 200); }
  gravar({ versao: 1, proximoNumero: estado.proximoNumero + 1, itens: [...estado.itens, l] });
  return l;
}

/** Cancela pelo número; devolve o lembrete cancelado ou null. */
export function cancelarLembrete(numero: number): LembretePessoal | null {
  const estado = obterEstado();
  const alvo = estado.itens.find((l) => l.numero === numero && l.estado === 'ativo');
  if (!alvo) return null;
  const { disparo: _d, adiadoAte: _a, ...resto } = alvo;
  const cancelado: LembretePessoal = { ...resto, estado: 'cancelado' };
  gravar({ ...estado, itens: estado.itens.map((l) => (l === alvo ? cancelado : l)) });
  return cancelado;
}

/** Desfaz um cancelamento (volta a ativo, sem aviso pendente). */
export function reativarLembrete(numero: number): LembretePessoal | null {
  const estado = obterEstado();
  const alvo = estado.itens.find((l) => l.numero === numero && l.estado === 'cancelado');
  if (!alvo) return null;
  const ativo: LembretePessoal = { ...alvo, estado: 'ativo' };
  gravar({ ...estado, itens: estado.itens.map((l) => (l === alvo ? ativo : l)) });
  return ativo;
}

export function responderAviso(numero: number, resposta: Resposta, agora: Date, ajuste: AjusteFeriados = {}) {
  const estado = obterEstado();
  gravar({ ...estado, itens: aplicarResposta(estado.itens, numero, resposta, agora, ajuste) });
}

/** Faz o relógio andar; só grava quando algo mudou. */
export function executarRelogio(agora: Date, ajuste: AjusteFeriados = {}) {
  const estado = obterEstado();
  const itens = avancarRelogio(estado.itens, agora, ajuste);
  if (itens !== estado.itens) gravar({ ...estado, itens });
}

/**
 * Cancela os lembretes ligados a demandas que não estão mais abertas (concluídas ou excluídas).
 * Devolve quantos cancelou.
 */
export function cancelarDeDemandasFechadas(abertas: ReadonlySet<string>): number {
  const estado = obterEstado();
  let n = 0;
  const itens = estado.itens.map((l) => {
    if (l.estado !== 'ativo' || !l.demandaId || abertas.has(l.demandaId)) return l;
    n++;
    const { disparo: _d, adiadoAte: _a, ...resto } = l;
    return { ...resto, estado: 'cancelado' as const };
  });
  if (n) gravar({ ...estado, itens });
  return n;
}

export function limparLembretesPessoais() {
  gravar(VAZIO);
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  window.addEventListener('storage', ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener('storage', ouvinte);
  };
}

export function useLembretesPessoais(): LembretePessoal[] {
  return useSyncExternalStore(assinar, obterLembretesPessoais);
}
