import { AVISO_PDS, type EntradaValidarPds, type SaidaValidarPds, type SituacaoCriterio } from './contrato.ts';

function situacao(valor: boolean | null, desejado: boolean): SituacaoCriterio {
  if (valor === null || valor === undefined) return 'nao-verificavel';
  return valor === desejado ? 'atendido' : 'nao-atendido';
}

export function validarPds(entrada: EntradaValidarPds): SaidaValidarPds {
  const e = entrada.entrega;
  return {
    aviso: AVISO_PDS,
    conclusaoConformidade: 'nao-emitida',
    matriz: [
      { criterio: 'Build executado com sucesso', situacao: situacao(e.buildPassou, true) },
      { criterio: 'Testes automatizados aprovados', situacao: situacao(e.testesPassaram, true) },
      { criterio: 'Documentação atualizada', situacao: situacao(e.documentacaoAtualizada, true) },
      { criterio: 'Nenhum segredo versionado', situacao: situacao(e.segredosVersionados, false) },
      { criterio: 'Evidências registradas', situacao: situacao(e.evidenciasRegistradas, true) },
    ],
  };
}
