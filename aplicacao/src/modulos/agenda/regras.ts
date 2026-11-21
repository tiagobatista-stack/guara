// Agenda (15/11/2026): junta vistorias das demandas, saídas dos pontos das operações e (item 14) os
// compromissos próprios, por dia. Regra pura, sem armazenamento próprio: lê o que os outros módulos guardam.

import type { Demanda } from '../demandas/modelo.ts';
import type { Operacao } from '../operacoes/modelo.ts';
import { viagemDoPonto } from '../operacoes/regras.ts';
import { tituloDoCompromisso, type Compromisso } from './compromissos.ts';

export interface ItemAgenda {
  /** AAAA-MM-DD. */
  data: string;
  tipo: 'vistoria' | 'saida' | 'compromisso';
  texto: string;
  /** HH:MM, só de compromisso com hora marcada. */
  hora?: string;
  /** Só de compromisso: permite editar, concluir e excluir pela Agenda. */
  id?: string;
  concluido?: true;
}

export function montarAgenda(
  demandas: readonly Pick<Demanda, 'titulo' | 'status' | 'vistoria'>[],
  operacoes: readonly Operacao[],
  compromissos: readonly Compromisso[] = [],
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
    itens.push({ data: c.data, tipo: 'compromisso', texto: tituloDoCompromisso(c), id: c.id, ...(c.hora ? { hora: c.hora } : {}), ...(c.concluido ? { concluido: true as const } : {}) });
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

/** Arquivo iCalendar (RFC 5545) de eventos de dia inteiro, que o Google Agenda importa. Só texto das demandas; nada sai do navegador. */
export function gerarIcs(itens: readonly ItemAgenda[], agora: Date): string {
  const carimbo = agora.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const eventos = itens.filter((i) => !i.concluido).flatMap((i) => {
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
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GUARA//Agenda//PT-BR', 'CALSCALE:GREGORIAN', ...eventos, 'END:VCALENDAR'];
  return linhas.map(dobrar).join('\r\n') + '\r\n';
}
