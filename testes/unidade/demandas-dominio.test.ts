// Incremento 1 (P03): criar, listar, editar, mudar status, excluir, recarregar,
// dados inválidos e preservação de dados existentes. Cenários do PLANO.md §4.

import { criarArmazem } from '../../aplicacao/src/modulos/demandas/armazem.ts';
import { CHAVE_DEMANDAS, type EntradaDemanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import { filtrarDemandas, FILTROS_VAZIOS, validarEntrada } from '../../aplicacao/src/modulos/demandas/regras.ts';

const ENTRADA: EntradaDemanda = {
  titulo: 'Revisar checklist de laboratório',
  descricao: 'Exemplo sintético',
  responsavel: 'Equipe A',
  prioridade: 'Alta',
  status: 'Em Andamento',
  prazo: '2026-11-20',
};

function relogio(inicio = '2026-11-13T10:00:00.000Z') {
  let t = Date.parse(inicio);
  return { agora: () => new Date(t), avancar: (ms: number) => { t += ms; } };
}

function novoArmazem(storage: Storage, rel = relogio()) {
  let n = 0;
  return criarArmazem(storage, { agora: rel.agora, gerarId: () => `id-${++n}`, exemplos: () => [] });
}

beforeEach(() => localStorage.clear());

describe('armazém de demandas (localStorage)', () => {
  it('cria, lista e persiste após recarregar (cenário 1)', () => {
    const a = novoArmazem(localStorage);
    const r = a.criar(ENTRADA);
    expect(r.ok).toBe(true);
    expect(a.obter().demandas).toHaveLength(1);
    const recarregado = novoArmazem(localStorage);
    expect(recarregado.obter().demandas.map((d) => d.titulo)).toEqual([ENTRADA.titulo]);
  });

  it('recusa dados inválidos sem gravar (cenário 2)', () => {
    const a = novoArmazem(localStorage);
    const r = a.criar({ ...ENTRADA, titulo: 'ab', prazo: '2026-02-30' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erros ?? {})).toEqual(['titulo', 'prazo']);
    expect(a.obter().demandas).toHaveLength(0);
  });

  it('edição real atualiza a última ação; edição sem mudança não (cenários 3 e 4)', () => {
    const rel = relogio();
    const a = novoArmazem(localStorage, rel);
    a.criar(ENTRADA);
    const original = a.obter().demandas[0];
    rel.avancar(60_000);
    a.editar(original.id, ENTRADA);
    expect(a.obter().demandas[0].ultimaAcaoRelevante).toBe(original.ultimaAcaoRelevante);
    a.editar(original.id, { ...ENTRADA, titulo: 'Título alterado' });
    const editada = novoArmazem(localStorage).obter().demandas[0];
    expect(editada.titulo).toBe('Título alterado');
    expect(editada.ultimaAcaoRelevante).toBe('2026-11-13T10:01:00.000Z');
  });

  it('mudar status persiste e atualiza a última ação', () => {
    const rel = relogio();
    const a = novoArmazem(localStorage, rel);
    a.criar(ENTRADA);
    const id = a.obter().demandas[0].id;
    rel.avancar(5_000);
    a.mudarStatus(id, 'Concluída');
    const d = novoArmazem(localStorage).obter().demandas[0];
    expect(d.status).toBe('Concluída');
    expect(d.ultimaAcaoRelevante).toBe('2026-11-13T10:00:05.000Z');
  });

  it('exclui de forma persistida (cenário 6)', () => {
    const a = novoArmazem(localStorage);
    a.criar(ENTRADA);
    a.criar({ ...ENTRADA, titulo: 'Outra demanda' });
    a.excluir('id-1');
    expect(novoArmazem(localStorage).obter().demandas.map((d) => d.id)).toEqual(['id-2']);
  });

  it('exemplos só na primeira inicialização; dados existentes são preservados', () => {
    // Na entrada a coordenada é texto; na demanda gravada, números: o exemplo vem sem ela.
    const exemplo = { ...ENTRADA, coordenada: undefined, vistoria: undefined, id: 'EX-1', criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T00:00:00.000Z' };
    const comExemplos = () => criarArmazem(localStorage, { exemplos: () => [exemplo] });
    expect(comExemplos().obter().demandas.map((d) => d.id)).toEqual(['EX-1']);
    comExemplos().excluir('EX-1');
    expect(comExemplos().obter().demandas).toEqual([]);
  });

  it('armazenamento corrompido gera aviso, não é apagado e bloqueia gravações', () => {
    localStorage.setItem(CHAVE_DEMANDAS, '{isto não é json');
    const a = novoArmazem(localStorage);
    expect(a.obter().erroArmazenamento).toContain('JSON');
    expect(a.criar(ENTRADA).ok).toBe(false);
    expect(localStorage.getItem(CHAVE_DEMANDAS)).toBe('{isto não é json');
    expect(a.obter().conteudoBruto).toBe('{isto não é json');
  });

  it('restaurar exemplos resolve a corrupção', () => {
    localStorage.setItem(CHAVE_DEMANDAS, '[]');
    const a = criarArmazem(localStorage, { exemplos: () => [] });
    expect(a.obter().erroArmazenamento).not.toBeNull();
    expect(a.restaurarExemplos().ok).toBe(true);
    expect(a.obter().erroArmazenamento).toBeNull();
  });
});

describe('regras puras', () => {
  it('filtra por texto, status, prioridade e responsável combinados (cenário 8)', () => {
    const a = novoArmazem(localStorage);
    a.criar(ENTRADA);
    a.criar({ ...ENTRADA, titulo: 'Atualizar manual de atendimento', prioridade: 'Média', status: 'A Fazer', responsavel: 'Equipe B' });
    a.criar({ ...ENTRADA, titulo: 'Conferir evidências de testes', prioridade: 'Baixa', status: 'Em Validação', responsavel: 'Equipe C' });
    const lista = a.obter().demandas;
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, texto: 'MANUAL' }).map((d) => d.responsavel)).toEqual(['Equipe B']);
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, status: 'Em Validação', prioridade: 'Baixa', responsavel: 'Equipe C' })).toHaveLength(1);
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, status: 'Em Validação', prioridade: 'Alta' })).toHaveLength(0);
  });

  it('valida limites de tamanho', () => {
    expect(validarEntrada({ ...ENTRADA, titulo: 'x'.repeat(121), responsavel: 'y'.repeat(81) })).toEqual({
      titulo: 'O título pode ter no máximo 120 caracteres.',
      responsavel: 'O responsável pode ter no máximo 80 caracteres.',
    });
  });
});
