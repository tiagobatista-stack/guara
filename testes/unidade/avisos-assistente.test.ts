// Avisos do assistente a partir dos dados reais (etapa 4 do plano dos mascotes).

import { avisosDoDia, resumoDosAvisos } from '../../aplicacao/src/modulos/assistente/avisos.ts';
import type { Demanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';

// Sexta, 13/11/2026; 20/11 é feriado nacional.
const AGORA = new Date('2026-11-13T12:00:00.000Z');
const RECENTE = '2026-11-13T09:00:00.000Z';

const d = (id: string, extra: Partial<Demanda> = {}): Demanda => ({
  id,
  titulo: `Demanda ${id}`,
  descricao: '',
  responsavel: 'Equipe (fictícia)',
  prioridade: 'Média',
  status: 'A Fazer',
  criadaEm: RECENTE,
  ultimaAcaoRelevante: RECENTE,
  ...extra,
});

describe('avisosDoDia', () => {
  const demandas = [
    d('E', { prazo: '2026-11-19', ultimaAcaoRelevante: '2026-11-03T12:00:00.000Z' }),
    d('D', { prazo: '2026-11-18' }),
    d('C', { prazo: '2026-11-13' }),
    d('B', { prazo: '2026-11-12' }),
    d('A', { prazo: '2026-11-10', ultimaAcaoRelevante: '2026-11-01T12:00:00.000Z' }),
    d('F', { prazo: '2026-11-01', status: 'Concluída' }),
    d('G'),
    d('H', { prazo: '2026-11-30' }),
  ];

  it('um aviso por demanda, do tipo mais urgente: vencidas, depois prazo próximo, depois paradas', () => {
    const avisos = avisosDoDia(demandas, AGORA, 3);
    expect(avisos.map((a) => [a.id, a.tipo])).toEqual([
      ['A', 'vencida'],
      ['B', 'vencida'],
      ['C', 'prazo-proximo'],
      ['D', 'prazo-proximo'],
      ['E', 'parada'],
    ]);
    // A também está parada: o aviso junta os dois sinais em vez de esconder o menos urgente.
    expect(avisos[0].texto).toBe('Demanda A: vencido há 3 dias úteis; parada há 12 dias sem ação relevante.');
    expect(avisos[2].texto).toBe('Demanda C: vence hoje.');
    expect(avisos[3].texto).toBe('Demanda D: faltam 3 dias úteis.');
    expect(avisos[4].texto).toBe('Demanda E: parada há 10 dias sem ação relevante.');
  });

  it('usa os feriados locais e o limiar de inatividade gravado', () => {
    // Com 17/11 como feriado local, 19/11 fica a 3 dias úteis: E passa de parada a prazo próximo (e continua parada).
    const comFeriado = avisosDoDia(demandas, AGORA, 3, { extras: ['2026-11-17'] });
    expect(comFeriado.find((a) => a.id === 'E')).toMatchObject({ tipo: 'prazo-proximo', texto: 'Demanda E: faltam 3 dias úteis; parada há 10 dias sem ação relevante.' });
    // Com limiar de 15 dias, E não está parada.
    expect(avisosDoDia(demandas, AGORA, 15).some((a) => a.id === 'E')).toBe(false);
  });

  it('sem demanda em aberto que peça atenção, não há aviso', () => {
    expect(avisosDoDia([d('G'), d('H', { prazo: '2026-11-30' })], AGORA, 3)).toEqual([]);
  });
});

describe('resumoDosAvisos', () => {
  it('conta por tipo, em português', () => {
    const avisos = avisosDoDia(
      [d('A', { prazo: '2026-11-10' }), d('C', { prazo: '2026-11-13' }), d('D', { prazo: '2026-11-18' })],
      AGORA,
      3,
    );
    expect(resumoDosAvisos(avisos)).toBe('1 vencida e 2 com prazo próximo');
    expect(resumoDosAvisos(avisosDoDia(demandas3(), AGORA, 3))).toBe('2 vencidas, 1 com prazo próximo e 1 parada');
    expect(resumoDosAvisos([])).toBe('');
  });
});

function demandas3() {
  return [
    d('A', { prazo: '2026-11-10' }),
    d('B', { prazo: '2026-11-12' }),
    d('C', { prazo: '2026-11-13' }),
    d('P', { ultimaAcaoRelevante: '2026-11-01T12:00:00.000Z' }),
  ];
}
