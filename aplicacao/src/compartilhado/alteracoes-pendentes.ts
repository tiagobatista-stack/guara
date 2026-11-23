// Proteção contra perder o que foi digitado e não salvo: cada formulário/campo em edição declara `usePendente(sujo)`;
// quem sai da tela pergunta antes. `beforeunload` só entra para fechar ou recarregar a aba.
// TODO: trocar todos os window.confirm do app (aqui, Excluir, Cancelar etc.) por um diálogo do app, numa tarefa única.

import { useEffect, useId } from 'react';

const fontes = new Set<string>();
const aoFecharAba = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };

export const MENSAGEM_PENDENTE = 'Há alterações não salvas. Descartar e sair?';

function marcar(chave: string, valor: boolean): void {
  const tinha = fontes.size > 0;
  if (valor) fontes.add(chave); else fontes.delete(chave);
  if (!tinha && fontes.size > 0) window.addEventListener('beforeunload', aoFecharAba);
  else if (tinha && fontes.size === 0) window.removeEventListener('beforeunload', aoFecharAba);
}

/** Enquanto `sujo` for true (e o componente estiver na tela), há alteração não salva. */
export function usePendente(sujo: boolean): void {
  const chave = useId();
  useEffect(() => { marcar(chave, sujo); return () => marcar(chave, false); }, [chave, sujo]);
}

/** true se pode sair: nada pendente ou o usuário aceitou descartar. */
export function confirmarSaida(): boolean {
  return fontes.size === 0 || window.confirm(MENSAGEM_PENDENTE);
}
