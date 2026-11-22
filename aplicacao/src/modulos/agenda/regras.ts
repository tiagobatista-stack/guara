// Agenda (15/11/2026): junta vistorias das demandas, saídas dos pontos das operações e (item 14) os
// compromissos próprios, por dia. Regra pura, sem armazenamento próprio: lê o que os outros módulos guardam.

import type { Demanda } from '../demandas/modelo.ts';
import type { Operacao } from '../operacoes/modelo.ts';
import { viagemDoPonto } from '../operacoes/regras.ts';
import { tituloDoCompromisso, type Compromisso } from './compromissos.ts';
import { descreverRepeticao, diaDaSemana, duracaoEmDias, ehInicioDeOcorrencia, MAXIMO_DA_JANELA, ocorrenciaConcluida, ocorrenciasNoIntervalo, ordemDoDiaNoMes, repete, somarDias } from './recorrencia.ts';

export interface ItemAgenda {
  /** AAAA-MM-DD: o dia em que o item aparece (num compromisso de vários dias ou de série, um item por dia coberto). */
  data: string;
  tipo: 'vistoria' | 'saida' | 'compromisso';
  texto: string;
  /** HH:MM, só de compromisso com hora marcada. */
  hora?: string;
  /** Só de compromisso: permite editar, concluir e excluir pela Agenda. */
  id?: string;
  /** Concluído neste dia (em série, só aquela ocorrência). */
  concluido?: true;
  /** Só de compromisso: data de início da ocorrência que cobre o dia (chave de "Concluir" em série). */
  ocorrencia?: string;
  /** Só de compromisso de vários dias: "Dia 2 de 3" = numero 2, total 3. */
  numero?: number;
  total?: number;
  /** Só de compromisso com repetição: "toda segunda". */
  repete?: string;
}

/** Período (inclusive) em que as séries de compromissos são expandidas. */
export interface JanelaDaAgenda { de: string; ate: string }

/**
 * Junta o que cai em cada dia. Compromisso de vários dias aparece em todos os dias que cobre e série em todas as
 * ocorrências da `janela`. Sem janela, a série entra só com a primeira ocorrência (não existe "todas").
 */
export function montarAgenda(
  demandas: readonly Pick<Demanda, 'titulo' | 'status' | 'vistoria'>[],
  operacoes: readonly Operacao[],
  compromissos: readonly Compromisso[] = [],
  janela?: JanelaDaAgenda,
): { dia: string; itens: ItemAgenda[] }[] {
  const itens: ItemAgenda[] = [];
  for (const d of demandas) {
    if (d.vistoria?.data && d.status !== 'Concluída') itens.push({ data: d.vistoria.data, tipo: 'vistoria', texto: d.titulo });
  }
  for (const o of operacoes) {
    for (const p of o.pontos) {
      const v = viagemDoPonto(o, p);
      if (v?.saida && p.situacao === 'planejado') {
        itens.push({ data: v.saida, tipo: 'saida', texto: `${o.nome} · ${p.municipio}${v.equipe ? ` · ${v.equipe}` : ''}` });
      }
    }
  }
  for (const c of compromissos) {
    const de = janela?.de ?? c.data;
    const ate = janela?.ate ?? somarDias(c.data, duracaoEmDias(c));
    for (const o of ocorrenciasNoIntervalo(c, de, ate)) {
      itens.push({
        data: o.dia, tipo: 'compromisso', texto: tituloDoCompromisso(c), id: c.id, ocorrencia: o.inicio,
        ...(c.hora ? { hora: c.hora } : {}),
        ...(ocorrenciaConcluida(c, o.inicio) ? { concluido: true as const } : {}),
        ...(o.total > 1 ? { numero: o.numero, total: o.total } : {}),
        ...(repete(c) ? { repete: descreverRepeticao(c) } : {}),
      });
    }
  }
  const dias = new Map<string, ItemAgenda[]>();
  for (const i of itens) dias.set(i.data, [...(dias.get(i.data) ?? []), i]);
  // Dentro do dia: o que não tem hora primeiro, depois os compromissos com hora, do mais cedo ao mais tarde.
  return [...dias.keys()].sort().map((dia) => ({ dia, itens: dias.get(dia)!.sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? '')) }));
}

/** Nomes das operações cujo período (inicio a fim; com só um lado, aquele dia) cobre o dia AAAA-MM-DD. */
export function operacoesNoDia(operacoes: readonly Pick<Operacao, 'nome' | 'inicio' | 'fim'>[], dia: string): string[] {
  return operacoes
    .filter((o) => (o.inicio || o.fim) && dia >= (o.inicio ?? o.fim!) && dia <= (o.fim ?? o.inicio!))
    .map((o) => o.nome);
}

/** Operação cujo período cobre dias de um compromisso: `dias` em ordem, sem repetir (AAAA-MM-DD). */
export interface Coincidencia { operacao: string; dias: string[] }

/**
 * Aviso de coincidência (não bloqueia nada): em quais dias o compromisso (de um dia, de vários dias ou em série,
 * até `repetirAte`; sem ele, nos próximos 400 dias) cai no período de uma operação. Só olha operações com `inicio`
 * ou `fim`. Não lê nem grava armazenamento.
 */
export function coincidenciasComOperacoes(
  c: Pick<Compromisso, 'data' | 'dataFim' | 'repeticao' | 'repetirAte'>,
  operacoes: readonly Pick<Operacao, 'nome' | 'inicio' | 'fim'>[],
): Coincidencia[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.data) || !operacoes.some((o) => o.inicio || o.fim)) return [];
  const ate = repete(c) && c.repetirAte ? somarDias(c.repetirAte, duracaoEmDias(c)) : somarDias(c.data, repete(c) ? MAXIMO_DA_JANELA : duracaoEmDias(c));
  const dias = [...new Set(ocorrenciasNoIntervalo(c, c.data, ate).map((o) => o.dia))];
  const saida: Coincidencia[] = [];
  for (const o of operacoes) {
    const em = dias.filter((d) => operacoesNoDia([o], d).length > 0);
    if (em.length) saida.push({ operacao: o.nome, dias: em });
  }
  return saida;
}

/** "10/12/2026 a 12/12/2026, 20/12/2026" (dias seguidos viram um período; mais de 4 trechos viram "e mais n"). */
export function resumirDias(dias: readonly string[]): string {
  const trechos: string[] = [];
  const br = (d: string) => d.split('-').reverse().join('/');
  for (let i = 0; i < dias.length; ) {
    let j = i;
    while (j + 1 < dias.length && somarDias(dias[j], 1) === dias[j + 1]) j++;
    trechos.push(j > i ? `${br(dias[i])} a ${br(dias[j])}` : br(dias[i]));
    i = j + 1;
  }
  return trechos.length > 4 ? `${trechos.slice(0, 4).join(', ')} e mais ${trechos.length - 4}` : trechos.join(', ');
}

/** Frase curta para o aviso: "Coincide com a operação Op (10/12/2026 a 12/12/2026)." */
export function textoDeCoincidencia(lista: readonly Coincidencia[]): string {
  if (!lista.length) return '';
  const partes = lista.map((c) => `${c.operacao} (${resumirDias(c.dias)})`);
  return `Coincide com ${lista.length > 1 ? 'as operações' : 'a operação'} ${partes.join('; ')}.`;
}

/** Semanas (domingo a sábado, como no Google Agenda) que cobrem o mês; `mes` de 1 a 12. `doMes` é falso nos dias de folga. */
export function gradeDoMes(ano: number, mes: number): { data: string; doMes: boolean }[][] {
  const dia = new Date(ano, mes - 1, 1);
  dia.setDate(1 - dia.getDay());
  const semanas: { data: string; doMes: boolean }[][] = [];
  do {
    const semana = [];
    for (let i = 0; i < 7; i++) {
      semana.push({ data: dia.toLocaleDateString('sv-SE'), doMes: dia.getMonth() === mes - 1 });
      dia.setDate(dia.getDate() + 1);
    }
    semanas.push(semana);
  } while (dia.getMonth() === mes - 1);
  return semanas;
}

const escapar = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compacta = (data: string) => data.replace(/-/g, '');
const hash = (t: string) => [...t].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7).toString(36);
// Linhas do iCalendar têm no máximo 75 caracteres; a continuação começa com um espaço.
const dobrar = (l: string) => (l.length <= 75 ? l : [l.slice(0, 75), ...(l.slice(75).match(/.{1,74}/g) ?? []).map((p) => ` ${p}`)].join('\r\n'));

const DIAS_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Regra de repetição do iCalendar (RRULE), sem o "UNTIL". */
function regraDeRepeticao(c: Pick<Compromisso, 'data' | 'repeticao'>): string | null {
  switch (c.repeticao) {
    case 'diaria': return 'FREQ=DAILY';
    case 'semanal': return 'FREQ=WEEKLY';
    case 'mensal': return 'FREQ=MONTHLY';
    case 'anual': return 'FREQ=YEARLY';
    case 'dias_uteis': return 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR';
    case 'mensal_semana': return `FREQ=MONTHLY;BYDAY=${ordemDoDiaNoMes(c.data)}${DIAS_ICS[diaDaSemana(c.data)]}`;
    default: return null;
  }
}

/** Horário "flutuante" (sem fuso) AAAAMMDDTHHMMSS. */
const flutuante = (dia: string, minutos: number) => `${compacta(dia)}T${String(Math.floor(minutos / 60)).padStart(2, '0')}${String(minutos % 60).padStart(2, '0')}00`;

/**
 * Um VEVENT por compromisso, com a série inteira em RRULE: o Google Agenda e o Outlook repetem sozinhos.
 *   Dia inteiro: DTSTART;VALUE=DATE e DTEND;VALUE=DATE no dia SEGUINTE ao último (o fim é exclusivo).
 *   Com hora: horário flutuante de 1 hora. UNTIL em AAAAMMDD (dia inteiro) ou AAAAMMDDT235959 (com hora).
 *   EXDATE: as ocorrências concluídas. UID fixo pelo id: importar de novo atualiza, não duplica.
 */
function eventoDoCompromisso(c: Compromisso, carimbo: string): string[] {
  if (c.concluido) return [];
  let inicio = c.data;
  // Dias úteis: o evento começa na primeira segunda a sexta (o Google conta o DTSTART como 1ª ocorrência mesmo fora da regra).
  if (c.repeticao === 'dias_uteis') while (!ehInicioDeOcorrencia({ data: inicio, repeticao: 'dias_uteis' }, inicio)) inicio = somarDias(inicio, 1);
  if (c.repetirAte && repete(c) && c.repetirAte < inicio) return [];
  const duracao = duracaoEmDias(c);
  const comHora = Boolean(c.hora);
  const [h, m] = (c.hora ?? '00:00').split(':').map(Number);
  const minutos = h * 60 + m;
  const data = (dia: string) => (comHora ? flutuante(dia, minutos) : compacta(dia));
  const tipo = comHora ? '' : ';VALUE=DATE';
  const linhas = ['BEGIN:VEVENT', `UID:compromisso-${c.id}@guara`, `DTSTAMP:${carimbo}`, `DTSTART${tipo}:${data(inicio)}`];
  if (comHora) linhas.push(`DTEND:${minutos + 60 >= 1440 ? flutuante(somarDias(inicio, 1), minutos + 60 - 1440) : flutuante(inicio, minutos + 60)}`);
  else linhas.push(`DTEND;VALUE=DATE:${compacta(somarDias(inicio, duracao + 1))}`);
  linhas.push(`SUMMARY:${escapar(tituloDoCompromisso(c))}`);
  const regra = regraDeRepeticao(c);
  if (regra && repete(c)) {
    const ate = c.repetirAte ? `;UNTIL=${compacta(c.repetirAte)}${comHora ? 'T235959' : ''}` : '';
    linhas.push(`RRULE:${regra}${ate}`);
    const feitas = (c.concluidasEm ?? []).filter((d) => ehInicioDeOcorrencia({ ...c, data: inicio }, d)).sort();
    if (feitas.length) linhas.push(`EXDATE${tipo}:${feitas.map((d) => data(d)).join(',')}`);
  }
  linhas.push('END:VEVENT');
  return linhas;
}

/** Arquivo iCalendar (RFC 5545), que o Google Agenda importa: vistorias e saídas (dia inteiro) e compromissos (com séries). Só texto das demandas; nada sai do navegador. */
export function gerarIcs(itens: readonly ItemAgenda[], agora: Date, compromissos?: readonly Compromisso[]): string {
  const carimbo = agora.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  // Com `compromissos`, eles saem inteiros (série em RRULE) e os itens de compromisso da lista são ignorados.
  const doCompromisso = (compromissos ?? []).flatMap((c) => eventoDoCompromisso(c, carimbo));
  const eventos = itens.filter((i) => !i.concluido && !(compromissos && i.tipo === 'compromisso')).flatMap((i) => {
    if (i.tipo === 'compromisso' && i.hora) {
      // Com hora marcada: horário "flutuante" (sem fuso), com uma hora de duração.
      const inicio = new Date(`${i.data}T${i.hora}:00`);
      const fim = new Date(inicio.getTime() + 3_600_000);
      const flutuante = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
      return ['BEGIN:VEVENT', `UID:${hash(`${i.tipo}|${i.id ?? ''}|${i.data}|${i.hora}|${i.texto}`)}@guara`, `DTSTAMP:${carimbo}`, `DTSTART:${flutuante(inicio)}`, `DTEND:${flutuante(fim)}`, `SUMMARY:${escapar(i.texto)}`, 'END:VEVENT'];
    }
    const fim = new Date(`${i.data}T12:00:00`);
    fim.setDate(fim.getDate() + 1);
    return [
      'BEGIN:VEVENT',
      `UID:${hash(`${i.tipo}|${i.data}|${i.texto}`)}@guara`,
      `DTSTAMP:${carimbo}`,
      `DTSTART;VALUE=DATE:${compacta(i.data)}`,
      `DTEND;VALUE=DATE:${compacta(fim.toLocaleDateString('sv-SE'))}`,
      `SUMMARY:${escapar(i.tipo === 'compromisso' ? i.texto : `${i.tipo === 'vistoria' ? 'Vistoria' : 'Saída'}: ${i.texto}`)}`,
      'END:VEVENT',
    ];
  });
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GUARA//Agenda//PT-BR', 'CALSCALE:GREGORIAN', ...eventos, ...doCompromisso, 'END:VCALENDAR'];
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}
