// Tipo (campo × gabinete) e natureza (demanda × tarefa comum) deduzidos das palavras do título
// (ideia do TOCA, `tipo.py` e `demanda.py`). Regras puras: devolvem a sugestão e a palavra que decidiu,
// para a tela mostrar o porquê. Na dúvida devolvem null e a pessoa escolhe.

export const TIPOS = ['campo', 'gabinete'] as const;
export type Tipo = (typeof TIPOS)[number];
export const ROTULOS_TIPO: Record<Tipo, string> = { campo: '🚙 Campo', gabinete: '🏢 Gabinete' };

export const NATUREZAS = ['demanda', 'comum'] as const;
export type Natureza = (typeof NATUREZAS)[number];
export const ROTULOS_NATUREZA: Record<Natureza, string> = { demanda: 'Demanda', comum: 'Tarefa comum' };

// Começo de palavra, sem acento nem maiúsculas; "$" no fim = só a palavra inteira ("mp$" não pega "mpresa").
export const PALAVRAS_CAMPO = ['vistoria', 'campo', 'fiscalizar', 'fiscalizacao', 'embargo', 'operacao'];
export const PALAVRAS_GABINETE = ['responder', 'oficio', 'analisar', 'analise', 'parecer', 'despacho', 'minuta', 'redigir', 'informac', 'esclarec', 'manifestac', 'solicitac'];
/** Vencem as de campo: "Informações sobre o embargo" é gabinete. */
export const FORTES_GABINETE = ['oficio', 'informac', 'esclarec', 'manifestac'];
export const PALAVRAS_DEMANDA = [
  'analis', 'parecer', 'oficio', 'manifestac', 'vistoria', 'processo', 'embargo', 'fiscaliz', 'notificac', 'auto de infrac', 'licenc',
  'denuncia', 'desmat', 'queimad', 'informac', 'esclarec', 'despacho', 'minuta', 'relatorio tecnico', 'demanda', 'laudo', 'pericia',
  'nota tecnica', 'promotoria', 'ministerio publico', 'mp$', 'simp$', 'inquerito', 'mandado', 'intimac', 'liminar', 'sentenc', 'tac$',
];
/** Vencem as de demanda: "Reunião sobre o embargo" é reunião. */
export const PALAVRAS_COMUM = [
  'reuniao', 'palestra', 'curso', 'evento', 'treinamento', 'workshop', 'seminario', 'congresso', 'apresentac', 'ligar', 'lembrar',
  'comprar', 'pagar', 'almoco', 'aniversario', 'ferias', 'folga', 'aula',
];

/** Minúsculas e sem acento, com o MESMO tamanho do original (os índices servem para recortar o título). */
function normalizarMesmoTamanho(s: string): string {
  return [...s].map((c) => {
    const n = c.normalize('NFD')[0].toLocaleLowerCase('pt-BR');
    return n.length === c.length ? n : c;
  }).join('');
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A primeira palavra da lista que aparece no título, como está escrita nele ("Informações"), ou ''. */
export function palavraNoTitulo(titulo: string, lista: readonly string[]): string {
  const t = normalizarMesmoTamanho(titulo);
  for (const p of lista) {
    const exata = p.endsWith('$');
    const raiz = escapar(normalizarMesmoTamanho(exata ? p.slice(0, -1) : p));
    const m = new RegExp(`(?<![\\p{L}\\p{N}])${raiz}${exata ? '(?![\\p{L}\\p{N}])' : '[\\p{L}\\p{N}]*'}`, 'u').exec(t);
    if (m) return t.length === titulo.length ? titulo.slice(m.index, m.index + m[0].length) : m[0];
  }
  return '';
}

export interface Deducao<T> {
  valor: T | null;
  /** A palavra (ou o motivo) que decidiu; '' quando não deu para deduzir. */
  porque: string;
}

/** Campo × gabinete. Dúvida (nenhuma palavra, ou dos dois tipos sem uma forte de gabinete) = null. */
export function deduzirTipo(titulo: string): Deducao<Tipo> {
  const c = palavraNoTitulo(titulo, PALAVRAS_CAMPO);
  const g = palavraNoTitulo(titulo, PALAVRAS_GABINETE);
  if (c && !g) return { valor: 'campo', porque: c };
  if (g && !c) return { valor: 'gabinete', porque: g };
  if (c && g) {
    const forte = palavraNoTitulo(titulo, FORTES_GABINETE);
    if (forte) return { valor: 'gabinete', porque: forte };
  }
  return { valor: null, porque: '' };
}

/** Demanda × tarefa comum: número (processo, SIMP ou CNJ) decide primeiro; palavra de tarefa comum vence a de demanda; tipo campo é demanda. */
export function deduzirNatureza(titulo: string, opcoes: { temNumero?: boolean; tipo?: Tipo | null } = {}): Deducao<Natureza> {
  if (opcoes.temNumero) return { valor: 'demanda', porque: 'tem número de processo' };
  const comum = palavraNoTitulo(titulo, PALAVRAS_COMUM);
  if (comum) return { valor: 'comum', porque: comum };
  const demanda = palavraNoTitulo(titulo, PALAVRAS_DEMANDA);
  if (demanda) return { valor: 'demanda', porque: demanda };
  if (opcoes.tipo === 'campo') return { valor: 'demanda', porque: 'é de campo' };
  return { valor: null, porque: '' };
}

/** Frase do porquê: "pela palavra «vistoria»" ou o motivo ("tem número de processo"). */
export function textoPorque(d: Deducao<unknown>): string {
  return d.porque === 'tem número de processo' || d.porque === 'é de campo' ? d.porque : `pela palavra «${d.porque}»`;
}
