// Datas, intervalo e repetição dos compromissos (item 14, evolução de 22/11/2026). Funções puras, sem
// armazenamento: dado um compromisso e um dia, dizem se ele cai ali, qual ocorrência é e como descrevê-la.
// Cada ocorrência é identificada pela sua data de início. Intervalo = `data` a `dataFim`, inclusive.
// Mês curto: dia 31 pula os meses sem dia 31 e 29/02 só vale em ano bissexto (igual ao RRULE e ao Google Agenda).

export const REPETICOES = ['nenhuma', 'diaria', 'semanal', 'mensal', 'mensal_semana', 'anual', 'dias_uteis'] as const;
export type Repeticao = (typeof REPETICOES)[number];

/** Duração máxima de uma ocorrência (em dias), para limitar as contas. */
export const MAXIMO_DE_DIAS_DO_EVENTO = 366;
/** Janela máxima das funções de expansão (em dias). */
export const MAXIMO_DA_JANELA = 400;

/** O que as funções daqui precisam saber de um compromisso. */
export interface Serie {
  data: string;
  dataFim?: string;
  hora?: string;
  repeticao?: Repeticao;
  repetirAte?: string;
  concluido?: true;
  concluidasEm?: readonly string[];
}

export const ROTULOS_DA_REPETICAO: Record<Exclude<Repeticao, 'mensal_semana'>, string> = {
  nenhuma: 'Não se repete',
  diaria: 'Todos os dias',
  semanal: 'Toda semana',
  mensal: 'Todo mês',
  anual: 'Todo ano',
  dias_uteis: 'Dias úteis (segunda a sexta)',
};

const DIAS_DA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Dias corridos desde 1970-01-01 (UTC, sem horário de verão). `iso` = AAAA-MM-DD. */
export function numeroDoDia(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(a, m - 1, d) / 86_400_000);
}

export function isoDoNumero(n: number): string {
  const d = new Date(n * 86_400_000);
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export const somarDias = (iso: string, n: number) => isoDoNumero(numeroDoDia(iso) + n);
/** 0 = domingo. */
export const diaDaSemana = (iso: string) => new Date(numeroDoDia(iso) * 86_400_000).getUTCDay();
const partes = (iso: string) => iso.split('-').map(Number) as [number, number, number];

/** Dias a mais que o compromisso cobre além do primeiro (0 = 1 dia). */
export function duracaoEmDias(c: Pick<Serie, 'data' | 'dataFim'>): number {
  return c.dataFim && c.dataFim > c.data ? numeroDoDia(c.dataFim) - numeroDoDia(c.data) : 0;
}

export const repete = (c: Pick<Serie, 'repeticao'>) => Boolean(c.repeticao && c.repeticao !== 'nenhuma');

// ---------- Semana do mês ----------

/** Semana do mês por faixas de dias: 1–7 = 1ª, 8–14 = 2ª, 15–21 = 3ª, 22–28 = 4ª, 29–31 = 5ª. */
export const semanaDoMes = (iso: string): number => Math.ceil(partes(iso)[2] / 7);

/** "2ª semana de dez" */
export const descreverSemanaDoMes = (iso: string): string => `${semanaDoMes(iso)}ª semana de ${MESES_CURTOS[partes(iso)[1] - 1]}`;

/** Ordem do dia da semana no mês (a 2ª segunda é o 2): coincide com a semana do mês por faixas. */
export const ordemDoDiaNoMes = semanaDoMes;

/** "2ª segunda", "1º sábado" (sábado e domingo são masculinos). */
export function descreverOrdemDoDia(iso: string): string {
  const dia = diaDaSemana(iso);
  return `${ordemDoDiaNoMes(iso)}${dia === 0 || dia === 6 ? 'º' : 'ª'} ${DIAS_DA_SEMANA[dia]}`;
}

/** "toda segunda", "todo sábado". */
export const todoDiaDaSemana = (dia: number) => `${dia === 0 || dia === 6 ? 'todo' : 'toda'} ${DIAS_DA_SEMANA[dia]}`;

const dataBr = (iso: string) => iso.split('-').reverse().join('/');

/** "toda segunda", "todo mês, na 2ª segunda", "nos dias úteis", com ", até dd/mm/aaaa" quando houver fim. */
export function descreverRepeticao(c: Pick<Serie, 'data' | 'repeticao' | 'repetirAte'>): string {
  const base = ({
    nenhuma: '',
    diaria: 'todos os dias',
    semanal: todoDiaDaSemana(diaDaSemana(c.data)),
    mensal: `todo dia ${partes(c.data)[2]} do mês`,
    mensal_semana: `todo mês, na ${descreverOrdemDoDia(c.data)}`,
    anual: 'todo ano',
    dias_uteis: 'nos dias úteis',
  } satisfies Record<Repeticao, string>)[c.repeticao ?? 'nenhuma'];
  return base && c.repetirAte ? `${base}, até ${dataBr(c.repetirAte)}` : base;
}

// ---------- Ocorrências ----------

/** A data `dia` é a data de início de uma ocorrência? */
export function ehInicioDeOcorrencia(c: Pick<Serie, 'data' | 'repeticao' | 'repetirAte'>, dia: string): boolean {
  if (dia < c.data) return false;
  const rep = c.repeticao ?? 'nenhuma';
  if (rep === 'nenhuma') return dia === c.data;
  if (c.repetirAte && dia > c.repetirAte) return false;
  const [, m0, d0] = partes(c.data);
  const [, m, d] = partes(dia);
  switch (rep) {
    case 'diaria': return true;
    case 'semanal': return (numeroDoDia(dia) - numeroDoDia(c.data)) % 7 === 0;
    case 'dias_uteis': { const s = diaDaSemana(dia); return s >= 1 && s <= 5; }
    case 'mensal': return d === d0;
    case 'mensal_semana': return diaDaSemana(dia) === diaDaSemana(c.data) && ordemDoDiaNoMes(dia) === ordemDoDiaNoMes(c.data);
    case 'anual': return m === m0 && d === d0;
  }
}

export interface OcorrenciaNoDia {
  /** O dia consultado. */
  dia: string;
  /** Data de início da ocorrência que cobre o dia (a chave de conclusão). */
  inicio: string;
  /** Última data da ocorrência. */
  fim: string;
  /** "Dia 2 de 3": numero = 2. */
  numero: number;
  total: number;
}

/** Ocorrência que cobre `dia` (a de início mais recente, se várias se sobrepõem), ou null. */
export function ocorrenciaNoDia(c: Pick<Serie, 'data' | 'dataFim' | 'repeticao' | 'repetirAte'>, dia: string): OcorrenciaNoDia | null {
  const duracao = duracaoEmDias(c);
  for (let k = 0; k <= duracao; k++) {
    const inicio = somarDias(dia, -k);
    if (ehInicioDeOcorrencia(c, inicio)) return { dia, inicio, fim: somarDias(inicio, duracao), numero: k + 1, total: duracao + 1 };
  }
  return null;
}

export const ocorreNoDia = (c: Pick<Serie, 'data' | 'dataFim' | 'repeticao' | 'repetirAte'>, dia: string): boolean => ocorrenciaNoDia(c, dia) !== null;

/** Ocorrências que cobrem algum dia de `de` a `ate` (inclusive), um item por dia coberto. Janela de no máximo 400 dias. */
export function ocorrenciasNoIntervalo(c: Pick<Serie, 'data' | 'dataFim' | 'repeticao' | 'repetirAte'>, de: string, ate: string): OcorrenciaNoDia[] {
  const saida: OcorrenciaNoDia[] = [];
  const ultimo = Math.min(numeroDoDia(ate), numeroDoDia(de) + MAXIMO_DA_JANELA - 1);
  // Antes da primeira data ou depois do fim da série não há nada a procurar.
  const inicio = Math.max(numeroDoDia(de), numeroDoDia(c.data));
  const fimDaSerie = c.repetirAte && repete(c) ? numeroDoDia(c.repetirAte) + duracaoEmDias(c) : Infinity;
  for (let n = inicio; n <= Math.min(ultimo, fimDaSerie); n++) {
    const o = ocorrenciaNoDia(c, isoDoNumero(n));
    if (o) saida.push(o);
  }
  return saida;
}

/** A ocorrência que começa em `inicio` está concluída? (`concluido` vale para todas.) */
export const ocorrenciaConcluida = (c: Pick<Serie, 'concluido' | 'concluidasEm'>, inicio: string): boolean =>
  Boolean(c.concluido) || Boolean(c.concluidasEm?.includes(inicio));
