// "prorrogar DEM-FIC-0001" (21/11/2026): o assistente NÃO muda o prazo. Ele leva a pessoa ao campo
// Prazo da demanda, onde a nova data é uma decisão dela. (Não confundir com "lembrar", que só
// esconde um aviso por um tempo.)

import type { Demanda } from '../demandas/modelo.ts';
import { rotaParaAbrirDemanda } from '../../nucleo/registro-modulos.ts';
import type { Mensagem } from './conversa.ts';

export function respostaDeProrrogar(id: string | null, demandas: readonly Demanda[], origem: string): Mensagem[] {
  if (!id) {
    return [{ autor: 'assistente', natureza: 'sugestão', fonte: 'regra: prorrogar sem código de demanda', texto: 'Diga qual demanda, por exemplo: "prorrogar DEM-FIC-0001". Eu abro a demanda no campo Prazo; a nova data é sua decisão.' }];
  }
  if (!demandas.some((d) => d.id === id)) {
    return [{ autor: 'assistente', natureza: 'fato', fonte: origem, texto: `Não encontrei ${id} nas demandas deste navegador. Nada foi alterado.` }];
  }
  return [{
    autor: 'assistente',
    natureza: 'sugestão',
    fonte: 'a decisão é sua; o assistente não altera prazos',
    texto: `Para prorrogar ${id}, informe a nova data no campo Prazo da demanda.`,
    acoes: [{ rotulo: 'Abrir demanda', comando: `abrir ${id}`, rota: rotaParaAbrirDemanda(id) }],
  }];
}
