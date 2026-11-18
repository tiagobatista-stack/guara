// Menu e painel do assistente recolhíveis; a escolha fica neste navegador. Sem escolha salva (ou sem acesso ao
// armazenamento), começam recolhidos só em tela estreita (< 900 px); essa regra nunca grava nada.

import { useState } from 'react';

export const LARGURA_ESTREITA = 900;
export const CHAVE_MENU = 'guara:menu-recolhido:v1';
export const CHAVE_PAINEL = 'guara:painel-recolhido:v1';

function lerEscolha(chave: string): boolean | null {
  try {
    const v = localStorage.getItem(chave);
    return v === '1' ? true : v === '0' ? false : null;
  } catch {
    return null;
  }
}

export function useRecolhido(chave: string): [boolean, () => void] {
  const [recolhido, setRecolhido] = useState(() => lerEscolha(chave) ?? window.innerWidth < LARGURA_ESTREITA);
  const alternar = () => {
    const novo = !recolhido;
    setRecolhido(novo);
    try { localStorage.setItem(chave, novo ? '1' : '0'); } catch { /* sem armazenamento: vale só nesta sessão */ }
  };
  return [recolhido, alternar];
}
