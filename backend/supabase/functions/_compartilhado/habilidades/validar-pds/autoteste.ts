import type { CasoAutoteste } from '../../tipos.ts';
import type { EntradaValidarPds, SaidaValidarPds } from './contrato.ts';
import { entregaFicticia } from '../../../../../../dados-ficticios/entregas.ts';

export const autoteste: CasoAutoteste<EntradaValidarPds, SaidaValidarPds> = {
  descricao: 'Avalia a entrega fictícia ENT-FIC-0001 (testes reprovados, evidências não informadas)',
  entrada: { entrega: entregaFicticia.entrega, documentoOficialPds: entregaFicticia.documentoOficialPds },
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
