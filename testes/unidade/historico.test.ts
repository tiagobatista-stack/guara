// Histórico da demanda: mudanças de status e do bloqueio (pedido do responsável, 14/11/2026).

import { criarArmazem } from '../../aplicacao/src/modulos/demandas/armazem.ts';
import { CHAVE_DEMANDAS, type Demanda, type EntradaDemanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import {
  confirmarBloqueio, criarDemanda, destravarDemanda, editarDemanda, ehDemandaValida, mudarStatus, paraEntrada, travarDemanda,
} from '../../aplicacao/src/modulos/demandas/regras.ts';
import { historicoRecente, registrar, textoEvento } from '../../aplicacao/src/modulos/demandas/historico.ts';
import { montarResumo } from '../../aplicacao/src/modulos/demandas/resumo.ts';

const T0 = '2026-11-13T12:00:00.000Z';
const T1 = '2026-11-14T12:00:00.000Z';
const T2 = '2026-11-16T12:00:00.000Z';
const T3 = '2026-11-17T12:00:00.000Z';
const ENTRADA: EntradaDemanda = {
  titulo: 'Analisar processo FIC-0001', descricao: '', responsavel: 'Equipe (fictícia)', prioridade: 'Média', status: 'A Fazer', prazo: '',
};
const nova = () => {
  const r = criarDemanda(ENTRADA, T0, () => 'd1');
  if (!r.ok) throw new Error('entrada inválida');
  return r.valor;
};

describe('eventos do histórico', () => {
  it('criar registra "criada" com o status inicial', () => {
    expect(nova().historico).toEqual([{ quando: T0, acao: 'criada', para: 'A Fazer' }]);
  });

  it('status e bloqueio viram eventos na ordem em que acontecem, com motivo e detalhe', () => {
    let d = mudarStatus(nova(), 'Em Andamento', T1);
    d = travarDemanda(d, 'documento', T1, 'Aguardando certidão (fictícia).')!;
    d = confirmarBloqueio(d, T2);
    d = travarDemanda(d, 'setor', T2)!;
    d = destravarDemanda(d, T3);
    expect(d.historico).toEqual([
      { quando: T0, acao: 'criada', para: 'A Fazer' },
      { quando: T1, acao: 'status', de: 'A Fazer', para: 'Em Andamento' },
      { quando: T1, acao: 'travou', motivo: 'documento', detalhe: 'Aguardando certidão (fictícia).' },
      { quando: T2, acao: 'ainda-travada', motivo: 'documento', detalhe: 'Aguardando certidão (fictícia).' },
      { quando: T2, acao: 'bloqueio-alterado', motivo: 'setor' },
      { quando: T3, acao: 'destravou', motivo: 'setor' },
    ]);
  });

  it('nada mudou, nada é registrado', () => {
    const d = travarDemanda(nova(), 'campo', T1)!;
    expect(travarDemanda(d, 'campo', T2)).toBe(d);
    expect(mudarStatus(d, 'A Fazer', T2)).toBe(d);
    expect(editarDemanda(d, paraEntrada(d), T2)).toEqual({ ok: true, valor: d });
    // Editar outro campo não é mudança de status.
    const r = editarDemanda(d, { ...paraEntrada(d), titulo: 'Analisar processo FIC-0001 (revisto)' }, T2);
    expect(r.ok && r.valor.historico).toEqual(d.historico);
  });

  it('concluir encerra o bloqueio e registra os dois eventos, pelo Kanban ou pelo formulário', () => {
    const travada = travarDemanda(nova(), 'documento', T1)!;
    const pelaMudanca = mudarStatus(travada, 'Concluída', T2);
    const r = editarDemanda(travada, { ...paraEntrada(travada), status: 'Concluída' }, T2);
    if (!r.ok) throw new Error('edição recusada');
    for (const d of [pelaMudanca, r.valor]) {
      expect(d).not.toHaveProperty('bloqueio');
      expect(d.historico!.slice(-2)).toEqual([
        { quando: T2, acao: 'status', de: 'A Fazer', para: 'Concluída' },
        { quando: T2, acao: 'bloqueio-encerrado', motivo: 'documento' },
      ]);
    }
  });

  it('texto de cada evento, do mais novo ao mais antigo', () => {
    let d = mudarStatus(nova(), 'Em Andamento', T1);
    d = travarDemanda(d, 'documento', T1, 'Aguardando certidão (fictícia).')!;
    expect(historicoRecente(d).map(textoEvento)).toEqual([
      'travou: falta documento · “Aguardando certidão (fictícia).”',
      'mudou o status: A Fazer → Em Andamento',
      'criada em A Fazer',
    ]);
  });

  it('acima de 500 eventos, os mais antigos saem', () => {
    let d: Demanda = nova();
    for (let i = 0; i < 510; i++) d = registrar(d, { quando: T1, acao: 'ainda-travada' });
    expect(d.historico).toHaveLength(500);
    expect(d.historico![0].acao).toBe('ainda-travada');
  });
});

describe('validação, privacidade e armazenamento', () => {
  beforeEach(() => localStorage.clear());

  it('demanda sem histórico (anterior a ele) continua válida; evento malformado invalida', () => {
    const { historico: _h, ...antiga } = nova();
    void _h;
    expect(ehDemandaValida(antiga)).toBe(true);
    expect(ehDemandaValida(nova())).toBe(true);
    const com = (evento: unknown) => ({ ...nova(), historico: [evento] });
    expect(ehDemandaValida(com({ quando: 'ontem', acao: 'criada' }))).toBe(false);
    expect(ehDemandaValida(com({ quando: T0, acao: 'apagou' }))).toBe(false);
    expect(ehDemandaValida(com({ quando: T0, acao: 'status', para: 'Arquivada' }))).toBe(false);
    expect(ehDemandaValida(com({ quando: T0, acao: 'travou', motivo: 'documento', detalhe: '' }))).toBe(false);
    expect(ehDemandaValida({ ...nova(), historico: 'criada' })).toBe(false);
  });

  it('o histórico não entra na tela compartilhada', () => {
    const d = travarDemanda(mudarStatus(nova(), 'Em Andamento', T1), 'documento', T1, 'Aguardando certidão (fictícia).')!;
    const texto = JSON.stringify(montarResumo(d, new Date(T1)));
    expect(texto).not.toContain('certidão');
    expect(texto).not.toContain('A Fazer');
  });

  it('o armazém grava os eventos e eles voltam ao recarregar', () => {
    const a = criarArmazem(localStorage, { agora: () => new Date(T0), gerarId: () => 'd1', exemplos: () => [] });
    a.criar(ENTRADA);
    a.mudarStatus('d1', 'Em Andamento');
    a.travar('d1', 'campo', 'Vistoria marcada (fictícia).');
    expect(localStorage.getItem(CHAVE_DEMANDAS)).toContain('"acao":"travou"');
    const b = criarArmazem(localStorage, { agora: () => new Date(T1), exemplos: () => [] });
    expect(b.obter().demandas[0].historico!.map((e) => e.acao)).toEqual(['criada', 'status', 'travou']);
  });
});
