// Relógio dos lembretes pessoais: regras puras (sem DOM e sem relógio próprio), testáveis com `agora` fixo.
// Decide quando um lembrete toca, quando insiste (nível 1 → 2 → 3), o que fazer com o que tocou
// enquanto a página estava fechada e qual é a próxima vez de um lembrete que se repete.
// O efeito na tela (balão, som, notificação) fica em AvisosLembretes.tsx e sinais.ts.

import { dataLocal, ehDiaUtil, feriadosEntre, type AjusteFeriados } from '../alertas/dias-uteis.ts';
import { CONFIG_LEMBRETES, dentroDaJanela, descreverIntervalo, textoHora, type Regra } from './interpretar.ts';

const MIN_MS = 60_000;
/** Até quanto atraso o lembrete ainda é tratado como "na hora" (página aberta, aba dormindo). */
export const TOLERANCIA_MS = 2 * MIN_MS;
const MAXIMO_REGISTRO = 100;

export type Resultado = 'feito' | 'pulado' | 'sem-resposta' | 'perdido';

export interface RegistroOcorrencia {
  previsto: string;
  resultado: Resultado;
  em: string;
}

export interface LembretePessoal {
  /** Número que a pessoa usa na conversa ("cancelar lembrete 2"). */
  numero: number;
  texto: string;
  criadoEm: string;
  /** Primeira vez (para contar "dose 4 de 21"). */
  inicio: string;
  /** Próxima vez prevista (ISO). */
  proximo: string;
  regra?: Regra;
  /** Fim exclusivo das repetições (ISO). */
  fim?: string;
  firme: boolean;
  remedio: boolean;
  demandaId?: string;
  demandaTitulo?: string;
  estado: 'ativo' | 'encerrado' | 'cancelado';
  /** Presente enquanto o aviso está na tela esperando resposta. */
  disparo?: { previsto: string; desde: string; atrasado?: boolean };
  /** "Adiar 10 min": volta a tocar nesta hora, para a mesma ocorrência. */
  adiadoAte?: string;
  registro: RegistroOcorrencia[];
}

export type Resposta = { acao: 'feito' } | { acao: 'pular' } | { acao: 'adiar'; minutos: number };

// ---------- Próxima vez ----------

function diaUtil(d: Date, ajuste: AjusteFeriados): boolean {
  const dia = dataLocal(d);
  return ehDiaUtil(dia, feriadosEntre(dia, dia, ajuste));
}

/** Próxima vez depois de `previsto`, ou null quando não repete ou passou do fim. */
export function proximaOcorrencia(l: Pick<LembretePessoal, 'regra' | 'fim' | 'firme'>, previsto: Date, ajuste: AjusteFeriados = {}): Date | null {
  const r = l.regra;
  if (!r) return null;
  let d: Date;
  if (r.tipo === 'intervalo') {
    d = new Date(previsto.getTime() + r.minutos * MIN_MS);
    if (!l.firme) d = dentroDaJanela(d);
  } else {
    d = new Date(previsto);
    for (let i = 0; i < 400; i++) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, d.getHours(), d.getMinutes());
      if (r.tipo === 'diario') break;
      if (r.tipo === 'semanal' && r.dias.includes(d.getDay())) break;
      if (r.tipo === 'uteis' && diaUtil(d, ajuste)) break;
    }
  }
  if (l.fim && d >= new Date(l.fim)) return null;
  return d;
}

/** Quantas vezes ao todo (só com fim) e qual é a desta ocorrência. Ex.: dose 4 de 21. */
export function contagem(l: LembretePessoal, previsto: Date, ajuste: AjusteFeriados = {}): { esta: number; total?: number } | null {
  if (!l.regra) return null;
  let d: Date | null = new Date(l.inicio);
  let n = 0;
  let esta = 0;
  while (d && n < 1000) {
    n++;
    if (d.getTime() === previsto.getTime()) esta = n;
    if (!l.fim && d >= previsto) break;
    d = proximaOcorrencia(l, d, ajuste);
  }
  if (!esta) return null;
  return { esta, total: l.fim ? n : undefined };
}

// ---------- Relógio ----------

function registrar(l: LembretePessoal, previsto: string, resultado: Resultado, agora: Date): RegistroOcorrencia[] {
  return [...l.registro, { previsto, resultado, em: agora.toISOString() }].slice(-MAXIMO_REGISTRO);
}

/** Passa para a próxima vez (ou encerra), sem disparo nem adiamento pendente. */
function avancar(l: LembretePessoal, previsto: Date, ajuste: AjusteFeriados): LembretePessoal {
  const { disparo: _d, adiadoAte: _a, ...resto } = l;
  const proxima = proximaOcorrencia(l, previsto, ajuste);
  return proxima ? { ...resto, proximo: proxima.toISOString() } : { ...resto, estado: 'encerrado' };
}

function tocar(l: LembretePessoal, agora: Date, ajuste: AjusteFeriados): LembretePessoal {
  if (l.estado !== 'ativo') return l;
  const insistir = CONFIG_LEMBRETES.insistirMin * MIN_MS;

  if (l.disparo) {
    const previsto = new Date(l.disparo.previsto);
    // Hábito sem resposta: não insiste nem acumula; passa para a próxima vez.
    if (!l.firme && agora.getTime() - new Date(l.disparo.desde).getTime() >= insistir) {
      return tocar(avancar({ ...l, registro: registrar(l, l.disparo.previsto, 'sem-resposta', agora) }, previsto, ajuste), agora, ajuste);
    }
    // Chegou a vez seguinte sem resposta à anterior: a anterior fica "sem resposta" e toca a nova.
    const seguinte = proximaOcorrencia(l, previsto, ajuste);
    if (seguinte && seguinte <= agora) {
      return tocar(avancar({ ...l, registro: registrar(l, l.disparo.previsto, 'sem-resposta', agora) }, previsto, ajuste), agora, ajuste);
    }
    return l;
  }

  const devido = new Date(l.adiadoAte ?? l.proximo);
  if (devido > agora) return l;
  if (l.adiadoAte) {
    const { adiadoAte: _a, ...resto } = l;
    return { ...resto, disparo: { previsto: l.proximo, desde: agora.toISOString() } };
  }

  let previsto = new Date(l.proximo);
  if (agora.getTime() - previsto.getTime() <= TOLERANCIA_MS) {
    return { ...l, disparo: { previsto: l.proximo, desde: agora.toISOString() } };
  }

  // Tocou com a página fechada. Hábito: descarta e vai para a próxima vez futura.
  let registro = l.registro;
  if (!l.firme) {
    let d: Date | null = previsto;
    for (let i = 0; d && d <= agora && i < 2000; i++) d = proximaOcorrencia(l, d, ajuste);
    return d ? { ...l, proximo: d.toISOString() } : { ...l, estado: 'encerrado' };
  }
  // Firme: um aviso só ("Era às 16h"), da vez mais recente; as anteriores ficam como perdidas.
  for (let i = 0; i < 2000; i++) {
    const d = proximaOcorrencia(l, previsto, ajuste);
    if (!d || d > agora) break;
    registro = [...registro, { previsto: previsto.toISOString(), resultado: 'perdido' as const, em: agora.toISOString() }].slice(-MAXIMO_REGISTRO);
    previsto = d;
  }
  return { ...l, registro, proximo: previsto.toISOString(), disparo: { previsto: previsto.toISOString(), desde: agora.toISOString(), atrasado: true } };
}

/** Atualiza os lembretes para `agora`. Devolve a mesma lista quando nada mudou. */
export function avancarRelogio(itens: readonly LembretePessoal[], agora: Date, ajuste: AjusteFeriados = {}): LembretePessoal[] {
  let mudou = false;
  const novos = itens.map((l) => {
    const n = tocar(l, agora, ajuste);
    if (n !== l) mudou = true;
    return n;
  });
  return mudou ? novos : (itens as LembretePessoal[]);
}

/** Aplica a resposta da pessoa ao aviso de um lembrete. */
export function aplicarResposta(itens: readonly LembretePessoal[], numero: number, resposta: Resposta, agora: Date, ajuste: AjusteFeriados = {}): LembretePessoal[] {
  return itens.map((l) => {
    if (l.numero !== numero || l.estado !== 'ativo') return l;
    const previsto = l.disparo?.previsto ?? l.proximo;
    if (resposta.acao === 'adiar') {
      const { disparo: _d, ...resto } = l;
      return { ...resto, proximo: previsto, adiadoAte: new Date(agora.getTime() + resposta.minutos * MIN_MS).toISOString() };
    }
    const resultado: Resultado = resposta.acao === 'feito' ? 'feito' : 'pulado';
    return avancar({ ...l, registro: registrar(l, previsto, resultado, agora) }, new Date(previsto), ajuste);
  });
}

// ---------- Destaque ----------

export type Nivel = 1 | 2 | 3;

/**
 * Nível do aviso na tela. 1: balão, mascote em alerta e som. 2: sem resposta depois de
 * `insistirMin`: insiste com notificação do navegador e título piscando. 3: sem resposta depois de
 * `insistirVezes` insistências: o balão sai e fica o selo ⚠️. Hábito fica sempre no 1.
 */
export function nivelDoAviso(l: LembretePessoal, agora: Date): Nivel | 0 {
  if (!l.disparo || l.estado !== 'ativo') return 0;
  if (!l.firme) return 1;
  const passou = agora.getTime() - new Date(l.disparo.desde).getTime();
  const insistir = CONFIG_LEMBRETES.insistirMin * MIN_MS;
  if (passou >= insistir * CONFIG_LEMBRETES.insistirVezes) return 3;
  if (passou >= insistir) return 2;
  return 1;
}

/** Quantas vezes já insistiu (0 no primeiro toque); muda a cada `insistirMin`. */
export function insistencia(l: LembretePessoal, agora: Date): number {
  if (!l.disparo) return 0;
  return Math.min(CONFIG_LEMBRETES.insistirVezes, Math.floor((agora.getTime() - new Date(l.disparo.desde).getTime()) / (CONFIG_LEMBRETES.insistirMin * MIN_MS)));
}

/** Avisos na tela, firmes primeiro e depois pela hora prevista. */
export function avisosNaTela(itens: readonly LembretePessoal[], agora: Date): { lembrete: LembretePessoal; nivel: Nivel }[] {
  return itens
    .map((lembrete) => ({ lembrete, nivel: nivelDoAviso(lembrete, agora) }))
    .filter((a): a is { lembrete: LembretePessoal; nivel: Nivel } => a.nivel !== 0)
    .sort((a, b) => Number(b.lembrete.firme) - Number(a.lembrete.firme) || a.lembrete.disparo!.previsto.localeCompare(b.lembrete.disparo!.previsto));
}

// ---------- Textos ----------

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const SEMANA_LONGA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "hoje às 22h51 (daqui 1 min)", "amanhã (seg 16/11) às 9h", "sex 20/11 às 9h". */
export function textoQuando(d: Date, agora: Date): string {
  const dias = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())) / 86_400_000);
  const data = `${SEMANA[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const hora = `às ${textoHora(d)}`;
  if (dias === 0) {
    const falta = Math.round((d.getTime() - agora.getTime()) / MIN_MS);
    return falta > 0 && falta < 60 ? `hoje ${hora} (daqui ${falta} min)` : `hoje ${hora}`;
  }
  if (dias === 1) return `amanhã (${data}) ${hora}`;
  return `${data} ${hora}`;
}

export function descreverRegra(regra: Regra | undefined): string {
  if (!regra) return 'uma vez';
  if (regra.tipo === 'intervalo') return `de ${descreverIntervalo(regra.minutos)}`;
  if (regra.tipo === 'diario') return 'todo dia';
  if (regra.tipo === 'uteis') return 'em dias úteis';
  return `toda ${regra.dias.map((d) => SEMANA_LONGA[d]).join(' e ')}`;
}
