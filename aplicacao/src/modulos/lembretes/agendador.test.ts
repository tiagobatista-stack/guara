import { describe, expect, it } from 'vitest';
import { aplicarResposta, avancarRelogio, avisosNaTela, contagem, nivelDoAviso, proximaOcorrencia, textoQuando, type LembretePessoal } from './agendador.ts';
import type { Regra } from './interpretar.ts';

const em = (dia: number, h: number, m = 0) => new Date(2026, 10, dia, h, m);

type Campos = Partial<Omit<LembretePessoal, 'proximo' | 'fim'>> & { proximo: Date; regra?: Regra; fim?: Date };

function lembrete(campos: Campos): LembretePessoal {
  const { proximo, fim, ...resto } = campos;
  return {
    numero: 1, texto: 'tomar antibiótico (fictício)', criadoEm: em(15, 22).toISOString(), inicio: proximo.toISOString(),
    proximo: proximo.toISOString(), firme: true, remedio: false, estado: 'ativo', registro: [],
    ...(fim ? { fim: fim.toISOString() } : {}), ...resto,
  };
}

const remedio = () => lembrete({ proximo: em(16, 8), regra: { tipo: 'intervalo', minutos: 480 }, fim: em(23, 8), remedio: true });

describe('lembretes: próxima vez', () => {
  it('intervalo, fim exclusivo e contagem das doses (21 em 7 dias de 8 em 8 h)', () => {
    const l = remedio();
    expect(proximaOcorrencia(l, em(16, 8))).toEqual(em(16, 16));
    expect(proximaOcorrencia(l, em(16, 16))).toEqual(em(17, 0));
    expect(proximaOcorrencia(l, em(23, 0))).toBeNull();
    expect(contagem(l, em(17, 8))).toEqual({ esta: 4, total: 21 });
  });

  it('hábito (suave) fora da janela do dia passa para as 7h', () => {
    const agua = lembrete({ proximo: em(16, 21, 30), regra: { tipo: 'intervalo', minutos: 60 }, firme: false });
    expect(proximaOcorrencia(agua, em(16, 21, 30))).toEqual(em(17, 7));
  });

  it('dias úteis pulam fim de semana e feriado; semanal vai para o próximo dia marcado', () => {
    expect(proximaOcorrencia(lembrete({ proximo: em(19, 8), regra: { tipo: 'uteis' } }), em(19, 8))).toEqual(em(23, 8));
    expect(proximaOcorrencia(lembrete({ proximo: em(16, 8), regra: { tipo: 'semanal', dias: [1, 3] } }), em(16, 8))).toEqual(em(18, 8));
  });
});

describe('lembretes: relógio', () => {
  it('na hora, toca (disparo); antes, nada muda e a lista é a mesma', () => {
    const itens = [lembrete({ proximo: em(16, 9) })];
    expect(avancarRelogio(itens, em(16, 8, 59))).toBe(itens);
    const [l] = avancarRelogio(itens, em(16, 9, 0));
    expect(l.disparo).toEqual({ previsto: em(16, 9).toISOString(), desde: em(16, 9).toISOString() });
  });

  it('escalonamento do firme: 1 na hora, 2 depois de 10 min, 3 depois de 30 min; hábito fica no 1', () => {
    const [l] = avancarRelogio([lembrete({ proximo: em(16, 9) })], em(16, 9));
    expect(nivelDoAviso(l, em(16, 9, 9))).toBe(1);
    expect(nivelDoAviso(l, em(16, 9, 10))).toBe(2);
    expect(nivelDoAviso(l, em(16, 9, 30))).toBe(3);
    const [agua] = avancarRelogio([lembrete({ proximo: em(16, 9), firme: false })], em(16, 9));
    expect(nivelDoAviso(agua, em(16, 9, 9))).toBe(1);
  });

  it('hábito sem resposta em 10 min passa para a próxima vez, sem acumular', () => {
    const [tocou] = avancarRelogio([lembrete({ proximo: em(16, 9), regra: { tipo: 'intervalo', minutos: 60 }, firme: false })], em(16, 9));
    const [depois] = avancarRelogio([tocou], em(16, 9, 10));
    expect(depois.disparo).toBeUndefined();
    expect(depois.proximo).toBe(em(16, 10).toISOString());
    expect(depois.registro.map((r) => r.resultado)).toEqual(['sem-resposta']);
  });

  it('página fechada: firme dá UM aviso ("Era às…") da vez mais recente; as anteriores ficam perdidas', () => {
    const [l] = avancarRelogio([remedio()], em(17, 10));
    expect(l.disparo).toMatchObject({ previsto: em(17, 8).toISOString(), atrasado: true });
    expect(l.registro.map((r) => [r.previsto, r.resultado])).toEqual([
      [em(16, 8).toISOString(), 'perdido'], [em(16, 16).toISOString(), 'perdido'], [em(17, 0).toISOString(), 'perdido'],
    ]);
  });

  it('página fechada: hábito descarta e vai para a próxima vez futura', () => {
    const [l] = avancarRelogio([lembrete({ proximo: em(16, 9), regra: { tipo: 'intervalo', minutos: 60 }, firme: false })], em(16, 12, 30));
    expect(l.disparo).toBeUndefined();
    expect(l.proximo).toBe(em(16, 13).toISOString());
  });

  it('as doses não escorregam: "Tomei" às 8h40 mantém a próxima às 16h', () => {
    const [tocou] = avancarRelogio([remedio()], em(16, 8));
    const [l] = aplicarResposta([tocou], 1, { acao: 'feito' }, em(16, 8, 40));
    expect(l.proximo).toBe(em(16, 16).toISOString());
    expect(l.registro).toEqual([{ previsto: em(16, 8).toISOString(), resultado: 'feito', em: em(16, 8, 40).toISOString() }]);
  });

  it('"Mais 10 min" adia só esta vez; "Pular" registra e segue; lembrete único encerra no "Feito"', () => {
    const [tocou] = avancarRelogio([remedio()], em(16, 8));
    const [adiado] = aplicarResposta([tocou], 1, { acao: 'adiar', minutos: 10 }, em(16, 8, 2));
    expect(adiado).toMatchObject({ proximo: em(16, 8).toISOString(), adiadoAte: em(16, 8, 12).toISOString() });
    expect(avancarRelogio([adiado], em(16, 8, 11))[0].disparo).toBeUndefined();
    const [devolta] = avancarRelogio([adiado], em(16, 8, 12));
    expect(devolta.disparo?.previsto).toBe(em(16, 8).toISOString());
    expect(aplicarResposta([devolta], 1, { acao: 'pular' }, em(16, 8, 13))[0].registro[0].resultado).toBe('pulado');

    const [unico] = avancarRelogio([lembrete({ proximo: em(16, 9) })], em(16, 9));
    expect(aplicarResposta([unico], 1, { acao: 'feito' }, em(16, 9, 1))[0].estado).toBe('encerrado');
  });

  it('vez seguinte chegando sem resposta à anterior: a anterior fica sem resposta e toca a nova', () => {
    const [tocou] = avancarRelogio([remedio()], em(16, 8));
    const [l] = avancarRelogio([tocou], em(16, 16));
    expect(l.disparo?.previsto).toBe(em(16, 16).toISOString());
    expect(l.registro.map((r) => r.resultado)).toEqual(['sem-resposta']);
  });

  it('avisos na tela: firmes primeiro', () => {
    const itens = avancarRelogio([
      lembrete({ numero: 1, proximo: em(16, 9), firme: false }),
      lembrete({ numero: 2, proximo: em(16, 9, 1) }),
    ], em(16, 9, 1));
    expect(avisosNaTela(itens, em(16, 9, 1)).map((a) => a.lembrete.numero)).toEqual([2, 1]);
  });

  it('texto da hora: hoje com "daqui N min", amanhã com a data, depois só a data', () => {
    expect(textoQuando(em(15, 22, 51), em(15, 22, 50))).toBe('hoje às 22h51 (daqui 1 min)');
    expect(textoQuando(em(16, 9), em(15, 22, 50))).toBe('amanhã (seg 16/11) às 9h');
    expect(textoQuando(em(20, 9), em(15, 22, 50))).toBe('sex 20/11 às 9h');
  });
});
