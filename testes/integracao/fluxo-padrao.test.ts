// Fluxo padrão da seção 9.4 de ponta a ponta, com dados fictícios.

import { agentes, habilidades } from '../../backend/supabase/functions/_compartilhado/catalogo.ts';
import { executarFluxoPadrao } from '../../backend/supabase/functions/_compartilhado/fluxo-padrao.ts';
import { avaliarPadroes } from '../../backend/supabase/functions/_compartilhado/padroes-orquestracao.ts';

describe('fluxo padrão', () => {
  it('executa os agentes na ordem e libera o resultado pelo gate', () => {
    const ex = executarFluxoPadrao(habilidades, agentes);
    expect(ex.etapas.map((e) => `${e.agente}/${e.habilidade}`)).toEqual([
      'triagem/registrar-demanda',
      'triagem/classificar-demanda',
      'documental/extrair-documento',
      'analista/montar-checklist',
      'analista/conferir-requisitos',
      'prazos/avaliar-prazos',
      'redator/redigir-minuta',
      'revisor/validar-evidencias',
    ]);
    expect(ex.etapas.every((e) => e.estado === 'OK')).toBe(true);
    expect(ex.gate.aprovado).toBe(true);
    expect(ex.liberado).toBe(true);
    expect(ex.consolidado?.pendencias).toEqual(['RL-05', 'RL-06']);
    expect(ex.consolidado?.alertasPrazo).toEqual(['DEM-FIC-0002', 'DEM-FIC-0003']);
  });

  it('habilidade desativada interrompe o fluxo e o gate bloqueia', () => {
    const ex = executarFluxoPadrao(habilidades, agentes, new Set(['extrair-documento']));
    expect(ex.liberado).toBe(false);
    expect(ex.gate.aprovado).toBe(false);
    expect(ex.etapas.at(-1)?.estado).toBe('FALHA');
  });

  it('agente sem permissão para a habilidade é barrado', () => {
    const triagemComRedacao = agentes.map((a) => (a.id === 'redator' ? { ...a, habilidades: ['relatorio-executivo'] } : a));
    const ex = executarFluxoPadrao(habilidades, triagemComRedacao);
    const etapa = ex.etapas.find((e) => e.habilidade === 'redigir-minuta');
    expect(etapa?.estado).toBe('FALHA');
    expect(etapa?.detalhe).toContain('não tem permissão');
    expect(ex.liberado).toBe(false);
    expect(ex.tentativasRedacao).toBe(2);
  });
});

describe('padrões de orquestração A–F', () => {
  it('sem execução, nenhum padrão é dado como demonstrado', () => {
    expect(avaliarPadroes(null).every((p) => p.produto.situacao === 'NÃO DEMONSTRADO')).toBe(true);
  });

  it('após o fluxo: A, B, C, E e F demonstrados no produto; D não demonstrado; coluna de desenvolvimento pendente', () => {
    const padroes = avaliarPadroes(executarFluxoPadrao(habilidades, agentes));
    const situacoes = Object.fromEntries(padroes.map((p) => [p.letra, p.produto.situacao]));
    expect(situacoes).toEqual({
      A: 'DEMONSTRADO', B: 'DEMONSTRADO', C: 'DEMONSTRADO', D: 'NÃO DEMONSTRADO', E: 'DEMONSTRADO', F: 'DEMONSTRADO',
    });
    expect(padroes.every((p) => p.desenvolvimento.situacao === 'NÃO DEMONSTRADO')).toBe(true);
  });
});
