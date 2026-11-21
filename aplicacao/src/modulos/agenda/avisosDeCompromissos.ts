// Aviso dos compromissos próprios (item 14): quando um compromisso pede atenção e como é descrito.
// O aviso vale às 8h do dia e, havendo hora marcada, no horário marcado. Some com "Ciente" (até o
// próximo horário de aviso), "Concluído" (de vez) ou "Em 2 horas" (volta depois). Compromisso de até
// 7 dias atrás que ninguém marcou ainda aparece; mais antigo que isso, não insiste.

import { useEffect, useState } from 'react';
import { diaCompleto, tituloDoCompromisso, useCompromissos, type Compromisso } from './compromissos.ts';
import { HORAS_DO_ADIAMENTO_CURTO } from '../assistente/lembretes.ts';

export const HORA_DO_AVISO_DO_DIA = 8;
export const DIAS_DE_TOLERANCIA = 7;

const emData = (iso: string, hora: number, minuto: number) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d, hora, minuto, 0, 0);
};

/** Instantes em que o aviso dispara: 8h do dia e a hora marcada (sem repetir). */
export function horariosDeAviso(c: Pick<Compromisso, 'data' | 'hora'>): Date[] {
  const horarios = [emData(c.data, HORA_DO_AVISO_DO_DIA, 0)];
  if (c.hora) {
    const [h, m] = c.hora.split(':').map(Number);
    const marcado = emData(c.data, h, m);
    if (marcado.getTime() !== horarios[0].getTime()) horarios.push(marcado);
  }
  return horarios.sort((a, b) => a.getTime() - b.getTime());
}

/** Compromissos que pedem atenção agora, do mais antigo (data e hora) para o mais novo. */
export function compromissosParaAvisar(compromissos: readonly Compromisso[], agora: Date): Compromisso[] {
  const limite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - DIAS_DE_TOLERANCIA);
  return compromissos
    .filter((c) => {
      if (c.concluido) return false;
      if (emData(c.data, 23, 59) < limite) return false;
      const ultimo = horariosDeAviso(c).filter((h) => h <= agora).pop();
      if (!ultimo) return false;
      if (c.adiadoAte && new Date(c.adiadoAte) > agora) return false;
      if (c.cienteEm && new Date(c.cienteEm) >= ultimo) return false;
      return true;
    })
    .sort((a, b) => `${a.data}${a.hora ?? ''}`.localeCompare(`${b.data}${b.hora ?? ''}`) || a.id.localeCompare(b.id));
}

/** "hoje", "amanhã" ou "quinta, 10/12/2026" (data e dia da semana, para conferir). */
export function descreverDia(data: string, agora: Date): string {
  const [a, m, d] = data.split('-').map(Number);
  const dias = Math.round((Date.UTC(a, m - 1, d) - Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())) / 86_400_000);
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return diaCompleto(data);
}

/** "Reunião — licenciamento · hoje às 14:30" ou "· amanhã · dia todo". */
export function textoDoCompromisso(c: Compromisso, agora: Date): string {
  const quando = descreverDia(c.data, agora);
  return `${tituloDoCompromisso(c)} · ${quando}${c.hora ? ` às ${c.hora}` : ' · dia todo'}${c.demanda ? ` · ${c.demanda}` : ''}`;
}

export const OPCAO_EM_DUAS_HORAS = { rotulo: `Em ${HORAS_DO_ADIAMENTO_CURTO} horas`, horas: HORAS_DO_ADIAMENTO_CURTO } as const;

/**
 * Compromissos que pedem atenção agora. Reavalia a cada 30 segundos, para o aviso aparecer sozinho
 * quando chega o dia (8h) ou a hora marcada, sem a pessoa tocar em nada.
 */
export function useCompromissosParaAvisar(agora: Date): Compromisso[] {
  const compromissos = useCompromissos();
  const [, setTique] = useState(0);
  useEffect(() => {
    const relogio = setInterval(() => setTique((n) => n + 1), 30_000);
    return () => clearInterval(relogio);
  }, []);
  return compromissosParaAvisar(compromissos, agora);
}
