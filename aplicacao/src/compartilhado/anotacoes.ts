// Anotações em checklist (demanda e ponto de operação): "coisas que aparecem ao longo da análise, que precisam ser
// lembradas e resolvidas, mas que não fazem parte do sistema" (pedido do responsável, 18/11/2026).
// Regra única, em funções puras; o componente é AnotacoesDoItem.tsx. Não vão para planilha da SEMA, CSV nem GeoJSON.

export interface Anotacao {
  id: string;
  /** 1 a 200 caracteres, sem espaços sobrando. */
  texto: string;
  feita: boolean;
  /** ISO 8601. */
  criadaEm: string;
  /** ISO 8601; presente só enquanto `feita`. */
  feitaEm?: string;
}

export const LIMITES_ANOTACAO = { texto: 200, itens: 50 } as const;

type Resultado = { ok: true; lista: Anotacao[] } | { ok: false; mensagem: string };

const dataIso = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));

/** Texto limpo (espaços repetidos viram um), ou a mensagem para a pessoa. */
export function conferirTextoAnotacao(texto: string): { ok: true; texto: string } | { ok: false; mensagem: string } {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (!limpo) return { ok: false, mensagem: 'Escreva a anotação.' };
  if (limpo.length > LIMITES_ANOTACAO.texto) return { ok: false, mensagem: `A anotação tem no máximo ${LIMITES_ANOTACAO.texto} caracteres.` };
  return { ok: true, texto: limpo };
}

export function adicionarAnotacao(lista: readonly Anotacao[] | undefined, texto: string, agoraIso: string, id: string): Resultado {
  const atual = lista ?? [];
  if (atual.length >= LIMITES_ANOTACAO.itens) return { ok: false, mensagem: `O limite é de ${LIMITES_ANOTACAO.itens} anotações por item.` };
  const t = conferirTextoAnotacao(texto);
  if (!t.ok) return t;
  return { ok: true, lista: [...atual, { id, texto: t.texto, feita: false, criadaEm: agoraIso }] };
}

/** Marca ou desmarca; marcar grava `feitaEm`, desmarcar apaga. */
export const alternarAnotacao = (lista: readonly Anotacao[] | undefined, id: string, agoraIso: string): Anotacao[] =>
  (lista ?? []).map((a) => {
    if (a.id !== id) return a;
    const { feitaEm: _f, ...resto } = a;
    void _f;
    return a.feita ? { ...resto, feita: false } : { ...resto, feita: true, feitaEm: agoraIso };
  });

export function editarAnotacao(lista: readonly Anotacao[] | undefined, id: string, texto: string): Resultado {
  const t = conferirTextoAnotacao(texto);
  if (!t.ok) return t;
  return { ok: true, lista: (lista ?? []).map((a) => (a.id === id ? { ...a, texto: t.texto } : a)) };
}

export const excluirAnotacao = (lista: readonly Anotacao[] | undefined, id: string): Anotacao[] => (lista ?? []).filter((a) => a.id !== id);

export const anotacoesAbertas = (lista: readonly Anotacao[] | undefined) => (lista ?? []).filter((a) => !a.feita);
export const contarAbertas = (lista: readonly Anotacao[] | undefined) => anotacoesAbertas(lista).length;
export const textoAnotacoesAbertas = (n: number) => `${n} anotação(ões) aberta(s)`;

/** Abertas em cima, na ordem de criação; feitas embaixo, também na ordem de criação. */
export const ordenarAnotacoes = (lista: readonly Anotacao[] | undefined): Anotacao[] =>
  [...(lista ?? [])].sort((a, b) => Number(a.feita) - Number(b.feita) || a.criadaEm.localeCompare(b.criadaEm));

/** Valida a lista vinda do armazenamento ou de importação. */
export function anotacoesValidas(x: unknown): x is Anotacao[] {
  if (!Array.isArray(x) || x.length > LIMITES_ANOTACAO.itens) return false;
  const ids = new Set<string>();
  return x.every((a) => {
    if (typeof a !== 'object' || a === null) return false;
    const r = a as Record<string, unknown>;
    if (typeof r.id !== 'string' || !r.id || ids.has(r.id)) return false;
    ids.add(r.id);
    return (
      typeof r.texto === 'string' && r.texto.trim().length > 0 && r.texto.length <= LIMITES_ANOTACAO.texto &&
      typeof r.feita === 'boolean' && dataIso(r.criadaEm) && (r.feitaEm === undefined || dataIso(r.feitaEm))
    );
  });
}

/** Lista nova no item: sem anotações, o campo some (não fica `[]` gravado). */
export function comAnotacoes<T extends { anotacoes?: Anotacao[] }>(item: T, lista: readonly Anotacao[]): T {
  const { anotacoes: _a, ...resto } = item;
  void _a;
  return (lista.length ? { ...resto, anotacoes: [...lista] } : resto) as T;
}
