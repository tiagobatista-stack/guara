// Leitura de pedidos de lembrete em português falado, por regras (sem IA e sem rede).
// Função pura: recebe `agora`, não lê o relógio e não grava nada. Datas no fuso do navegador.
// Especificação: ROTINA_LEMBRETES.md (seções 1 a 3), adaptada ao app web.
// Exemplos: "me lembre de beber água daqui 1 min", "me lembre de tomar antibiótico 3x ao dia",
// "ligar para o proprietário do processo 213456/2022 amanhã de manhã".

import { dataLocal, ehDiaUtil, feriadosNacionais } from '../alertas/dias-uteis.ts';

export const CONFIG_LEMBRETES = {
  /** Hora usada quando só o dia foi dito (minutos desde 0h). */
  horaPadrao: 9 * 60,
  /** "daqui a pouco", em minutos. */
  poucoMin: 15,
  /** Hábitos (água, alongar) só tocam dentro desta janela; doses fora dela geram um aviso na confirmação. */
  janelaInicio: 7 * 60,
  janelaFim: 22 * 60,
  /** Lembrete firme sem resposta: insiste a cada tantos minutos, até tantas vezes. */
  insistirMin: 10,
  insistirVezes: 3,
} as const;

const PALAVRAS_REMEDIO = ['remedio', 'comprimido', 'dose', 'antibiotico', 'gotas', 'capsula', 'xarope', 'medicamento', 'pomada', 'insulina', 'vitamina'];
const PALAVRAS_HABITO = ['agua', 'alongar', 'alongamento', 'postura', 'levantar', 'esticar', 'pausa', 'descansar a vista'];
const VERBOS_SEM_GATILHO = ['ligar', 'telefonar', 'tomar', 'beber', 'buscar', 'pagar', 'levar', 'retornar', 'mandar', 'enviar', 'responder', 'cobrar'];

/** Períodos do dia, do mais específico para o mais geral. */
const PERIODOS: readonly { re: RegExp; minutos: number }[] = [
  { re: /\bantes do almoco\b/, minutos: 11 * 60 + 30 },
  { re: /\bdepois do almoco\b/, minutos: 13 * 60 },
  { re: /\b(?:no )?fim (?:da tarde|do expediente|do dia)\b/, minutos: 17 * 60 },
  { re: /\bantes de dormir\b/, minutos: 22 * 60 },
  { re: /\b(?:de|pela|na|amanha a|hoje a) ?manha(?: cedo)?\b|\bcedinho\b|\bcedo\b/, minutos: 9 * 60 },
  { re: /\b(?:a|de|pela|na) tarde\b|\bhoje a tarde\b/, minutos: 14 * 60 },
  { re: /\b(?:a|de|pela|na) noite\b|\bhoje a noite\b/, minutos: 19 * 60 },
];

export type Regra =
  | { tipo: 'intervalo'; minutos: number }
  | { tipo: 'diario' }
  | { tipo: 'uteis' }
  | { tipo: 'semanal'; dias: number[] };

export interface PedidoLembrete {
  texto: string;
  /** Primeira ocorrência. */
  proximo: Date;
  regra?: Regra;
  /** Fim exclusivo das repetições. */
  fim?: Date;
  /** Firme: hora marcada, remédio, demanda; toca mesmo em foco e insiste. Suave: hábito. */
  firme: boolean;
  remedio: boolean;
  /** Número de processo achado na frase (para ligar o lembrete à demanda). */
  processo?: string;
  /** Observações para a confirmação ("amanhã, porque 8h já passou"). */
  notas: string[];
}

export interface OpcaoResposta {
  rotulo: string;
  comando: string;
}

export type Interpretacao =
  | { tipo: 'lembrete'; pedido: PedidoLembrete }
  | { tipo: 'pergunta'; texto: string; opcoes: OpcaoResposta[] }
  | { tipo: 'nao-e-lembrete' };

// ---------- Texto ----------

/** Minúsculas e sem acento, caractere a caractere (mantém as posições do texto original). */
function normalizar(s: string): string {
  return [...s].map((c) => {
    const r = c.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return r.length === c.length ? r : c;
  }).join('');
}

const NUMEROS_EXTENSO: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, meia: 0.5,
};
const NUM = `(\\d+|${Object.keys(NUMEROS_EXTENSO).join('|')})`;
const lerNumero = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUMEROS_EXTENSO[s] ?? NaN);

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const DIA = `(?:${DIAS.join('|')})(?:-feira)?`;
const UNIDADE = '(minutos?|min|horas?|hrs?|h)';
const minutosDaUnidade = (u: string) => (u.startsWith('m') ? 1 : 60);

/** Frase com as partes já reconhecidas apagadas (em espaços, para manter as posições). */
class Frase {
  readonly original: string;
  n: string;
  constructor(texto: string) {
    this.original = texto;
    this.n = normalizar(texto);
  }
  achar(re: RegExp): RegExpExecArray | null {
    const m = re.exec(this.n);
    if (m) this.n = this.n.slice(0, m.index) + ' '.repeat(m[0].length) + this.n.slice(m.index + m[0].length);
    return m;
  }
  /** O que sobrou do texto original, sem as partes reconhecidas e sem conectivos soltos nas pontas. */
  sobra(): string {
    let orig = '';
    let norm = '';
    for (let i = 0; i < this.original.length; i++) {
      const apagado = this.n[i] === ' ' && this.original[i] !== ' ';
      orig += apagado ? ' ' : this.original[i];
      norm += apagado ? ' ' : this.n[i];
    }
    const juntar = (s: string) => s.replace(/\s+/g, ' ').trim();
    orig = juntar(orig);
    norm = juntar(norm);
    const conectivo = /^(?:de|do|da|no|na|nos|nas|em|as|a|ao|e|para|pra|pela|pelas|ate|por|durante|comecando|que|o|,|\.|;|-)$/;
    let palavrasO = orig.split(' ');
    let palavrasN = norm.split(' ');
    if (palavrasO.length !== palavrasN.length) return orig;
    while (palavrasN.length && conectivo.test(palavrasN[palavrasN.length - 1])) { palavrasN = palavrasN.slice(0, -1); palavrasO = palavrasO.slice(0, -1); }
    while (palavrasN.length && /^(?:de|que|para|pra|,|:|-)$/.test(palavrasN[0])) { palavrasN = palavrasN.slice(1); palavrasO = palavrasO.slice(1); }
    return palavrasO.join(' ').replace(/[\s,;:.-]+$/, '');
  }
}

// ---------- Datas ----------

const MIN_MS = 60_000;
const DIA_MS = 24 * 60 * MIN_MS;

function noDia(base: Date, minutos: number, diasAMais = 0): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + diasAMais, Math.floor(minutos / 60), minutos % 60, 0, 0);
}
const minutosDoDia = (d: Date) => d.getHours() * 60 + d.getMinutes();

export function textoHora(d: Date): string {
  return d.getMinutes() ? `${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}` : `${d.getHours()}h`;
}

/** Próximo dia (a partir de hoje) que é o dia da semana pedido; hoje só se a hora ainda não passou. */
function proximoDiaDaSemana(agora: Date, semana: number, minutos: number): Date {
  for (let i = 0; i < 8; i++) {
    const d = noDia(agora, minutos, i);
    if (d.getDay() === semana && d > agora) return d;
  }
  return noDia(agora, minutos, 7);
}

/** Lê um dia na frase (hoje, amanhã, sexta, 20/11, dia 20). Devolve a data à 0h. */
function lerDia(f: Frase, agora: Date): Date | null {
  const hoje = noDia(agora, 0);
  if (f.achar(/\bdepois de amanha\b/)) return noDia(agora, 0, 2);
  if (f.achar(/\bamanha\b/)) return noDia(agora, 0, 1);
  const emDias = f.achar(new RegExp(`\\b(?:daqui|dentro de|em)(?:\\s+a)?\\s+${NUM}\\s+(dias?|semanas?)\\b`));
  if (emDias) return noDia(agora, 0, Math.round(lerNumero(emDias[1]) * (emDias[2].startsWith('semana') ? 7 : 1)));
  const data = f.achar(/\b(?:dia |em |no dia )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (data) {
    const [, dd, mm, aa] = data;
    let ano = aa ? Number(aa.length === 2 ? `20${aa}` : aa) : agora.getFullYear();
    let d = new Date(ano, Number(mm) - 1, Number(dd));
    if (!aa && d < hoje) { ano += 1; d = new Date(ano, Number(mm) - 1, Number(dd)); }
    return d;
  }
  const diaMes = f.achar(/\bdia (\d{1,2})\b/);
  if (diaMes) {
    let d = new Date(agora.getFullYear(), agora.getMonth(), Number(diaMes[1]));
    if (d < hoje) d = new Date(agora.getFullYear(), agora.getMonth() + 1, Number(diaMes[1]));
    return d;
  }
  const semana = f.achar(new RegExp(`\\b(?:(?:na|no|nesta|neste|esta|este|proxima|proximo|essa|nessa)\\s+)?(${DIA})\\b`));
  if (semana) {
    const alvo = DIAS.indexOf(semana[1].replace('-feira', ''));
    const d = proximoDiaDaSemana(agora, alvo, 0);
    // Hoje conta como o dia pedido: a hora decide depois se ainda dá.
    return agora.getDay() === alvo ? hoje : d;
  }
  if (f.achar(/\bhoje\b/)) return hoje;
  return null;
}

const HORA = '(\\d{1,2})(?:(h|:)(\\d{2})?|\\s*horas?)?(?:\\s+(?:da|de)\\s+(manha|tarde|noite|madrugada))?';

function minutosDaHora(m: RegExpExecArray, i: number, comMarca: boolean): number | null {
  let h = Number(m[i]);
  const min = m[i + 2] ? Number(m[i + 2]) : 0;
  const periodo = m[i + 3];
  if (h > 23 || min > 59) return null;
  if ((periodo === 'tarde' || periodo === 'noite') && h < 12) h += 12;
  // "às 3" (sem "h" e sem período): de 1 a 7 entende-se da tarde.
  if (!periodo && !comMarca && h >= 1 && h <= 7) h += 12;
  return h * 60 + min;
}

/** Lê a hora: "às 14h", "14:30", "às 3 da tarde", "meio-dia", "meia-noite". */
function lerHora(f: Frase): number | null {
  if (f.achar(/\b(?:ao |as |a )?meio[- ]dia(?: e meia)?\b/)) return 12 * 60;
  if (f.achar(/\b(?:a )?meia[- ]noite\b/)) return 0;
  const comAs = f.achar(new RegExp(`\\b(?:as|ao|pelas|la pelas)\\s+${HORA}(?![\\w/])`));
  if (comAs) return minutosDaHora(comAs, 1, Boolean(comAs[2]) || /hora/.test(comAs[0]));
  const solta = f.achar(/\b(\d{1,2})(h|:)(\d{2})?(?:\s+(?:da|de)\s+(manha|tarde|noite|madrugada))?(?![\w/])/);
  if (solta) return minutosDaHora(solta, 1, true);
  return null;
}

function lerPeriodo(f: Frase): number | null {
  for (const p of PERIODOS) if (f.achar(p.re)) return p.minutos;
  return null;
}

// ---------- Repetição, duração e começo ----------

function lerRegra(f: Frase): Regra | null {
  const vezes = f.achar(new RegExp(`\\b${NUM}\\s*(?:x|vezes)\\s*(?:ao|por|no|a)\\s*dia\\b`));
  if (vezes) {
    const n = lerNumero(vezes[1]);
    if (n >= 1 && n <= 24) return { tipo: 'intervalo', minutos: Math.round(1440 / n) };
  }
  const deEmDe = f.achar(new RegExp(`\\bde\\s+${NUM}\\s+em\\s+${NUM}\\s*${UNIDADE}\\b`));
  if (deEmDe) return { tipo: 'intervalo', minutos: lerNumero(deEmDe[2]) * minutosDaUnidade(deEmDe[3]) };
  if (f.achar(/\bde hora em hora\b/)) return { tipo: 'intervalo', minutos: 60 };
  if (f.achar(/\bde meia em meia hora\b/)) return { tipo: 'intervalo', minutos: 30 };
  const aCada = f.achar(new RegExp(`\\b(?:a|de)\\s+cada\\s+(?:${NUM}\\s*)?${UNIDADE}\\b`));
  if (aCada) {
    const n = aCada[1] ? lerNumero(aCada[1]) : 1;
    return { tipo: 'intervalo', minutos: Math.round(n * minutosDaUnidade(aCada[2])) };
  }
  if (f.achar(/\b(?:(?:nos|em)\s+)?dias?\s+uteis\b|\bde\s+segunda\s+a\s+sexta\b/)) return { tipo: 'uteis' };
  if (f.achar(/\b(?:todos?\s+os\s+dias|todo\s+dia|diariamente|todas?\s+as\s+(?:manhas|tardes|noites))\b/)) return { tipo: 'diario' };
  const semanal = f.achar(new RegExp(`\\btod[ao]s?\\s+(?:as\\s+|os\\s+)?(${DIA}s?(?:\\s*(?:,|e)\\s*${DIA}s?)*)`));
  if (semanal) {
    const dias = [...new Set(DIAS.map((d, i) => (semanal[1].includes(d) ? i : -1)).filter((i) => i >= 0))];
    if (dias.length) return { tipo: 'semanal', dias };
  }
  return null;
}

type Duracao = { dias: number } | { ate: Date } | { semFim: true };

function lerDuracao(f: Frase, agora: Date): Duracao | null {
  if (f.achar(/\bsem fim\b|\b(?:pra|para) sempre\b|\bate eu (?:parar|cancelar)\b/)) return { semFim: true };
  const por = f.achar(new RegExp(`\\b(?:por|durante)\\s+${NUM}\\s+(dias?|semanas?|mes|meses)\\b`));
  if (por) {
    const n = lerNumero(por[1]);
    const fator = por[2].startsWith('semana') ? 7 : por[2].startsWith('mes') ? 30 : 1;
    return { dias: n * fator };
  }
  const ate = f.achar(new RegExp(`\\bate\\s+(?:o\\s+dia\\s+|dia\\s+|a\\s+|o\\s+)?(amanha|${DIA}|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?)\\b`));
  if (ate) {
    const sub = new Frase(ate[1]);
    const dia = lerDia(sub, agora);
    if (dia) return { ate: noDia(dia, 0, 1) };
  }
  return null;
}

type Comeco = { agora: true } | { minutos: number };

function lerComeco(f: Frase): Comeco | null {
  const m = f.achar(new RegExp(`\\b(?:comecando|a partir d[ae]s?|primeira dose|primeira|1a dose)\\s+(?:(agora|ja)|(?:(?:as|a)\\s+)?${HORA})`));
  if (!m) return null;
  if (m[1]) return { agora: true };
  const minutos = minutosDaHora(m, 2, Boolean(m[3]) || /hora/.test(m[0]) || /\bas\b/.test(m[0]));
  return minutos === null ? null : { minutos };
}

function lerRelativo(f: Frase): number | null {
  if (f.achar(/\bdaqui (?:a )?(?:pouco|pouquinho)\b/)) return CONFIG_LEMBRETES.poucoMin;
  const hm = f.achar(/\b(?:daqui|dentro de|em)(?: a)?\s+(\d{1,2})h(\d{2})\b/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);
  const m = f.achar(new RegExp(`\\b(?:daqui|dqui|dentro de|em)(?:\\s+a)?\\s+${NUM}\\s*${UNIDADE}(\\s+e\\s+meia)?\\b`));
  if (m) return Math.round(lerNumero(m[1]) * minutosDaUnidade(m[2]) + (m[3] ? 30 : 0));
  const meia = f.achar(/\b(?:daqui|dentro de|em)(?: a)? meia hora\b/);
  if (meia) return 30;
  return null;
}

/** Nº de processo: SIGLA-PRO-AAAA/NNNN, FIC-AAAA-NNNN ou NNNNNN/AAAA. */
function lerProcessoNaFrase(frase: string): string | undefined {
  const n = normalizar(frase);
  const m = /\b[a-z]{2,10}-[a-z]{2,5}-\d{4}\/\d{1,8}\b|\b[a-z]{2,6}-\d{4}-\d{2,8}\b|\b\d{3,8}\/\d{4}\b/.exec(n);
  return m ? frase.slice(m.index, m.index + m[0].length).toUpperCase() : undefined;
}

// ---------- Gatilho ----------

const GATILHO = /^\s*(?:(?:por favor|ei|oi)[,\s]+)?(?:me\s+lembr[ae]r?(?:-me)?|lembr[ae]-me|lembrar|lembrete|me\s+avis[ae]r?|avis[ae]-me|avisar)\b[:,]?\s*/;

/** Diz se a frase pede um lembrete: começa com "me lembre", "lembrete", "me avise"... */
export function temGatilhoDeLembrete(frase: string): boolean {
  return GATILHO.test(normalizar(frase));
}

const contem = (n: string, palavras: readonly string[]) => palavras.some((p) => new RegExp(`\\b${p}`).test(n));

// ---------- Leitura ----------

/**
 * Lê um pedido de lembrete. `nao-e-lembrete` quando a frase não pede lembrete (o assistente segue
 * com os outros comandos); `pergunta` quando falta algo que a mascote não deve adivinhar.
 */
export function interpretarLembrete(frase: string, agora: Date): Interpretacao {
  const original = frase.trim();
  if (!original) return { tipo: 'nao-e-lembrete' };
  const f = new Frase(original);
  const comGatilho = Boolean(f.achar(GATILHO));
  const nTudo = normalizar(original);
  if (!comGatilho) {
    const verbo = new RegExp(`^\\s*(?:preciso\\s+|tenho\\s+que\\s+)?(?:${VERBOS_SEM_GATILHO.join('|')})\\b`);
    if (!verbo.test(nTudo)) return { tipo: 'nao-e-lembrete' };
  }

  const processo = lerProcessoNaFrase(original);
  const regra = lerRegra(f);
  const duracao = lerDuracao(f, agora);
  const comeco = lerComeco(f);
  const relativo = lerRelativo(f);
  const dia = lerDia(f, agora);
  const hora = lerHora(f);
  const periodo = hora === null ? lerPeriodo(f) : null;
  const minutos = hora ?? periodo;

  const algumTempo = regra || relativo !== null || dia || minutos !== null || comeco;
  if (!comGatilho && !algumTempo) return { tipo: 'nao-e-lembrete' };

  const texto = f.sobra() || 'Lembrete';
  const remedio = contem(nTudo, PALAVRAS_REMEDIO);
  const habito = !remedio && contem(nTudo, PALAVRAS_HABITO);
  const notas: string[] = [];
  const completar = (sufixo: string) => `${original} ${sufixo}`;

  if (!algumTempo) {
    return {
      tipo: 'pergunta',
      texto: `Quando devo lembrar de «${texto}»?`,
      opcoes: [
        { rotulo: 'Daqui 10 min', comando: completar('daqui 10 min') },
        { rotulo: 'Daqui 1 hora', comando: completar('daqui 1 hora') },
        { rotulo: 'Amanhã de manhã', comando: completar('amanhã de manhã') },
      ],
    };
  }

  let proximo: Date;
  if (relativo !== null) {
    proximo = new Date(agora.getTime() + relativo * MIN_MS);
  } else if (regra?.tipo === 'intervalo') {
    const inicio = comeco ?? (minutos !== null ? { minutos } : null);
    if (inicio && 'agora' in inicio) {
      proximo = new Date(agora);
      proximo.setSeconds(0, 0);
    } else if (inicio) {
      proximo = noDia(dia ?? agora, inicio.minutos);
      if (proximo <= agora) { proximo = noDia(proximo, inicio.minutos, 1); notas.push(`começa amanhã, porque ${textoHora(noDia(agora, inicio.minutos))} já passou`); }
    } else if (regra.minutos < 240 && !remedio) {
      proximo = new Date(agora.getTime() + regra.minutos * MIN_MS);
    } else {
      return {
        tipo: 'pergunta',
        texto: `A que horas é a primeira vez de «${texto}»? As outras saem de ${descreverIntervalo(regra.minutos)}.`,
        opcoes: [
          { rotulo: 'Agora', comando: completar('começando agora') },
          { rotulo: 'Às 8h', comando: completar('começando às 8h') },
          { rotulo: 'Às 12h', comando: completar('começando às 12h') },
        ],
      };
    }
    if (habito) proximo = dentroDaJanela(proximo);
  } else {
    const min = minutos ?? (comeco && 'minutos' in comeco ? comeco.minutos : null);
    if (regra) {
      const m = min ?? CONFIG_LEMBRETES.horaPadrao;
      proximo = primeiraDaRegra(regra, dia ?? agora, m, agora);
    } else if (dia && min === null) {
      proximo = noDia(dia, CONFIG_LEMBRETES.horaPadrao);
      if (proximo <= agora) {
        return {
          tipo: 'pergunta',
          texto: `A que horas devo lembrar de «${texto}»?`,
          opcoes: [
            { rotulo: 'Daqui 1 hora', comando: completar('daqui 1 hora') },
            { rotulo: 'Às 17h', comando: completar('às 17h') },
            { rotulo: 'Amanhã às 9h', comando: `${original.replace(/\bhoje\b/i, '')} amanhã às 9h`.replace(/\s+/g, ' ') },
          ],
        };
      }
    } else if (min !== null) {
      proximo = noDia(dia ?? agora, min);
      if (proximo <= agora && !dia) {
        proximo = noDia(agora, min, 1);
        notas.push(`amanhã, porque ${textoHora(noDia(agora, min))} de hoje já passou`);
      } else if (proximo <= agora) {
        return { tipo: 'pergunta', texto: `${textoHora(proximo)} de hoje já passou. Quando devo lembrar de «${texto}»?`, opcoes: [
          { rotulo: 'Daqui 10 min', comando: `lembrete ${texto} daqui 10 min` },
          { rotulo: 'Amanhã nessa hora', comando: `lembrete ${texto} amanhã às ${textoHora(proximo)}` },
        ] };
      }
    } else {
      proximo = new Date(agora.getTime() + CONFIG_LEMBRETES.poucoMin * MIN_MS);
    }
  }

  let fim: Date | undefined;
  if (regra) {
    if (duracao && 'dias' in duracao) fim = new Date(proximo.getTime() + duracao.dias * DIA_MS);
    else if (duracao && 'ate' in duracao) fim = duracao.ate;
    else if (!duracao && remedio) {
      return {
        tipo: 'pergunta',
        texto: `Por quantos dias devo lembrar de «${texto}»? Siga a receita: eu só repito o que você disser.`,
        opcoes: [
          { rotulo: '5 dias', comando: completar('por 5 dias') },
          { rotulo: '7 dias', comando: completar('por 7 dias') },
          { rotulo: '10 dias', comando: completar('por 10 dias') },
          { rotulo: 'Sem fim', comando: completar('sem fim') },
        ],
      };
    }
    if (regra.tipo === 'intervalo' && remedio) {
      const fora = horariosDoDia(proximo, regra.minutos).filter((m) => m < CONFIG_LEMBRETES.janelaInicio || m >= CONFIG_LEMBRETES.janelaFim);
      if (fora.length) notas.push(`${fora.length === 1 ? 'uma das vezes cai' : 'algumas vezes caem'} às ${fora.map((m) => textoHora(noDia(agora, m))).join(' e ')}`);
    }
  }

  return {
    tipo: 'lembrete',
    pedido: { texto, proximo, regra: regra ?? undefined, fim, firme: !habito, remedio, processo, notas },
  };
}

/** Hábito fora da janela do dia vai para o começo dela (hoje ou amanhã). */
export function dentroDaJanela(d: Date): Date {
  const m = minutosDoDia(d);
  if (m < CONFIG_LEMBRETES.janelaInicio) return noDia(d, CONFIG_LEMBRETES.janelaInicio);
  if (m >= CONFIG_LEMBRETES.janelaFim) return noDia(d, CONFIG_LEMBRETES.janelaInicio, 1);
  return d;
}

/** Horários (minutos do dia) de um ciclo de 24 h a partir da primeira vez. */
function horariosDoDia(primeira: Date, intervalo: number): number[] {
  const lista: number[] = [];
  for (let t = 0; t < 1440; t += intervalo) lista.push((minutosDoDia(primeira) + t) % 1440);
  return lista;
}

function primeiraDaRegra(regra: Regra, base: Date, minutos: number, agora: Date): Date {
  for (let i = 0; i < 400; i++) {
    const d = noDia(base, minutos, i);
    if (d <= agora) continue;
    if (regra.tipo === 'diario') return d;
    if (regra.tipo === 'semanal' && regra.dias.includes(d.getDay())) return d;
    if (regra.tipo === 'uteis' && ehDiaUtil(dataLocal(d), new Set(feriadosNacionais(d.getFullYear())))) return d;
  }
  return noDia(base, minutos, 1);
}

export function descreverIntervalo(minutos: number): string {
  if (minutos === 60) return 'hora em hora';
  if (minutos % 60 === 0) return `${minutos / 60} em ${minutos / 60} horas`;
  return `${minutos} em ${minutos} minutos`;
}
