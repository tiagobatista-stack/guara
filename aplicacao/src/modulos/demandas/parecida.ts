// Aviso de demanda parecida antes de criar (ideia do TOCA, `_parecida` em comandos_extras_modulo.py).
// Regra pura: compara a entrada com as demandas EM ABERTO e devolve a provável duplicata, ou null.
// Só avisa; quem decide criar outra mesmo assim é a pessoa.

import type { Demanda } from './modelo.ts';
import { LER_NUMERO, NUMEROS, type CampoNumero } from './identificadores.ts';

/** Palavras que não contam na comparação de títulos ("relatório e" não vira "Entregar relatório"). */
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na', 'nos', 'nas', 'para', 'pra', 'com', 'por', 'ao', 'um', 'uma']);

// Número de processo: SIGLA-… com dígitos (FIC-2026-0001, ORGAO-PRO-2024/12345) ou nº/ano (213456/2022).
const RE_PROCESSO = /(?<![\p{L}\p{N}])(?:\p{L}{2,10}-[\p{L}\p{N}/.-]*\p{N}|\p{N}{3,8}\/(?:19|20)\p{N}{2})(?![\p{L}\p{N}])/gu;

export type MotivoParecida = 'processo' | 'titulo-igual' | 'titulo-contido';

export interface Parecida {
  demanda: Demanda;
  motivo: MotivoParecida;
  /** Número em comum, quando o motivo é "processo". */
  processo?: string;
  /** De que tipo é o número em comum. */
  tipoNumero?: CampoNumero;
}

const NOME_CURTO: Record<CampoNumero, string> = { processo: 'processo', simp: 'SIMP', judicial: 'processo judicial' };

/** Minúsculas e sem acento. */
const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');

const palavras = (s: string) => normalizar(s).match(/[\p{L}\p{N}]+/gu) ?? [];

export function processosNoTexto(texto: string): string[] {
  // Pelo menos 3 dígitos: "COVID-19" não é número de processo.
  const achados = (texto.match(RE_PROCESSO) ?? []).filter((p) => (p.match(/\p{N}/gu) ?? []).length >= 3);
  return [...new Set(achados.map((p) => p.toUpperCase()))];
}

/**
 * A demanda em aberto que a entrada provavelmente repete, na ordem do TOCA:
 * 1) o mesmo número (processo, SIMP ou CNJ nos campos, ou processo no título ou na descrição) em UMA só demanda;
 * 2) o mesmo título, sem diferença de acento, maiúsculas ou espaços;
 * 3) todas as palavras do título digitado (2 ou mais, fora conectivos) inteiras no título de UMA só demanda.
 */
export function acharParecida(
  entrada: { titulo: string; descricao: string; processo?: string; simp?: string; judicial?: string },
  demandas: readonly Demanda[],
): Parecida | null {
  const abertas = demandas.filter((d) => d.status !== 'Concluída');

  for (const { valor, campo } of numerosDe(entrada)) {
    const mesmas = abertas.filter((d) => numerosDe(d).some((n) => n.valor === valor));
    if (mesmas.length === 1) return { demanda: mesmas[0], motivo: 'processo', processo: valor, tipoNumero: campo };
  }

  const alvo = palavras(entrada.titulo).join(' ');
  if (!alvo) return null;
  const igual = abertas.find((d) => palavras(d.titulo).join(' ') === alvo);
  if (igual) return { demanda: igual, motivo: 'titulo-igual' };

  const digitadas = new Set(palavras(entrada.titulo).filter((p) => !CONECTIVOS.has(p)));
  if (digitadas.size >= 2) {
    const contem = abertas.filter((d) => {
      const doTitulo = new Set(palavras(d.titulo));
      return [...digitadas].every((p) => doTitulo.has(p));
    });
    if (contem.length === 1) return { demanda: contem[0], motivo: 'titulo-contido' };
  }
  return null;
}

/** Os três números (normalizados) e os números de processo achados no título e na descrição. */
function numerosDe(x: { titulo: string; descricao: string; processo?: string; simp?: string; judicial?: string }): { valor: string; campo: CampoNumero }[] {
  const campos = NUMEROS.flatMap((campo) => {
    const r = LER_NUMERO[campo]((x[campo] ?? '').trim());
    return (x[campo] ?? '').trim() && r.ok ? [{ valor: r.valor, campo }] : [];
  });
  const doTexto = processosNoTexto(`${x.titulo} ${x.descricao}`)
    .filter((valor) => !campos.some((n) => n.valor === valor))
    .map((valor) => ({ valor, campo: 'processo' as const }));
  return [...campos, ...doTexto];
}

/** Frase do aviso: por que a demanda parece a mesma. */
export function textoMotivo(p: Parecida): string {
  if (p.motivo === 'processo') return `mesmo ${NOME_CURTO[p.tipoNumero ?? 'processo']} ${p.processo}`;
  if (p.motivo === 'titulo-igual') return 'mesmo título';
  return 'o título digitado está inteiro no título dela';
}
