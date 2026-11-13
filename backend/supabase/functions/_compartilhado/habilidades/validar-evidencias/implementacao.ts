import type { EntradaValidarEvidencias, SaidaValidarEvidencias } from './contrato.ts';

export function validarEvidencias(entrada: EntradaValidarEvidencias): SaidaValidarEvidencias {
  const erros: string[] = [];
  const ressalvas: string[] = [];
  for (const r of entrada.resultados) {
    if (r.situacao === 'atendido') {
      if (!r.evidencia) erros.push(`${r.itemId}: marcado como atendido sem evidência`);
      else if (!(r.evidencia.pagina >= 1) || r.evidencia.valor.trim() === '') {
        erros.push(`${r.itemId}: evidência incompleta (página ou valor)`);
      }
    } else {
      ressalvas.push(`${r.itemId}: ${r.situacao}`);
    }
  }
  return { aprovado: erros.length === 0, erros, ressalvas, itensVerificados: entrada.resultados.length };
}
