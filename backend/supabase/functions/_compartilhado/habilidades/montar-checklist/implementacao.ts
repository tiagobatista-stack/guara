import type { EntradaMontarChecklist, ItemChecklist, SaidaMontarChecklist } from './contrato.ts';
import { checklistsPorTipo } from '../../../../../../dados-ficticios/checklists.ts';

/** Configuração de checklists; no futuro virá da tabela de configuração no banco. */
export function montarChecklist(
  entrada: EntradaMontarChecklist,
  configuracao: Record<string, ItemChecklist[]> = checklistsPorTipo,
): SaidaMontarChecklist {
  const itens = configuracao[entrada.tipo];
  if (!itens) return { tipo: entrada.tipo, configurado: false, itens: [] };
  return { tipo: entrada.tipo, configurado: true, itens: itens.map((item) => ({ ...item })) };
}
