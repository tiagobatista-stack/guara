// Documentos lavrados no ponto: lista fechada, na nomenclatura do SIGA (o responsável completa a lista). Só o número e a data; enquadramento e multa
// ficam no SIGA Autuação. `frase`: {numero} = número registrado; {data} = ", em dd/mm/aaaa" ou vazio.

export interface TipoLavrado { nome: string; frase: string }

export const TIPOS_LAVRADOS: readonly TipoLavrado[] = [
  { nome: 'Auto de infração', frase: 'Foi lavrado o Auto de Infração n.º {numero}{data}.' },
  { nome: 'Notificação', frase: 'Foi lavrada a Notificação n.º {numero}{data}.' },
  { nome: 'Termo de embargo / Interdição', frase: 'Foi lavrado o Termo de Embargo / Interdição n.º {numero}{data}.' },
];

export const NOMES_LAVRADOS: readonly string[] = TIPOS_LAVRADOS.map((t) => t.nome);
export const MAX_LAVRADOS = 30;
