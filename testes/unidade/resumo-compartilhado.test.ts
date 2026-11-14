// Resumo para tela compartilhada (ideia do TOCA, `resumo.py`): lista branca de campos,
// nenhum dado pessoal. Dados FICTÍCIOS.

import type { Demanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import { digitosCnj } from '../../aplicacao/src/modulos/demandas/identificadores.ts';
import { CAMPOS_DO_RESUMO, montarResumo, resumosEmAberto } from '../../aplicacao/src/modulos/demandas/resumo.ts';

const AGORA = new Date(2026, 10, 13, 12, 0); // sexta 13/11/2026, fuso local
const CNJ = `0000001-${digitosCnj('0000001', '2099', '8', '11', '0000')}.2099.8.11.0000`;
const COMPLETA: Demanda = {
  id: 'd1', titulo: 'Vistoria no lote 4', descricao: 'Contato: Fulana Fictícia, telefone 0000-0000',
  responsavel: 'Beltrano Fictício', prioridade: 'Alta', status: 'Em Andamento', prazo: '2026-11-23',
  criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-11T12:00:00.000Z',
  processo: 'FIC-2026-0001', simp: '000001-001/2099', judicial: CNJ, tipo: 'campo', natureza: 'demanda',
  bloqueio: { motivo: 'documento', desde: '2026-11-11T12:00:00.000Z' },
};

describe('montarResumo', () => {
  it('mostra os campos da lista branca, com textos prontos', () => {
    const r = montarResumo(COMPLETA, AGORA);
    expect(r.titulo).toBe('Vistoria no lote 4');
    expect(Object.fromEntries(r.linhas)).toEqual({
      Status: 'Em Andamento',
      Prioridade: 'Alta',
      Prazo: '23/11/2026 · faltam 5 dias úteis',
      Tipo: '🚙 Campo',
      Natureza: 'Demanda',
      Andamento: 'em andamento · última ação há 2 dias',
      Bloqueio: '⛔ travada há 2 dias úteis: falta documento',
      Processo: 'FIC-2026-0001',
      SIMP: 'tem (número fora do resumo)',
      'Processo judicial': 'tem (número fora do resumo)',
    });
  });
  it('nunca leva responsável, descrição, números do MP e judicial, nem campos desconhecidos', () => {
    const comExtra = { ...COMPLETA, telefone: '0000-0000', cpf: '000.000.000-00' } as Demanda;
    const texto = JSON.stringify(montarResumo(comExtra, AGORA));
    for (const proibido of ['Beltrano', 'Fulana', '0000-0000', '000.000.000-00', '000001-001/2099', CNJ]) {
      expect(texto).not.toContain(proibido);
    }
  });
  it('a lista branca não inclui responsável nem descrição', () => {
    expect(CAMPOS_DO_RESUMO).not.toContain('responsavel');
    expect(CAMPOS_DO_RESUMO).not.toContain('descricao');
  });
  it('sem prazo e sem campos opcionais: só o básico', () => {
    const r = montarResumo({ ...COMPLETA, status: 'A Fazer', prazo: undefined, processo: undefined, simp: undefined, judicial: undefined, tipo: undefined, natureza: undefined, bloqueio: undefined }, AGORA);
    expect(r.linhas).toEqual([['Status', 'A Fazer'], ['Prioridade', 'Alta'], ['Prazo', 'sem prazo']]);
  });
});

describe('resumosEmAberto', () => {
  it('tira as concluídas e ordena pelo prazo, sem prazo por último', () => {
    const lista: Demanda[] = [
      { ...COMPLETA, id: 'sem', prazo: undefined },
      { ...COMPLETA, id: 'tarde', prazo: '2026-12-10' },
      { ...COMPLETA, id: 'feita', status: 'Concluída' },
      { ...COMPLETA, id: 'cedo', prazo: '2026-11-16' },
    ];
    expect(resumosEmAberto(lista, AGORA).map((r) => r.id)).toEqual(['cedo', 'tarde', 'sem']);
  });
});
