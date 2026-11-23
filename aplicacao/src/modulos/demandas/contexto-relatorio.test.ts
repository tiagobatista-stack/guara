// Texto "Contexto do processo" (contexto-relatorio.ts): gabinete, campo sem operação e campo com ponto completo.

import { contextoDoRelatorio, escolherVinculo } from './contexto-relatorio.ts';
import type { Demanda } from './modelo.ts';
import type { Operacao, Ponto } from '../operacoes/modelo.ts';

const BASE: Demanda = {
  id: 'd1', titulo: 'Renovação de licença de operação — Piscicultura Rio Claro (FICTÍCIA)',
  descricao: 'Pedido de renovação de licença de operação para tanques escavados', responsavel: 'Equipe Licenciamento (fictícia)',
  prioridade: 'Alta', status: 'A Fazer', criadaEm: '2026-11-12T12:00:00.000Z', ultimaAcaoRelevante: '2026-11-21T12:00:00.000Z',
  prazo: '2026-11-18', processo: 'FIC-2026-0001',
  bloqueio: { motivo: 'documento', desde: '2026-11-17T12:00:00.000Z', detalhe: 'texto interno que não pode sair' },
  anotacoes: [{ id: 'a1', texto: 'anotação interna', feita: false } as never],
};

const PONTO: Ponto = {
  id: 'p1', coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Lugar Fictício', notas: '', demandas: ['d1'], situacao: 'vistoriado',
  viagem: 'vg-1', imovel: 'Fazenda Fictícia', car: 'MT-0000000-FIC', situacaoCar: 'com-car', areaHa: 12.5, dataVistoria: '2026-11-19',
  tipoDano: 'Desmatamento', caracterizacao: { 'A-1': 'Sim' },
};
const OPERACAO: Pick<Operacao, 'viagens'> = {
  viagens: [{ id: 'vg-1', equipe: 'Equipe A', integrantes: ['Analista Um (fictício)', 'Analista Dois (fictício)'], veiculos: ['Caminhonete'], notas: '' }],
};

describe('contextoDoRelatorio', () => {
  it('gabinete: só o 1º parágrafo; SIMP e judicial com o número; sem status, responsável, bloqueio nem anotações', () => {
    const { texto, faltam } = contextoDoRelatorio({ ...BASE, tipo: 'gabinete', simp: '000123/2026', judicial: '0000001-00.2026.8.11.0000' });
    expect(texto).toContain('Contexto do processo');
    expect(texto).toContain('Trata-se do Processo Administrativo nº FIC-2026-0001, em atendimento ao SIMP nº 000123/2026 e ao Processo Judicial nº 0000001-00.2026.8.11.0000, referente a renovação de licença');
    expect(texto).toContain('Objeto: Pedido de renovação de licença de operação para tanques escavados.');
    expect(texto).toContain('recebida nesta unidade em 12/11/2026, com prazo de atendimento até 18/11/2026.');
    expect(texto).not.toMatch(/vistoria/i);
    for (const proibido of ['A Fazer', 'Alta', 'Equipe Licenciamento', 'texto interno', 'anotação interna', 'falta documento']) expect(texto).not.toContain(proibido);
    expect(faltam).toEqual([]);
  });

  it('campo sem operação: marca entre colchetes o que falta', () => {
    const { texto, faltam } = contextoDoRelatorio({ ...BASE, tipo: 'campo', processo: undefined, prazo: undefined });
    expect(texto).toContain('nº [nº do processo administrativo]');
    expect(texto).toContain('até [prazo], e exige vistoria em campo.');
    expect(texto).toContain('A vistoria foi realizada em [data da vistoria], no município de [município], no imóvel [imóvel], inscrito no CAR sob nº [nº do CAR], com área de [área] ha, pela equipe técnica composta por [integrantes da equipe técnica].');
    expect(faltam).toEqual(['nº do processo administrativo', 'prazo', 'data da vistoria', 'município', 'imóvel', 'nº do CAR', 'área', 'integrantes da equipe técnica']);
  });

  it('campo com ponto completo: vistoria, equipe técnica e caracterização POP', () => {
    const { texto, faltam } = contextoDoRelatorio({ ...BASE, tipo: 'campo' }, { operacao: OPERACAO, ponto: PONTO });
    expect(texto).toContain('A vistoria foi realizada em 19/11/2026, no município de Lugar Fictício, no imóvel Fazenda Fictícia, inscrito no CAR sob nº MT-0000000-FIC, com área de 12,5 ha, nas coordenadas');
    expect(texto).toContain('(SIRGAS 2000), para verificação de desmatamento, pela equipe técnica composta por Analista Um (fictício) e Analista Dois (fictício).');
    expect(texto).toContain('Caracterização do dano (POP IBAMA');
    expect(faltam).toEqual([]);
  });

  it('data da vistoria da demanda vence a do ponto; sem CAR muda a frase; POP ativo e vazio vira marcador', () => {
    const ponto: Ponto = { ...PONTO, situacaoCar: 'sem-car', car: undefined, caracterizacao: undefined };
    const { texto, faltam } = contextoDoRelatorio({ ...BASE, tipo: 'campo', vistoria: { data: '2026-11-20' } }, { operacao: OPERACAO, ponto });
    expect(texto).toContain('realizada em 20/11/2026');
    expect(texto).toContain('no imóvel Fazenda Fictícia, sem inscrição no CAR, com área');
    expect(texto).toContain('[caracterização do dano (POP) não preenchida]');
    expect(faltam).toEqual(['caracterização do dano (POP) não preenchida']);
  });

  it('sigla no início do título não vira minúscula', () => {
    expect(contextoDoRelatorio({ ...BASE, titulo: 'SIMP sobre queimada (fictício)' }).texto).toContain('referente a SIMP sobre queimada');
  });

  it('escolherVinculo prefere o ponto vistoriado', () => {
    const a = { ponto: { situacao: 'planejado' as const } };
    const b = { ponto: { situacao: 'vistoriado' as const } };
    expect(escolherVinculo([a, b])).toBe(b);
    expect(escolherVinculo([a])).toBe(a);
    expect(escolherVinculo([])).toBeUndefined();
  });
});
