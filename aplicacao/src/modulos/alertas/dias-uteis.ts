// Prazos em dias úteis com feriados nacionais (regra pura, sem rede).
// Lógica reescrita a partir do TOCA (feriados.py, judicial.py e prazo.py:somar_uteis).
// Datas no formato AAAA-MM-DD, no fuso do navegador; a conta usa dias UTC para
// não sofrer com horário de verão.

import { DIA_MS } from './inatividade.ts';

/** Ajuste local dos feriados: estaduais, municipais e recessos ficam em `extras`. */
export interface AjusteFeriados {
  /** true: carnaval (segunda e terça) e Corpus Christi também contam. */
  facultativos?: boolean;
  extras?: readonly string[];
  /** Datas nacionais que não valem para quem usa. */
  remover?: readonly string[];
}

// [mês, dia]; 20/11 é feriado nacional desde a Lei 14.759/2023.
const FIXOS: readonly [number, number][] = [[1, 1], [4, 21], [5, 1], [9, 7], [10, 12], [11, 2], [11, 15], [11, 20], [12, 25]];

const paraDia = (texto: string): number => {
  const [a, m, d] = texto.split('-').map(Number);
  return Date.UTC(a, m - 1, d) / DIA_MS;
};

const paraTexto = (dia: number): string => new Date(dia * DIA_MS).toISOString().slice(0, 10);

/** Data de hoje (AAAA-MM-DD) no fuso do navegador. */
export function dataLocal(agora: Date): string {
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${m}-${d}`;
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): string {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return paraTexto(Date.UTC(ano, mes - 1, dia) / DIA_MS);
}

/** Feriados nacionais do ano: fixos, Sexta-feira Santa e, opcionalmente, os facultativos. */
export function feriadosNacionais(ano: number, facultativos = false): string[] {
  const datas = FIXOS.map(([m, d]) => paraTexto(Date.UTC(ano, m - 1, d) / DIA_MS));
  const p = paraDia(pascoa(ano));
  datas.push(paraTexto(p - 2));
  if (facultativos) datas.push(paraTexto(p - 48), paraTexto(p - 47), paraTexto(p + 60));
  return datas.sort();
}

/** Feriados no intervalo [inicio, fim], já com o ajuste local aplicado. */
export function feriadosEntre(inicio: string, fim: string, ajuste: AjusteFeriados = {}): Set<string> {
  const datas = new Set<string>(ajuste.extras ?? []);
  for (let ano = Number(inicio.slice(0, 4)); ano <= Number(fim.slice(0, 4)); ano++) {
    for (const d of feriadosNacionais(ano, ajuste.facultativos)) datas.add(d);
  }
  for (const d of ajuste.remover ?? []) datas.delete(d);
  return new Set([...datas].filter((d) => d >= inicio && d <= fim));
}

export function ehDiaUtil(data: string, feriados: ReadonlySet<string> = new Set()): boolean {
  const semana = new Date(paraDia(data) * DIA_MS).getUTCDay();
  return semana !== 0 && semana !== 6 && !feriados.has(data);
}

/**
 * Dias úteis de `hoje` até `prazo`: positivo = faltam (o prazo conta, hoje não);
 * 0 = vence hoje ou não há dia útil entre as datas; negativo = vencido há N (hoje conta).
 */
export function diasUteis(hoje: string, prazo: string, ajuste: AjusteFeriados = {}): number {
  if (prazo === hoje) return 0;
  const sinal = prazo > hoje ? 1 : -1;
  const [de, ate] = sinal > 0 ? [hoje, prazo] : [prazo, hoje];
  const feriados = feriadosEntre(de, ate, ajuste);
  let n = 0;
  for (let dia = paraDia(de) + 1; dia <= paraDia(ate); dia++) {
    if (ehDiaUtil(paraTexto(dia), feriados)) n++;
  }
  return n === 0 ? 0 : sinal * n; // evita -0
}

/** `n` dias úteis depois de `inicio` (que não conta), com os feriados que foram pulados. */
export function somarDiasUteis(inicio: string, n: number, ajuste: AjusteFeriados = {}): { data: string; feriadosPulados: string[] } {
  // Folga generosa para o intervalo de feriados: cada semana tem ao menos 5 dias úteis.
  const feriados = feriadosEntre(inicio, paraTexto(paraDia(inicio) + n * 2 + 21), ajuste);
  const feriadosPulados: string[] = [];
  let dia = paraDia(inicio);
  for (let contados = 0; contados < n; ) {
    dia++;
    const texto = paraTexto(dia);
    if (!ehDiaUtil(texto)) continue;
    if (feriados.has(texto)) {
      feriadosPulados.push(texto);
      continue;
    }
    contados++;
  }
  return { data: paraTexto(dia), feriadosPulados };
}

/** "1 dia útil" ou "4 dias úteis" (sem sinal). */
export function rotuloDias(n: number): string {
  const q = Math.abs(n);
  return q === 1 ? '1 dia útil' : `${q} dias úteis`;
}

export interface SituacaoPrazo {
  diasUteis: number;
  vencido: boolean;
  texto: string;
}

/** "faltam 4 dias úteis", "vence hoje", "vencido há 2 dias úteis". Vencido segue a regra do dashboard: prazo antes de hoje. */
export function situacaoPrazo(hoje: string, prazo: string, ajuste: AjusteFeriados = {}): SituacaoPrazo {
  const n = diasUteis(hoje, prazo, ajuste);
  const vencido = prazo < hoje;
  let texto: string;
  if (prazo === hoje) texto = 'vence hoje';
  else if (vencido) texto = n < 0 ? `vencido há ${rotuloDias(n)}` : 'vencido, sem dia útil desde o prazo';
  else if (n > 0) texto = `${n === 1 ? 'falta' : 'faltam'} ${rotuloDias(n)}`;
  else texto = 'sem dia útil antes do prazo';
  return { diasUteis: n, vencido, texto };
}

/** Situação do prazo de uma demanda em aberto; null se concluída ou sem prazo. */
export function situacaoDaDemanda(d: { status: string; prazo?: string }, agora: Date, ajuste: AjusteFeriados = {}): SituacaoPrazo | null {
  if (d.status === 'Concluída' || !d.prazo) return null;
  return situacaoPrazo(dataLocal(agora), d.prazo, ajuste);
}
