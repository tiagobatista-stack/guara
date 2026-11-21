import { describe, expect, it } from 'vitest';
import type { Demanda } from '../demandas/modelo.ts';
import { avisosDoDia, naturezaDoAviso, resumoDosAvisos } from './avisos.ts';

const AGORA = new Date(2026, 10, 13, 10, 0, 0); // sexta, 13/11/2026
const iso = (a: number, m: number, d: number) => new Date(a, m - 1, d, 10, 0, 0).toISOString();
const demanda = (o: Partial<Demanda> = {}): Demanda => ({
  id: 'DEM-FIC-0001', titulo: 'Demanda fictícia', descricao: '', responsavel: 'Ana Teste', prioridade: 'Baixa',
  status: 'Em Andamento', criadaEm: AGORA.toISOString(), ultimaAcaoRelevante: AGORA.toISOString(),
  natureza: 'comum', prazo: '2026-12-30', ...o,
});
const avisos = (...ds: Demanda[]) => avisosDoDia(ds, AGORA, 3);

describe('avisos do dia: um por demanda, com todos os sinais', () => {
  it('um sinal só: o texto e a situação seguem como antes', () => {
    const [a] = avisos(demanda({ prazo: '2026-11-11' }));
    expect(a).toEqual({ tipo: 'vencida', id: 'DEM-FIC-0001', titulo: 'Demanda fictícia', texto: 'Demanda fictícia: vencido há 2 dias úteis.', situacao: 'vencida|Em Andamento' });
  });

  it('vencida e parada: um aviso do tipo mais urgente, com os dois sinais no texto', () => {
    const lista = avisos(demanda({ prazo: '2026-11-11', ultimaAcaoRelevante: iso(2026, 11, 6) }));
    expect(lista).toHaveLength(1);
    expect(lista[0].tipo).toBe('vencida');
    expect(lista[0].texto).toBe('Demanda fictícia: vencido há 2 dias úteis; parada há 7 dia(s) sem ação relevante.');
    expect(lista[0].situacao).toBe('vencida+parada|Em Andamento');
  });

  it('prazo próximo e parada também se juntam; só parada continua só parada', () => {
    expect(avisos(demanda({ prazo: '2026-11-17', ultimaAcaoRelevante: iso(2026, 11, 6) }))[0]).toMatchObject({ tipo: 'prazo-proximo', situacao: 'prazo-proximo+parada|Em Andamento' });
    expect(avisos(demanda({ ultimaAcaoRelevante: iso(2026, 11, 6) }))[0]).toMatchObject({ tipo: 'parada', situacao: 'parada|Em Andamento' });
  });

  it('um sinal novo muda a situação (o "ciente" anterior deixa de valer)', () => {
    const antes = avisos(demanda({ prazo: '2026-11-11' }))[0].situacao;
    const depois = avisos(demanda({ prazo: '2026-11-11', ultimaAcaoRelevante: iso(2026, 11, 6) }))[0].situacao;
    expect(depois).not.toBe(antes);
  });

  it('concluída e demanda em dia não geram aviso; a ordem e a contagem seguem o tipo mais urgente', () => {
    const lista = avisos(
      demanda({ id: 'A', status: 'Concluída', prazo: '2026-11-01' }),
      demanda({ id: 'B' }),
      demanda({ id: 'C', ultimaAcaoRelevante: iso(2026, 11, 6) }),
      demanda({ id: 'D', prazo: '2026-11-11', ultimaAcaoRelevante: iso(2026, 11, 6) }),
    );
    expect(lista.map((a) => a.id)).toEqual(['D', 'C']);
    expect(resumoDosAvisos(lista)).toBe('1 vencida e 1 parada');
  });
});

describe('naturezaDoAviso', () => {
  it('prazo é fato; parada é inferência; os dois juntos dizem qual é qual', () => {
    expect(naturezaDoAviso({ situacao: 'vencida|A Fazer' })).toBe('fato');
    expect(naturezaDoAviso({ situacao: 'prazo-proximo|A Fazer' })).toBe('fato');
    expect(naturezaDoAviso({ situacao: 'parada|Em Andamento' })).toBe('inferência');
    expect(naturezaDoAviso({ situacao: 'vencida+parada|Em Andamento' })).toBe('fato (prazo) e inferência (parada)');
  });
});
