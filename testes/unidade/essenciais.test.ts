// Campos essenciais (ideia do TOCA, `perguntas.py`): o que falta preencher em cada demanda.

import type { Demanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import { camposQueFaltam, essenciaisAplicaveis, textoFalta } from '../../aplicacao/src/modulos/demandas/essenciais.ts';
import { filtrarDemandas, FILTROS_VAZIOS } from '../../aplicacao/src/modulos/demandas/regras.ts';

const BASE: Demanda = {
  id: 'd1', titulo: 'Analisar processo fictício', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer',
  criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T00:00:00.000Z',
};
const COMPLETA: Demanda = { ...BASE, id: 'c1', natureza: 'demanda', tipo: 'gabinete', prazo: '2026-11-30', responsavel: 'Equipe (fictícia)', processo: 'FIC-2026-0001' };

describe('essenciaisAplicaveis', () => {
  it('depende da natureza: comum pede menos; demanda pede o processo', () => {
    expect(essenciaisAplicaveis({ natureza: 'comum' })).toEqual(['prazo', 'responsavel']);
    expect(essenciaisAplicaveis({ natureza: 'demanda' })).toEqual(['tipo', 'prazo', 'responsavel', 'processo']);
    expect(essenciaisAplicaveis({})).toEqual(['natureza', 'tipo', 'prazo', 'responsavel']);
  });
});

describe('camposQueFaltam e textoFalta', () => {
  it('demanda nova sem nada: natureza, tipo, prazo e responsável', () => {
    expect(camposQueFaltam(BASE)).toEqual(['natureza', 'tipo', 'prazo', 'responsavel']);
    expect(textoFalta(BASE)).toBe('Falta: natureza, tipo, prazo, responsável.');
  });
  it('responsável só com espaços conta como vazio', () => {
    expect(camposQueFaltam({ ...COMPLETA, responsavel: '   ' })).toEqual(['responsavel']);
  });
  it('demanda completa e tarefa comum completa: nada falta', () => {
    expect(camposQueFaltam(COMPLETA)).toEqual([]);
    expect(textoFalta(COMPLETA)).toBeNull();
    expect(camposQueFaltam({ ...BASE, natureza: 'comum', prazo: '2026-11-30', responsavel: 'Equipe' })).toEqual([]);
  });
  it('demanda sem processo cobra o processo', () => {
    expect(textoFalta({ ...COMPLETA, processo: undefined })).toBe('Falta: processo.');
  });
  it('concluída não cobra nada', () => {
    expect(camposQueFaltam({ ...BASE, status: 'Concluída' })).toEqual([]);
  });
  it('o texto traz só o nome do campo, nunca o conteúdo', () => {
    expect(textoFalta({ ...COMPLETA, tipo: undefined })).toBe('Falta: tipo.');
    expect(textoFalta({ ...COMPLETA, tipo: undefined })).not.toContain('Equipe');
  });
});

describe('filtro de preenchimento', () => {
  it('faltando dados e completas; concluída conta como completa', () => {
    const lista = [BASE, COMPLETA, { ...BASE, id: 'feita', status: 'Concluída' as const }];
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, preenchimento: 'faltando' }).map((d) => d.id)).toEqual(['d1']);
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, preenchimento: 'completas' }).map((d) => d.id)).toEqual(['c1', 'feita']);
  });
});
