// Extração de dados de uma frase do assistente (21/11/2026): funções puras, sem IA e sem estado.
// Hoje só reconhece o código de demanda fictícia (DEM-FIC-nnnn), em qualquer parte da frase.

/** DEM-FIC-0001, dem-fic-1, "dem fic 3" ou "demfic0003": letras sem distinção de maiúsculas. */
const PADRAO_ID = /(?<![a-z0-9])dem[\s_-]*fic[\s_-]*(\d{1,4})(?![a-z0-9])/gi;

/** Códigos de demanda citados na frase, no formato exato DEM-FIC-nnnn, na ordem e sem repetir. */
export function extrairIds(texto: string): string[] {
  const ids: string[] = [];
  for (const m of texto.matchAll(PADRAO_ID)) {
    const id = `DEM-FIC-${m[1].padStart(4, '0')}`;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}
