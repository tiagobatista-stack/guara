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

describe('interpretar compromisso: intervalo de datas', () => {
  it.each([
    ['curso de geoprocessamento de 10/12 a 12/12', { data: '2026-12-10', dataFim: '2026-12-12', assunto: 'geoprocessamento' }],
    ['curso sobre SIG 10/12 até 12/12', { data: '2026-12-10', dataFim: '2026-12-12', assunto: 'SIG' }],
    ['curso sobre SIG dias 10 a 12', { data: '2026-12-10', dataFim: '2026-12-12', assunto: 'SIG' }],
    ['curso sobre SIG de 10 a 12 de dezembro', { data: '2026-12-10', dataFim: '2026-12-12', assunto: 'SIG' }],
    ['viagem de 28/12 a 02/01', { data: '2026-12-28', dataFim: '2027-01-02' }],
    ['curso sobre SIG de 10/12/2027 a 12/12/2027', { data: '2027-12-10', dataFim: '2027-12-12' }],
  ])('%s', (frase, esperado) => expect(ler(frase, SABADO)).toMatchObject(esperado));

  it('um dia só não ganha dataFim; hora vale com intervalo', () => {
    expect(ler('curso 10/12 a 10/12', SABADO).dataFim).toBeUndefined();
    expect(ler('curso de 10/12 a 12/12 às 8h', SABADO)).toMatchObject({ data: '2026-12-10', dataFim: '2026-12-12', hora: '08:00' });
  });

  it('fim antes do início, longo demais ou inexistente é problema', () => {
    expect(ler('curso 12/12 a 10/12/2026', SABADO)).toMatchObject({ data: null, problema: 'intervalo-invalido' });
    expect(ler('curso 10/12/2026 a 10/12/2028', SABADO)).toMatchObject({ data: null, problema: 'intervalo-invalido' });
    expect(ler('curso 10/12 a 31/02', SABADO)).toMatchObject({ data: null, problema: 'data-invalida' });
    expect(ler('curso 10/11/2026 a 12/12/2026', SABADO)).toMatchObject({ data: null, problema: 'data-passada' });
  });
});

describe('interpretar compromisso: repetição', () => {
  it.each([
    ['reunião toda segunda às 9h sobre alinhamento', { repeticao: 'semanal', data: '2026-11-23', hora: '09:00', assunto: 'alinhamento' }],
    ['reunião todas as segundas', { repeticao: 'semanal', data: '2026-11-23' }],
    ['reunião toda semana', { repeticao: 'semanal', data: '2026-11-21' }],
    ['reunião semanalmente', { repeticao: 'semanal', data: '2026-11-21' }],
    ['reunião todos os dias às 14h', { repeticao: 'diaria', data: '2026-11-21', hora: '14:00' }],
    ['reunião todo dia', { repeticao: 'diaria', data: '2026-11-21' }],
    ['reunião diariamente', { repeticao: 'diaria', data: '2026-11-21' }],
    ['reunião nos dias úteis', { repeticao: 'dias_uteis', data: '2026-11-23' }],
    ['reunião de segunda a sexta', { repeticao: 'dias_uteis', data: '2026-11-23' }],
    ['reunião todo dia 10 sobre contas', { repeticao: 'mensal', data: '2026-12-10', assunto: 'contas' }],
    ['reunião todo mês', { repeticao: 'mensal', data: '2026-11-21' }],
    ['reunião todo mês dia 10', { repeticao: 'mensal', data: '2026-12-10' }],
    ['reunião mensalmente', { repeticao: 'mensal' }],
    ['reunião toda 1ª segunda', { repeticao: 'mensal_semana', data: '2026-12-07' }],
    ['reunião toda 2ª quinta do mês', { repeticao: 'mensal_semana', data: '2026-12-10' }],
    ['reunião todo ano 10/12', { repeticao: 'anual', data: '2026-12-10' }],
    ['reunião anualmente', { repeticao: 'anual' }],
  ])('%s', (frase, esperado) => expect(ler(frase, SABADO)).toMatchObject(esperado));

  it('hora de hoje que já passou empurra o início para a próxima ocorrência', () => {
    expect(ler('reunião todos os dias às 8h', SABADO)).toMatchObject({ repeticao: 'diaria', data: '2026-11-22' });
    expect(ler('reunião toda semana às 8h', SABADO)).toMatchObject({ repeticao: 'semanal', data: '2026-11-28' });
    expect(ler('reunião toda sexta às 8h', SABADO)).toMatchObject({ repeticao: 'semanal', data: '2026-11-27' });
  });

  it('"até" vira repetirAte (não intervalo); o ano é o da primeira data depois do início', () => {
    expect(ler('reunião toda segunda até 20/12', SABADO)).toMatchObject({ repeticao: 'semanal', data: '2026-11-23', repetirAte: '2026-12-20' });
    expect(ler('reunião todo dia 10 até 10 de março', SABADO)).toMatchObject({ repeticao: 'mensal', data: '2026-12-10', repetirAte: '2027-03-10' });
    expect(ler('reunião toda segunda até 20/12', SABADO).dataFim).toBeUndefined();
    expect(ler('reunião toda segunda até 10/11/2026', SABADO)).toMatchObject({ problema: 'intervalo-invalido' });
  });

  it('com data explícita a repetição parte dela', () => {
    expect(ler('reunião 25/11 toda semana', SABADO)).toMatchObject({ repeticao: 'semanal', data: '2026-11-25' });
  });

  it('sem repetição, nada de repeticao nem repetirAte', () => {
    const e = ler('reunião dia 10/12', SABADO);
    expect(e.repeticao).toBeUndefined();
    expect(e.repetirAte).toBeUndefined();
  });
});

describe('interpretar compromisso: semana do mês', () => {
  it.each([
    ['curso na 2ª semana de dezembro', { data: '2026-12-08', dataFim: '2026-12-14' }],
    ['curso na 5ª semana de novembro', { data: '2026-11-29', dataFim: '2026-11-30' }],
    ['reunião na 1ª segunda de dezembro', { data: '2026-12-07' }],
    ['reunião na 1ª segunda do mês', { data: '2026-12-07' }],
  ])('%s', (frase, esperado) => {
    const e = ler(frase, SABADO);
    expect(e).toMatchObject(esperado);
    expect(e.repeticao).toBeUndefined();
  });

  it('semana que já começou parte de hoje; se hoje é o último dia, é um dia só', () => {
    expect(ler('curso na 3ª semana do mês', SABADO)).toMatchObject({ data: '2026-11-21' });
    expect(ler('curso na 3ª semana do mês', SABADO).dataFim).toBeUndefined();
  });

  it('5ª semana que não existe é problema', () => {
    expect(ler('curso na 5ª semana de fevereiro de 2027', SABADO)).toMatchObject({ data: null, problema: 'intervalo-invalido' });
  });
});

describe('a frase parece compromisso? com intervalo e repetição', () => {
  it('reconhece as novas formas', () => {
    expect(pareceCompromisso('curso de 10/12 a 12/12', SABADO)).toBe(true);
    expect(pareceCompromisso('reunião toda segunda', SABADO)).toBe(true);
    expect(pareceCompromisso('curso 12/12 a 10/12/2026', SABADO)).toBe(true);
  });
});

describe('folgas do analista (compensação, licença premium, férias)', () => {
  it('reconhece o tipo, com e sem acento, e o período', () => {
    expect(ler('férias de 10/12 a 20/12', SABADO)).toMatchObject({ tipo: 'férias', data: '2026-12-10', dataFim: '2026-12-20' });
    expect(ler('compensação dia 10/12', SABADO)).toMatchObject({ tipo: 'compensação', data: '2026-12-10' });
    expect(ler('licença prêmio dia 10/12', SABADO).tipo).toBe('licença premium');
    expect(ler('licenca premium dia 10/12', SABADO).tipo).toBe('licença premium');
  });
  it('parece compromisso quando há tipo de folga e data', () => {
    expect(pareceCompromisso('férias dia 10/12', SABADO)).toBe(true);
    expect(pareceCompromisso('lembrar dia 10/12', SABADO)).toBe(false);
  });
});

it('reconhece "viagem a serviço"', () => {
  expect(ler('viagem a serviço de 10/12 a 12/12', SABADO)).toMatchObject({ tipo: 'viagem a serviço', data: '2026-12-10', dataFim: '2026-12-12' });
});
