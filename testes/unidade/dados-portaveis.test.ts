// Exportação e importação JSON, limiar persistido e backup (P06; cenários 11 e 12).

import { CHAVE_BACKUP, CHAVE_CONFIGURACAO, criarArmazem } from '../../aplicacao/src/modulos/demandas/armazem.ts';
import type { Demanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import { exportarDados, validarImportacao } from '../../aplicacao/src/modulos/alertas/dados-portaveis.ts';

const D = (id: string, titulo = `Demanda ${id}`): Demanda => ({
  id, titulo, descricao: '', responsavel: 'Equipe', prioridade: 'Média', status: 'A Fazer',
  criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T00:00:00.000Z',
});
const AGORA = new Date('2026-11-13T12:00:00.000Z');

beforeEach(() => localStorage.clear());

describe('limiar de inatividade', () => {
  it('padrão 3, persistido e validado (1 a 365, inteiro)', () => {
    const a = criarArmazem(localStorage, { exemplos: () => [] });
    expect(a.obter().diasInatividade).toBe(3);
    expect(a.definirDiasInatividade(0).ok).toBe(false);
    expect(a.definirDiasInatividade(2.5).ok).toBe(false);
    expect(a.definirDiasInatividade(7).ok).toBe(true);
    expect(criarArmazem(localStorage, { exemplos: () => [] }).obter().diasInatividade).toBe(7);
    expect(JSON.parse(localStorage.getItem(CHAVE_CONFIGURACAO)!)).toEqual({ diasInatividade: 7 });
  });
});

describe('exportar e importar', () => {
  it('ida e volta preserva contagens e grava backup antes de substituir (cenário 11)', () => {
    const origem = criarArmazem(localStorage, { exemplos: () => [D('a'), D('b'), D('c')] });
    origem.definirDiasInatividade(5);
    const json = exportarDados(origem.obter().demandas, origem.obter().diasInatividade, AGORA);
    const v = validarImportacao(json);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.dados.demandas).toHaveLength(3);
    expect(v.dados.ficticio).toBe(true);

    origem.excluir('a');
    origem.excluir('b');
    expect(origem.obter().demandas).toHaveLength(1);

    expect(origem.importar(v.dados).ok).toBe(true);
    expect(origem.obter().demandas.map((d) => d.id)).toEqual(['a', 'b', 'c']);
    expect(origem.obter().diasInatividade).toBe(5);
    expect(origem.obter().temBackup).toBe(true);
    expect(JSON.parse(localStorage.getItem(CHAVE_BACKUP)!).conteudo).toContain('"c"');

    expect(origem.restaurarBackup().ok).toBe(true);
    expect(origem.obter().demandas.map((d) => d.id)).toEqual(['c']);
    expect(origem.obter().temBackup).toBe(false);
  });

  it.each([
    ['não é JSON', '{ruim', 'JSON válido'],
    ['formato errado', JSON.stringify({ formato: 'outro', versao: 1, demandas: [] }), 'Formato'],
    ['demanda inválida', JSON.stringify({ formato: 'guara-dados', versao: 1, ficticio: true, demandas: [{ id: 'x' }] }), 'inválida'],
    ['IDs duplicados', JSON.stringify({ formato: 'guara-dados', versao: 1, ficticio: true, demandas: [D('x'), D('x')] }), 'duplicados'],
    ['limiar inválido', JSON.stringify({ formato: 'guara-dados', versao: 1, ficticio: true, configuracao: { diasInatividade: 0 }, demandas: [] }), 'inatividade'],
    ['grande demais', 'x'.repeat(1_000_001), 'maior'],
  ])('recusa importação com %s sem alterar dados (cenário 12)', (_nome, texto, trecho) => {
    const a = criarArmazem(localStorage, { exemplos: () => [D('mantida')] });
    const r = validarImportacao(texto);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toContain(trecho);
    expect(a.obter().demandas.map((d) => d.id)).toEqual(['mantida']);
  });
});
