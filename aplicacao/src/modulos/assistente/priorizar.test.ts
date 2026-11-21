import { describe, expect, it } from 'vitest';
import type { Demanda } from '../demandas/modelo.ts';
import { DIAS_VISTORIA_PROXIMA, PESOS, motivosDaDemanda, priorizarDemandas, proximaAcao, resumoDosMotivos } from './priorizar.ts';

// Sexta, 13/11/2026, 10h (horário local do teste). Dados fictícios.
const AGORA = new Date(2026, 10, 13, 10, 0, 0);
const LIMIAR = 3;
const iso = (a: number, m: number, d: number, h = 10) => new Date(a, m - 1, d, h, 0, 0).toISOString();

/** Demanda em dia: tarefa comum com prazo longe, responsável e ação recente. Nenhum sinal. */
const demanda = (o: Partial<Demanda> = {}): Demanda => ({
  id: 'DEM-FIC-0001',
  titulo: 'Demanda fictícia de teste',
  descricao: '',
  responsavel: 'Ana Teste',
  prioridade: 'Baixa',
  status: 'Em Andamento',
  criadaEm: AGORA.toISOString(),
  ultimaAcaoRelevante: AGORA.toISOString(),
  natureza: 'comum',
  prazo: '2026-12-30',
  ...o,
});

const sinais = (d: Demanda) => motivosDaDemanda(d, AGORA, LIMIAR).map((m) => m.sinal);

describe('priorizar: sinais por demanda', () => {
  it('demanda em dia não gera sinal nem entra na fila', () => {
    expect(sinais(demanda())).toEqual([]);
    expect(priorizarDemandas([demanda()], AGORA, LIMIAR)).toEqual([]);
  });

  it('concluída nunca pede atenção, mesmo vencida, parada e sem prazo', () => {
    const d = demanda({ status: 'Concluída', prazo: '2026-11-01', ultimaAcaoRelevante: iso(2026, 11, 1), responsavel: '' });
    expect(sinais(d)).toEqual([]);
    expect(priorizarDemandas([d], AGORA, LIMIAR)).toEqual([]);
  });

  it('vencida: pontos pelos dias úteis de atraso, com o texto da regra de prazo', () => {
    const [m] = motivosDaDemanda(demanda({ prazo: '2026-11-11' }), AGORA, LIMIAR);
    expect(m).toMatchObject({ sinal: 'vencida', pontos: PESOS.vencida.base + 2 * PESOS.vencida.porDia, texto: 'prazo: vencido há 2 dias úteis', natureza: 'inferência' });
  });

  it('o atraso pesa só até o teto, para uma demanda velha não esconder as demais', () => {
    const [m] = motivosDaDemanda(demanda({ prazo: '2026-06-01' }), AGORA, LIMIAR);
    expect(m.pontos).toBe(PESOS.vencida.base + PESOS.vencida.maxDias * PESOS.vencida.porDia);
  });

  it('prazo próximo: até 3 dias úteis, e vence hoje pesa mais que faltam 3', () => {
    const hoje = motivosDaDemanda(demanda({ prazo: '2026-11-13' }), AGORA, LIMIAR)[0];
    const terca = motivosDaDemanda(demanda({ prazo: '2026-11-17' }), AGORA, LIMIAR)[0];
    const quarta = motivosDaDemanda(demanda({ prazo: '2026-11-18' }), AGORA, LIMIAR)[0];
    expect(hoje).toMatchObject({ sinal: 'prazo-proximo', texto: 'prazo: vence hoje' });
    expect(terca).toMatchObject({ sinal: 'prazo-proximo', pontos: PESOS['prazo-proximo'].base + 3, texto: 'prazo: faltam 2 dias úteis' });
    expect(hoje.pontos).toBeGreaterThan(terca.pontos);
    expect(quarta.pontos).toBe(PESOS['prazo-proximo'].base);
    expect(sinais(demanda({ prazo: '2026-11-19' }))).toEqual([]);
  });

  it('parada: mais de N dias corridos sem ação relevante', () => {
    const d = demanda({ ultimaAcaoRelevante: iso(2026, 11, 9) });
    const [m] = motivosDaDemanda(d, AGORA, LIMIAR);
    expect(m).toMatchObject({ sinal: 'parada', pontos: PESOS.parada.base + 4, texto: 'parada há 4 dias sem ação relevante', natureza: 'inferência' });
    expect(sinais(demanda({ ultimaAcaoRelevante: iso(2026, 11, 10) }))).toEqual([]); // exatamente 3 dias: ainda não
  });

  it('bloqueada: diz o motivo e há quanto tempo, sem repetir o detalhe digitado', () => {
    const d = demanda({ bloqueio: { motivo: 'documento', desde: iso(2026, 11, 11), detalhe: 'Fulano de Tal ainda não enviou' } });
    const [m] = motivosDaDemanda(d, AGORA, LIMIAR);
    expect(m).toMatchObject({ sinal: 'bloqueada', texto: 'travada há 2 dias úteis: falta documento', natureza: 'fato' });
    const tudo = JSON.stringify(priorizarDemandas([d], AGORA, LIMIAR));
    expect(tudo).not.toContain('Fulano');
  });

  it('sem prazo e campos faltando são sinais separados', () => {
    expect(sinais(demanda({ prazo: undefined }))).toEqual(['sem-prazo']);
    const d = demanda({ natureza: 'demanda', tipo: 'gabinete' }); // demanda sem processo
    const [m] = motivosDaDemanda(d, AGORA, LIMIAR);
    expect(m).toMatchObject({ sinal: 'campos-faltando', texto: 'falta preencher: processo', natureza: 'fato' });
  });

  it('vistoria agendada entra quando faltam até 2 dias úteis; a distante, a passada e a sem data não', () => {
    const campo = (data: string) => demanda({ natureza: 'demanda', tipo: 'campo', processo: '0001/2026', vistoria: { data } });
    expect(DIAS_VISTORIA_PROXIMA).toBe(2);
    expect(motivosDaDemanda(campo('2026-11-16'), AGORA, LIMIAR)[0]).toMatchObject({ sinal: 'vistoria-proxima', texto: 'vistoria em 1 dia útil', pontos: PESOS['vistoria-proxima'].base });
    expect(motivosDaDemanda(campo('2026-11-13'), AGORA, LIMIAR)[0].texto).toBe('vistoria hoje');
    expect(sinais(campo('2026-11-30'))).toEqual([]);
    expect(sinais(campo('2026-11-10'))).toEqual([]);
    expect(sinais(demanda({ natureza: 'demanda', tipo: 'campo', processo: '0001/2026', vistoria: {} }))).toEqual([]);
  });

  it('prioridade só soma quando já existe outro sinal', () => {
    expect(sinais(demanda({ prioridade: 'Alta' }))).toEqual([]);
    const ms = motivosDaDemanda(demanda({ prioridade: 'Alta', prazo: '2026-11-11' }), AGORA, LIMIAR);
    expect(ms.map((m) => m.sinal)).toEqual(['vencida', 'prioridade']);
    expect(ms[1]).toMatchObject({ pontos: PESOS.prioridade.Alta, texto: 'prioridade alta' });
  });
});

describe('priorizar: próxima ação sugerida', () => {
  const acao = (o: Partial<Demanda>) => priorizarDemandas([demanda(o)], AGORA, LIMIAR)[0]?.proximaAcao;

  it('vencida e travada: cobrar o motivo; vencida sem bloqueio: decidir', () => {
    expect(acao({ prazo: '2026-11-11', bloqueio: { motivo: 'setor', desde: iso(2026, 11, 10) } })).toEqual({ tipo: 'cobrar', texto: 'Cobrar o retorno: aguardando outro setor.', natureza: 'sugestão' });
    expect(acao({ prazo: '2026-11-11' })).toMatchObject({ tipo: 'decidir', texto: 'Decidir: prorrogar o prazo ou concluir.' });
  });

  it('travada e no prazo: cobrar', () => {
    expect(acao({ bloqueio: { motivo: 'autuado', desde: iso(2026, 11, 12) } })).toMatchObject({ tipo: 'cobrar', texto: 'Cobrar o retorno: aguardando dados do autuado.' });
  });

  it('parada: a sugestão depende do status', () => {
    const velha = iso(2026, 11, 5);
    expect(acao({ status: 'Em Andamento', ultimaAcaoRelevante: velha })?.tipo).toBe('registrar');
    expect(acao({ status: 'Em Validação', ultimaAcaoRelevante: velha })?.tipo).toBe('concluir-validacao');
    expect(acao({ status: 'A Fazer', ultimaAcaoRelevante: velha })?.tipo).toBe('comecar');
  });

  it('prazo próximo, sem prazo e campos faltando', () => {
    expect(acao({ prazo: '2026-11-17' })).toMatchObject({ tipo: 'planejar' });
    expect(acao({ prazo: undefined })).toMatchObject({ tipo: 'definir-prazo', texto: 'Definir o prazo (sugestão: 10 dias úteis).' });
    expect(acao({ natureza: 'demanda', tipo: 'gabinete' })).toMatchObject({ tipo: 'preencher', texto: 'Preencher: processo.' });
  });

  it('vistoria próxima: preparar', () => {
    expect(acao({ natureza: 'demanda', tipo: 'campo', processo: '0001/2026', vistoria: { data: '2026-11-16' } })?.tipo).toBe('preparar-vistoria');
  });

  it('toda ação é sugestão e sem motivo não há ação', () => {
    expect(proximaAcao(demanda(), [])).toBeNull();
    expect(acao({ prazo: '2026-11-11' })?.natureza).toBe('sugestão');
  });
});

describe('priorizar: fila do dia', () => {
  it('ordena por pontos, e cada item soma exatamente os pontos dos seus motivos', () => {
    const lista = [
      demanda({ id: 'A', prazo: '2026-11-17' }),
      demanda({ id: 'B', prazo: '2026-11-11' }),
      demanda({ id: 'C', ultimaAcaoRelevante: iso(2026, 11, 5) }),
      demanda({ id: 'D', prazo: '2026-11-11', prioridade: 'Alta' }),
      demanda({ id: 'E' }),
    ];
    const fila = priorizarDemandas(lista, AGORA, LIMIAR);
    expect(fila.map((i) => i.id)).toEqual(['D', 'B', 'A', 'C']);
    for (const item of fila) expect(item.pontos).toBe(item.motivos.reduce((s, m) => s + m.pontos, 0));
  });

  it('empate: prazo mais próximo primeiro, sem prazo por último, depois o código', () => {
    const mesma = (id: string, prazo: string) => demanda({ id, prazo, ultimaAcaoRelevante: iso(2026, 11, 8), prioridade: 'Baixa' });
    const fila = priorizarDemandas([mesma('Z', '2026-12-30'), mesma('B', '2026-12-28'), mesma('A', '2026-12-28')], AGORA, LIMIAR);
    expect(fila.map((i) => i.id)).toEqual(['A', 'B', 'Z']);
  });

  it('demanda travada e vencida acumula os dois sinais, em vez de mostrar só o mais urgente', () => {
    const [item] = priorizarDemandas([demanda({ prazo: '2026-11-11', bloqueio: { motivo: 'campo', desde: iso(2026, 11, 10) } })], AGORA, LIMIAR);
    expect(item.motivos.map((m) => m.sinal)).toEqual(['vencida', 'bloqueada']);
    expect(resumoDosMotivos(item.motivos)).toBe('prazo: vencido há 2 dias úteis + travada há 3 dias úteis: depende de campo');
  });

  it('é pura: não altera as demandas recebidas', () => {
    const lista = [demanda({ prazo: '2026-11-11' }), demanda({ id: 'B', prazo: undefined })];
    const antes = JSON.stringify(lista);
    priorizarDemandas(lista, AGORA, LIMIAR);
    expect(JSON.stringify(lista)).toBe(antes);
  });

  it('respeita o limiar de inatividade gravado', () => {
    const d = demanda({ ultimaAcaoRelevante: iso(2026, 11, 9) });
    expect(priorizarDemandas([d], AGORA, 3)).toHaveLength(1);
    expect(priorizarDemandas([d], AGORA, 7)).toHaveLength(0);
  });
});
