import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaValidarPds, SaidaValidarPds } from './contrato.ts';

/** Entrega FICTÍCIA com um critério reprovado e um sem informação. */
export const autoteste: CasoAutoteste<EntradaValidarPds, SaidaValidarPds> = {
  descricao: 'Avalia entrega fictícia (testes reprovados, evidências não informadas)',
  entrada: {
    entrega: {
      buildPassou: true,
      testesPassaram: false,
      documentacaoAtualizada: true,
      segredosVersionados: false,
      evidenciasRegistradas: null,
    },
    documentoOficialPds: false,
  },
  saidaEsperada: {
    aviso: 'Checklist didático de qualidade. NÃO é o PDS oficial da SEMA-MT; nenhuma conclusão de conformidade é emitida.',
    conclusaoConformidade: 'nao-emitida',
    matriz: [
      { criterio: 'Build executado com sucesso', situacao: 'atendido' },
      { criterio: 'Testes automatizados aprovados', situacao: 'nao-atendido' },
      { criterio: 'Documentação atualizada', situacao: 'atendido' },
      { criterio: 'Nenhum segredo versionado', situacao: 'atendido' },
      { criterio: 'Evidências registradas', situacao: 'nao-verificavel' },
    ],
  },
};
