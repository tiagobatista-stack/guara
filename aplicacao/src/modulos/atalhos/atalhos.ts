// Atalhos para sistemas externos (SIGPAS, SIGADOC, Portal SEMA...), editáveis pelo analista.
// O GUARÁ só abre o endereço numa aba nova: não faz login, não guarda senha e não lê nada do sistema (princípio 1).
// Fica no localStorage deste navegador; com o armazenamento bloqueado, vale só até fechar a página.

import { useSyncExternalStore } from 'react';

export const CHAVE_ATALHOS = 'guara:atalhos:v1';
export const TAMANHO_MAXIMO_NOME_ATALHO = 40;
export const TAMANHO_MAXIMO_URL = 500;
export const MAXIMO_ATALHOS = 30;

export interface Atalho {
  id: string;
  nome: string;
  url: string;
}

export const ATALHOS_PADRAO: readonly Atalho[] = [
  { id: 'sigpas', nome: 'SIGPAS', url: 'https://sigpas.seplag.mt.gov.br/sigpas/' },
  { id: 'sigadoc', nome: 'SIGADOC', url: 'https://www.sigadoc.mt.gov.br/siga/app/principal' },
  { id: 'portal-sema', nome: 'Portal SEMA', url: 'https://portal.sema.mt.gov.br/#/login?returnUrl=%2F' },
];

export function limparNomeAtalho(nome: string): string {
  return nome.replace(/\s+/g, ' ').trim();
}

/** Endereço aceito, já normalizado; ou a mensagem do problema. Só http e https: nada de javascript:, data: etc. */
export function validarEndereco(url: string): { ok: true; url: string } | { ok: false; erro: string } {
  const texto = url.trim();
  if (!texto) return { ok: false, erro: 'Informe o endereço.' };
  if (texto.length > TAMANHO_MAXIMO_URL) return { ok: false, erro: `O endereço pode ter até ${TAMANHO_MAXIMO_URL} caracteres.` };
  if (!/^https?:\/\//i.test(texto)) return { ok: false, erro: 'O endereço precisa começar com https:// (ou http://).' };
  try {
    const u = new URL(texto);
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !u.hostname) throw new Error();
    return { ok: true, url: u.href };
  } catch {
    return { ok: false, erro: 'Endereço inválido.' };
  }
}

/** Confere nome e endereço; devolve o atalho limpo (sem id) ou a mensagem do problema. */
export function validarAtalho(nome: string, url: string): { ok: true; nome: string; url: string } | { ok: false; erro: string } {
  const n = limparNomeAtalho(nome);
  if (!n) return { ok: false, erro: 'Informe o nome do atalho.' };
  if (n.length > TAMANHO_MAXIMO_NOME_ATALHO) return { ok: false, erro: `O nome pode ter até ${TAMANHO_MAXIMO_NOME_ATALHO} caracteres.` };
  const e = validarEndereco(url);
  if (!e.ok) return e;
  return { ok: true, nome: n, url: e.url };
}

/** Lista gravada válida: itens inválidos (gravação corrompida ou alterada à mão) são descartados. */
export function validarLista(x: unknown): Atalho[] {
  if (!Array.isArray(x)) return [...ATALHOS_PADRAO];
  const lista: Atalho[] = [];
  const ids = new Set<string>();
  for (const item of x) {
    if (typeof item !== 'object' || item === null) continue;
    const { id, nome, url } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !id || ids.has(id) || typeof nome !== 'string' || typeof url !== 'string') continue;
    const v = validarAtalho(nome, url);
    if (!v.ok) continue;
    ids.add(id);
    lista.push({ id, nome: v.nome, url: v.url });
    if (lista.length === MAXIMO_ATALHOS) break;
  }
  return lista;
}

// ---------- Armazém pequeno, no mesmo esquema das preferências do mascote ----------

const ouvintes = new Set<() => void>();
let brutoLido: string | null | undefined;
let atual: Atalho[] = [...ATALHOS_PADRAO];
let soNaMemoria = false;

function lerBruto(): string | null | undefined {
  try {
    return window.localStorage.getItem(CHAVE_ATALHOS);
  } catch {
    return undefined;
  }
}

/** Atalhos atuais. Sem nada gravado, os três iniciais; lista vazia gravada continua vazia. */
export function obterAtalhos(): Atalho[] {
  if (soNaMemoria) return atual;
  const bruto = lerBruto();
  if (bruto === undefined) {
    soNaMemoria = true;
    return atual;
  }
  if (bruto !== brutoLido) {
    brutoLido = bruto;
    try {
      atual = bruto === null ? [...ATALHOS_PADRAO] : validarLista(JSON.parse(bruto));
    } catch {
      atual = [...ATALHOS_PADRAO];
    }
  }
  return atual;
}

function gravar(nova: Atalho[]) {
  atual = nova;
  const bruto = JSON.stringify(nova);
  try {
    window.localStorage.setItem(CHAVE_ATALHOS, bruto);
    brutoLido = bruto;
    soNaMemoria = false;
  } catch {
    soNaMemoria = true;
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

function novoId(lista: readonly Atalho[]): string {
  let id: string;
  do id = `atalho-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  while (lista.some((a) => a.id === id));
  return id;
}

/** Inclui um atalho no fim da lista. Devolve a mensagem do problema, ou null quando deu certo. */
export function incluirAtalho(nome: string, url: string): string | null {
  const lista = obterAtalhos();
  if (lista.length >= MAXIMO_ATALHOS) return `O limite é de ${MAXIMO_ATALHOS} atalhos. Exclua um antes de incluir outro.`;
  const v = validarAtalho(nome, url);
  if (!v.ok) return v.erro;
  gravar([...lista, { id: novoId(lista), nome: v.nome, url: v.url }]);
  return null;
}

/** Altera nome e endereço de um atalho. Devolve a mensagem do problema, ou null quando deu certo. */
export function editarAtalho(id: string, nome: string, url: string): string | null {
  const lista = obterAtalhos();
  if (!lista.some((a) => a.id === id)) return 'Atalho não encontrado.';
  const v = validarAtalho(nome, url);
  if (!v.ok) return v.erro;
  gravar(lista.map((a) => (a.id === id ? { id, nome: v.nome, url: v.url } : a)));
  return null;
}

/** Exclui um atalho, um por vez. */
export function excluirAtalho(id: string) {
  gravar(obterAtalhos().filter((a) => a.id !== id));
}

/** Volta aos três atalhos iniciais. */
export function restaurarAtalhosIniciais() {
  gravar([...ATALHOS_PADRAO]);
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  window.addEventListener('storage', ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener('storage', ouvinte);
  };
}

export function useAtalhos(): Atalho[] {
  return useSyncExternalStore(assinar, obterAtalhos);
}

export function atalhosSoNaMemoria(): boolean {
  obterAtalhos();
  return soNaMemoria;
}

export function useAtalhosSoNaMemoria(): boolean {
  return useSyncExternalStore(assinar, atalhosSoNaMemoria);
}
