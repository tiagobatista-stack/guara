import { describe, expect, it } from 'vitest';
import type { Demanda } from '../demandas/modelo.ts';
import { moduloDaRota, parametrosDaRota, rotaParaAbrirDemanda } from '../../nucleo/registro-modulos.ts';
import { respostaDeProrrogar } from './prorrogar.ts';
import { respostaDePrioridades } from './respostaPrioridades.ts';

const demandas = [{ id: 'DEM-FIC-0001' }] as unknown as Demanda[];

describe('prorrogar pela conversa', () => {
  it('não altera nada: orienta a informar a data no campo Prazo e oferece "Abrir demanda"', () => {
    const [m] = respostaDeProrrogar('DEM-FIC-0001', demandas, 'origem');
    expect(m.natureza).toBe('sugestão');
    expect(m.fonte).toContain('a decisão é sua');
    expect(m.texto).toBe('Para prorrogar DEM-FIC-0001, informe a nova data no campo Prazo da demanda.');
    expect(m.texto.toLowerCase()).not.toContain('adiar');
    expect(m.acoes).toEqual([{ rotulo: 'Abrir demanda', comando: 'abrir DEM-FIC-0001', rota: '#/demandas?abrir=DEM-FIC-0001&campo=prazo' }]);
  });

  it('sem código ou com código inexistente, não oferece botão de abrir', () => {
    expect(respostaDeProrrogar(null, demandas, 'o')[0].acoes).toBeUndefined();
    expect(respostaDeProrrogar('DEM-FIC-0099', demandas, 'o')[0].texto).toContain('Não encontrei DEM-FIC-0099');
  });
});

describe('rota com parâmetros', () => {
  it('moduloDaRota ignora o que vem depois do "?"', () => {
    expect(moduloDaRota('#/demandas?abrir=DEM-FIC-0001&campo=prazo')).toBe('demandas');
    expect(moduloDaRota('#/inexistente?x=1')).toBe('painel');
  });
  it('lê os parâmetros e monta a rota', () => {
    expect(parametrosDaRota(rotaParaAbrirDemanda('DEM-FIC-0001')).get('abrir')).toBe('DEM-FIC-0001');
    expect(parametrosDaRota('#/demandas').get('abrir')).toBeNull();
  });
});

describe('fila do dia: decidir prazo', () => {
  it('a sugestão "decidir" ganha "Abrir demanda"; outras sugestões não', () => {
    const base = { titulo: 'T', descricao: '', responsavel: 'R', prioridade: 'Média', status: 'A Fazer', criadaEm: '2026-11-01', anotacoes: [], natureza: 'Administrativa', tipo: 'Ofício' };
    const vencida = { ...base, id: 'DEM-FIC-0001', prazo: '2026-11-10' } as unknown as Demanda;
    const [, sug] = respostaDePrioridades([vencida], new Date(2026, 10, 21, 10), 5, {}, 'o');
    expect(sug.texto).toContain('prorrogar o prazo ou concluir');
    expect(sug.acoes?.[0]).toMatchObject({ rotulo: 'Abrir demanda', rota: '#/demandas?abrir=DEM-FIC-0001&campo=prazo' });
  });
});
