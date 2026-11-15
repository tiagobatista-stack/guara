// Lista de contatos de trabalho: nome, instituição/empresa, setor/função, e-mail, celular e observações.
// São dados pessoais (LGPD): ficam só neste navegador, não vão para backup, servidor nem IA, e começam vazios.

import { criarListaLocal, novoId } from './lista-local.ts';

export const CHAVE_CONTATOS = 'guara:contatos:v1';
export const MAXIMO_CONTATOS = 200;
export const LIMITES_CONTATO = { nome: 80, instituicao: 80, setor: 80, email: 120, celular: 20, observacoes: 500 } as const;

export interface Contato {
  id: string;
  nome: string;
  instituicao: string;
  setor: string;
  email: string;
  /** Só dígitos, com DDD (10 ou 11), ou vazio. */
  celular: string;
  observacoes: string;
}

export type DadosContato = Omit<Contato, 'id'>;
export const CONTATO_VAZIO: DadosContato = { nome: '', instituicao: '', setor: '', email: '', celular: '', observacoes: '' };

const linha = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Celular só com dígitos; aceita +55 na frente. Vazio fica vazio. */
export function limparCelular(texto: string): string {
  let d = texto.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d;
}

/** "(65) 99999-1234" ou "(65) 3613-1234" para mostrar na tela. */
export function formatarCelular(digitos: string): string {
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return digitos;
}

/** Confere e limpa os campos; devolve o contato pronto (sem id) ou a mensagem do problema. */
export function validarContato(d: DadosContato): { ok: true; contato: DadosContato } | { ok: false; erro: string } {
  const c: DadosContato = {
    nome: linha(d.nome),
    instituicao: linha(d.instituicao),
    setor: linha(d.setor),
    email: d.email.trim().toLowerCase(),
    celular: limparCelular(d.celular),
    observacoes: d.observacoes.trim(),
  };
  if (!c.nome) return { ok: false, erro: 'Informe o nome do contato.' };
  if (c.nome.length > LIMITES_CONTATO.nome) return { ok: false, erro: `O nome pode ter até ${LIMITES_CONTATO.nome} caracteres.` };
  if (c.instituicao.length > LIMITES_CONTATO.instituicao) return { ok: false, erro: `Instituição/empresa pode ter até ${LIMITES_CONTATO.instituicao} caracteres.` };
  if (c.setor.length > LIMITES_CONTATO.setor) return { ok: false, erro: `Setor/função pode ter até ${LIMITES_CONTATO.setor} caracteres.` };
  if (c.email && (c.email.length > LIMITES_CONTATO.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))) {
    return { ok: false, erro: 'E-mail inválido. Exemplo: nome@sema.mt.gov.br' };
  }
  if (c.celular && c.celular.length !== 10 && c.celular.length !== 11) {
    return { ok: false, erro: 'Celular inválido: use o DDD e o número, por exemplo (65) 99999-1234.' };
  }
  if (c.observacoes.length > LIMITES_CONTATO.observacoes) return { ok: false, erro: `As observações podem ter até ${LIMITES_CONTATO.observacoes} caracteres.` };
  return { ok: true, contato: c };
}

/** Lista gravada válida: itens inválidos (gravação corrompida ou alterada à mão) são descartados. */
export function validarListaContatos(x: unknown): Contato[] {
  if (!Array.isArray(x)) return [];
  const lista: Contato[] = [];
  const ids = new Set<string>();
  for (const item of x) {
    if (typeof item !== 'object' || item === null) continue;
    const b = item as Record<string, unknown>;
    if (typeof b.id !== 'string' || !b.id || ids.has(b.id)) continue;
    const texto = (k: string) => (typeof b[k] === 'string' ? (b[k] as string) : '');
    const v = validarContato({
      nome: texto('nome'), instituicao: texto('instituicao'), setor: texto('setor'),
      email: texto('email'), celular: texto('celular'), observacoes: texto('observacoes'),
    });
    if (!v.ok) continue;
    ids.add(b.id);
    lista.push({ id: b.id, ...v.contato });
    if (lista.length === MAXIMO_CONTATOS) break;
  }
  return lista;
}

/** Em ordem alfabética pelo nome, sem diferenciar acentos nem maiúsculas. */
export function ordenarContatos(lista: readonly Contato[]): Contato[] {
  return [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
}

/** Contatos cujo nome, instituição, setor, e-mail ou celular contém o termo (sem diferenciar acentos). */
export function filtrarContatos(lista: readonly Contato[], termo: string): Contato[] {
  const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const t = normal(termo.trim());
  if (!t) return [...lista];
  return lista.filter((c) => [c.nome, c.instituicao, c.setor, c.email, c.celular].some((campo) => normal(campo).includes(t)));
}

// ---------- Armazém: começa vazio ----------

const armazem = criarListaLocal<Contato>(CHAVE_CONTATOS, () => [], validarListaContatos);

export const obterContatos = armazem.obter;
export const useContatos = armazem.useLista;
export const useContatosSoNaMemoria = armazem.useSoNaMemoria;

export function incluirContato(d: DadosContato): string | null {
  const lista = obterContatos();
  if (lista.length >= MAXIMO_CONTATOS) return `O limite é de ${MAXIMO_CONTATOS} contatos. Exclua um antes de incluir outro.`;
  const v = validarContato(d);
  if (!v.ok) return v.erro;
  armazem.gravar([...lista, { id: novoId('contato', lista), ...v.contato }]);
  return null;
}

export function editarContato(id: string, d: DadosContato): string | null {
  const lista = obterContatos();
  if (!lista.some((c) => c.id === id)) return 'Contato não encontrado.';
  const v = validarContato(d);
  if (!v.ok) return v.erro;
  armazem.gravar(lista.map((c) => (c.id === id ? { id, ...v.contato } : c)));
  return null;
}

/** Exclui um contato, um por vez. */
export function excluirContato(id: string) {
  armazem.gravar(obterContatos().filter((c) => c.id !== id));
}
