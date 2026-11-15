import { beforeEach, describe, expect, it } from 'vitest';
import type { Aviso } from './avisos.ts';
import {
  adiarLembrete, CHAVE_LEMBRETES, limparLembretesSemAviso, marcarCiente, mostrarDeNovo, obterLembretes,
  opcoesDeAdiamento, separarAvisos, textoDoRetorno, validarLembretes,
} from './lembretes.ts';

const aviso = (id: string, tipo: Aviso['tipo'] = 'vencida', status = 'A Fazer'): Aviso =>
  ({ id, tipo, texto: `${id}: texto`, situacao: `${tipo}|${status}` });

// Sexta, 13/11/2026, 10h (horário local do teste).
const AGORA = new Date(2026, 10, 13, 10, 0, 0);

beforeEach(() => { localStorage.clear(); mostrarDeNovo('x'); localStorage.clear(); });

describe('lembretes: regras', () => {
  it('ciente esconde o aviso enquanto a situação for a mesma; muda o status ou o tipo, o aviso volta', () => {
    marcarCiente(aviso('D1'), AGORA);
    expect(separarAvisos([aviso('D1')], obterLembretes(), AGORA)).toEqual({ visiveis: [], ocultos: [{ aviso: aviso('D1'), motivo: 'ciente' }] });
    expect(separarAvisos([aviso('D1', 'vencida', 'Em Andamento')], obterLembretes(), AGORA).visiveis).toHaveLength(1);
    expect(separarAvisos([aviso('D1', 'parada')], obterLembretes(), AGORA).visiveis).toHaveLength(1);
  });

  it('adiar esconde só até a hora marcada; depois o lembrete volta sozinho', () => {
    const ate = new Date(2026, 10, 13, 14, 0, 0);
    adiarLembrete(aviso('D1'), ate);
    const antes = separarAvisos([aviso('D1')], obterLembretes(), AGORA);
    expect(antes.visiveis).toHaveLength(0);
    expect(antes.ocultos[0]).toMatchObject({ motivo: 'adiado', ate });
    expect(separarAvisos([aviso('D1')], obterLembretes(), ate).visiveis).toHaveLength(1);
  });

  it('opções de adiamento: as próximas 8h e 14h em dia útil, em ordem, com rótulo de hoje, amanhã ou dia da semana', () => {
    expect(opcoesDeAdiamento(AGORA).map((o) => [o.rotulo, o.ate.toISOString()])).toEqual([
      ['Hoje às 14h', new Date(2026, 10, 13, 14).toISOString()],
      ['Segunda às 8h', new Date(2026, 10, 16, 8).toISOString()], // pula sábado e domingo
    ]);
    const quinta = new Date(2026, 10, 12, 15, 30);
    expect(opcoesDeAdiamento(quinta).map((o) => o.rotulo)).toEqual(['Amanhã às 8h', 'Amanhã às 14h']);
    // Quinta 19/11 à tarde: sexta 20/11 é feriado nacional (Consciência Negra); cai na segunda 23/11.
    expect(opcoesDeAdiamento(new Date(2026, 10, 19, 15)).map((o) => o.rotulo)).toEqual(['Segunda às 8h', 'Segunda às 14h']);
    // Feriado local: segunda 16/11 removida pela configuração; cai na terça.
    expect(opcoesDeAdiamento(AGORA, { extras: ['2026-11-16'] }).map((o) => o.rotulo)).toEqual(['Hoje às 14h', 'Terça às 8h']);
  });

  it('texto do retorno: hoje, amanhã ou a data', () => {
    expect(textoDoRetorno(new Date(2026, 10, 13, 14), AGORA)).toBe('hoje às 14h');
    expect(textoDoRetorno(new Date(2026, 10, 14, 8), AGORA)).toBe('amanhã às 8h');
    expect(textoDoRetorno(new Date(2026, 10, 17, 8), AGORA)).toBe('terça às 8h');
    expect(textoDoRetorno(new Date(2026, 10, 24, 8), AGORA)).toBe('24/11 às 8h');
  });

  it('mostrar de novo apaga o registro; registros de demandas sem aviso são limpos', () => {
    marcarCiente(aviso('D1'), AGORA);
    marcarCiente(aviso('D2'), AGORA);
    mostrarDeNovo('D1');
    expect(Object.keys(obterLembretes())).toEqual(['D2']);
    limparLembretesSemAviso([aviso('D3')]);
    expect(obterLembretes()).toEqual({});
    expect(localStorage.getItem(CHAVE_LEMBRETES)).toBe('{}');
  });

  it('gravação inválida é descartada parte por parte', () => {
    expect(validarLembretes([1])).toEqual({});
    expect(validarLembretes({
      a: { situacao: 'vencida|A Fazer', cienteEm: '2026-11-13T10:00:00.000Z' },
      b: { situacao: 'x', adiadoAte: 'não é data' },
      c: { cienteEm: '2026-11-13T10:00:00.000Z' },
      d: 'texto',
    })).toEqual({ a: { situacao: 'vencida|A Fazer', cienteEm: '2026-11-13T10:00:00.000Z' } });
  });
});
