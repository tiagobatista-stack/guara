// Os três números da demanda (ideia do TOCA, `identificadores.py`): processo, SIMP e CNJ.
// Números FICTÍCIOS: ano 2099 e órgão 0000, que não existem em registros reais.

import { criarArmazem } from '../../aplicacao/src/modulos/demandas/armazem.ts';
import type { Demanda, EntradaDemanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import { digitosCnj, lerJudicial, lerProcesso, lerSimp } from '../../aplicacao/src/modulos/demandas/identificadores.ts';
import { ehDemandaValida, editarDemanda, filtrarDemandas, FILTROS_VAZIOS, paraEntrada, validarEntrada } from '../../aplicacao/src/modulos/demandas/regras.ts';
import { acharParecida, textoMotivo } from '../../aplicacao/src/modulos/demandas/parecida.ts';
import { demandasExemplo } from '../../aplicacao/src/modulos/demandas/exemplos.ts';

const DV = digitosCnj('0000001', '2099', '8', '11', '0000');
const CNJ = `0000001-${DV}.2099.8.11.0000`;
const CNJ_ERRADO = `0000001-${DV === '00' ? '01' : '00'}.2099.8.11.0000`;

const ENTRADA: EntradaDemanda = { titulo: 'Analisar resposta fictícia', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' };
const BASE: Demanda = {
  id: 'd1', titulo: 'Analisar resposta fictícia', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer',
  criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T00:00:00.000Z',
};

describe('leitura dos números', () => {
  it('processo: normaliza espaços e maiúsculas; exige um número; limita o tamanho', () => {
    expect(lerProcesso('  fic-2026-0001 ')).toEqual({ ok: true, valor: 'FIC-2026-0001' });
    expect(lerProcesso('orgao-pro-2026/0000001')).toEqual({ ok: true, valor: 'ORGAO-PRO-2026/0000001' });
    expect(lerProcesso('sem numero').ok).toBe(false);
    expect(lerProcesso('FIC;2026').ok).toBe(false);
    expect(lerProcesso(`FIC-${'1'.repeat(60)}`).ok).toBe(false);
  });
  it('SIMP: NNNNNN-NNN/AAAA, com ou sem a palavra SIMP antes', () => {
    expect(lerSimp('000001-001/2099')).toEqual({ ok: true, valor: '000001-001/2099' });
    expect(lerSimp('SIMP nº 000001-001/2099')).toEqual({ ok: true, valor: '000001-001/2099' });
    expect(lerSimp('1-001/2099').ok).toBe(false);
  });
  it('CNJ: confere os dígitos verificadores (mod 97) e aceita os 20 dígitos seguidos', () => {
    expect(lerJudicial(CNJ)).toEqual({ ok: true, valor: CNJ });
    expect(lerJudicial(CNJ.replace(/\D/g, ''))).toEqual({ ok: true, valor: CNJ });
    expect(lerJudicial(CNJ_ERRADO)).toEqual({ ok: false, erro: 'Os dígitos verificadores não conferem. Confira o número.' });
    expect(lerJudicial('123').ok).toBe(false);
  });
  it('CNJ: a regra (NNNNNNN AAAA J TR OOOO DD) mod 97 = 1 vale para o dígito calculado', () => {
    // NNNNNNN AAAA J TR OOOO DD
    expect(BigInt(`0000001` + `2099` + `8` + `11` + `0000` + DV) % 97n).toBe(1n);
  });
});

describe('demanda com os três números', () => {
  it('valida a entrada campo a campo, com a mensagem no campo certo', () => {
    const erros = validarEntrada({ ...ENTRADA, processo: 'sem número', simp: '123', judicial: CNJ_ERRADO });
    expect(Object.keys(erros).sort()).toEqual(['judicial', 'processo', 'simp']);
    expect(validarEntrada({ ...ENTRADA, processo: '', simp: '  ', judicial: '' })).toEqual({});
  });
  it('grava normalizado, apaga o campo esvaziado e só registra ação relevante se mudou', () => {
    localStorage.clear();
    const a = criarArmazem(localStorage, { agora: () => new Date('2026-11-14T10:00:00.000Z'), gerarId: () => 'n1', exemplos: () => [] });
    const r = a.criar({ ...ENTRADA, processo: 'fic-2026-0007', simp: 'SIMP 000001-001/2099', judicial: CNJ.replace(/\D/g, '') });
    expect(r.ok && r.demanda).toMatchObject({ processo: 'FIC-2026-0007', simp: '000001-001/2099', judicial: CNJ });
    const d = r.ok ? r.demanda! : BASE;
    const igual = editarDemanda(d, paraEntrada(d), '2026-11-15T10:00:00.000Z');
    expect(igual.ok && igual.valor).toBe(d);
    const semSimp = editarDemanda(d, { ...paraEntrada(d), simp: '' }, '2026-11-15T10:00:00.000Z');
    expect(semSimp.ok && semSimp.valor).not.toHaveProperty('simp');
    expect(semSimp.ok && semSimp.valor.ultimaAcaoRelevante).toBe('2026-11-15T10:00:00.000Z');
  });
  it('dados antigos sem os números continuam válidos; número gravado fora da forma normalizada é recusado', () => {
    expect(ehDemandaValida(BASE)).toBe(true);
    expect(ehDemandaValida({ ...BASE, processo: 'FIC-2026-0001', simp: '000001-001/2099', judicial: CNJ })).toBe(true);
    expect(ehDemandaValida({ ...BASE, processo: 'fic-2026-0001' })).toBe(false);
    expect(ehDemandaValida({ ...BASE, judicial: CNJ_ERRADO })).toBe(false);
    expect(ehDemandaValida({ ...BASE, simp: 123 })).toBe(false);
  });
  it('a pesquisa encontra pelo número', () => {
    const lista = [BASE, { ...BASE, id: 'd2', judicial: CNJ }];
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, texto: '2099.8.11' }).map((d) => d.id)).toEqual(['d2']);
  });
  it('aviso de parecida pelo SIMP ou pelo CNJ, dizendo o tipo do número', () => {
    const lista = [{ ...BASE, simp: '000001-001/2099' }, { ...BASE, id: 'd2', titulo: 'Outra fictícia', judicial: CNJ }];
    const pSimp = acharParecida({ titulo: 'Nova coisa', descricao: '', simp: 'SIMP 000001-001/2099' }, lista);
    expect(pSimp?.demanda.id).toBe('d1');
    expect(textoMotivo(pSimp!)).toBe('mesmo SIMP 000001-001/2099');
    const pCnj = acharParecida({ titulo: 'Nova coisa', descricao: '', judicial: CNJ.replace(/\D/g, '') }, lista);
    expect(textoMotivo(pCnj!)).toBe(`mesmo processo judicial ${CNJ}`);
  });
  it('os exemplos fictícios levam o número FIC- no campo processo, não na descrição', () => {
    const exemplos = demandasExemplo();
    expect(exemplos.every((d) => d.processo?.startsWith('FIC-') && !d.descricao.includes('FIC-'))).toBe(true);
    expect(exemplos.every(ehDemandaValida)).toBe(true);
  });
});
