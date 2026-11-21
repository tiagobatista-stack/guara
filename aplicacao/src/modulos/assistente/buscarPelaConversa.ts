// "buscar <termo>" (21/11/2026): acha demandas com a MESMA regra da tela Demandas (`filtrarDemandas`
// com `filtros.texto`), então a conversa e a tela sempre mostram as mesmas demandas. Só demandas;
// operações e pontos ficam no backlog.

import { filtrarDemandas } from '../demandas/regras.ts';
import { FILTROS_VAZIOS } from '../demandas/regras.ts';
import type { Demanda } from '../demandas/modelo.ts';
import { rotaParaBuscarDemandas } from '../../nucleo/registro-modulos.ts';
import type { Mensagem } from './conversa.ts';
import { encurtarTitulo } from './priorizar.ts';

export const MAXIMO_DE_RESULTADOS = 5;
const FONTE = 'demandas deste navegador · busca por título, descrição ou número';

export function respostaDeBusca(termo: string | null, demandas: readonly Demanda[], encaixadas?: ReadonlySet<string>): Mensagem[] {
  if (!termo) {
    return [{
      autor: 'assistente',
      natureza: 'sugestão',
      fonte: 'regra: buscar sem termo',
      texto: 'O que você quer buscar? Escreva, por exemplo, "buscar licença" (uma palavra do título ou da descrição, ou o número do processo).',
    }];
  }
  const achadas = filtrarDemandas(demandas, { ...FILTROS_VAZIOS, texto: termo }, encaixadas);
  if (achadas.length === 0) {
    return [{ autor: 'assistente', natureza: 'fato', fonte: FONTE, texto: `Não achei demanda com '${termo}'.` }];
  }
  const linhas = achadas.slice(0, MAXIMO_DE_RESULTADOS).map((d) => `• ${d.id} — ${encurtarTitulo(d.titulo)} (${d.status})`);
  const mais = achadas.length - MAXIMO_DE_RESULTADOS;
  return [{
    autor: 'assistente',
    natureza: 'fato',
    fonte: FONTE,
    texto: [
      `Achei ${achadas.length} ${achadas.length === 1 ? 'demanda' : 'demandas'} com '${termo}':`,
      ...linhas,
      ...(mais > 0 ? [`e mais ${mais}.`] : []),
    ].join('\n'),
    acoes: [{ rotulo: 'Ver todos em Demandas', comando: `buscar ${termo}`, rota: rotaParaBuscarDemandas(termo) }],
  }];
}
