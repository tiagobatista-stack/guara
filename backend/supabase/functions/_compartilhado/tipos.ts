// Tipos do catálogo de agentes, habilidades e ferramentas (seções 9.1 a 9.3).
// TypeScript puro: sem APIs de Node ou Deno, para rodar no Vite, Vitest e Deno.

export type Estado = 'OK' | 'ATENÇÃO' | 'FALHA' | 'NÃO TESTADO';

export type ModoHabilidade = 'deterministico' | 'assistido';

/** Esquema mínimo para validar entradas e saídas sem dependências externas. */
export type Esquema =
  | { tipo: 'texto'; opcional?: boolean; valores?: readonly string[] }
  | { tipo: 'numero'; opcional?: boolean }
  | { tipo: 'booleano'; opcional?: boolean }
  | { tipo: 'lista'; itens: Esquema; opcional?: boolean }
  | { tipo: 'objeto'; campos: Record<string, Esquema>; opcional?: boolean };

export interface CasoAutoteste<E, S> {
  descricao: string;
  /** Entrada vinda de dados-ficticios/. */
  entrada: E;
  /** Saída esperada, comparada campo a campo. */
  saidaEsperada: S;
}

export interface ContratoHabilidade<E = unknown, S = unknown> {
  id: string;
  versao: string;
  descricao: string;
  modo: ModoHabilidade;
  /** Agente que pode executá-la; null quando não pertence ao fluxo de demandas. */
  agenteResponsavel: string | null;
  permissoes: readonly string[];
  ferramentas: readonly string[];
  esquemaEntrada: Esquema;
  esquemaSaida: Esquema;
  criteriosAceite: readonly string[];
  /** Limitação honesta do autoteste, quando houver. */
  observacao?: string;
  /** Desativável na tela Saúde do sistema. */
  desativavel: boolean;
}

export interface Habilidade<E = unknown, S = unknown> {
  contrato: ContratoHabilidade<E, S>;
  executar: (entrada: E) => S;
  autoteste: CasoAutoteste<E, S>;
}

export type PermissaoAgente = 'leitura' | 'rascunho';

export interface ContratoAgente {
  id: string;
  versao: string;
  papel: string;
  habilidades: readonly string[];
  ferramentas: readonly string[];
  permissao: PermissaoAgente;
  /** O revisor não pode ser desativado (seção 9.3). */
  desativavel: boolean;
}

export interface Ferramenta {
  id: string;
  nome: string;
  descricao: string;
  /** Teste de conexão; ausente quando não há backend para testar. */
  testarConexao?: () => Promise<{ estado: Estado; detalhe: string }>;
  motivoSemTeste?: string;
}
