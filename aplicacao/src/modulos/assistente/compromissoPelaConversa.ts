// Compromissos e lembretes próprios pela conversa (item 14, 21/11/2026), sem IA.
// Fluxo: a frase é interpretada (`interpretarCompromisso.ts`); ANTES de gravar, o assistente mostra o que
// entendeu e pede confirmação ("Confirmar", "Corrigir", "Cancelar"). O entendimento fica num rascunho
// (`guara:compromissos:rascunho:v1`) até a pessoa decidir. Só "Confirmar" grava.

import type { Demanda } from '../demandas/modelo.ts';
import type { Operacao } from '../operacoes/modelo.ts';
import { dataLocal } from '../alertas/dias-uteis.ts';
import {
  criarCompromisso, diaCompleto, guardarRascunho, limparRascunho, obterEtapaDoRascunho, obterRascunho, tituloDoCompromisso,
  type Compromisso, type DadosCompromisso, type EtapaDoRascunho, type TipoDeCompromisso,
} from '../agenda/compromissos.ts';
import { coincidenciasComOperacoes, montarAgenda, textoDeCoincidencia, type ItemAgenda } from '../agenda/regras.ts';
import { obterOperacoes } from '../operacoes/armazem.ts';
import { descreverRepeticao, REPETICOES } from '../agenda/recorrencia.ts';
import { interpretarCompromisso, pareceCompromisso, type Entendido, type ProblemaDaFrase } from './interpretarCompromisso.ts';
import { palavras } from './normalizar.ts';
import type { AcaoDaFala, Mensagem } from './conversa.ts';

export const FONTE_DO_ENTENDIMENTO = 'interpretação da frase por regras; confira';
const ABRIR_AGENDA: AcaoDaFala = { rotulo: 'Abrir a Agenda', comando: 'abrir agenda', rota: '#/agenda' };

/** Rota da Agenda com o formulário já preenchido ("Corrigir"). Só carrega campos que o formulário valida de novo. */
export function rotaParaCorrigirCompromisso(d: Partial<DadosCompromisso>): string {
  const partes = [d.tipo ?? '', d.data ?? '', d.hora ?? '', d.demanda ?? '', d.assunto ?? ''];
  const extras = `${d.dataFim ? `&fim=${d.dataFim}` : ''}${d.repeticao ? `&rep=${d.repeticao}` : ''}${d.repetirAte ? `&ate=${d.repetirAte}` : ''}`;
  return `#/agenda?novo=${encodeURIComponent(partes.join('|'))}${extras}`;
}

/** Os parâmetros opcionais da rota ("fim", "rep", "ate"), como a Agenda os lê do endereço. */
export interface ExtrasDaRota { fim?: string | null; rep?: string | null; ate?: string | null }

/** Lê o que `rotaParaCorrigirCompromisso` escreveu; nada que não caiba nos campos volta. */
export function lerRotaDeCompromisso(valor: string | null, extras: ExtrasDaRota = {}): Partial<DadosCompromisso> | null {
  if (!valor) return null;
  const [tipo, data, hora, demanda, ...assunto] = valor.split('|');
  const saida: Partial<DadosCompromisso> = {};
  if (tipo === 'reunião' || tipo === 'palestra' || tipo === 'curso' || tipo === 'compromisso' || tipo === 'lembrete') saida.tipo = tipo;
  if (/^\d{4}-\d{2}-\d{2}$/.test(data ?? '')) saida.data = data;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(hora ?? '')) saida.hora = hora;
  if (/^DEM-FIC-\d{4}$/.test(demanda ?? '')) saida.demanda = demanda;
  saida.assunto = assunto.join('|').slice(0, 120);
  if (extras.fim && /^\d{4}-\d{2}-\d{2}$/.test(extras.fim)) saida.dataFim = extras.fim;
  if (extras.rep && extras.rep !== 'nenhuma' && (REPETICOES as readonly string[]).includes(extras.rep)) saida.repeticao = extras.rep as DadosCompromisso['repeticao'];
  if (extras.ate && /^\d{4}-\d{2}-\d{2}$/.test(extras.ate)) saida.repetirAte = extras.ate;
  return saida;
}

const sugestao = (texto: string, fonte: string, acoes?: AcaoDaFala[]): Mensagem[] => [{ autor: 'assistente', natureza: 'sugestão', fonte, texto, ...(acoes ? { acoes } : {}) }];
const fato = (texto: string, fonte: string, acoes?: AcaoDaFala[]): Mensagem[] => [{ autor: 'assistente', natureza: 'fato', fonte, texto, ...(acoes ? { acoes } : {}) }];

const EXEMPLO = '"reunião dia 10/12 sobre licenciamento" ou "palestra amanhã às 14h"';

const PERGUNTA: Record<ProblemaDaFrase, (e: Entendido) => string> = {
  'sem-data': () => `Não entendi a data. Diga o dia, por exemplo: ${EXEMPLO}. Também entendo "dia 10", "10 de dezembro" e dias da semana.`,
  'data-invalida': (e) => `A data${e.trecho ? ` "${e.trecho}"` : ''} não existe. Confira o dia e o mês e diga de novo, por exemplo: ${EXEMPLO}.`,
  'data-passada': (e) => `A data${e.trecho ? ` "${e.trecho}"` : ''} já passou. Diga uma data de hoje em diante, por exemplo: ${EXEMPLO}.`,
  'hora-invalida': (e) => `Não entendi a hora${e.trecho ? ` "${e.trecho}"` : ''}. Use de 0h a 23h59, por exemplo "às 14h" ou "14:30", ou deixe sem hora para o dia todo.`,
  'hora-passada': () => 'Esse horário de hoje já passou. Diga outra hora, ou outro dia, ou deixe sem hora para o dia todo.',
  'intervalo-invalido': (e) => `O período${e.trecho ? ` "${e.trecho}"` : ''} não faz sentido: o fim precisa ser depois do início e caber em menos de um ano. Diga de novo, por exemplo: "curso de 10/12 a 12/12".`,
};

const dataBr = (iso: string) => iso.split('-').reverse().join('/');

/**
 * O que a pessoa confere antes de gravar:
 *   "Reunião — licenciamento · quinta, 10/12/2026 · dia todo"
 *   "Curso — geoprocessamento · 10/12/2026 a 12/12/2026 · dia todo"
 *   "Reunião — alinhamento · toda segunda a partir de 23/11/2026 · às 09:00"
 */
export function descreverEntendimento(d: DadosCompromisso): string {
  let quando = diaCompleto(d.data);
  if (d.repeticao) {
    quando = `${descreverRepeticao({ data: d.data, repeticao: d.repeticao })} a partir de ${dataBr(d.data)}${d.repetirAte ? `, até ${dataBr(d.repetirAte)}` : ''}`;
  } else if (d.dataFim && d.dataFim > d.data) {
    quando = `${dataBr(d.data)} a ${dataBr(d.dataFim)}`;
  }
  return `${tituloDoCompromisso(d)} · ${quando} · ${d.hora ? `às ${d.hora}` : 'dia todo'}${d.demanda ? ` · demanda ${d.demanda}` : ''}`;
}

/**
 * Frase de compromisso ou de lembrete próprio. Devolve a pergunta (quando falta ou está errado algo) ou o
 * entendimento com os botões Confirmar, Corrigir e Cancelar. Não grava nada.
 */
export function respostaDeCompromisso(
  frase: string,
  demandas: readonly Pick<Demanda, 'id' | 'titulo'>[],
  agora: Date,
  tipoForcado?: TipoDeCompromisso,
): Mensagem[] {
  const e = interpretarCompromisso(frase, agora, tipoForcado);
  // O vínculo só vale para demanda que existe neste navegador; senão avisa e segue sem vínculo.
  const demanda = e.demanda ? demandas.find((d) => d.id === e.demanda) : undefined;
  const avisoDoVinculo = e.demanda && !demanda ? ` Não encontrei ${e.demanda} nas demandas deste navegador; o vínculo não foi incluído.` : '';
  const rascunho: Partial<DadosCompromisso> = { tipo: e.tipo, ...(e.data ? { data: e.data } : {}), ...(e.dataFim ? { dataFim: e.dataFim } : {}), ...(e.repeticao ? { repeticao: e.repeticao } : {}), ...(e.repetirAte ? { repetirAte: e.repetirAte } : {}), ...(e.hora ? { hora: e.hora } : {}), ...(demanda ? { demanda: demanda.id } : {}), assunto: e.assunto || demanda?.titulo || '' };
  if (e.problema || !e.data) {
    limparRascunho();
    return sugestao(`${PERGUNTA[e.problema ?? 'sem-data'](e)}${avisoDoVinculo}`, 'regra: compromisso sem dados suficientes', [
      { rotulo: 'Abrir formulário', comando: 'abrir agenda', rota: rotaParaCorrigirCompromisso(rascunho) },
    ]);
  }
  const dados: DadosCompromisso = {
    tipo: e.tipo,
    data: e.data,
    ...(e.dataFim ? { dataFim: e.dataFim } : {}),
    ...(e.repeticao ? { repeticao: e.repeticao } : {}),
    ...(e.repetirAte ? { repetirAte: e.repetirAte } : {}),
    ...(e.hora ? { hora: e.hora } : {}),
    // Sem assunto na frase: o título da demanda vinculada, ou o nome do tipo.
    assunto: e.assunto || demanda?.titulo || e.tipo[0].toUpperCase() + e.tipo.slice(1),
    ...(demanda ? { demanda: demanda.id } : {}),
  };
  // Frase com só o dia (sem hora, intervalo nem repetição) deixa coisas em aberto: o mascote pergunta,
  // uma coisa por vez. Frase completa e lembrete (aviso às 8h) vão direto à confirmação.
  if (dados.tipo !== 'lembrete' && !dados.hora && !dados.dataFim && !dados.repeticao) {
    guardarRascunho(dados, 'hora');
    return perguntar(obterRascunho() ?? dados, 'hora', avisoDoVinculo);
  }
  guardarRascunho(dados);
  return confirmacao(obterRascunho() ?? dados, avisoDoVinculo);
}

const CANCELAR: AcaoDaFala = { rotulo: 'Cancelar', comando: 'cancelar compromisso', acao: { tipo: 'cancelar-compromisso' } };
const PULAR: AcaoDaFala = { rotulo: 'Pular, está bom assim', comando: 'pular', };

/** "Vou anotar: …" com Confirmar, Corrigir e Cancelar. */
function confirmacao(anotado: DadosCompromisso, aviso = ''): Mensagem[] {
  // Coincidência com o período de uma operação: só informa, o Confirmar continua valendo.
  const coincide = textoDeCoincidencia(coincidenciasComOperacoes(anotado, obterOperacoes()));
  return [{
    autor: 'assistente',
    natureza: 'inferência',
    fonte: FONTE_DO_ENTENDIMENTO,
    texto: `Vou anotar: ${descreverEntendimento(anotado)}.${aviso}${coincide ? `\nAtenção: ${coincide} Pode confirmar assim mesmo.` : ''}`,
    acoes: [
      { rotulo: 'Confirmar', comando: 'confirmar compromisso', acao: { tipo: 'confirmar-compromisso', dados: anotado } },
      { rotulo: 'Corrigir', comando: 'corrigir compromisso', rota: rotaParaCorrigirCompromisso(anotado) },
      CANCELAR,
    ],
  }];
}

/** Minúsculas, sem acento nem pontuação; NÃO reduz letras repetidas ("nesse", "assim"), ao contrário de `normalizar`. */
const chave = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const PERGUNTAS_DO_MASCOTE: Record<EtapaDoRascunho, { texto: string; botao: AcaoDaFala }> = {
  hora: { texto: 'É o dia todo ou tem hora? Pode dizer, por exemplo, "às 14h".', botao: { rotulo: 'Dia todo', comando: 'dia todo' } },
  fim: { texto: 'É só nesse dia ou vai até quando? Pode dizer, por exemplo, "até 12/12".', botao: { rotulo: 'Só nesse dia', comando: 'só nesse dia' } },
  repete: { texto: 'Isso se repete? Pode dizer, por exemplo, "toda semana até 20/12".', botao: { rotulo: 'Não repete', comando: 'não repete' } },
};

/** Pergunta curta do mascote; o rascunho (com a etapa) já está guardado e nada foi gravado. */
function perguntar(dados: DadosCompromisso, etapa: EtapaDoRascunho, prefixo = ''): Mensagem[] {
  return sugestao(
    `${prefixo ? `${prefixo.trim()} ` : `Entendi: ${descreverEntendimento(dados)}. `}${PERGUNTAS_DO_MASCOTE[etapa].texto}`,
    'pergunta do assistente; nada foi gravado ainda',
    [PERGUNTAS_DO_MASCOTE[etapa].botao, PULAR, CANCELAR],
  );
}

/** Lê a resposta a uma pergunta reaproveitando o interpretador da frase; null quando não é uma resposta válida. */
function lerResposta(etapa: EtapaDoRascunho, texto: string, d: DadosCompromisso, agora: Date): { dados: DadosCompromisso } | { erro: string } | null {
  const k = chave(texto);
  if (etapa === 'hora') {
    if (/^(?:nao|o dia todo|dia todo|dia inteiro|o dia inteiro)(?: mesmo)?$/.test(k)) return { dados: d };
    const e = interpretarCompromisso(`${dataBr(d.data)} ${texto}`, agora, d.tipo);
    if (e.problema === 'hora-invalida' || e.problema === 'hora-passada') return { erro: PERGUNTA[e.problema](e) };
    return e.hora ? { dados: { ...d, hora: e.hora } } : null;
  }
  if (etapa === 'fim') {
    if (/^(?:nao|so nesse dia|so neste dia|so esse dia|so este dia|so um dia|so isso|apenas nesse dia)$/.test(k)) return { dados: d };
    // "até 12/12", "até dia 12", "de 10/12 a 12/12" e "2ª semana de dezembro".
    const soDia = /^(?:ate )?(?:o )?(?:dia )?(\d{1,2})$/.exec(k);
    let frase = `${dataBr(d.data)} ${texto}`;
    if (soDia) {
      // Só o número do dia: no mesmo mês se ainda vem depois do início, senão no mês seguinte.
      const [a, m, dia] = d.data.split('-').map(Number);
      const depois = Number(soDia[1]) > dia;
      frase = `${dataBr(d.data)} ate ${soDia[1]}/${depois ? m : (m % 12) + 1}/${depois || m < 12 ? a : a + 1}`;
    }
    let e = interpretarCompromisso(frase, agora, d.tipo);
    if (!e.dataFim && !e.problema) e = interpretarCompromisso(texto, agora, d.tipo);
    if (e.problema === 'intervalo-invalido' || e.problema === 'data-invalida' || e.problema === 'data-passada') return { erro: PERGUNTA['intervalo-invalido'](e) };
    if (!e.data || !e.dataFim || e.problema) return null;
    // "até 05/12" depois de 10/12 sem ano: o interpretador pularia para o ano seguinte; aqui é fim antes do início.
    if (e.data === d.data && e.dataFim.slice(5) < d.data.slice(5) && !/\d{4}/.test(texto)) return { erro: PERGUNTA['intervalo-invalido'](e) };
    return { dados: { ...d, data: e.data, dataFim: e.dataFim } };
  }
  if (/^(?:nao|nao repete|so uma vez|uma vez so|nunca)$/.test(k)) return { dados: d };
  const e = interpretarCompromisso(`${dataBr(d.data)} ${texto}`, agora, d.tipo);
  if (!e.repeticao) return null;
  if (e.problema === 'intervalo-invalido' || e.problema === 'data-invalida') return { erro: PERGUNTA['intervalo-invalido'](e) };
  if (e.problema) return null;
  return { dados: { ...d, repeticao: e.repeticao, ...(e.repetirAte ? { repetirAte: e.repetirAte } : {}) } };
}

/** A pessoa respondeu (ou pulou) a pergunta pendente; devolve a próxima pergunta ou o "Vou anotar". */
function responderEtapa(frase: string, etapa: EtapaDoRascunho, pendente: DadosCompromisso, agora: Date): Mensagem[] | null {
  if (pareceCompromisso(frase, agora)) return null; // frase nova de compromisso: segue o fluxo normal
  const k = chave(frase);
  if (/^(?:pular|pula|pulo|ta bom|esta bom|ta bom assim|esta bom assim|pular esta bom assim|assim mesmo)$/.test(k)) {
    guardarRascunho(pendente);
    return confirmacao(obterRascunho() ?? pendente);
  }
  const r = lerResposta(etapa, frase, pendente, agora);
  if (!r) return perguntar(pendente, etapa, 'Não entendi.');
  if ('erro' in r) return perguntar(pendente, etapa, r.erro);
  // Segunda e última pergunta: com hora, "se repete"; dia todo, "até quando". Depois disso, só confirmar.
  const proxima: EtapaDoRascunho | null = etapa === 'hora' ? (r.dados.hora ? 'repete' : 'fim') : null;
  guardarRascunho(r.dados, proxima ?? undefined);
  const gravado = obterRascunho() ?? r.dados;
  return proxima ? perguntar(gravado, proxima) : confirmacao(gravado);
}

// A normalização reduz letras repetidas ("compromisso" vira "compromiso"); compara-se na mesma forma.
const PALAVRA_COMPROMISSO = palavras('compromisso')[0];
const SIM = new Set(['sim', 'confirmar', 'confirma', 'confirmo', 'isso', 'pode', 'ok']);
const NAO = new Set(['nao', 'cancelar', 'cancela', 'deixa']);

/** "Confirmar" / "Cancelar" (botão ou digitado) só valem com um entendimento pendente. */
export function respostaDeDecisao(frase: string, agora: Date): Mensagem[] | null {
  const ps = palavras(frase);
  const botao = ps.length === 2 && ps[1] === PALAVRA_COMPROMISSO && ['confirmar', 'cancelar'].includes(ps[0]);
  const pendente = obterRascunho();
  const soloSim = ps.length >= 1 && ps.length <= 2 && ps.every((p) => SIM.has(p));
  const soloNao = ps.length === 1 && NAO.has(ps[0]);
  // Com uma pergunta do mascote esperando, a frase é a resposta (menos "confirmar"/"cancelar", que valem sempre).
  const etapa = obterEtapaDoRascunho();
  if (etapa && pendente && !botao && !soloSim && !(soloNao && ps[0] !== 'nao')) {
    const r = responderEtapa(frase, etapa, pendente, agora);
    if (r) return r;
  }
  if (!botao && !(pendente && (soloSim || soloNao))) return null;
  const confirmar = botao ? ps[0] === 'confirmar' : soloSim;
  if (!pendente) return sugestao(`Não tenho nenhum compromisso esperando ${confirmar ? 'confirmação' : 'cancelamento'}. Diga a frase de novo, por exemplo: ${EXEMPLO}.`, 'regra: nada pendente');
  return confirmar ? confirmarCompromisso(pendente, agora) : cancelarCompromisso();
}

/** Grava o compromisso entendido. É o que o botão "Confirmar" executa direto (e o "sim" digitado). */
export function confirmarCompromisso(dados: DadosCompromisso, agora: Date): Mensagem[] {
  const r = criarCompromisso(dados, agora.toISOString());
  if (!r.ok) return fato(`${r.erro} Nada foi gravado.`, 'compromissos deste navegador');
  limparRascunho();
  return fato(
    `Anotado: ${descreverEntendimento(dados)}. Aparece na Agenda e o aviso vem às 8h ${dados.repeticao ? 'de cada ocorrência' : dados.dataFim && dados.dataFim > dados.data ? 'de cada dia' : 'do dia'}${dados.hora && dados.hora !== '08:00' ? ` e às ${dados.hora}` : ''}.`,
    'compromisso gravado agora',
    [ABRIR_AGENDA],
  );
}

/** Descarta o entendimento pendente. É o que o botão "Cancelar" executa direto. */
export function cancelarCompromisso(): Mensagem[] {
  limparRascunho();
  return fato('Cancelado. Nada foi gravado.', 'compromisso cancelado agora');
}

// ---------- "agenda", "compromissos", "o que tenho hoje|amanhã|semana" ----------

const MAXIMO_DE_LINHAS = 14;

function rotuloDoItem(i: ItemAgenda): string {
  if (i.tipo === 'vistoria') return `Vistoria: ${i.texto}`;
  if (i.tipo === 'saida') return `Saída: ${i.texto}`;
  return `${i.hora ? `${i.hora} ` : ''}${i.texto}${i.total ? ` (dia ${i.numero} de ${i.total})` : ''}${i.repete ? ` (↻ ${i.repete})` : ''}`;
}

export function respostaDeAgenda(
  frase: string,
  compromissos: readonly Compromisso[],
  demandas: Parameters<typeof montarAgenda>[0],
  operacoes: readonly Operacao[],
  agora: Date,
): Mensagem[] {
  const ps = palavras(frase);
  const dia = (n: number) => { const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + n); return dataLocal(d); };
  const periodo = ps.includes('hoje') ? { de: dia(0), ate: dia(0), nome: 'hoje' }
    : ps.includes('amanha') ? { de: dia(1), ate: dia(1), nome: 'amanhã' }
      : { de: dia(0), ate: dia(6), nome: 'nos próximos 7 dias' };
  // Ocorrência concluída não entra na lista; vistoria e saída seguem as mesmas regras da Agenda.
  const dias = montarAgenda(demandas, operacoes, compromissos, { de: periodo.de, ate: periodo.ate })
    .map((d) => ({ dia: d.dia, itens: d.itens.filter((i) => !i.concluido) }))
    .filter((d) => d.dia >= periodo.de && d.dia <= periodo.ate && d.itens.length > 0);
  const origem = `agenda deste navegador · ${agora.toLocaleDateString('pt-BR')}`;
  if (dias.length === 0) return fato(`Nada marcado ${periodo.nome}.`, origem, [ABRIR_AGENDA]);
  const linhas: string[] = [];
  let corte = 0;
  for (const { dia: data, itens } of dias) {
    if (linhas.length >= MAXIMO_DE_LINHAS) { corte += itens.length; continue; }
    if (periodo.de !== periodo.ate) linhas.push(`${diaCompleto(data)}:`);
    for (const i of itens) {
      if (linhas.length >= MAXIMO_DE_LINHAS) corte++;
      else linhas.push(`• ${rotuloDoItem(i)}`);
    }
  }
  if (corte) linhas.push(`E mais ${corte}: veja a Agenda.`);
  return fato(`Agenda ${periodo.nome}:\n${linhas.join('\n')}`, origem, [ABRIR_AGENDA]);
}
