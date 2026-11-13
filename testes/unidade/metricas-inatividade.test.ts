// Métricas do dashboard e regra de inatividade (P05, P06; cenários 9 e 10 do PLANO.md).

import type { Demanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import { calcularMetricas, estaVencida } from '../../aplicacao/src/modulos/painel/metricas.ts';
import { estaInativa, listarInativas } from '../../aplicacao/src/modulos/alertas/inatividade.ts';

const AGORA = new Date(2026, 10, 13, 10, 0, 0); // 13/11/2026 10:00, fuso local

function demanda(p: Partial<Demanda>): Demanda {
  return {
    id: p.id ?? 'x',
    titulo: 'Demanda fictícia',
    descricao: '',
    responsavel: 'Equipe',
    prioridade: 'Média',
    status: 'A Fazer',
    criadaEm: '2026-11-01T00:00:00.000Z',
    ultimaAcaoRelevante: AGORA.toISOString(),
    ...p,
  };
}

describe('vencida (prazo antes do início de hoje, fuso local)', () => {
  it('prazo de ontem e não concluída = vencida; concluída nunca', () => {
    expect(estaVencida(demanda({ prazo: '2026-11-12', status: 'Em Andamento' }), AGORA)).toBe(true);
    expect(estaVencida(demanda({ prazo: '2026-11-12', status: 'Concluída' }), AGORA)).toBe(false);
  });
  it('prazo de hoje ou sem prazo = não vencida', () => {
    expect(estaVencida(demanda({ prazo: '2026-11-13' }), AGORA)).toBe(false);
    expect(estaVencida(demanda({}), AGORA)).toBe(false);
  });
});

describe('inatividade (dias corridos, estritamente maior que o limiar)', () => {
  const ha = (dias: number, extraMs = 0) => new Date(AGORA.getTime() - dias * 86_400_000 - extraMs).toISOString();
  it('exatamente 3 dias não é inativa; 3 dias e 1 ms é', () => {
    expect(estaInativa(demanda({ ultimaAcaoRelevante: ha(3) }), 3, AGORA)).toBe(false);
    expect(estaInativa(demanda({ ultimaAcaoRelevante: ha(3, 1) }), 3, AGORA)).toBe(true);
  });
  it('5 dias com limiar 3 = inativa; concluída nunca gera alerta', () => {
    expect(estaInativa(demanda({ ultimaAcaoRelevante: ha(5) }), 3, AGORA)).toBe(true);
    expect(estaInativa(demanda({ ultimaAcaoRelevante: ha(5), status: 'Concluída' }), 3, AGORA)).toBe(false);
  });
  it('ação relevante recente normaliza a demanda', () => {
    const lista = [demanda({ id: 'a', ultimaAcaoRelevante: ha(5) }), demanda({ id: 'b', ultimaAcaoRelevante: ha(0) })];
    expect(listarInativas(lista, 3, AGORA).map((d) => d.id)).toEqual(['a']);
  });
});

describe('calcularMetricas', () => {
  it('conta total, por status, vencidas e inativas', () => {
    const m = calcularMetricas(
      [
        demanda({ id: '1', status: 'A Fazer', prazo: '2026-11-10' }),
        demanda({ id: '2', status: 'Em Andamento', ultimaAcaoRelevante: '2026-11-01T00:00:00.000Z' }),
        demanda({ id: '3', status: 'Concluída', prazo: '2026-11-01', ultimaAcaoRelevante: '2026-10-01T00:00:00.000Z' }),
      ],
      AGORA,
      3,
    );
    expect(m.total).toBe(3);
    expect(m.porStatus).toEqual({ 'A Fazer': 1, 'Em Andamento': 1, 'Em Validação': 0, 'Concluída': 1 });
    expect(m.vencidas.map((d) => d.id)).toEqual(['1']);
    expect(m.inativas.map((d) => d.id)).toEqual(['2']);
  });
});
