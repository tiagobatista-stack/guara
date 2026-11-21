// Lembrete pedido pela conversa (21/11/2026): "lembrar DEM-FIC-0003 segunda às 14h".
// Não há caminho novo de gravação: é a MESMA função dos botões do aviso ("Em 2 horas",
// "Segunda às 8h"), `adiarLembrete`. Por isso o lembrete é o adiamento de um aviso que já existe:
// o aviso some do assistente e volta na hora combinada. Demanda sem aviso hoje não recebe lembrete.
// Dashboard, Alertas e a fila do dia seguem mostrando tudo; nada altera a demanda.

import type { Demanda } from '../demandas/modelo.ts';
import type { AjusteFeriados } from '../alertas/dias-uteis.ts';
import type { Aviso } from './avisos.ts';
import type { Mensagem } from './conversa.ts';
import { extrairQuando } from './extrair.ts';
import { adiarLembrete, obterLembretes, opcoesDeAdiamento } from './lembretes.ts';

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "hoje", "amanhã", "na segunda" ou "em 30/11/2026": o dia dito de forma natural. */
function nomeDoDia(ate: Date, agora: Date): string {
  const dias = Math.round((Date.UTC(ate.getFullYear(), ate.getMonth(), ate.getDate()) - Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())) / 86_400_000);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  if (dias > 7) return 'em';
  const d = ate.getDay();
  return `${d === 0 || d === 6 ? 'no' : 'na'} ${DIAS[d]}`;
}

/** "na segunda, 23/11/2026, às 8h" (data e hora absolutas, para a pessoa conferir). */
export function descreverQuando(ate: Date, agora: Date): string {
  const hora = `${ate.getHours()}h${ate.getMinutes() ? String(ate.getMinutes()).padStart(2, '0') : ''}`;
  const dia = nomeDoDia(ate, agora);
  const data = ate.toLocaleDateString('pt-BR');
  return dia === 'em' ? `em ${data}, às ${hora}` : `${dia}, ${data}, às ${hora}`;
}

const nao = (texto: string, fonte: string): Mensagem[] => [{ autor: 'assistente', natureza: 'fato', fonte, texto }];

export function respostaDeLembrete(
  frase: string,
  id: string | null,
  avisos: readonly Aviso[],
  demandas: readonly Demanda[],
  agora: Date,
  ajuste: AjusteFeriados,
  origem: string,
): Mensagem[] {
  if (!id) {
    return [{ autor: 'assistente', natureza: 'sugestão', fonte: 'regra: lembrete sem código de demanda', texto: 'Diga qual demanda e quando, por exemplo: "lembrar DEM-FIC-0003 segunda às 8h" ou "me lembra de DEM-FIC-0003 em 2 horas".' }];
  }
  if (!demandas.some((d) => d.id === id)) return nao(`Não encontrei ${id} nas demandas deste navegador. Nada foi gravado.`, origem);
  const aviso = avisos.find((a) => a.id === id);
  if (!aviso) {
    return nao(`${id} não tem aviso hoje. Por enquanto só consigo adiar avisos de demandas atrasadas ou paradas. Lembretes livres ainda não existem. Nada foi gravado.`, origem);
  }
  if (obterLembretes()[id]?.silenciada) {
    return nao(`${id} está silenciada no painel. Use "Mostrar de novo" nas notificações antes de combinar um lembrete. Nada foi gravado.`, 'lembretes deste navegador');
  }
  const quando = extrairQuando(frase, agora);
  if (!('ate' in quando)) {
    return [{
      autor: 'assistente',
      natureza: 'sugestão',
      fonte: quando.motivo === 'passado' ? 'regra: horário de hoje já passou' : 'regra: lembrete sem horário reconhecido',
      texto: `${quando.motivo === 'passado' ? 'Esse horário de hoje já passou.' : 'Não entendi quando.'} Diga, por exemplo, "em 2 horas", "amanhã", "segunda às 14h", ou escolha:`,
      acoes: opcoesDeAdiamento(agora, ajuste)
        .filter((o) => /^[a-zà-ú]/i.test(o.rotulo))
        .map((o) => ({ rotulo: o.rotulo, comando: `lembrar ${id} ${o.rotulo.toLowerCase()}` })),
    }];
  }
  adiarLembrete(aviso, quando.ate);
  return [{
    autor: 'assistente',
    natureza: 'fato',
    fonte: 'lembrete criado agora',
    texto: `Tirei o aviso de ${id} da lista; ele volta ${descreverQuando(quando.ate, agora)}, se a demanda ainda estiver atrasada ou parada. Dashboard e Alertas continuam mostrando a situação real.`,
  }];
}
