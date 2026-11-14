// Feriados locais (estaduais, municipais, recessos) e datas nacionais que não valem para quem usa.
// Regras puras: validação, leitura do formulário e conversão para o AjusteFeriados de dias-uteis.ts.
// Gravado no localStorage pela chave CHAVE_FERIADOS (armazem.ts).

import { dataValida } from '../demandas/regras.ts';
import { pascoa, type AjusteFeriados } from './dias-uteis.ts';

export const CHAVE_FERIADOS = 'guara:feriados:v1';
export const LIMITE_FERIADOS = 100;
export const NOME_FERIADO_MAX = 60;

export interface FeriadoLocal {
  /** AAAA-MM-DD; se `anual`, vale o dia e o mês de todo ano. */
  data: string;
  nome: string;
  anual: boolean;
}

export interface ConfiguracaoFeriados {
  extras: FeriadoLocal[];
  /** Datas nacionais (AAAA-MM-DD) que não valem para quem usa. */
  remover: string[];
  /** Carnaval (segunda e terça) e Corpus Christi também contam. */
  facultativos: boolean;
}

export const FERIADOS_VAZIOS: ConfiguracaoFeriados = { extras: [], remover: [], facultativos: false };

const ehFeriadoLocal = (x: unknown): x is FeriadoLocal => {
  if (typeof x !== 'object' || x === null) return false;
  const f = x as Record<string, unknown>;
  return typeof f.data === 'string' && dataValida(f.data) &&
    typeof f.nome === 'string' && f.nome.trim().length > 0 && f.nome.length <= NOME_FERIADO_MAX &&
    typeof f.anual === 'boolean';
};

/** Configuração gravada válida, ou null (gravação corrompida ou alterada à mão). */
export function validarFeriados(x: unknown): ConfiguracaoFeriados | null {
  if (typeof x !== 'object' || x === null) return null;
  const c = x as Record<string, unknown>;
  if (!Array.isArray(c.extras) || !Array.isArray(c.remover) || typeof c.facultativos !== 'boolean') return null;
  if (c.extras.length > LIMITE_FERIADOS || c.remover.length > LIMITE_FERIADOS) return null;
  if (!c.extras.every(ehFeriadoLocal)) return null;
  if (!c.remover.every((d) => typeof d === 'string' && dataValida(d))) return null;
  return { extras: c.extras as FeriadoLocal[], remover: c.remover as string[], facultativos: c.facultativos };
}

export type ResultadoFeriado = { ok: true; feriado: FeriadoLocal } | { ok: false; erro: string };

/** Lê o formulário "novo feriado"; recusa data inválida, nome vazio ou longo, repetido e acima do limite. */
export function lerNovoFeriado(atual: ConfiguracaoFeriados, data: string, nome: string, anual: boolean): ResultadoFeriado {
  const n = nome.trim().replace(/\s+/g, ' ');
  if (!dataValida(data)) return { ok: false, erro: 'Informe uma data válida.' };
  if (!n) return { ok: false, erro: 'Informe o nome do feriado.' };
  if (n.length > NOME_FERIADO_MAX) return { ok: false, erro: `O nome pode ter no máximo ${NOME_FERIADO_MAX} caracteres.` };
  if (atual.extras.length >= LIMITE_FERIADOS) return { ok: false, erro: `Limite de ${LIMITE_FERIADOS} feriados locais.` };
  const repetido = atual.extras.some((f) => (anual || f.anual ? f.data.slice(5) === data.slice(5) : f.data === data));
  if (repetido) return { ok: false, erro: 'Já existe um feriado local nesta data.' };
  return { ok: true, feriado: { data, nome: n, anual } };
}

/** Converte para o ajuste das contas; os anuais valem do ano anterior a três anos à frente de `anoBase`. */
export function paraAjuste(c: ConfiguracaoFeriados, anoBase: number): AjusteFeriados {
  const extras: string[] = [];
  for (const f of c.extras) {
    if (!f.anual) {
      extras.push(f.data);
      continue;
    }
    for (let ano = anoBase - 1; ano <= anoBase + 3; ano++) {
      const data = `${ano}${f.data.slice(4)}`;
      if (dataValida(data)) extras.push(data); // 29/02 só nos anos bissextos
    }
  }
  return { extras, remover: c.remover, facultativos: c.facultativos };
}

const doisDigitos = (n: number) => String(n).padStart(2, '0');
const somarDias = (aaaammdd: string, dias: number) => {
  const [a, m, d] = aaaammdd.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, d + dias));
  return `${t.getUTCFullYear()}-${doisDigitos(t.getUTCMonth() + 1)}-${doisDigitos(t.getUTCDate())}`;
};

/** Feriados nacionais do ano com nome, para a tela escolher os que não valem. */
export function nacionaisComNome(ano: number, facultativos: boolean): { data: string; nome: string; facultativo: boolean }[] {
  const fixos: [string, string][] = [
    ['01-01', 'Confraternização Universal'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'],
    ['09-07', 'Independência'], ['10-12', 'Nossa Senhora Aparecida'], ['11-02', 'Finados'],
    ['11-15', 'Proclamação da República'], ['11-20', 'Consciência Negra'], ['12-25', 'Natal'],
  ];
  const p = pascoa(ano);
  const lista = fixos.map(([md, nome]) => ({ data: `${ano}-${md}`, nome, facultativo: false }));
  lista.push({ data: somarDias(p, -2), nome: 'Sexta-feira Santa', facultativo: false });
  if (facultativos) {
    lista.push(
      { data: somarDias(p, -48), nome: 'Carnaval (segunda)', facultativo: true },
      { data: somarDias(p, -47), nome: 'Carnaval (terça)', facultativo: true },
      { data: somarDias(p, 60), nome: 'Corpus Christi', facultativo: true },
    );
  }
  return lista.sort((a, b) => a.data.localeCompare(b.data));
}
