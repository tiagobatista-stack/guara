// FICTÍCIO — checklists configurados por tipo de demanda (exemplo didático,
// não representa norma da SEMA-MT). A demanda piloto real ainda será escolhida.

export interface ItemChecklist {
  id: string;
  descricao: string;
  /** Campo extraído que comprova o item; null = só verificável por humano. */
  campoEvidencia: string | null;
}

export const checklistsPorTipo: Record<string, ItemChecklist[]> = {
  'renovacao-licenca': [
    { id: 'RL-01', descricao: 'Número do processo identificado', campoEvidencia: 'processo' },
    { id: 'RL-02', descricao: 'Interessado identificado', campoEvidencia: 'interessado' },
    { id: 'RL-03', descricao: 'Validade da licença anterior informada', campoEvidencia: 'validadeLicencaAnterior' },
    { id: 'RL-04', descricao: 'Responsável técnico indicado', campoEvidencia: 'responsavelTecnico' },
    { id: 'RL-05', descricao: 'Outorga de uso da água apresentada', campoEvidencia: 'outorgaAgua' },
    { id: 'RL-06', descricao: 'Vistoria de campo realizada', campoEvidencia: null },
  ],
  denuncia: [
    { id: 'DN-01', descricao: 'Localização informada', campoEvidencia: 'localizacao' },
    { id: 'DN-02', descricao: 'Descrição do fato', campoEvidencia: 'descricao' },
  ],
};

export const modeloMinuta = {
  id: 'MOD-FIC-01',
  titulo: 'Minuta de parecer preliminar (MODELO FICTÍCIO)',
};
