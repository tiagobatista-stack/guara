// FICTÍCIO — entrega de software sintética usada pelo autoteste de validar-pds.
// Um critério reprovado (testes) e um sem informação (evidências).

export const entregaFicticia = {
  ficticio: true as const,
  id: 'ENT-FIC-0001',
  entrega: {
    buildPassou: true,
    testesPassaram: false,
    documentacaoAtualizada: true,
    segredosVersionados: false,
    evidenciasRegistradas: null,
  },
  documentoOficialPds: false,
};
