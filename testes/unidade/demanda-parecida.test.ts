// Aviso de demanda parecida (ideia do TOCA, `_parecida`): mesmo processo, mesmo título
// ou título digitado inteiro em UMA demanda em aberto.

import type { Demanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import { acharParecida, processosNoTexto, textoMotivo } from '../../aplicacao/src/modulos/demandas/parecida.ts';

const dem = (id: string, titulo: string, extra: Partial<Demanda> = {}): Demanda => ({
  id, titulo, descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer',
  criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T00:00:00.000Z', ...extra,
});

const LISTA = [
  dem('a', 'Analisar licença de operação', { descricao: 'Processo FIC-2026-0001.' }),
  dem('b', 'Resposta ofício 2'),
  dem('c', 'Entregar relatório mensal'),
  dem('d', 'Vistoria lote A'),
  dem('e', 'Vistoria lote B'),
  dem('f', 'Parecer técnico antigo', { status: 'Concluída', descricao: 'Processo FIC-2026-0009.' }),
];

describe('processosNoTexto', () => {
  it('reconhece SIGLA-… com dígitos e nº/ano; ignora poucos dígitos', () => {
    expect(processosNoTexto('ver fic-2026-0001 e SEMA-PRO-2024/12345, também 213456/2022.')).toEqual(['FIC-2026-0001', 'SEMA-PRO-2024/12345', '213456/2022']);
    expect(processosNoTexto('Relatório COVID-19 de 2026')).toEqual([]);
  });
});

describe('acharParecida', () => {
  it('mesmo processo na descrição de uma demanda em aberto', () => {
    const p = acharParecida({ titulo: 'Notificar empreendedor', descricao: 'Ref. FIC-2026-0001' }, LISTA);
    expect(p?.demanda.id).toBe('a');
    expect(textoMotivo(p!)).toBe('mesmo processo FIC-2026-0001');
  });
  it('processo de demanda concluída não conta', () => {
    expect(acharParecida({ titulo: 'Reabrir análise', descricao: 'FIC-2026-0009' }, LISTA)).toBeNull();
  });
  it('mesmo título, sem diferença de acento, maiúsculas ou espaços', () => {
    const p = acharParecida({ titulo: '  RESPOSTA   oficio 2 ', descricao: '' }, LISTA);
    expect(p?.demanda.id).toBe('b');
    expect(p?.motivo).toBe('titulo-igual');
  });
  it('palavras inteiras do título digitado em UMA demanda', () => {
    expect(acharParecida({ titulo: 'Relatório mensal', descricao: '' }, LISTA)?.demanda.id).toBe('c');
    expect(acharParecida({ titulo: 'Ofício 2', descricao: '' }, LISTA)?.demanda.id).toBe('b');
  });
  it('uma palavra só (fora conectivos) não basta; "lote C" não é "lote A"; duas candidatas não avisam', () => {
    expect(acharParecida({ titulo: 'Relatório e', descricao: '' }, LISTA)).toBeNull();
    expect(acharParecida({ titulo: 'Vistoria lote C', descricao: '' }, LISTA)).toBeNull();
    expect(acharParecida({ titulo: 'Vistoria lote', descricao: '' }, LISTA)).toBeNull();
  });
  it('título novo não avisa', () => {
    expect(acharParecida({ titulo: 'Organizar arquivo do setor', descricao: '' }, LISTA)).toBeNull();
  });
});
