// Prazos em dias úteis e feriados nacionais (lógica reescrita a partir do TOCA).
// Calendário de referência: 13/11/2026 é sexta; 15/11 (domingo) e 20/11 (sexta) são feriados.

import {
  dataLocal,
  diasUteis,
  ehDiaUtil,
  feriadosEntre,
  feriadosNacionais,
  pascoa,
  rotuloDias,
  situacaoPrazo,
  somarDiasUteis,
} from '../../aplicacao/src/modulos/alertas/dias-uteis.ts';

describe('feriados nacionais', () => {
  it('Páscoa em anos conhecidos', () => {
    expect(pascoa(2008)).toBe('2008-03-23');
    expect(pascoa(2019)).toBe('2019-04-21');
    expect(pascoa(2024)).toBe('2024-03-31');
    expect(pascoa(2025)).toBe('2025-04-20');
    expect(pascoa(2026)).toBe('2026-04-05');
    expect(pascoa(2038)).toBe('2038-04-25');
  });
  it('2026: 9 fixos e a Sexta-feira Santa; facultativos só quando pedidos', () => {
    const nacionais = feriadosNacionais(2026);
    expect(nacionais).toHaveLength(10);
    expect(nacionais).toContain('2026-04-03');
    expect(nacionais).toContain('2026-11-20');
    expect(nacionais).not.toContain('2026-02-16');
    expect(feriadosNacionais(2026, true)).toEqual(expect.arrayContaining(['2026-02-16', '2026-02-17', '2026-06-04']));
  });
  it('intervalo com extras e remoções locais', () => {
    expect([...feriadosEntre('2026-11-01', '2026-11-30')]).toEqual(['2026-11-02', '2026-11-15', '2026-11-20']);
    const ajustado = feriadosEntre('2026-11-01', '2026-11-30', { extras: ['2026-11-16', '2027-01-05'], remover: ['2026-11-20'] });
    expect([...ajustado].sort()).toEqual(['2026-11-02', '2026-11-15', '2026-11-16']);
  });
  it('sábado, domingo e feriado não são dias úteis', () => {
    expect(ehDiaUtil('2026-11-19')).toBe(true);
    expect(ehDiaUtil('2026-11-14')).toBe(false);
    expect(ehDiaUtil('2026-11-15')).toBe(false);
    expect(ehDiaUtil('2026-11-20', feriadosEntre('2026-11-20', '2026-11-20'))).toBe(false);
  });
});

describe('contagem de dias úteis', () => {
  it('de sexta 13/11 a segunda 23/11 há 5 dias úteis (pula o fim de semana e o 20/11)', () => {
    expect(diasUteis('2026-11-13', '2026-11-23')).toBe(5);
    expect(diasUteis('2026-11-23', '2026-11-13')).toBe(-5);
    expect(diasUteis('2026-11-13', '2026-11-13')).toBe(0);
  });
  it('o ajuste local muda a conta', () => {
    expect(diasUteis('2026-11-13', '2026-11-23', { extras: ['2026-11-16'] })).toBe(4);
    expect(diasUteis('2026-11-13', '2026-11-23', { remover: ['2026-11-20'] })).toBe(6);
  });
  it('somar dias úteis informa os feriados pulados, inclusive na virada do ano', () => {
    expect(somarDiasUteis('2026-11-13', 5)).toEqual({ data: '2026-11-23', feriadosPulados: ['2026-11-20'] });
    expect(somarDiasUteis('2026-12-30', 2)).toEqual({ data: '2027-01-04', feriadosPulados: ['2027-01-01'] });
    expect(somarDiasUteis('2026-11-13', 0)).toEqual({ data: '2026-11-13', feriadosPulados: [] });
  });
});

describe('texto do prazo', () => {
  it('singular, plural e sem sinal', () => {
    expect(rotuloDias(1)).toBe('1 dia útil');
    expect(rotuloDias(-1)).toBe('1 dia útil');
    expect(rotuloDias(4)).toBe('4 dias úteis');
  });
  it('faltam, falta, vence hoje e vencido', () => {
    expect(situacaoPrazo('2026-11-13', '2026-11-23')).toEqual({ diasUteis: 5, vencido: false, texto: 'faltam 5 dias úteis' });
    expect(situacaoPrazo('2026-11-13', '2026-11-16').texto).toBe('falta 1 dia útil');
    expect(situacaoPrazo('2026-11-13', '2026-11-13')).toEqual({ diasUteis: 0, vencido: false, texto: 'vence hoje' });
    expect(situacaoPrazo('2026-11-23', '2026-11-13')).toEqual({ diasUteis: -5, vencido: true, texto: 'vencido há 5 dias úteis' });
  });
  it('fim de semana entre hoje e o prazo não vira "vence hoje"', () => {
    expect(situacaoPrazo('2026-11-13', '2026-11-14')).toEqual({ diasUteis: 0, vencido: false, texto: 'sem dia útil antes do prazo' });
    expect(situacaoPrazo('2026-11-14', '2026-11-13')).toEqual({ diasUteis: 0, vencido: true, texto: 'vencido, sem dia útil desde o prazo' });
  });
  it('data de hoje no fuso local, mesmo perto da meia-noite', () => {
    expect(dataLocal(new Date(2026, 10, 13, 23, 59))).toBe('2026-11-13');
    expect(dataLocal(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
});
