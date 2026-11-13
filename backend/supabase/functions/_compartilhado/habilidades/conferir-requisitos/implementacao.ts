import type { EntradaConferirRequisitos, ResultadoRequisito, SaidaConferirRequisitos } from './contrato.ts';

const VALOR_NEGATIVO = /^(não|nao)\b|ausente|inexistente/i;

export function conferirRequisitos(entrada: EntradaConferirRequisitos): SaidaConferirRequisitos {
  const resultados: ResultadoRequisito[] = entrada.itens.map((item) => {
    if (item.campoEvidencia === null) {
      return { itemId: item.id, situacao: 'nao-verificavel', justificativa: 'requer verificação humana' };
    }
    const evidencia = entrada.campos.find((c) => c.campo === item.campoEvidencia);
    if (!evidencia) {
      return {
        itemId: item.id,
        situacao: 'pendente',
        justificativa: `campo "${item.campoEvidencia}" não encontrado no documento`,
      };
    }
    if (VALOR_NEGATIVO.test(evidencia.valor)) {
      return {
        itemId: item.id,
        situacao: 'pendente',
        justificativa: `documento indica "${evidencia.valor}" (página ${evidencia.pagina})`,
        evidencia: { ...evidencia },
      };
    }
    return {
      itemId: item.id,
      situacao: 'atendido',
      justificativa: `campo "${evidencia.campo}" encontrado na página ${evidencia.pagina}`,
      evidencia: { ...evidencia },
    };
  });

  return {
    resultados,
    totais: {
      atendidos: resultados.filter((r) => r.situacao === 'atendido').length,
      pendentes: resultados.filter((r) => r.situacao === 'pendente').length,
      naoVerificaveis: resultados.filter((r) => r.situacao === 'nao-verificavel').length,
    },
  };
}
