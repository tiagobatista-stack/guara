// Triagem das demandas sem prazo (ideia do TOCA): quais entram e qual prazo é sugerido.

import { listarSemPrazo, PRAZO_SUGERIDO_DIAS_UTEIS, sugerirPrazo } from '../../aplicacao/src/modulos/alertas/triagem.ts';

const d = (id: string, criadaEm: string, extra: { status?: string; prazo?: string } = {}) => ({ id, status: 'A Fazer', criadaEm, ...extra });

describe('listarSemPrazo', () => {
  it('só as abertas sem prazo, da criada há mais tempo para a mais nova', () => {
    const lista = [
      d('nova', '2026-11-12T10:00:00.000Z'),
      d('com-prazo', '2026-11-01T10:00:00.000Z', { prazo: '2026-11-30' }),
      d('concluida', '2026-11-01T10:00:00.000Z', { status: 'Concluída' }),
      d('antiga', '2026-11-02T10:00:00.000Z', { status: 'Em Andamento' }),
    ];
    expect(listarSemPrazo(lista).map((x) => x.id)).toEqual(['antiga', 'nova']);
  });
  it('não altera a lista recebida', () => {
    const lista = [d('b', '2026-11-12T10:00:00.000Z'), d('a', '2026-11-02T10:00:00.000Z')];
    listarSemPrazo(lista);
    expect(lista.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('sugerirPrazo (10 dias úteis, fuso local)', () => {
  it('o padrão é 10 dias úteis, como no TOCA', () => {
    expect(PRAZO_SUGERIDO_DIAS_UTEIS).toBe(10);
  });
  it('sexta 13/11/2026 → 30/11/2026, pulando o feriado de 20/11', () => {
    expect(sugerirPrazo(new Date(2026, 10, 13, 9, 0))).toEqual({ data: '2026-11-30', feriadosPulados: ['2026-11-20'] });
  });
  it('sem feriado no caminho: segunda 02/03/2026 → 16/03/2026', () => {
    expect(sugerirPrazo(new Date(2026, 2, 2, 9, 0))).toEqual({ data: '2026-03-16', feriadosPulados: [] });
  });
  it('fim de ano: quarta 23/12/2026 → sexta 08/01/2027, pulando 25/12 e 01/01', () => {
    expect(sugerirPrazo(new Date(2026, 11, 23, 9, 0))).toEqual({ data: '2027-01-08', feriadosPulados: ['2026-12-25', '2027-01-01'] });
  });
});
