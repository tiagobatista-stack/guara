// Comando "demanda" do assistente: responde sobre a demanda em foco, com regras fixas (sem IA).
// Separa fato extraído, inferência e sugestão, e diz a fonte. Não altera nada.

import type { Demanda } from '../demandas/modelo.ts';
import { camposQueFaltam, ROTULOS_ESSENCIAL } from '../demandas/essenciais.ts';
import { situacaoDaDemanda, type AjusteFeriados } from '../alertas/dias-uteis.ts';
import { diasParado, estaInativa } from '../alertas/inatividade.ts';
import type { Mensagem } from './conversa.ts';
import { codigoLegivel } from './rotuloDaDemanda.ts';

export const METODO_DETERMINISTICO = 'método: determinístico (regras locais, sem modelo de IA)';

export function respostaSobreDemanda(
  emFoco: string | null,
  demandas: readonly Demanda[],
  agora: Date,
  limiarDias: number,
  ajuste: AjusteFeriados,
  origem: string,
  /** true quando o código veio escrito na frase (e não da demanda aberta na tela). */
  explicito = false,
): Mensagem[] {
  if (!emFoco) {
    return [{ autor: 'assistente', natureza: 'sugestão', fonte: 'regra: nenhuma demanda em foco', texto: 'Abra uma demanda na tela Demandas (detalhe) e peça de novo: o comando "demanda" fala da demanda aberta.' }];
  }
  const d = demandas.find((x) => x.id === emFoco);
  if (!d && explicito) {
    return [{ autor: 'assistente', natureza: 'fato', fonte: origem, texto: `Não encontrei ${emFoco} nas demandas deste navegador. Nada foi alterado.` }];
  }
  if (!d) {
    return [{ autor: 'assistente', natureza: 'fato', fonte: 'regra: demanda em foco não encontrada nos dados deste navegador', texto: `Não encontrei a demanda ${emFoco}: ela pode ter sido excluída ou os dados foram trocados. Nada foi alterado.` }];
  }
  const fato: Mensagem = {
    autor: 'assistente', natureza: 'fato', fonte: origem,
    texto: `${codigoLegivel(d.id) ? `${d.id} · ` : ''}${d.titulo} — situação ${d.status}, prioridade ${d.prioridade}${d.prazo ? `, prazo ${d.prazo}` : ', sem prazo'}.`,
  };
  const prazo = situacaoDaDemanda(d, agora, ajuste);
  const parada = estaInativa(d, limiarDias, agora);
  const sinais = [prazo ? `prazo: ${prazo.texto}` : null, parada ? `parada há ${diasParado(d, agora)} dia(s) sem ação relevante` : null].filter(Boolean);
  const falta = camposQueFaltam(d).map((c) => ROTULOS_ESSENCIAL[c]);
  const saida: Mensagem[] = [fato];
  if (sinais.length) {
    saida.push({ autor: 'assistente', natureza: 'inferência', fonte: `regras de dias úteis e de inatividade (limiar ${limiarDias} dia(s)); confira antes de agir`, texto: `Pelas regras: ${sinais.join('; ')}.` });
  }
  if (falta.length) {
    saida.push({ autor: 'assistente', natureza: 'sugestão', fonte: 'regra de campos essenciais', texto: `Falta preencher: ${falta.join(', ')}. A decisão de preencher e de encaminhar é sua.` });
  }
  return saida;
}
