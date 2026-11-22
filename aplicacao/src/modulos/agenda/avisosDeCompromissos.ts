// Aviso dos compromissos próprios (item 14): quando um compromisso pede atenção e como é descrito.
// O aviso vale às 8h do dia e, havendo hora marcada, no horário marcado. Some com "Ciente" (até o
// próximo horário de aviso), "Concluído" (de vez) ou "Em 2 horas" (volta depois). Compromisso de até
// 7 dias atrás que ninguém marcou ainda aparece; mais antigo que isso, não insiste.

import { useEffect, useState } from 'react';
import { diaCompleto, tituloDoCompromisso, useCompromissos, type Compromisso } from './compromissos.ts';
import { descreverRepeticao, descreverSemanaDoMes, duracaoEmDias, numeroDoDia, ocorrenciaConcluida, ocorrenciaNoDia, repete, somarDias } from './recorrencia.ts';
import { HORAS_DO_ADIAMENTO_CURTO } from '../assistente/lembretes.ts';

export const HORA_DO_AVISO_DO_DIA = 8;
export const DIAS_DE_TOLERANCIA = 7;

const emData = (iso: string, hora: number, minuto: number) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, hora, minuto, 0, 0);
};

/** Instantes em que o aviso dispara no dia `dia` (padrão: a data do compromisso): 8h e a hora marcada (sem repetir). */
export function horariosDeAviso(c: Pick<Compromisso, 'data' | 'hora'>, dia: string = c.data): Date[] {
  const horarios = [emData(dia, HORA_DO_AVISO_DO_DIA, 0)];
  if (c.hora) {
    const [h, m] = c.hora.split(':').map(Number);
    const marcado = emData(dia, h, m);
    if (marcado.getTime() !== horarios[0].getTime()) horarios.push(marcado);
  }
  return horarios.sort((a, b) => a.getTime() - b.getTime());
}

/** Compromisso que pede atenção, com a data de início da ocorrência que o motivou (a chave de "Concluído"). */
export type CompromissoAvisado = Compromisso & { ocorrencia: string };

const isoLocal = (d: Date) => `${String(d.getFullYear()).padStart(4, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Compromissos que pedem atenção agora, do mais antigo (ocorrência e hora) para o mais novo.
 * Varre de hoje até 7 dias atrás e fica, por compromisso, com o último horário já passado: uma série diária
 * gera no máximo UM aviso (o da ocorrência mais recente), nunca sete. "Ciente", "Em 2 horas" e "Concluído"
 * (da ocorrência, em série) escondem o aviso.
 */
export function compromissosParaAvisar(compromissos: readonly Compromisso[], agora: Date): CompromissoAvisado[] {
  const hoje = isoLocal(agora);
  const achados: { c: CompromissoAvisado; ultimo: Date }[] = [];
  for (const c of compromissos) {
    if (c.concluido) continue;
    for (let n = 0; n <= DIAS_DE_TOLERANCIA; n++) {
      const dia = somarDias(hoje, -n);
      const o = ocorrenciaNoDia(c, dia);
      if (!o) continue;
      const ultimo = horariosDeAviso(c, dia).filter((h) => h <= agora).pop();
      if (!ultimo) continue;
      // A ocorrência mais recente com horário passado é a que vale; se ela já foi tratada, não se volta às antigas.
      const escondido = ocorrenciaConcluida(c, o.inicio)
        || Boolean(c.adiadoAte && new Date(c.adiadoAte) > agora)
        || Boolean(c.cienteEm && new Date(c.cienteEm) >= ultimo);
      if (!escondido) achados.push({ c: { ...c, ocorrencia: o.inicio }, ultimo });
      break;
    }
  }
  return achados
    .map((x) => x.c)
    .sort((a, b) => `${a.ocorrencia}${a.hora ?? ''}`.localeCompare(`${b.ocorrencia}${b.hora ?? ''}`) || a.id.localeCompare(b.id));
}

/** "hoje", "amanhã" ou "quinta, 10/12/2026" (data e dia da semana, para conferir). */
export function descreverDia(data: string, agora: Date): string {
  const [a, m, d] = data.split('-').map(Number);
  const dias = Math.round((Date.UTC(a, m - 1, d) - Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())) / 86_400_000);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return diaCompleto(data);
}

/** A ocorrência cobre exatamente uma faixa de semana do mês (1–7, 8–14, 15–21, 22–28 ou 29–fim)? */
function ehSemanaDoMes(inicio: string, duracao: number): boolean {
  const dia = Number(inicio.slice(8, 10));
  if (dia % 7 !== 1 || duracao === 0) return false;
  if (duracao === 6) return true;
  const [a, m] = inicio.split('-').map(Number);
  return dia === 29 && duracao === new Date(a, m, 0).getDate() - 29;
}

/**
 * "Reunião — licenciamento · hoje às 14:30", "· amanhã · dia todo", e, quando couber:
 * "· Dia 2 de 3" (vários dias), "· toda segunda" (série) e "· 2ª semana de dez" (semana do mês).
 */
export function textoDoCompromisso(c: Compromisso & { ocorrencia?: string }, agora: Date): string {
  const inicio = c.ocorrencia ?? c.data;
  const duracao = duracaoEmDias(c);
  const hoje = isoLocal(agora);
  // Em evento de vários dias, "quando" é o dia de hoje dentro dele (ou o último, se já terminou).
  const dentro = Math.min(Math.max(numeroDoDia(hoje) - numeroDoDia(inicio), 0), duracao);
  const quando = descreverDia(duracao > 0 ? somarDias(inicio, dentro) : inicio, agora);
  const extras = [
    duracao > 0 ? `Dia ${dentro + 1} de ${duracao + 1}` : '',
    repete(c) ? descreverRepeticao(c) : '',
    ehSemanaDoMes(inicio, duracao) ? descreverSemanaDoMes(inicio) : '',
  ].filter(Boolean);
  return `${tituloDoCompromisso(c)} · ${quando}${c.hora ? ` às ${c.hora}` : ' · dia todo'}${c.demanda ? ` · ${c.demanda}` : ''}${extras.map((x) => ` · ${x}`).join('')}`;
}

export const OPCAO_EM_DUAS_HORAS = { rotulo: `Em ${HORAS_DO_ADIAMENTO_CURTO} horas`, horas: HORAS_DO_ADIAMENTO_CURTO } as const;

/**
 * Compromissos que pedem atenção agora. Reavalia a cada 30 segundos, para o aviso aparecer sozinho
 * quando chega o dia (8h) ou a hora marcada, sem a pessoa tocar em nada.
 */
export function useCompromissosParaAvisar(agora: Date): CompromissoAvisado[] {
  const compromissos = useCompromissos();
  const [, setTique] = useState(0);
  useEffect(() => {
    const relogio = setInterval(() => setTique((n) => n + 1), 30_000);
    return () => clearInterval(relogio);
  }, []);
  return compromissosParaAvisar(compromissos, agora);
}
