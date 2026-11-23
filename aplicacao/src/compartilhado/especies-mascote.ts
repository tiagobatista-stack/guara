// Espécies dos mascotes, em TypeScript puro (sem React): assim regras e o servidor MCP, que roda
// no Node sem compilar .tsx, podem usar estes dados sem carregar o componente.

export type EspecieMascote = 'ariranha' | 'lobo-guara' | 'capivara';

export const MASCOTES: Record<EspecieMascote, { nome: string; bioma: string; personalidade: string; pelagem: string; detalhe: string }> = {
  ariranha: { nome: 'Ariranha', bioma: 'Amazônia', personalidade: 'curiosa e comunicativa', pelagem: '#7a5535', detalhe: '#f6e8cc' },
  'lobo-guara': { nome: 'Lobo-guará', bioma: 'Cerrado', personalidade: 'observador e atento', pelagem: '#d17a30', detalhe: '#2a2018' },
  capivara: { nome: 'Capivara', bioma: 'Pantanal', personalidade: 'tranquila e acolhedora', pelagem: '#a37d58', detalhe: '#c29d7a' },
};

// Ocasiões pontuais em que um mascote convidado entra no lugar do principal, conforme a personalidade.
// É só o rosto e o nome: o texto e os dados da tela não mudam (planejamento, seção 7).
export type Ocasiao = 'prazo' | 'aviso' | 'vazio-acolhedor' | 'vazio-descoberta' | 'marco';

export const ESPECIE_DA_OCASIAO: Record<Ocasiao, EspecieMascote> = {
  prazo: 'lobo-guara',
  aviso: 'lobo-guara',
  'vazio-acolhedor': 'capivara',
  marco: 'capivara',
  'vazio-descoberta': 'ariranha',
};
