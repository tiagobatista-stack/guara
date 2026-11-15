// Conversa com o assistente, guardada neste navegador (`guara:conversa:v1`).
// Motivo: na gaveta (celular e tablet) o painel é desmontado ao fechar, e no desktop o painel fixo
// e a gaveta são instâncias separadas; sem um armazém único, cada abertura recomeçava do "Olá".
// Só comandos e respostas determinísticas: nada de dado pessoal além do que a pessoa digitou.
// Com o armazenamento bloqueado, vale só até fechar a página (mesma regra das preferências).

import { useSyncExternalStore } from 'react';

export const CHAVE_CONVERSA = 'guara:conversa:v1';
/** Falas guardadas no máximo; as mais antigas saem primeiro. */
export const MAXIMO_DE_FALAS = 60;
const TAMANHO_MAXIMO_TEXTO = 2000;

export type Natureza = 'fato' | 'inferência' | 'sugestão';

export interface Mensagem {
  autor: 'usuario' | 'assistente';
  texto: string;
  natureza?: Natureza;
  fonte?: string;
}

const NATUREZAS: Natureza[] = ['fato', 'inferência', 'sugestão'];

function validarMensagem(x: unknown): Mensagem | null {
  if (typeof x !== 'object' || x === null) return null;
  const b = x as Record<string, unknown>;
  if ((b.autor !== 'usuario' && b.autor !== 'assistente') || typeof b.texto !== 'string' || !b.texto.trim()) return null;
  const m: Mensagem = { autor: b.autor, texto: b.texto.slice(0, TAMANHO_MAXIMO_TEXTO) };
  if (typeof b.natureza === 'string' && (NATUREZAS as string[]).includes(b.natureza)) m.natureza = b.natureza as Natureza;
  if (typeof b.fonte === 'string') m.fonte = b.fonte.slice(0, TAMANHO_MAXIMO_TEXTO);
  return m;
}

/** Lista gravada válida; falas inválidas são descartadas e o excesso cortado pelo começo. */
export function validarConversa(x: unknown): Mensagem[] {
  if (!Array.isArray(x)) return [];
  return x.map(validarMensagem).filter((m): m is Mensagem => m !== null).slice(-MAXIMO_DE_FALAS);
}

// ---------- Armazém pequeno, compartilhado pelo painel fixo e pela gaveta ----------

const VAZIA: Mensagem[] = [];
const ouvintes = new Set<() => void>();
let brutoLido: string | null | undefined;
let atual: Mensagem[] = VAZIA;
let soNaMemoria = false;

function lerBruto(): string | null | undefined {
  try {
    return window.localStorage.getItem(CHAVE_CONVERSA);
  } catch {
    return undefined;
  }
}

export function obterConversa(): Mensagem[] {
  if (soNaMemoria) return atual;
  const bruto = lerBruto();
  if (bruto === undefined) {
    soNaMemoria = true;
    return atual;
  }
  if (bruto !== brutoLido) {
    brutoLido = bruto;
    try {
      atual = bruto === null ? VAZIA : validarConversa(JSON.parse(bruto));
    } catch {
      atual = VAZIA;
    }
  }
  return atual;
}

function gravar(nova: Mensagem[]) {
  atual = nova;
  const bruto = JSON.stringify(nova);
  try {
    window.localStorage.setItem(CHAVE_CONVERSA, bruto);
    brutoLido = bruto;
    soNaMemoria = false;
  } catch {
    soNaMemoria = true;
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Acrescenta falas ao fim da conversa, respeitando o máximo guardado. */
export function acrescentarFalas(falas: readonly Mensagem[]) {
  gravar([...obterConversa(), ...falas].slice(-MAXIMO_DE_FALAS));
}

export function limparConversa() {
  gravar(VAZIA);
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  window.addEventListener('storage', ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener('storage', ouvinte);
  };
}

export function useConversa(): Mensagem[] {
  return useSyncExternalStore(assinar, obterConversa);
}
