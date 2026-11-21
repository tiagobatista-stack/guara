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
import { extrairIds } from './extrair.ts';

export type ProblemaDaFrase = 'sem-data' | 'data-invalida' | 'data-passada' | 'hora-invalida' | 'hora-passada';

export interface Entendido {
  tipo: TipoDeCompromisso;
  /** AAAA-MM-DD, ou null quando a frase não tem data utilizável (veja `problema`). */
  data: string | null;
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

  // Data.
  let data: string | null = null;
  let problema: ProblemaDaFrase | undefined;
  let trecho: string | undefined;
  const falhaDeData = (p: ProblemaDaFrase, a: Achado) => { problema = p; trecho = original.slice(a.inicio, a.fim).trim(); };
  const prefixo = String.raw`(?:(?:no|em|para|pro)\s+)?(?:dia\s+)?`;
  let achado: (RegExpExecArray & Achado) | null;
  if ((achado = achar(new RegExp(String.raw`${prefixo}(?<![\d/])(\d{1,2})\s*[/-]\s*(\d{1,2})(?:\s*[/-]\s*(\d{4}|\d{2}))?(?![\d/])`)))) {
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
  return e.data !== null || e.problema === 'data-invalida' || e.problema === 'data-passada';
}
