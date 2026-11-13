import type { CampoExtraido, EntradaExtrairDocumento, SaidaExtrairDocumento } from './contrato.ts';

/** Padrões de extração em ordem fixa. Cada um captura o valor no grupo 1. */
export const PADROES: ReadonlyArray<readonly [string, RegExp]> = [
  ['processo', /Processo:\s*(\S+)/],
  ['interessado', /Interessado:\s*(.+)/],
  ['validadeLicencaAnterior', /válida até:\s*(\d{4}-\d{2}-\d{2})/],
  ['areaHa', /Área total \(ha\):\s*([\d.,]+)/],
  ['responsavelTecnico', /Responsável técnico:\s*(.+)/],
  ['outorgaAgua', /Outorga de uso da água:\s*(.+)/],
];

export function extrairDocumento(entrada: EntradaExtrairDocumento): SaidaExtrairDocumento {
  const campos: CampoExtraido[] = [];
  const camposAusentes: string[] = [];
  for (const [campo, padrao] of PADROES) {
    let achado: CampoExtraido | null = null;
    for (const pagina of entrada.paginas) {
      const m = padrao.exec(pagina.texto);
      if (m) {
        achado = { campo, valor: m[1].trim(), pagina: pagina.numero };
        break;
      }
    }
    if (achado) campos.push(achado);
    else camposAusentes.push(campo);
  }
  return { documentoId: entrada.documentoId, fonte: 'camada-de-texto', campos, camposAusentes };
}
