import { describe, expect, it } from 'vitest';
import { interpretarCompromisso as ler, pareceCompromisso } from './interpretarCompromisso.ts';

// Sábado, 21/11/2026, 10h.
const SABADO = new Date(2026, 10, 21, 10);

describe('interpretar compromisso: o caso real de 21/11', () => {
  it('"reunião dia 10/12 sobre licenciamento"', () => {
    expect(ler('reunião dia 10/12 sobre licenciamento', SABADO)).toEqual({ tipo: 'reunião', data: '2026-12-10', assunto: 'licenciamento' });
  });
});

describe('interpretar compromisso: tipo', () => {
  it.each([
    ['reunião amanhã', 'reunião'], ['Reuniao amanha', 'reunião'], ['palestra amanhã', 'palestra'], ['curso amanhã', 'curso'],
    ['compromisso amanhã', 'compromisso'], ['audiência amanhã', 'compromisso'], ['lembrar amanhã', 'lembrete'], ['me lembra amanhã', 'lembrete'],
    ['lembrar da reunião amanhã', 'reunião'],
  ])('%s → %s', (frase, tipo) => expect(ler(frase, SABADO).tipo).toBe(tipo));

  it('o tipo forçado vale mesmo sem palavra de tipo', () => {
    expect(ler('DEM-FIC-0003 amanhã', SABADO, 'lembrete').tipo).toBe('lembrete');
  });
});

describe('interpretar compromisso: data', () => {
  it.each([
    ['reunião 10/12', '2026-12-10'],
    ['reunião 10/12/2027', '2027-12-10'],
    ['reunião 10/12/27', '2027-12-10'],
    ['reunião 10-12', '2026-12-10'],
    ['reunião 10 de dezembro', '2026-12-10'],
    ['reunião dia 10 de março', '2027-03-10'],
    ['reunião dia 10 de dezembro de 2027', '2027-12-10'],
    ['reunião hoje', '2026-11-21'],
    ['reunião amanhã', '2026-11-22'],
    ['reunião depois de amanhã', '2026-11-23'],
    ['reunião dia 21', '2026-11-21'],
    ['reunião dia 10', '2026-12-10'],
    ['reunião dia 31', '2026-12-31'],
    ['reunião segunda', '2026-11-23'],
    ['reunião na quarta-feira', '2026-11-25'],
    ['reunião sábado', '2026-11-28'],
    ['reunião na próxima sexta', '2026-11-27'],
    ['reunião domingo que vem', '2026-11-22'],
  ])('%s → %s', (frase, data) => expect(ler(frase, SABADO).data).toBe(data));

  it('sem ano, a data que já passou neste ano vira a do ano seguinte (virada do ano)', () => {
    const dezembro = new Date(2026, 11, 15, 9);
    expect(ler('reunião dia 10/01', dezembro).data).toBe('2027-01-10');
    expect(ler('reunião 10/12', dezembro).data).toBe('2027-12-10');
    expect(ler('reunião 15/12', dezembro).data).toBe('2026-12-15');
    expect(ler('reunião dia 5', dezembro).data).toBe('2027-01-05');
  });

  it('dia 31 pula os meses que não o têm', () => {
    expect(ler('reunião dia 31', new Date(2026, 10, 21)).data).toBe('2026-12-31');
    expect(ler('reunião dia 31', new Date(2027, 0, 31, 12)).data).toBe('2027-01-31');
    expect(ler('reunião dia 31', new Date(2027, 1, 2)).data).toBe('2027-03-31');
  });

  it('data inexistente pergunta', () => {
    expect(ler('reunião 31/02', SABADO)).toMatchObject({ data: null, problema: 'data-invalida', trecho: '31/02' });
    expect(ler('reunião 32/13/2027', SABADO)).toMatchObject({ data: null, problema: 'data-invalida' });
    expect(ler('reunião 29/02', SABADO)).toMatchObject({ data: '2028-02-29' });
  });

  it('data com ano que já passou pergunta', () => {
    expect(ler('reunião 10/11/2026', SABADO)).toMatchObject({ data: null, problema: 'data-passada' });
  });

  it('sem data pergunta', () => {
    expect(ler('reunião sobre licenciamento', SABADO)).toMatchObject({ data: null, problema: 'sem-data', assunto: 'licenciamento' });
  });
});

describe('interpretar compromisso: hora', () => {
  it.each([
    ['reunião amanhã às 14h', '14:00'], ['reunião amanhã 14h30', '14:30'], ['reunião amanhã às 14:30', '14:30'],
    ['reunião amanhã às 9', '09:00'], ['reunião amanhã 9h', '09:00'], ['reunião amanhã às 14 horas', '14:00'],
    ['reunião 10/12 às 8h15', '08:15'],
  ])('%s → %s', (frase, hora) => expect(ler(frase, SABADO).hora).toBe(hora));

  it('sem hora é o dia todo', () => {
    expect(ler('reunião dia 10/12', SABADO).hora).toBeUndefined();
  });

  it('a data não é confundida com hora, nem o dia com a hora', () => {
    expect(ler('reunião dia 10 às 14h', SABADO)).toMatchObject({ data: '2026-12-10', hora: '14:00' });
    expect(ler('reunião 10/12', SABADO).hora).toBeUndefined();
  });

  it('hora impossível pergunta; hora de hoje que já passou também', () => {
    expect(ler('reunião amanhã às 25h', SABADO)).toMatchObject({ problema: 'hora-invalida' });
    expect(ler('reunião hoje às 9h', SABADO)).toMatchObject({ data: '2026-11-21', problema: 'hora-passada' });
    expect(ler('reunião hoje às 11h', SABADO).problema).toBeUndefined();
  });
});

describe('interpretar compromisso: assunto e demanda', () => {
  it.each([
    ['reunião dia 10/12 sobre licenciamento', 'licenciamento'],
    ['reunião sobre licenciamento dia 10/12', 'licenciamento'],
    ['reunião de licenciamento amanhã às 14h', 'licenciamento'],
    ['palestra para o pessoal da fiscalização dia 10/12', 'pessoal da fiscalização'],
    ['curso de georreferenciamento 10 de dezembro', 'georreferenciamento'],
    ['lembrar de ligar para o João amanhã às 9h', 'ligar para o João'],
    ['reunião sobre o licenciamento do Rio Teles Pires 10/12', 'licenciamento do Rio Teles Pires'],
    ['reunião sobre prazo de outorga dia 10/12', 'prazo de outorga'],
    ['marcar compromisso Sinop dia 10/12', 'Sinop'],
    ['reunião 10/12', ''],
  ])('%s → assunto "%s"', (frase, assunto) => expect(ler(frase, SABADO).assunto).toBe(assunto));

  it('o assunto tem no máximo 120 caracteres', () => {
    expect(ler(`reunião 10/12 sobre ${'a'.repeat(300)}`, SABADO).assunto).toHaveLength(120);
  });

  it('o código DEM-FIC-… vira vínculo e sai do assunto', () => {
    expect(ler('reunião dia 10/12 sobre DEM-FIC-0003', SABADO)).toMatchObject({ demanda: 'DEM-FIC-0003', assunto: '' });
    expect(ler('lembrar dem fic 3 amanhã', SABADO, 'lembrete')).toMatchObject({ demanda: 'DEM-FIC-0003', assunto: '', data: '2026-11-22' });
    expect(ler('reunião 10/12 sobre licenciamento de DEM-FIC-0003', SABADO)).toMatchObject({ demanda: 'DEM-FIC-0003', assunto: 'licenciamento' });
  });
});

describe('a frase parece compromisso?', () => {
  it('tipo e data juntos sim; só um deles não; lembrar não conta', () => {
    expect(pareceCompromisso('reunião dia 10/12 sobre prazos', SABADO)).toBe(true);
    expect(pareceCompromisso('curso amanhã', SABADO)).toBe(true);
    expect(pareceCompromisso('reunião sobre licenciamento', SABADO)).toBe(false);
    expect(pareceCompromisso('prazos de amanhã', SABADO)).toBe(false);
    expect(pareceCompromisso('lembrar DEM-FIC-0003 amanhã', SABADO)).toBe(false);
    expect(pareceCompromisso('reunião 31/02', SABADO)).toBe(true);
  });
});
