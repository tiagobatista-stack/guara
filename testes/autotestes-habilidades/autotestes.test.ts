// Executa o autoteste de cada habilidade do catálogo, o mesmo usado pela
// tela Saúde do sistema. Globais do Vitest (describe/it/expect) habilitados.

import { agentes, habilidades } from '../../backend/supabase/functions/_compartilhado/catalogo.ts';
import { executarAutoteste, executarVerificacao } from '../../backend/supabase/functions/_compartilhado/verificacao-saude.ts';

const IDS_CATALOGO_HABILIDADES = [
  'registrar-demanda', 'classificar-demanda', 'extrair-documento', 'montar-checklist', 'conferir-requisitos',
  'avaliar-prazos', 'redigir-minuta', 'validar-evidencias', 'relatorio-executivo', 'validar-pds',
];
const IDS_CATALOGO_AGENTES = ['triagem', 'documental', 'analista', 'prazos', 'redator', 'revisor'];

describe('catálogo (seções 9.2 e 9.3)', () => {
  it('contém exatamente as 10 habilidades do planejamento', () => {
    expect(habilidades.map((h) => h.contrato.id)).toEqual(IDS_CATALOGO_HABILIDADES);
  });
  it('contém exatamente os 6 agentes do planejamento', () => {
    expect(agentes.map((a) => a.id)).toEqual(IDS_CATALOGO_AGENTES);
  });
  it('o revisor não pode ser desativado', () => {
    expect(agentes.find((a) => a.id === 'revisor')?.desativavel).toBe(false);
  });
  it('só o redator tem permissão de rascunho', () => {
    expect(agentes.filter((a) => a.permissao === 'rascunho').map((a) => a.id)).toEqual(['redator']);
  });
});

describe('autoteste de cada habilidade', () => {
  for (const h of habilidades) {
    it(`${h.contrato.id}: ${h.autoteste.descricao}`, () => {
      const r = executarAutoteste(h);
      expect(r.detalhe).toContain('aprovado');
      expect(r.estado).toBe('OK');
      expect(r.executadoEm).not.toBeNull();
    });
  }
});

describe('verificação completa', () => {
  it('todos os agentes ficam OK quando todas as habilidades passam', () => {
    const rel = executarVerificacao(habilidades, agentes);
    expect(rel.resumo).toEqual({ ok: 10, falha: 0, total: 10 });
    for (const id of IDS_CATALOGO_AGENTES) expect(rel.agentes[id].estado).toBe('OK');
  });
});
