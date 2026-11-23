import { describe, expect, it } from 'vitest';
import {
  descreverOrdemDoDia, descreverRepeticao, descreverSemanaDoMes, duracaoEmDias, ehInicioDeOcorrencia, ocorreNoDia, ocorrenciaConcluida,
  ocorrenciaNoDia, ocorrenciasNoIntervalo, semanaDoMes, somarDias,
} from './recorrencia.ts';

// 2026-12-10 é quinta-feira.
const datas = (c: Parameters<typeof ocorrenciasNoIntervalo>[0], de: string, ate: string) => ocorrenciasNoIntervalo(c, de, ate).map((o) => o.dia);

describe('semana do mês', () => {
  it('usa as faixas 1–7, 8–14, 15–21, 22–28 e 29–31', () => {
    expect(['2026-12-01', '2026-12-07', '2026-12-08', '2026-12-14', '2026-12-15', '2026-12-21', '2026-12-22', '2026-12-28', '2026-12-29', '2026-12-31'].map(semanaDoMes))
      .toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it('descreve a semana e a ordem do dia da semana, com o gênero certo', () => {
    expect(descreverSemanaDoMes('2026-12-10')).toBe('2ª semana de dez');
    expect(descreverOrdemDoDia('2026-12-10')).toBe('2ª quinta');
    expect(descreverOrdemDoDia('2026-12-05')).toBe('1º sábado');
    expect(descreverOrdemDoDia('2026-12-06')).toBe('1º domingo');
  });
});

describe('intervalo de datas', () => {
  const curso = { data: '2026-12-10', dataFim: '2026-12-12' };
  it('cobre todos os dias, de data a dataFim, e mostra "dia n de total"', () => {
    expect(duracaoEmDias(curso)).toBe(2);
    expect(ocorrenciasNoIntervalo(curso, '2026-12-01', '2026-12-31')).toEqual([
      { dia: '2026-12-10', inicio: '2026-12-10', fim: '2026-12-12', numero: 1, total: 3 },
      { dia: '2026-12-11', inicio: '2026-12-10', fim: '2026-12-12', numero: 2, total: 3 },
      { dia: '2026-12-12', inicio: '2026-12-10', fim: '2026-12-12', numero: 3, total: 3 },
    ]);
  });
  it('sem dataFim, ou com dataFim igual à data, é de 1 dia', () => {
    expect(duracaoEmDias({ data: '2026-12-10' })).toBe(0);
    expect(duracaoEmDias({ data: '2026-12-10', dataFim: '2026-12-10' })).toBe(0);
    expect(datas({ data: '2026-12-10', dataFim: '2026-12-10' }, '2026-12-01', '2026-12-31')).toEqual(['2026-12-10']);
  });
  it('janela que começa no meio do evento ainda enxerga os dias seguintes', () => {
    expect(datas(curso, '2026-12-11', '2026-12-20')).toEqual(['2026-12-11', '2026-12-12']);
  });
  it('atravessa a virada do mês e do ano', () => {
    expect(datas({ data: '2026-12-30', dataFim: '2027-01-02' }, '2026-12-01', '2027-01-31')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  });
});

describe('repetição', () => {
  it('sem repetição só ocorre na data', () => {
    expect(ocorreNoDia({ data: '2026-12-10', repeticao: 'nenhuma' }, '2026-12-10')).toBe(true);
    expect(ocorreNoDia({ data: '2026-12-10' }, '2026-12-17')).toBe(false);
  });
  it('diária: todo dia, a partir da data, e nunca antes', () => {
    const c = { data: '2026-12-10', repeticao: 'diaria' as const };
    expect(datas(c, '2026-12-08', '2026-12-12')).toEqual(['2026-12-10', '2026-12-11', '2026-12-12']);
  });
  it('semanal: no mesmo dia da semana da data', () => {
    expect(datas({ data: '2026-12-10', repeticao: 'semanal' }, '2026-12-01', '2027-01-07')).toEqual(['2026-12-10', '2026-12-17', '2026-12-24', '2026-12-31', '2027-01-07']);
  });
  it('dias úteis: segunda a sexta, e a série de fim de semana começa na segunda seguinte', () => {
    const c = { data: '2026-12-05', repeticao: 'dias_uteis' as const }; // sábado
    expect(datas(c, '2026-12-01', '2026-12-11')).toEqual(['2026-12-07', '2026-12-08', '2026-12-09', '2026-12-10', '2026-12-11']);
  });
  it('mensal: dia 31 pula os meses que não têm dia 31', () => {
    const c = { data: '2026-01-31', repeticao: 'mensal' as const };
    expect(datas(c, '2026-01-01', '2026-06-30')).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
    expect(ehInicioDeOcorrencia(c, '2026-02-28')).toBe(false);
    expect(ehInicioDeOcorrencia(c, '2026-04-30')).toBe(false);
  });
  it('mensal: dia 28 vale em todos os meses, inclusive fevereiro', () => {
    expect(datas({ data: '2026-01-28', repeticao: 'mensal' }, '2026-01-01', '2026-03-31')).toEqual(['2026-01-28', '2026-02-28', '2026-03-28']);
  });
  it('anual: 29/02 só vale em ano bissexto', () => {
    const c = { data: '2024-02-29', repeticao: 'anual' as const };
    expect(datas(c, '2024-01-01', '2024-12-31')).toEqual(['2024-02-29']);
    expect(datas(c, '2027-01-01', '2027-12-31')).toEqual([]);
    expect(datas(c, '2028-01-01', '2028-12-31')).toEqual(['2028-02-29']);
    expect(datas({ data: '2026-12-10', repeticao: 'anual' }, '2026-12-01', '2027-12-31')).toEqual(['2026-12-10', '2027-12-10']);
  });
  it('mensal na semana do mês: a 2ª quinta de cada mês', () => {
    const c = { data: '2026-12-10', repeticao: 'mensal_semana' as const };
    expect(datas(c, '2026-12-01', '2027-02-28')).toEqual(['2026-12-10', '2027-01-14', '2027-02-11']);
  });
  it('mensal na semana do mês: a 5ª sexta pula os meses que não têm', () => {
    const c = { data: '2026-01-30', repeticao: 'mensal_semana' as const }; // 5ª sexta de janeiro
    expect(datas(c, '2026-01-01', '2026-05-31')).toEqual(['2026-01-30', '2026-05-29']);
  });
  it('repetirAte encerra a série (inclusive) e a janela longa é limitada', () => {
    const c = { data: '2026-12-10', repeticao: 'semanal' as const, repetirAte: '2026-12-24' };
    expect(datas(c, '2026-12-01', '2027-06-30')).toEqual(['2026-12-10', '2026-12-17', '2026-12-24']);
    expect(ocorrenciasNoIntervalo({ data: '2026-01-01', repeticao: 'diaria' }, '2026-01-01', '2036-01-01')).toHaveLength(400);
  });
  it('série de vários dias: cada ocorrência cobre a mesma duração', () => {
    const c = { data: '2026-12-10', dataFim: '2026-12-11', repeticao: 'semanal' as const };
    expect(ocorrenciaNoDia(c, '2026-12-18')).toMatchObject({ inicio: '2026-12-17', numero: 2, total: 2 });
    expect(ocorreNoDia(c, '2026-12-19')).toBe(false);
    expect(ehInicioDeOcorrencia(c, '2026-12-24')).toBe(true);
  });
  it('descreve a repetição em português, com o gênero certo e o fim', () => {
    expect(descreverRepeticao({ data: '2026-11-23', repeticao: 'semanal' })).toBe('toda segunda');
    expect(descreverRepeticao({ data: '2026-12-05', repeticao: 'semanal' })).toBe('todo sábado');
    expect(descreverRepeticao({ data: '2026-12-06', repeticao: 'semanal' })).toBe('todo domingo');
    expect(descreverRepeticao({ data: '2026-12-10', repeticao: 'mensal_semana' })).toBe('todo mês, na 2ª quinta');
    expect(descreverRepeticao({ data: '2026-12-10', repeticao: 'mensal' })).toBe('todo dia 10 do mês');
    expect(descreverRepeticao({ data: '2026-12-10', repeticao: 'dias_uteis', repetirAte: '2027-01-15' })).toBe('nos dias úteis, até 15/01/2027');
    expect(descreverRepeticao({ data: '2026-12-10' })).toBe('');
  });
});

describe('conclusão por ocorrência', () => {
  it('concluidasEm vale só para aquela data; concluido vale para todas', () => {
    expect(ocorrenciaConcluida({ concluidasEm: ['2026-12-10'] }, '2026-12-10')).toBe(true);
    expect(ocorrenciaConcluida({ concluidasEm: ['2026-12-10'] }, '2026-12-17')).toBe(false);
    expect(ocorrenciaConcluida({ concluido: true }, '2026-12-17')).toBe(true);
  });
  it('somarDias anda por datas, não por horas', () => {
    expect(somarDias('2026-10-31', 1)).toBe('2026-11-01');
    expect(somarDias('2027-03-01', -1)).toBe('2027-02-28');
  });
});
