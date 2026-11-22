// Interpretação de uma frase de compromisso (item 14, 21/11/2026): função pura, por regras, sem IA.
//   "reunião dia 10/12 sobre licenciamento"  → reunião · 10/12 · assunto "licenciamento"
// Tipo: reunião, palestra, curso, compromisso, audiência (vira compromisso) ou lembrar/lembrete.
// Data: dd/mm, dd/mm/aaaa, "10 de dezembro", "dia 10", hoje, amanhã, depois de amanhã e dias da semana.
//   Sem ano = próxima ocorrência (10/12 dito em 21/11/2026 é 10/12/2026; dito em 15/12, é 10/12 do ano seguinte).
// Hora opcional: "às 14h", "14h30", "14:30", "às 14". Sem hora = dia todo.
// Assunto: o que vem depois de "sobre", "de" ou "para" (o 1º que sobrar depois de tirar data e hora).
// O código DEM-FIC-nnnn vira vínculo. Nada é gravado aqui: quem chama mostra o que entendeu e pede confirmação.

import { dataValida } from '../demandas/regras.ts';
import { limparAssunto, type TipoDeCompromisso } from '../agenda/compromissos.ts';
import { diaDaSemana, MAXIMO_DE_DIAS_DO_EVENTO, numeroDoDia, type Repeticao } from '../agenda/recorrencia.ts';
import { extrairIds } from './extrair.ts';

export type ProblemaDaFrase = 'sem-data' | 'data-invalida' | 'data-passada' | 'hora-invalida' | 'hora-passada' | 'intervalo-invalido';

export interface Entendido {
  tipo: TipoDeCompromisso;
  /** AAAA-MM-DD, ou null quando a frase não tem data utilizável (veja `problema`). */
  data: string | null;
  /** Último dia de um evento de vários dias ("de 10/12 a 12/12"). */
  dataFim?: string;
  /** "toda segunda", "todo dia 10", "nos dias úteis"... */
  repeticao?: Exclude<Repeticao, 'nenhuma'>;
  /** Último dia da repetição ("toda segunda até 20/12"). */
  repetirAte?: string;
  /** HH:MM. */
  hora?: string;
  /** Pode vir vazio: quem chama usa o título da demanda ou o nome do tipo. */
  assunto: string;
  demanda?: string;
  problema?: ProblemaDaFrase;
  /** Trecho da frase que causou o problema ("31/02"), para a pergunta. */
  trecho?: string;
}

const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };

/** Palavra do tipo, por ordem de precedência: lembrete só vale se nenhuma outra aparecer. */
const TIPOS: { tipo: TipoDeCompromisso; padrao: RegExp }[] = [
  { tipo: 'reunião', padrao: /\breuni(?:ao|oes)\b/ },
  { tipo: 'palestra', padrao: /\bpalestras?\b/ },
  { tipo: 'curso', padrao: /\bcursos?\b/ },
  { tipo: 'compromisso', padrao: /\bcompromissos?\b|\baudienc(?:ia|ias)\b/ },
  { tipo: 'lembrete', padrao: /\blembr(?:ar|a|e|ete|etes)\b/ },
];

const ACENTOS: Record<string, string> = { á: 'a', à: 'a', â: 'a', ã: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', ë: 'e', í: 'i', ì: 'i', î: 'i', ï: 'i', ó: 'o', ò: 'o', ô: 'o', õ: 'o', ö: 'o', ú: 'u', ù: 'u', û: 'u', ü: 'u', ç: 'c' };
/** Minúsculas e sem acento, com o MESMO comprimento do texto (cada letra vira uma letra). */
const semAcento = (t: string) => t.toLowerCase().replace(/[áàâãäéèêëíìîïóòôõöúùûüç]/g, (c) => ACENTOS[c]);

const isoDe = (a: number, m: number, d: number) => `${String(a).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const hojeIso = (agora: Date) => isoDe(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
const maisDias = (agora: Date, n: number) => { const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + n); return isoDe(d.getFullYear(), d.getMonth() + 1, d.getDate()); };

/** Próxima ocorrência (de hoje em diante) de dia/mês, no ano atual ou nos seguintes (29/02 espera o ano bissexto); null se a data não existe. */
function proximaDeDiaMes(dia: number, mes: number, agora: Date): string | null {
  const hoje = hojeIso(agora);
  for (let ano = agora.getFullYear(); ano <= agora.getFullYear() + 8; ano++) {
    const iso = isoDe(ano, mes, dia);
    if (dataValida(iso) && iso >= hoje) return iso;
  }
  return null;
}

/** Próximo dia `dia` do mês, a partir de hoje (pula meses que não têm esse dia). */
function proximaDeDia(dia: number, agora: Date): string | null {
  const hoje = hojeIso(agora);
  for (let n = 0; n < 24; n++) {
    const base = new Date(agora.getFullYear(), agora.getMonth() + n, 1);
    const iso = isoDe(base.getFullYear(), base.getMonth() + 1, dia);
    if (dataValida(iso) && iso >= hoje) return iso;
  }
  return null;
}

const dataDeIso = (iso: string) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
const NOMES_DOS_DIAS = Object.keys(DIAS).join('|');
const anoDe = (t?: string) => (t ? (t.length === 2 ? 2000 + Number(t) : Number(t)) : undefined);

/** N-ésimo dia da semana do mês (2ª segunda = n 2, dow 1); null se o mês não tem (5º). */
function enesimoDiaDoMes(ano: number, mes: number, n: number, dow: number): string | null {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay();
  const iso = isoDe(ano, mes, 1 + ((dow - primeiro + 7) % 7) + (n - 1) * 7);
  return dataValida(iso) ? iso : null;
}

/** Próximo N-ésimo dia da semana a partir de `de` (inclusive); `mes`/`ano` restringem ("2ª quinta de dezembro"). */
function proximoEnesimo(n: number, dow: number, de: string, mes?: number, ano?: number): string | null {
  const [a0, m0] = de.split('-').map(Number);
  for (let k = 0; k < 96; k++) {
    const t = m0 - 1 + k;
    const a = a0 + Math.floor(t / 12), m = (t % 12) + 1;
    if ((mes !== undefined && m !== mes) || (ano !== undefined && a !== ano)) continue;
    const iso = enesimoDiaDoMes(a, m, n, dow);
    if (iso && iso >= de) return iso;
  }
  return null;
}

type RepeticaoLida = Exclude<Repeticao, 'nenhuma'>;
interface Ritmo { rep: RepeticaoLida; diaSem?: number; nth?: number; diaMes?: number }

/** Primeira ocorrência de uma repetição dita sem data: hoje, ou a seguinte se a hora de hoje já passou. */
function inicioDaSerie(r: Ritmo, agora: Date, hora?: string): string | null {
  let apos = hojeIso(agora);
  let passou = false;
  if (hora) {
    const [h, m] = hora.split(':').map(Number);
    passou = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m) <= agora;
    if (passou) apos = maisDias(agora, 1);
  }
  const base = dataDeIso(apos);
  switch (r.rep) {
    case 'dias_uteis': { let n = 0; while ([0, 6].includes(diaDaSemana(maisDias(base, n)))) n++; return maisDias(base, n); }
    // Sem dia citado, a série segue o dia de hoje: se a hora de hoje já passou, a próxima é daqui a uma semana, um mês ou um ano.
    case 'semanal': return r.diaSem === undefined ? maisDias(agora, passou ? 7 : 0) : maisDias(base, (r.diaSem - base.getDay() + 7) % 7);
    case 'mensal': return r.diaMes !== undefined ? proximaDeDia(r.diaMes, base) : passou ? proximaDeDia(agora.getDate(), base) : apos;
    case 'anual': return passou ? proximaDeDiaMes(agora.getDate(), agora.getMonth() + 1, base) : apos;
    case 'mensal_semana': return proximoEnesimo(r.nth ?? 1, r.diaSem ?? 1, apos);
    default: return apos;
  }
}

/** Repetições reconhecidas, da mais específica para a mais geral: vale a primeira que aparecer na frase. */
const REGRAS_DE_REPETICAO: [RegExp, (m: RegExpExecArray) => Ritmo][] = [
  [new RegExp(String.raw`\b(?:toda|todo|todos\s+os|todas\s+as)\s+([1-5])\s*[ªaº°]?\s*(${NOMES_DOS_DIAS})s?(?:\s*-?\s*feiras?)?(?:\s+do\s+mes)?`), (m) => ({ rep: 'mensal_semana', nth: Number(m[1]), diaSem: DIAS[m[2]] })],
  [/\b(?:nos\s+)?dias\s+uteis\b|\b(?:de\s+)?segunda\s+a\s+sexta(?:\s*-?\s*feira)?\b/, () => ({ rep: 'dias_uteis' })],
  [/\btodo\s+ano\b|\btodos\s+os\s+anos\b|\banualmente\b/, () => ({ rep: 'anual' })],
  [/\btodo\s+dia\s+(\d{1,2})\b(?!\s*[/h:\d])/, (m) => ({ rep: 'mensal', diaMes: Number(m[1]) })],
  [/\btodo\s+mes\b|\btodos\s+os\s+meses\b|\bmensalmente\b/, () => ({ rep: 'mensal' })],
  [/\b(?:toda|todas\s+as)\s+semanas?\b|\bsemanalmente\b/, () => ({ rep: 'semanal' })],
  [new RegExp(String.raw`\btod[oa]s?\s+(?:(?:as|os)\s+)?(${NOMES_DOS_DIAS})s?(?:\s*-?\s*feiras?)?\b`), (m) => ({ rep: 'semanal', diaSem: DIAS[m[1]] })],
  [/\btodos\s+os\s+dias\b|\btodo\s+dia\b|\bdiariamente\b/, () => ({ rep: 'diaria' })],
];

const DATA_NUM = String.raw`(\d{1,2})\s*[/-]\s*(\d{1,2})(?:\s*[/-]\s*(\d{4}|\d{2}))?`;
const ANTES_DA_DATA = String.raw`(?:(?:de|do|no|em|para|pro)\s+)?(?:dias?\s+)?`;
const ATE_NUM = new RegExp(String.raw`\bate\s+(?:o\s+)?(?:dia\s+)?${DATA_NUM}(?![\d/])`);
const ATE_EXTENSO = new RegExp(String.raw`\bate\s+(?:o\s+)?(?:dia\s+)?(\d{1,2})\s+de\s+(${MESES.join('|')})(?:\s+de\s+(\d{4}))?\b`);
const INTERVALO_NUM = new RegExp(String.raw`${ANTES_DA_DATA}(?<![\d/])${DATA_NUM}\s+(?:ate\s+o\s+dia|ate\s+dia|ate|ao\s+dia|a)\s+(?:dia\s+)?${DATA_NUM}(?![\d/])`);
const INTERVALO_COM_MES = new RegExp(String.raw`${ANTES_DA_DATA}(?<![\d/])(\d{1,2})\s+(?:a|ate)\s+(\d{1,2})\s+de\s+(${MESES.join('|')})(?:\s+de\s+(\d{4}))?\b`);
const INTERVALO_DE_DIAS = /\bdias\s+(\d{1,2})\s+(?:a|ate)\s+(\d{1,2})\b(?!\s*[/h:\d])/;
const SEMANA_DO_MES = new RegExp(String.raw`(?:(?:na|a)\s+)?\b([1-5])\s*[ªaº°]?\s*semana\s+(?:do\s+mes|de\s+(${MESES.join('|')})(?:\s+de\s+(\d{4}))?)`);
const ENESIMO_DO_MES = new RegExp(String.raw`(?:(?:na|no|em|para|pro)\s+)?\b([1-5])\s*[ªaº°]?\s*(${NOMES_DOS_DIAS})(?:\s*-?\s*feira)?\s+(?:do\s+mes|de\s+(${MESES.join('|')})(?:\s+de\s+(\d{4}))?)`);

interface Achado { inicio: number; fim: number }

/** Interpreta a frase. `tipoForcado` vale quando o fluxo já sabe o tipo (ex.: "lembrar DEM-… amanhã"). */
export function interpretarCompromisso(frase: string, agora: Date, tipoForcado?: TipoDeCompromisso): Entendido {
  const original = frase.normalize('NFC');
  // `mascara` é a frase sem acento; cada trecho reconhecido é apagado dos dois (mesmos índices).
  let mascara = semAcento(original);
  let resto = original;
  const apagar = (a: Achado) => {
    const brancos = ' '.repeat(a.fim - a.inicio);
    mascara = mascara.slice(0, a.inicio) + brancos + mascara.slice(a.fim);
    resto = resto.slice(0, a.inicio) + brancos + resto.slice(a.fim);
  };
  const achar = (padrao: RegExp): (RegExpExecArray & Achado) | null => {
    const m = padrao.exec(mascara);
    return m ? Object.assign(m, { inicio: m.index, fim: m.index + m[0].length }) : null;
  };

  // Tipo (antes de apagar qualquer coisa).
  const tipo = tipoForcado ?? TIPOS.find((t) => t.padrao.test(mascara))?.tipo ?? 'compromisso';

  // Código da demanda.
  let demanda: string | undefined;
  const codigo = achar(/(?<![a-z0-9])dem[\s_-]*fic[\s_-]*\d{1,4}(?![a-z0-9])/);
  if (codigo) {
    demanda = extrairIds(original.slice(codigo.inicio, codigo.fim))[0];
    apagar(codigo);
  }

  // Repetição ("toda segunda", "todo dia 10"...): sai da frase antes da data, para o dia da semana não virar data.
  let ritmo: Ritmo | undefined;
  let achado: (RegExpExecArray & Achado) | null;
  for (const [padrao, ler] of REGRAS_DE_REPETICAO) {
    if ((achado = achar(padrao))) { ritmo = ler(achado); apagar(achado); break; }
  }
  // "até 20/12" de uma repetição: guardado agora, resolvido quando a data de início for conhecida.
  let ate: { d: number; m: number; a?: number; trecho: string } | undefined;
  if (ritmo) {
    if ((achado = achar(ATE_NUM))) { ate = { d: Number(achado[1]), m: Number(achado[2]), a: anoDe(achado[3]), trecho: original.slice(achado.inicio, achado.fim).trim() }; apagar(achado); }
    else if ((achado = achar(ATE_EXTENSO))) { ate = { d: Number(achado[1]), m: MESES.indexOf(achado[2]) + 1, a: anoDe(achado[3]), trecho: original.slice(achado.inicio, achado.fim).trim() }; apagar(achado); }
  }

  // Data.
  let data: string | null = null;
  let dataFim: string | undefined;
  let repetirAte: string | undefined;
  let problema: ProblemaDaFrase | undefined;
  let trecho: string | undefined;
  const falhaDeData = (p: ProblemaDaFrase, a: Achado) => { problema = p; trecho = original.slice(a.inicio, a.fim).trim(); };
  const prefixo = String.raw`(?:(?:no|em|para|pro)\s+)?(?:dia\s+)?`;
  /** Início e fim de um intervalo dito por extenso; o ano que falta é o da próxima ocorrência. */
  const lerIntervalo = (a: Achado, d1: number, m1: number, a1: number | undefined, d2: number, m2: number, a2: number | undefined) => {
    let inicio: string | null;
    if (a1 !== undefined) {
      inicio = isoDe(a1, m1, d1);
      if (!dataValida(inicio)) return falhaDeData('data-invalida', a);
      if (inicio < hojeIso(agora)) return falhaDeData('data-passada', a);
    } else {
      inicio = proximaDeDiaMes(d1, m1, agora);
      if (!inicio) return falhaDeData('data-invalida', a);
    }
    let fim: string | null = null;
    if (a2 !== undefined) fim = isoDe(a2, m2, d2);
    else for (let ano = Number(inicio.slice(0, 4)); ano <= Number(inicio.slice(0, 4)) + 8 && !fim; ano++) { const iso = isoDe(ano, m2, d2); if (dataValida(iso) && iso >= inicio) fim = iso; }
    if (!fim || !dataValida(fim)) return falhaDeData('data-invalida', a);
    if (fim < inicio || numeroDoDia(fim) - numeroDoDia(inicio) >= MAXIMO_DE_DIAS_DO_EVENTO) return falhaDeData('intervalo-invalido', a);
    data = inicio;
    if (fim > inicio) dataFim = fim;
  };
  if (!ritmo && (achado = achar(INTERVALO_NUM))) {
    lerIntervalo(achado, Number(achado[1]), Number(achado[2]), anoDe(achado[3]), Number(achado[4]), Number(achado[5]), anoDe(achado[6]));
    apagar(achado);
  } else if (!ritmo && (achado = achar(INTERVALO_COM_MES))) {
    const m = MESES.indexOf(achado[3]) + 1;
    lerIntervalo(achado, Number(achado[1]), m, anoDe(achado[4]), Number(achado[2]), m, anoDe(achado[4]));
    apagar(achado);
  } else if (!ritmo && (achado = achar(INTERVALO_DE_DIAS))) {
    const [d1, d2] = [Number(achado[1]), Number(achado[2])];
    const inicio = proximaDeDia(d1, agora);
    let fim: string | null = null;
    if (inicio) for (let k = 0; k < 12 && !fim; k++) {
      const base = new Date(Number(inicio.slice(0, 4)), Number(inicio.slice(5, 7)) - 1 + k, 1);
      const iso = isoDe(base.getFullYear(), base.getMonth() + 1, d2);
      if (dataValida(iso) && iso >= inicio) fim = iso;
    }
    if (!inicio || !fim) falhaDeData('data-invalida', achado);
    else if (numeroDoDia(fim) - numeroDoDia(inicio) >= MAXIMO_DE_DIAS_DO_EVENTO) falhaDeData('intervalo-invalido', achado);
    else { data = inicio; if (fim > inicio) dataFim = fim; }
    apagar(achado);
  } else if (!ritmo && (achado = achar(SEMANA_DO_MES))) {
    // "2ª semana de dezembro": do dia 8 ao 14 (a 5ª vai do 29 ao fim do mês).
    const n = Number(achado[1]);
    const mes = achado[2] ? MESES.indexOf(achado[2]) + 1 : undefined;
    const ano = achado[3] ? Number(achado[3]) : undefined;
    const hoje = hojeIso(agora);
    let achou = false, passou = false;
    for (let k = 0; k < 96 && !achou; k++) {
      const t = agora.getMonth() + k;
      const a = agora.getFullYear() + Math.floor(t / 12), m = (t % 12) + 1;
      if ((mes !== undefined && m !== mes) || (ano !== undefined && a !== ano)) continue;
      const inicio = isoDe(a, m, (n - 1) * 7 + 1);
      if (!dataValida(inicio)) continue;
      const fim = n === 5 ? isoDe(a, m, new Date(a, m, 0).getDate()) : isoDe(a, m, n * 7);
      if (fim < hoje) { passou = true; continue; }
      data = inicio < hoje ? hoje : inicio;
      if (fim > data) dataFim = fim;
      achou = true;
    }
    if (!achou) falhaDeData(passou && ano !== undefined ? 'data-passada' : 'intervalo-invalido', achado);
    apagar(achado);
  } else if ((achado = achar(ENESIMO_DO_MES))) {
    // "1ª segunda do mês", "2ª quinta de dezembro": um dia só.
    data = proximoEnesimo(Number(achado[1]), DIAS[achado[2]], hojeIso(agora), achado[3] ? MESES.indexOf(achado[3]) + 1 : undefined, achado[4] ? Number(achado[4]) : undefined);
    if (!data) falhaDeData('data-invalida', achado);
    apagar(achado);
  } else if ((achado = achar(new RegExp(String.raw`${prefixo}(?<![\d/])(\d{1,2})\s*[/-]\s*(\d{1,2})(?:\s*[/-]\s*(\d{4}|\d{2}))?(?![\d/])`)))) {
    const [d, m] = [Number(achado[1]), Number(achado[2])];
    if (achado[3]) {
      const ano = achado[3].length === 2 ? 2000 + Number(achado[3]) : Number(achado[3]);
      const iso = isoDe(ano, m, d);
      if (!dataValida(iso)) falhaDeData('data-invalida', achado);
      else if (iso < hojeIso(agora)) falhaDeData('data-passada', achado);
      else data = iso;
    } else {
      data = proximaDeDiaMes(d, m, agora);
      if (!data) falhaDeData('data-invalida', achado);
    }
    apagar(achado);
  } else if ((achado = achar(new RegExp(String.raw`${prefixo}(\d{1,2})\s+de\s+(${MESES.join('|')})(?:\s+de\s+(\d{4}))?\b`)))) {
    const [d, m] = [Number(achado[1]), MESES.indexOf(achado[2]) + 1];
    if (achado[3]) {
      const iso = isoDe(Number(achado[3]), m, d);
      if (!dataValida(iso)) falhaDeData('data-invalida', achado);
      else if (iso < hojeIso(agora)) falhaDeData('data-passada', achado);
      else data = iso;
    } else {
      data = proximaDeDiaMes(d, m, agora);
      if (!data) falhaDeData('data-invalida', achado);
    }
    apagar(achado);
  } else if ((achado = achar(/\bdepois\s+de\s+amanha\b/))) {
    data = maisDias(agora, 2);
    apagar(achado);
  } else if ((achado = achar(/\bamanha\b/))) {
    data = maisDias(agora, 1);
    apagar(achado);
  } else if ((achado = achar(/\bhoje\b/))) {
    data = maisDias(agora, 0);
    apagar(achado);
  } else if ((achado = achar(new RegExp(String.raw`(?:(?:na|no|na\s+proxima|proxima)\s+)?\b(${Object.keys(DIAS).join('|')})(?:\s*-?\s*feira)?\b(?:\s+que\s+vem)?`)))) {
    // O dia da semana dito nesse mesmo dia é o da semana que vem (como nos lembretes de demanda).
    data = maisDias(agora, ((DIAS[achado[1]] - agora.getDay() + 7) % 7) || 7);
    apagar(achado);
  } else if ((achado = achar(/\b(?:no\s+)?dia\s+(\d{1,2})\b(?!\s*[/h:])/))) {
    data = proximaDeDia(Number(achado[1]), agora);
    if (!data) falhaDeData('data-invalida', achado);
    apagar(achado);
  }

  // Hora (depois da data apagada, para "10/12" não ser confundido).
  let hora: string | undefined;
  const lerHora = (h: string, min = '00', a: Achado) => {
    if (Number(h) > 23 || Number(min) > 59) { problema ??= 'hora-invalida'; trecho ??= original.slice(a.inicio, a.fim).trim(); } else hora = `${h.padStart(2, '0')}:${min}`;
    apagar(a);
  };
  if ((achado = achar(/(?:\bas\s+)?(?<![\d/])(\d{1,2})\s*(?:h(?![a-z])|:)\s*(\d{2})?(?![\d/])/))) {
    lerHora(achado[1], achado[2] ?? '00', achado);
  } else if ((achado = achar(/(?<![\d/])(\d{1,2})\s*horas?\b/))) {
    lerHora(achado[1], '00', achado);
  } else if ((achado = achar(/\bas\s+(\d{1,2})\b(?!\s*[/\d-])/))) {
    lerHora(achado[1], '00', achado);
  }

  // Repetição sem data: começa hoje, ou na próxima ocorrência se a hora de hoje já passou.
  if (ritmo && !data && !problema) {
    data = inicioDaSerie(ritmo, agora, hora);
    if (!data) problema = 'data-invalida';
  }
  // Fim da repetição: o ano que falta é o da primeira data igual ou posterior ao início.
  if (ritmo && ate && data && !problema) {
    let fim: string | null = null;
    if (ate.a !== undefined) fim = isoDe(ate.a, ate.m, ate.d);
    else for (let ano = Number(data.slice(0, 4)); ano <= Number(data.slice(0, 4)) + 8 && !fim; ano++) { const iso = isoDe(ano, ate.m, ate.d); if (dataValida(iso) && iso >= data) fim = iso; }
    if (!fim || !dataValida(fim)) { problema = 'data-invalida'; trecho = ate.trecho; }
    else if (fim < data) { problema = 'intervalo-invalido'; trecho = ate.trecho; }
    else repetirAte = fim;
  }

  if (!data && !problema) problema = 'sem-data';
  if (data && hora && !problema && data === hojeIso(agora)) {
    const [h, m] = hora.split(':').map(Number);
    if (new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m) <= agora) problema = 'hora-passada';
  }

  // Assunto: depois da primeira marca "sobre"/"de"/"para" do que restou; sem marca, o resto sem as palavras de comando.
  const marca = /(?<![a-z0-9])(sobre|para|pra|de|do|da)(?![a-z0-9])/.exec(mascara);
  let texto: string;
  if (marca) {
    texto = resto.slice(marca.index + marca[0].length);
  } else {
    const COMANDO = /^[\s,;:.!?-]*(?:me|lembra|lembrar|lembre|lembrete|marcar|marca|marque|anotar|anota|anote|agendar|agende|tenho|temos|uma|um|que|tem|tipo|reuniao|reunioes|palestras?|cursos?|compromissos?|audiencias?)(?![a-z0-9])/;
    let inicio = 0;
    for (let m = COMANDO.exec(mascara.slice(inicio)); m; m = COMANDO.exec(mascara.slice(inicio))) inicio += m[0].length;
    texto = resto.slice(inicio);
  }
  const assunto = limparAssunto(
    texto
      .replace(/^[\s,;:.!?"'“”-]+/, '')
      .replace(/^(?:(?:o|a|os|as|um|uma)\s+)+/i, '')
      .replace(/[\s,;:.!?"'“”-]+$/, '')
      .replace(/(?:\s+(?:de|do|da|para|pra|sobre|em|com|e))+$/i, ''),
  );

  const saida: Entendido = { tipo, data, assunto };
  if (dataFim) saida.dataFim = dataFim;
  if (ritmo) saida.repeticao = ritmo.rep;
  if (repetirAte) saida.repetirAte = repetirAte;
  if (hora) saida.hora = hora;
  if (demanda) saida.demanda = demanda;
  if (problema) saida.problema = problema;
  if (trecho) saida.trecho = trecho;
  return saida;
}

/**
 * A frase parece um compromisso novo: tem uma palavra de tipo (reunião, palestra, curso, compromisso,
 * audiência) e uma data reconhecida. O classificador usa isto para que "reunião dia 10/12 sobre prazos"
 * não seja lido como o comando "prazos".
 */
export function pareceCompromisso(frase: string, agora: Date): boolean {
  const m = semAcento(frase.normalize('NFC'));
  if (!TIPOS.slice(0, 4).some((t) => t.padrao.test(m))) return false;
  const e = interpretarCompromisso(frase, agora);
  return e.data !== null || e.problema === 'data-invalida' || e.problema === 'data-passada' || e.problema === 'intervalo-invalido';
}
