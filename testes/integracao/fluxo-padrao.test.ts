// Fluxo padrão da seção 9.4 de ponta a ponta, com dados fictícios.

import { agentes, habilidades } from '../../backend/supabase/functions/_compartilhado/catalogo.ts';
import { executarFluxoPadrao } from '../../backend/supabase/functions/_compartilhado/fluxo-padrao.ts';
import { demandaSinteticaCerrado, demandasFicticias } from '../../dados-ficticios/demandas.ts';
import { MODO_DO_FLUXO } from '../../backend/supabase/functions/_compartilhado/fluxo-padrao.ts';
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

describe('fluxo recebe a demanda como parâmetro (P1 do relatório)', () => {
  const textoDaTrilha = (ex: ReturnType<typeof executarFluxoPadrao>) => JSON.stringify([ex.entrada, ex.consolidado]);

  it('VÁLIDO: dois casos sintéticos geram trilhas com os próprios dados, e o modo aparece na saída', () => {
    const a = executarFluxoPadrao(habilidades, agentes);
    const b = executarFluxoPadrao(habilidades, agentes, new Set(), demandaSinteticaCerrado);
    expect(a.liberado && b.liberado).toBe(true);
    expect(a.modo).toBe(MODO_DO_FLUXO);
    expect(b.modo).toContain('determinístico');
    expect(a.entrada).toMatchObject({ demanda: 'DEM-FIC-0001', processo: 'FIC-2026-0001', documento: 'DOC-FIC-0001' });
    expect(b.entrada).toMatchObject({ demanda: 'DEM-FIC-0101', processo: 'FIC-2026-0101', documento: 'DOC-FIC-0101', prazo: '2026-11-30' });
    expect(b.consolidado?.minuta[0]).toContain('FIC-2026-0101');
    expect(a.consolidado?.minuta[0]).toContain('FIC-2026-0001');
    // O caso B não herda nada do caso A (processo, interessado) e vice-versa.
    expect(textoDaTrilha(b)).not.toContain('FIC-2026-0001');
    expect(textoDaTrilha(a)).not.toContain('FIC-2026-0101');
    // Outorga apresentada no documento B: o resultado da conferência difere do caso A (RL-05 pendente só em A).
    expect(b.consolidado?.pendencias).toEqual(['RL-06']);
    expect(a.consolidado?.pendencias).toEqual(['RL-05', 'RL-06']);
  });

  it('FALHA: demanda sem documento fictício vinculado bloqueia a liberação pelo gate', () => {
    const ex = executarFluxoPadrao(habilidades, agentes, new Set(), demandasFicticias[1]);
    expect(ex.entrada.demanda).toBe('DEM-FIC-0002');
    expect(ex.entrada.documento).toBeNull();
    expect(ex.etapas.at(-1)).toMatchObject({ habilidade: 'extrair-documento', estado: 'FALHA' });
    expect(ex.gate.aprovado).toBe(false);
    expect(ex.liberado).toBe(false);
    expect(ex.modo).toBe(MODO_DO_FLUXO);
  });

  it('NEGADO: demanda não marcada como fictícia não entra no fluxo', () => {
    const real = { ...demandaSinteticaCerrado, ficticio: false } as unknown as typeof demandaSinteticaCerrado;
    const ex = executarFluxoPadrao(habilidades, agentes, new Set(), real);
    expect(ex.etapas).toHaveLength(1);
    expect(ex.etapas[0]).toMatchObject({ estado: 'FALHA', habilidade: 'verificar-modo-ficticio' });
    expect(ex.liberado).toBe(false);
    expect(ex.consolidado).toBeNull();
  });
});

describe('padrões de orquestração A–F', () => {
  it('sem execução, nenhum padrão é dado como demonstrado', () => {
    const semExecucao = avaliarPadroes(null);
    expect(semExecucao.every((p) => p.produto.situacao === 'NÃO DEMONSTRADO')).toBe(true);
    // A coluna de desenvolvimento é registro da rodada de 19/11, independente da execução do produto.
    expect(semExecucao.every((p) => p.desenvolvimento.situacao === 'DEMONSTRADO')).toBe(true);
  });

  it('após o fluxo: A, B, C, E e F demonstrados no produto; D não demonstrado; coluna de desenvolvimento conforme a rodada de 19/11', () => {
    const padroes = avaliarPadroes(executarFluxoPadrao(habilidades, agentes));
    const situacoes = Object.fromEntries(padroes.map((p) => [p.letra, p.produto.situacao]));
    expect(situacoes).toEqual({
      A: 'DEMONSTRADO', B: 'DEMONSTRADO', C: 'DEMONSTRADO', D: 'NÃO DEMONSTRADO', E: 'DEMONSTRADO', F: 'DEMONSTRADO',
    });
    expect(padroes.every((p) => p.desenvolvimento.situacao === 'DEMONSTRADO')).toBe(true);
    expect(padroes.every((p) => p.desenvolvimento.justificativa.includes('2026-11-19-orquestracao-a-d-e-f.md'))).toBe(true);
    expect(padroes.find((p) => p.letra === 'C')?.desenvolvimento.justificativa).toContain('APROVADO COM RESSALVAS');
    expect(padroes.find((p) => p.letra === 'D')?.produto.situacao).toBe('NÃO DEMONSTRADO');
  });
});
