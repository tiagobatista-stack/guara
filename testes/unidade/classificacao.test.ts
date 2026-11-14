// Tipo (campo × gabinete) e natureza (demanda × tarefa comum) pelo título
// (ideia do TOCA, `tipo.py` e `demanda.py`), e os campos na demanda.

import type { Demanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import { deduzirNatureza, deduzirTipo, palavraNoTitulo, textoPorque } from '../../aplicacao/src/modulos/demandas/classificacao.ts';
import { ehDemandaValida, editarDemanda, filtrarDemandas, FILTROS_VAZIOS, paraEntrada, validarEntrada } from '../../aplicacao/src/modulos/demandas/regras.ts';

const BASE: Demanda = {
  id: 'd1', titulo: 'Vistoria fictícia', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer',
  criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T00:00:00.000Z',
};

describe('palavraNoTitulo', () => {
  it('começo de palavra, sem acento nem maiúsculas, devolvendo a palavra como está no título', () => {
    expect(palavraNoTitulo('Pedir INFORMAÇÕES ao setor', ['informac'])).toBe('INFORMAÇÕES');
    expect(palavraNoTitulo('Desinformação', ['informac'])).toBe('');
  });
  it('"$" no fim exige a palavra inteira', () => {
    expect(palavraNoTitulo('Ofício do MP sobre o lote', ['mp$'])).toBe('MP');
    expect(palavraNoTitulo('MPresa fictícia', ['mp$'])).toBe('');
  });
});

describe('deduzirTipo', () => {
  it('palavra de um só tipo decide', () => {
    expect(deduzirTipo('Vistoria no lote 4')).toEqual({ valor: 'campo', porque: 'Vistoria' });
    expect(deduzirTipo('Redigir resposta ao setor')).toEqual({ valor: 'gabinete', porque: 'Redigir' });
  });
  it('palavras dos dois tipos: a forte de gabinete vence; sem forte, dúvida', () => {
    expect(deduzirTipo('Informações sobre o embargo')).toEqual({ valor: 'gabinete', porque: 'Informações' });
    expect(deduzirTipo('Analisar vistoria')).toEqual({ valor: null, porque: '' });
  });
  it('nenhuma palavra: dúvida', () => {
    expect(deduzirTipo('Organizar arquivo').valor).toBeNull();
  });
});

describe('deduzirNatureza', () => {
  it('número de processo decide primeiro, mesmo com palavra de tarefa comum', () => {
    expect(deduzirNatureza('Reunião sobre o caso', { temNumero: true })).toEqual({ valor: 'demanda', porque: 'tem número de processo' });
  });
  it('palavra de tarefa comum vence a de demanda', () => {
    expect(deduzirNatureza('Reunião sobre o embargo')).toEqual({ valor: 'comum', porque: 'Reunião' });
    expect(deduzirNatureza('Parecer sobre licença')).toEqual({ valor: 'demanda', porque: 'Parecer' });
  });
  it('sem palavra: tipo campo é demanda; senão, dúvida', () => {
    expect(deduzirNatureza('Ir ao lote 4', { tipo: 'campo' })).toEqual({ valor: 'demanda', porque: 'é de campo' });
    expect(deduzirNatureza('Organizar arquivo').valor).toBeNull();
  });
  it('texto do porquê', () => {
    expect(textoPorque({ valor: 'campo', porque: 'Vistoria' })).toBe('pela palavra «Vistoria»');
    expect(textoPorque({ valor: 'demanda', porque: 'é de campo' })).toBe('é de campo');
  });
});

describe('tipo e natureza na demanda', () => {
  const entrada = { ...paraEntrada(BASE) };
  it('valores fora da lista são recusados; dados antigos sem os campos continuam válidos', () => {
    expect(validarEntrada({ ...entrada, tipo: 'outro' as never }).tipo).toBe('Tipo inválido.');
    expect(ehDemandaValida(BASE)).toBe(true);
    expect(ehDemandaValida({ ...BASE, tipo: 'campo', natureza: 'demanda' })).toBe(true);
    expect(ehDemandaValida({ ...BASE, tipo: 'Campo' })).toBe(false);
    expect(ehDemandaValida({ ...BASE, natureza: '' })).toBe(false);
  });
  it('editar grava, compara e apaga quando volta a "não definido"', () => {
    const r = editarDemanda(BASE, { ...entrada, tipo: 'campo', natureza: 'demanda' }, '2026-11-14T10:00:00.000Z');
    const d = r.ok ? r.valor : BASE;
    expect(d).toMatchObject({ tipo: 'campo', natureza: 'demanda', ultimaAcaoRelevante: '2026-11-14T10:00:00.000Z' });
    const igual = editarDemanda(d, paraEntrada(d), '2026-11-15T10:00:00.000Z');
    expect(igual.ok && igual.valor).toBe(d);
    const sem = editarDemanda(d, { ...paraEntrada(d), tipo: undefined }, '2026-11-15T10:00:00.000Z');
    expect(sem.ok && sem.valor).not.toHaveProperty('tipo');
  });
  it('filtros por tipo e natureza, inclusive "não definido"', () => {
    const lista: Demanda[] = [BASE, { ...BASE, id: 'c', tipo: 'campo' }, { ...BASE, id: 'g', tipo: 'gabinete', natureza: 'comum' }];
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, tipo: 'campo' }).map((d) => d.id)).toEqual(['c']);
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, tipo: 'sem' }).map((d) => d.id)).toEqual(['d1']);
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, natureza: 'comum' }).map((d) => d.id)).toEqual(['g']);
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, natureza: 'sem' }).map((d) => d.id)).toEqual(['d1', 'c']);
  });
});
