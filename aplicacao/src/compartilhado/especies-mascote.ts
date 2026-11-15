// Espécies dos mascotes, em TypeScript puro (sem React): assim regras e o servidor MCP, que roda
// no Node sem compilar .tsx, podem usar estes dados sem carregar o componente.

export type EspecieMascote = 'ariranha' | 'lobo-guara' | 'capivara';

export const MASCOTES: Record<EspecieMascote, { nome: string; bioma: string; pelagem: string; detalhe: string }> = {
  ariranha: { nome: 'Ariranha', bioma: 'Amazônia', pelagem: '#7a5535', detalhe: '#f6e8cc' },
  'lobo-guara': { nome: 'Lobo-guará', bioma: 'Cerrado', pelagem: '#d17a30', detalhe: '#2a2018' },
  capivara: { nome: 'Capivara', bioma: 'Pantanal', pelagem: '#a37d58', detalhe: '#c29d7a' },
};
