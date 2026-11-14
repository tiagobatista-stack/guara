// Feriados locais: validação, formulário, conversão para as contas e gravação no armazém.

import { criarArmazem } from '../../aplicacao/src/modulos/demandas/armazem.ts';
import { diasUteis, situacaoPrazo } from '../../aplicacao/src/modulos/alertas/dias-uteis.ts';
import {
  CHAVE_FERIADOS, FERIADOS_VAZIOS, LIMITE_FERIADOS, lerNovoFeriado, nacionaisComNome, paraAjuste, validarFeriados,
  type ConfiguracaoFeriados,
} from '../../aplicacao/src/modulos/alertas/feriados-locais.ts';

const ANIVERSARIO: ConfiguracaoFeriados = { extras: [{ data: '2026-11-17', nome: 'Aniversário do município (fictício)', anual: true }], remover: [], facultativos: false };

describe('lerNovoFeriado', () => {
  it('aceita data e nome, tirando espaços a mais', () => {
    expect(lerNovoFeriado(FERIADOS_VAZIOS, '2026-11-17', '  Aniversário   da cidade ', true)).toEqual({ ok: true, feriado: { data: '2026-11-17', nome: 'Aniversário da cidade', anual: true } });
  });
  it('recusa data inválida, nome vazio ou longo', () => {
    expect(lerNovoFeriado(FERIADOS_VAZIOS, '2026-02-30', 'X', false)).toEqual({ ok: false, erro: 'Informe uma data válida.' });
    expect(lerNovoFeriado(FERIADOS_VAZIOS, '2026-11-17', '   ', false)).toEqual({ ok: false, erro: 'Informe o nome do feriado.' });
    expect(lerNovoFeriado(FERIADOS_VAZIOS, '2026-11-17', 'x'.repeat(61), false).ok).toBe(false);
  });
  it('recusa repetido: mesma data, ou mesmo dia e mês quando um deles é anual', () => {
    expect(lerNovoFeriado(ANIVERSARIO, '2027-11-17', 'Outro', false)).toEqual({ ok: false, erro: 'Já existe um feriado local nesta data.' });
    const unico: ConfiguracaoFeriados = { ...FERIADOS_VAZIOS, extras: [{ data: '2026-12-08', nome: 'Recesso', anual: false }] };
    expect(lerNovoFeriado(unico, '2027-12-08', 'Recesso 2027', false).ok).toBe(true);
    expect(lerNovoFeriado(unico, '2026-12-08', 'Outro', false).ok).toBe(false);
  });
  it('recusa acima do limite', () => {
    const cheio: ConfiguracaoFeriados = { ...FERIADOS_VAZIOS, extras: Array.from({ length: LIMITE_FERIADOS }, (_, i) => ({ data: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, nome: `F${i}`, anual: false })) };
    expect(lerNovoFeriado(cheio, '2026-12-30', 'Mais um', false)).toEqual({ ok: false, erro: `Limite de ${LIMITE_FERIADOS} feriados locais.` });
  });
});

describe('validarFeriados', () => {
  it('aceita a forma certa e recusa a corrompida', () => {
    expect(validarFeriados(ANIVERSARIO)).toEqual(ANIVERSARIO);
    expect(validarFeriados({ extras: [], remover: [] })).toBeNull();
    expect(validarFeriados({ extras: [{ data: '17/11', nome: 'X', anual: true }], remover: [], facultativos: false })).toBeNull();
    expect(validarFeriados({ extras: [], remover: ['ontem'], facultativos: false })).toBeNull();
    expect(validarFeriados(null)).toBeNull();
  });
});

describe('paraAjuste e contas em dias úteis', () => {
  it('feriado anual vale do ano anterior a três à frente; 29/02 só nos bissextos', () => {
    expect(paraAjuste(ANIVERSARIO, 2026).extras).toEqual(['2025-11-17', '2026-11-17', '2027-11-17', '2028-11-17', '2029-11-17']);
    const bissexto: ConfiguracaoFeriados = { ...FERIADOS_VAZIOS, extras: [{ data: '2028-02-29', nome: 'X', anual: true }] };
    expect(paraAjuste(bissexto, 2027).extras).toEqual(['2028-02-29']);
  });
  it('feriado local e nacional removido mudam a contagem (sexta 13/11/2026 → segunda 23/11/2026)', () => {
    expect(diasUteis('2026-11-13', '2026-11-23')).toBe(5);
    expect(diasUteis('2026-11-13', '2026-11-23', paraAjuste(ANIVERSARIO, 2026))).toBe(4);
    expect(situacaoPrazo('2026-11-13', '2026-11-23', paraAjuste({ ...FERIADOS_VAZIOS, remover: ['2026-11-20'] }, 2026)).texto).toBe('faltam 6 dias úteis');
  });
  it('facultativos ligados: Carnaval conta', () => {
    expect(diasUteis('2026-02-13', '2026-02-18')).toBe(3);
    expect(diasUteis('2026-02-13', '2026-02-18', paraAjuste({ ...FERIADOS_VAZIOS, facultativos: true }, 2026))).toBe(1);
  });
});

describe('nacionaisComNome', () => {
  it('2026: Sexta-feira Santa em 03/04; com facultativos, Carnaval 16 e 17/02 e Corpus Christi 04/06', () => {
    const lista = nacionaisComNome(2026, true);
    expect(lista).toContainEqual({ data: '2026-04-03', nome: 'Sexta-feira Santa', facultativo: false });
    expect(lista.filter((n) => n.facultativo).map((n) => n.data)).toEqual(['2026-02-16', '2026-02-17', '2026-06-04']);
    expect(nacionaisComNome(2026, false)).toHaveLength(10);
  });
});

describe('armazém', () => {
  beforeEach(() => localStorage.clear());
  it('grava, relê ao recarregar e recusa configuração inválida sem gravar', () => {
    const a = criarArmazem(localStorage, { exemplos: () => [] });
    expect(a.definirFeriados(ANIVERSARIO)).toEqual({ ok: true });
    expect(criarArmazem(localStorage, { exemplos: () => [] }).obter().feriados).toEqual(ANIVERSARIO);
    const antes = localStorage.getItem(CHAVE_FERIADOS);
    expect(a.definirFeriados({ extras: [], remover: ['x'], facultativos: false }).ok).toBe(false);
    expect(localStorage.getItem(CHAVE_FERIADOS)).toBe(antes);
  });
  it('gravação ilegível: avisa, usa a lista vazia e não apaga nada até gravar de novo', () => {
    localStorage.setItem(CHAVE_FERIADOS, '{quebrado');
    const a = criarArmazem(localStorage, { exemplos: () => [] });
    expect(a.obter()).toMatchObject({ feriados: FERIADOS_VAZIOS, feriadosIlegiveis: true });
    expect(localStorage.getItem(CHAVE_FERIADOS)).toBe('{quebrado');
    a.definirFeriados(ANIVERSARIO);
    expect(a.obter().feriadosIlegiveis).toBe(false);
  });
});
