// Preferências do mascote: qual é o principal e o nome que o analista deu a cada um.
// É só uma preferência visual (seção 7.3 do planejamento): não muda permissões, dados nem capacidades.
// Fica no localStorage deste navegador; com o armazenamento bloqueado, vale só até fechar a página.

import { useSyncExternalStore } from 'react';
import { MASCOTES, type EspecieMascote } from './especies-mascote.ts';

export const CHAVE_MASCOTE = 'guara:mascote:v1';
export const TAMANHO_MAXIMO_NOME = 20;

export interface PreferenciasMascote {
  principal: EspecieMascote;
  /** Nome dado pelo analista; espécie sem nome usa o nome da espécie. */
  nomes: Partial<Record<EspecieMascote, string>>;
}

export const PREFERENCIAS_PADRAO: PreferenciasMascote = { principal: 'capivara', nomes: {} };

const ESPECIES = Object.keys(MASCOTES) as EspecieMascote[];
const ehEspecie = (x: unknown): x is EspecieMascote => typeof x === 'string' && (ESPECIES as string[]).includes(x);

/** Tira espaços sobrando e corta no tamanho máximo. Devolve '' quando não sobra nome. */
export function limparNome(nome: string): string {
  return nome.replace(/\s+/g, ' ').trim().slice(0, TAMANHO_MAXIMO_NOME).trim();
}

/** Preferências gravadas válidas; qualquer parte inválida (gravação corrompida ou alterada à mão) volta ao padrão. */
export function validarPreferencias(x: unknown): PreferenciasMascote {
  if (typeof x !== 'object' || x === null) return PREFERENCIAS_PADRAO;
  const bruto = x as { principal?: unknown; nomes?: unknown };
  const nomes: PreferenciasMascote['nomes'] = {};
  if (typeof bruto.nomes === 'object' && bruto.nomes !== null) {
    for (const especie of ESPECIES) {
      const nome = (bruto.nomes as Record<string, unknown>)[especie];
      if (typeof nome === 'string' && limparNome(nome)) nomes[especie] = limparNome(nome);
    }
  }
  return { principal: ehEspecie(bruto.principal) ? bruto.principal : PREFERENCIAS_PADRAO.principal, nomes };
}

/** Nome mostrado na tela: o escolhido pelo analista ou, sem ele, o da espécie. */
export function nomeDoMascote(p: PreferenciasMascote, especie: EspecieMascote): string {
  return p.nomes[especie] || MASCOTES[especie].nome;
}

// ---------- Armazém pequeno, compartilhado por todas as telas ----------

const ouvintes = new Set<() => void>();
let brutoLido: string | null | undefined; // undefined = ainda não leu
let atual: PreferenciasMascote = PREFERENCIAS_PADRAO;
let soNaMemoria = false; // armazenamento bloqueado: guarda só enquanto a página estiver aberta

function lerBruto(): string | null | undefined {
  try {
    return window.localStorage.getItem(CHAVE_MASCOTE);
  } catch {
    return undefined;
  }
}

/** Preferências atuais. Relê o localStorage quando o conteúdo gravado mudou (outra aba, limpeza, importação). */
export function obterPreferencias(): PreferenciasMascote {
  if (soNaMemoria) return atual;
  const bruto = lerBruto();
  if (bruto === undefined) {
    soNaMemoria = true;
    return atual;
  }
  if (bruto !== brutoLido) {
    brutoLido = bruto;
    try {
      atual = bruto === null ? PREFERENCIAS_PADRAO : validarPreferencias(JSON.parse(bruto));
    } catch {
      atual = PREFERENCIAS_PADRAO;
    }
  }
  return atual;
}

function gravar(nova: PreferenciasMascote) {
  atual = nova;
  const bruto = JSON.stringify(nova);
  try {
    window.localStorage.setItem(CHAVE_MASCOTE, bruto);
    brutoLido = bruto;
    soNaMemoria = false;
  } catch {
    soNaMemoria = true;
  }
  ouvintes.forEach((ouvinte) => ouvinte());
}

export function escolherPrincipal(especie: EspecieMascote) {
  gravar({ ...obterPreferencias(), principal: especie });
}

/** Grava o nome do mascote; nome vazio volta a mostrar a espécie. */
export function nomearMascote(especie: EspecieMascote, nome: string) {
  const p = obterPreferencias();
  const nomes = { ...p.nomes };
  const limpo = limparNome(nome);
  if (limpo) nomes[especie] = limpo;
  else delete nomes[especie];
  gravar({ ...p, nomes });
}

/** Substitui as preferências inteiras (importação de backup). */
export function definirPreferencias(p: PreferenciasMascote) {
  gravar(validarPreferencias(p));
}

function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  window.addEventListener('storage', ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener('storage', ouvinte);
  };
}

export function usePreferenciasMascote(): PreferenciasMascote {
  return useSyncExternalStore(assinar, obterPreferencias);
}

/** true quando o navegador não deixou ler ou gravar: as preferências valem só até fechar a página. */
export function preferenciasSoNaMemoria(): boolean {
  obterPreferencias();
  return soNaMemoria;
}

export function usePreferenciasSoNaMemoria(): boolean {
  return useSyncExternalStore(assinar, preferenciasSoNaMemoria);
}
