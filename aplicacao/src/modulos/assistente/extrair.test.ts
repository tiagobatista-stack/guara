import { describe, expect, it } from 'vitest';
import { extrairIds, extrairQuando } from './extrair.ts';

describe('extrairIds', () => {
  it.each([
    ['DEM-FIC-0001', ['DEM-FIC-0001']],
    ['dem-fic-0001', ['DEM-FIC-0001']],
    ['Prorrogar DEM-FIC-0001, por favor', ['DEM-FIC-0001']],
    ['DEM-FIC-0003 lembrar segunda feira', ['DEM-FIC-0003']],
    ['lembrar (DEM-FIC-0099) amanhã', ['DEM-FIC-0099']],
    ['dem fic 3', ['DEM-FIC-0003']],
    ['demfic12', ['DEM-FIC-0012']],
    ['DEM_FIC_7', ['DEM-FIC-0007']],
    ['DEM-FIC-0001 e DEM-FIC-0002', ['DEM-FIC-0001', 'DEM-FIC-0002']],
    ['DEM-FIC-0001 de novo DEM-FIC-1', ['DEM-FIC-0001']],
  ])('"%s" → %j', (frase, esperado) => {
    expect(extrairIds(frase)).toEqual(esperado);
  });

  it.each(['prazos', '', 'DEM-1', 'DEM-FIC-', 'DEM-FIC-12345', 'XDEM-FIC-0001', 'DEM-FIC-0001x', 'dem fic três'])('"%s" não tem ID', (frase) => {
    expect(extrairIds(frase)).toEqual([]);
  });
});


// Sábado, 21/11/2026, 10h (horário local do teste). Datas montadas no horário local.
const SABADO = new Date(2026, 10, 21, 10, 0);
const SEGUNDA = new Date(2026, 10, 16, 10, 0);
const local = (d: number, h: number, min = 0) => new Date(2026, 10, d, h, min).getTime();
const ate = (frase: string, agora = SABADO) => {
  const q = extrairQuando(frase, agora);
  return 'ate' in q ? q.ate.getTime() : q.motivo;
};

describe('extrairQuando', () => {
  it('em N horas', () => {
    expect(ate('lembrar em 2 horas')).toBe(local(21, 12));
    expect(ate('me lembra em uma hora')).toBe(local(21, 11));
    expect(ate('em 169 horas')).toBe('sem-horario');
  });

  it('amanhã às 8h, ou no horário dito', () => {
    expect(ate('lembrar amanhã')).toBe(local(22, 8));
    expect(ate('amanha as 9h30')).toBe(local(22, 9, 30));
  });

  it('dia da semana: próxima ocorrência às 8h, com variações de escrita', () => {
    expect(ate('segunda')).toBe(local(23, 8));
    expect(ate('lembrar segunda feira')).toBe(local(23, 8));
    expect(ate('na segunda-feira')).toBe(local(23, 8));
    expect(ate('terça')).toBe(local(24, 8));
    expect(ate('sexta')).toBe(local(27, 8));
    expect(ate('segunda às 14h')).toBe(local(23, 14));
  });

  it('segunda dita numa segunda é a da semana que vem, não a de hoje', () => {
    expect(ate('segunda', SEGUNDA)).toBe(local(23, 8));
    expect(ate('segunda às 14h', SEGUNDA)).toBe(local(23, 14));
    expect(ate('terça', SEGUNDA)).toBe(local(17, 8));
  });

  it('só o horário: hoje se ainda não passou, senão amanhã; "hoje" com horário passado é recusado', () => {
    expect(ate('14h')).toBe(local(21, 14));
    expect(ate('às 9h')).toBe(local(22, 9));
    expect(ate('hoje às 17h')).toBe(local(21, 17));
    expect(ate('hoje às 9h')).toBe('passado');
  });

  it('sem horário reconhecível pede o horário', () => {
    for (const frase of ['', 'lembrar', 'mais tarde', 'dia 23', '25h', 'em dois dias', 'hoje']) expect(ate(frase), frase).toBe('sem-horario');
  });
});
