// Coordenada da demanda (ideia do TOCA, `coordenadas.py`; lógica reescrita, sem copiar código).
// Aceita graus decimais, graus-minutos-segundos e graus-minutos decimais, com sinal ou com letra de
// hemisfério (N/S, E/W, L = leste, O = oeste), antes ou depois do número. Grava sempre em graus
// decimais, no referencial SIRGAS 2000 (o dos órgãos brasileiros). UTM não é aceito: a conversão
// pediria uma biblioteca de projeção.
// Cair fora do Brasil é AVISO, nunca erro. Nenhum serviço externo é consultado.

export interface Coordenada {
  lat: number;
  lon: number;
}

export type FormatoCoordenada = 'decimal' | 'gms' | 'gm';

export type LeituraCoordenada =
  | { ok: true; valor: Coordenada; formato: FormatoCoordenada; avisos: string[]; trocaSugerida: boolean }
  | { ok: false; erro: string };

/** Retângulo aproximado do território brasileiro (aviso, não bloqueio). */
export const LIMITES_BRASIL = { latMin: -34, latMax: 5.5, lonMin: -74.5, lonMax: -28.5 } as const;

export const dentroDoBrasil = ({ lat, lon }: Coordenada) =>
  lat >= LIMITES_BRASIL.latMin && lat <= LIMITES_BRASIL.latMax && lon >= LIMITES_BRASIL.lonMin && lon <= LIMITES_BRASIL.lonMax;

const SINAL_DA_LETRA: Record<string, 1 | -1> = { N: 1, S: -1, E: 1, L: 1, W: -1, O: -1 };
const EIXO_DA_LETRA: Record<string, 'lat' | 'lon'> = { N: 'lat', S: 'lat', E: 'lon', L: 'lon', W: 'lon', O: 'lon' };

interface Termo {
  valor: number;
  letra?: string;
}

const numero = (t: string) => Number(t.replace(',', '.'));

/** Unifica símbolos parecidos (º, ’, ″…) e espaços, para as leituras abaixo. */
function padronizar(texto: string): string {
  return texto
    .replace(/[−–]/g, '-')
    .replace(/[º˚]/g, '°')
    .replace(/''|’’|´´|′′|[″”]/g, '"')
    .replace(/[’′´`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Graus + minutos/60 + segundos/3600; null se minutos ou segundos passarem de 59,999. */
function somar(graus: string, minutos?: string, segundos?: string): number | null {
  const m = minutos === undefined ? 0 : numero(minutos);
  const s = segundos === undefined ? 0 : numero(segundos);
  if (m >= 60 || s >= 60) return null;
  return numero(graus) + m / 60 + s / 3600;
}

function comSinal(valor: number, sinal: string | undefined, letra: string | undefined): number {
  return sinal === '-' || (letra && SINAL_DA_LETRA[letra] < 0) ? -Math.abs(valor) : valor;
}

const N = String.raw`\d+(?:[.,]\d+)?`;

/** Termos com o símbolo de grau: «15° 30' 12,5" S», «S 15° 30,2'», «-15°». */
function termosComGrau(t: string): Termo[] | string {
  // A letra entre dois números («S 15° 30' W 55° 30'») é do segundo quando o texto começa com letra.
  const prefixo = /^[NSEWLO]/i.test(t);
  const antesRx = prefixo ? '([NSEWLO])?' : '()';
  const depoisRx = prefixo ? '()' : '([NSEWLO])?';
  const rx = new RegExp(String.raw`${antesRx}\s*([-+])?\s*(${N})\s*°\s*(?:(${N})\s*'\s*)?(?:(${N})\s*"\s*)?${depoisRx}`, 'gi');
  const termos: Termo[] = [];
  let resto = t;
  for (const m of t.matchAll(rx)) {
    const [trecho, antes, sinal, g, mi, se, depois] = m;
    const v = somar(g, mi, se);
    if (v === null) return 'Minutos e segundos precisam ser menores que 60.';
    const letra = (antes || depois || undefined)?.toUpperCase();
    termos.push({ valor: comSinal(v, sinal, letra), letra });
    resto = resto.replace(trecho, ' ');
  }
  if (resto.replace(/[\s,;/]/g, '')) return 'Não entendi parte do texto da coordenada.';
  return termos;
}

/** Sem símbolo de grau, com letras: «15 30 12,5 S 55 12 W», «S 15.503 W 55.2», «15.5S 55.2W». */
function termosComLetra(t: string): Termo[] | string {
  const prefixo = /^[NSEWLO]/i.test(t);
  const partes = t.split(/([NSEWLO])/i).map((p) => p.trim());
  const termos: Termo[] = [];
  // partes alterna [texto, letra, texto, letra, texto]
  for (let i = 1; i < partes.length; i += 2) {
    const letra = partes[i].toUpperCase();
    const bloco = (prefixo ? partes[i + 1] : partes[i - 1]).replace(/^[,;/\s]+|[,;/\s]+$/g, '');
    const nums = bloco.match(new RegExp(String.raw`^([-+])?\s*(${N})(?:\s+(${N}))?(?:\s+(${N}))?$`));
    if (!nums) return 'Não entendi parte do texto da coordenada.';
    const v = somar(nums[2], nums[3], nums[4]);
    if (v === null) return 'Minutos e segundos precisam ser menores que 60.';
    termos.push({ valor: comSinal(v, nums[1], letra), letra });
  }
  const sobra = prefixo ? partes[0] : partes[partes.length - 1];
  if (sobra.replace(/[\s,;/]/g, '')) return 'Não entendi parte do texto da coordenada.';
  return termos;
}

/** Só números, latitude e longitude nessa ordem: «-15.5, -55.2», «-15,5; -55,2», «-15,5 -55,2». */
function termosDecimais(t: string): Termo[] | string {
  let partes: string[];
  if (/[;/]/.test(t)) partes = t.split(/[;/]/);
  else if (/,\s/.test(t)) partes = t.split(/,\s/);
  else if ((t.match(/,/g) ?? []).length === 1 && (t.match(/\./g) ?? []).length === 2) partes = t.split(',');
  else partes = t.split(' ');
  partes = partes.map((p) => p.trim()).filter(Boolean);
  if (partes.length !== 2) {
    return partes.length > 2
      ? 'Sem letra de hemisfério nem °, informe só dois números em graus decimais (latitude, longitude).'
      : 'Informe a latitude e a longitude.';
  }
  const termos: Termo[] = [];
  for (const p of partes) {
    if (!new RegExp(String.raw`^[-+]?${N}$`).test(p)) return 'Não entendi parte do texto da coordenada.';
    termos.push({ valor: numero(p) });
  }
  return termos;
}

/** Lê a coordenada digitada. Nunca lança exceção. */
export function lerCoordenada(texto: string): LeituraCoordenada {
  const t = padronizar(texto);
  if (!t) return { ok: false, erro: 'Coordenada vazia.' };
  if (/^\d{1,2}\s*[A-Z]\s+\d{5,7}/i.test(t)) {
    return { ok: false, erro: 'UTM ainda não é aceito: informe em graus (ex.: -15.5, -55.5).' };
  }
  const formato: FormatoCoordenada = !t.includes('°') ? 'decimal' : t.includes('"') ? 'gms' : t.includes("'") ? 'gm' : 'decimal';
  const termos = t.includes('°') ? termosComGrau(t) : /[NSEWLO]/i.test(t) ? termosComLetra(t) : termosDecimais(t);
  if (typeof termos === 'string') return { ok: false, erro: termos };
  if (termos.length !== 2) return { ok: false, erro: 'Informe a latitude e a longitude (dois valores).' };

  const [a, b] = termos;
  let lat: number;
  let lon: number;
  if (a.letra || b.letra) {
    // Com letra, a ordem não importa.
    const eixoA = a.letra ? EIXO_DA_LETRA[a.letra] : b.letra && EIXO_DA_LETRA[b.letra] === 'lat' ? 'lon' : 'lat';
    const eixoB = b.letra ? EIXO_DA_LETRA[b.letra] : eixoA === 'lat' ? 'lon' : 'lat';
    if (eixoA === eixoB) return { ok: false, erro: 'Os dois valores são do mesmo tipo: informe uma latitude e uma longitude.' };
    [lat, lon] = eixoA === 'lat' ? [a.valor, b.valor] : [b.valor, a.valor];
  } else {
    [lat, lon] = [a.valor, b.valor];
  }
  if (Math.abs(lat) > 90) {
    return { ok: false, erro: `Latitude ${lat} fora de -90 a 90${Math.abs(lon) <= 90 ? ': parece que a ordem está trocada (longitude, latitude)' : ''}.` };
  }
  if (Math.abs(lon) > 180) return { ok: false, erro: `Longitude ${lon} fora de -180 a 180.` };

  const valor = { lat: arredondar(lat), lon: arredondar(lon) };
  const avisos: string[] = [];
  const semLetra = !a.letra && !b.letra;
  const trocaSugerida = semLetra && !dentroDoBrasil(valor) && dentroDoBrasil({ lat: valor.lon, lon: valor.lat });
  if (trocaSugerida) avisos.push('Parece que a ordem está trocada (longitude, latitude).');
  else if (!dentroDoBrasil(valor)) avisos.push('Fica fora do Brasil: confira os sinais e a ordem.');
  return { ok: true, valor, formato, avisos, trocaSugerida };
}

/** Seis casas decimais: cerca de 10 cm, mais que suficiente. */
const arredondar = (v: number) => Math.round(v * 1e6) / 1e6;

/** "-15.500000, -55.500000" (o que vai no campo ao editar). */
export const formatarDecimal = ({ lat, lon }: Coordenada) => `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

function gms(valor: number, positivo: string, negativo: string): string {
  const total = Math.round(Math.abs(valor) * 3600 * 100) / 100; // em segundos, com 2 casas
  const g = Math.floor(total / 3600);
  const m = Math.floor((total - g * 3600) / 60);
  const s = Math.round((total - g * 3600 - m * 60) * 100) / 100;
  return `${g}° ${m}' ${String(s).replace('.', ',')}" ${valor < 0 ? negativo : positivo}`;
}

/** "15° 30' 0" S, 55° 30' 0" W", como no QGIS. */
export const formatarGms = ({ lat, lon }: Coordenada) => `${gms(lat, 'N', 'S')}, ${gms(lon, 'E', 'W')}`;

/** Coordenada gravada válida (armazenamento ou importação). */
export function coordenadaValida(x: unknown): x is Coordenada {
  if (typeof x !== 'object' || x === null) return false;
  const c = x as Record<string, unknown>;
  return (
    Object.keys(c).length === 2 &&
    typeof c.lat === 'number' && Number.isFinite(c.lat) && Math.abs(c.lat) <= 90 &&
    typeof c.lon === 'number' && Number.isFinite(c.lon) && Math.abs(c.lon) <= 180
  );
}
