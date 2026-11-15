import { criarDemanda, editarDemanda, ehDemandaValida, filtrarDemandas, FILTROS_VAZIOS, paraEntrada, validarEntrada } from '../../aplicacao/src/modulos/demandas/regras.ts';
import { listarSemVistoria, situacaoVistoria, textoVistoria } from '../../aplicacao/src/modulos/demandas/vistoria.ts';
import { camposQueFaltam } from '../../aplicacao/src/modulos/demandas/essenciais.ts';
import { exportarDados, validarImportacao } from '../../aplicacao/src/modulos/alertas/dados-portaveis.ts';
import { montarResumo } from '../../aplicacao/src/modulos/demandas/resumo.ts';
import type { Demanda, EntradaDemanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';

const T0 = '2026-11-15T12:00:00.000Z';
const BASE: EntradaDemanda = { titulo: 'Vistoria em área de campo', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '', tipo: 'campo' };
const criar = (e: Partial<EntradaDemanda>, id = 'd1'): Demanda => {
  const r = criarDemanda({ ...BASE, ...e }, T0, () => id);
  if (!r.ok) throw new Error(JSON.stringify(r.erros));
  return r.valor;
};

describe('vistoria: regra para tipo campo', () => {
  it('exige data ou "em aberto" na demanda de campo', () => {
    expect(validarEntrada(BASE).vistoria).toBe('Informe a data da vistoria ou marque como vistoria em aberto.');
  });
  it('recusa data inválida ou ausente quando escolheu informar a data', () => {
    expect(validarEntrada({ ...BASE, vistoria: 'data', vistoriaData: '2026-02-30' }).vistoriaData).toBe('Informe uma data válida para a vistoria.');
    expect(validarEntrada({ ...BASE, vistoria: 'data' }).vistoriaData).toBeDefined();
  });
  it('aceita data válida e "em aberto"', () => {
    expect(validarEntrada({ ...BASE, vistoria: 'data', vistoriaData: '2026-12-12' })).toEqual({});
    expect(validarEntrada({ ...BASE, vistoria: 'aberta' })).toEqual({});
  });
  it.each([{ tipo: 'gabinete' as const }, { tipo: undefined }])('não exige nada fora do campo (%o)', (e) => {
    expect(validarEntrada({ ...BASE, ...e })).toEqual({});
  });
  it('fora do campo a vistoria informada é descartada', () => {
    expect(criar({ tipo: 'gabinete', vistoria: 'data', vistoriaData: '2026-12-12' })).not.toHaveProperty('vistoria');
  });
});

describe('vistoria na demanda', () => {
  it('grava data ou objeto vazio (em aberto)', () => {
    expect(criar({ vistoria: 'data', vistoriaData: '2026-12-12' }).vistoria).toEqual({ data: '2026-12-12' });
    expect(criar({ vistoria: 'aberta' }).vistoria).toEqual({});
  });
  it('editar: encaixar numa data, voltar para aberta e ida e volta pelo formulário', () => {
    const d = criar({ vistoria: 'aberta' });
    const r = editarDemanda(d, { ...paraEntrada(d), vistoria: 'data', vistoriaData: '2026-12-01' }, '2026-11-16T12:00:00.000Z');
    expect(r.ok && r.valor.vistoria).toEqual({ data: '2026-12-01' });
    if (!r.ok) return;
    expect(paraEntrada(r.valor)).toMatchObject({ vistoria: 'data', vistoriaData: '2026-12-01' });
    const volta = editarDemanda(r.valor, { ...paraEntrada(r.valor), vistoria: 'aberta' }, '2026-11-17T12:00:00.000Z');
    expect(volta.ok && volta.valor.vistoria).toEqual({});
  });
  it('editar sem mudar a vistoria não conta como ação relevante', () => {
    const d = criar({ vistoria: 'data', vistoriaData: '2026-12-12' });
    const r = editarDemanda(d, paraEntrada(d), '2026-11-20T12:00:00.000Z');
    expect(r).toEqual({ ok: true, valor: d });
  });
  it('mudar de campo para gabinete remove a vistoria', () => {
    const d = criar({ vistoria: 'aberta' });
    const r = editarDemanda(d, { ...paraEntrada(d), tipo: 'gabinete' }, '2026-11-16T12:00:00.000Z');
    expect(r.ok && r.valor).not.toHaveProperty('vistoria');
  });
  it('ehDemandaValida aceita as formas gravadas e recusa as inválidas', () => {
    const d = criar({ vistoria: 'data', vistoriaData: '2026-12-12' });
    expect(ehDemandaValida(d)).toBe(true);
    expect(ehDemandaValida({ ...d, vistoria: {} })).toBe(true);
    expect(ehDemandaValida({ ...d, vistoria: { data: '2026-13-01' } })).toBe(false);
    expect(ehDemandaValida({ ...d, vistoria: { data: 5 } })).toBe(false);
    expect(ehDemandaValida({ ...d, vistoria: { outra: 1 } })).toBe(false);
    expect(ehDemandaValida({ ...d, vistoria: 'aberta' })).toBe(false);
  });
  it('ida e volta do backup, e fora da tela compartilhada', () => {
    const d = criar({ vistoria: 'data', vistoriaData: '2026-12-12' });
    const r = validarImportacao(exportarDados([d], 3, new Date(T0)));
    expect(r.ok && r.dados.demandas[0].vistoria).toEqual({ data: '2026-12-12' });
    expect(JSON.stringify(montarResumo(d, new Date(T0)))).not.toContain('2026-12-12');
  });
});

describe('vistoria: situação, lista e filtro', () => {
  const agendada = criar({ vistoria: 'data', vistoriaData: '2026-12-12' }, 'a');
  const aberta = criar({ vistoria: 'aberta' }, 'b');
  const antiga: Demanda = { ...criar({ vistoria: 'aberta' }, 'c'), criadaEm: '2026-11-01T12:00:00.000Z' };
  delete (antiga as Partial<Demanda>).vistoria;
  const gabinete = criar({ tipo: 'gabinete' }, 'e');
  const concluida: Demanda = { ...criar({ vistoria: 'aberta' }, 'f'), status: 'Concluída' };
  const todas = [agendada, aberta, antiga, gabinete, concluida];

  it('situação por demanda', () => {
    expect([agendada, aberta, antiga, gabinete].map((d) => situacaoVistoria(d))).toEqual(['agendada', 'aberta', 'nao-informada', null]);
    expect([agendada, aberta, antiga, gabinete].map((d) => textoVistoria(d))).toEqual(['12/12/2026', 'em aberto', 'não informada', null]);
  });
  it('lista só as de campo abertas sem data, da mais antiga para a mais nova', () => {
    expect(listarSemVistoria(todas).map((d) => d.id)).toEqual(['c', 'b']);
  });
  it('filtro "com data" e "em aberto"', () => {
    expect(filtrarDemandas(todas, { ...FILTROS_VAZIOS, vistoria: 'agendada' }).map((d) => d.id)).toEqual(['a']);
    expect(filtrarDemandas(todas, { ...FILTROS_VAZIOS, vistoria: 'sem-data' }).map((d) => d.id)).toEqual(['b', 'c', 'f']);
  });
  it('campos essenciais: só falta "vistoria" quando nunca foi informada', () => {
    expect(camposQueFaltam({ ...aberta, prazo: '2026-12-01', responsavel: 'x', natureza: 'comum' })).toEqual([]);
    expect(camposQueFaltam({ ...antiga, prazo: '2026-12-01', responsavel: 'x', natureza: 'comum' })).toEqual(['vistoria']);
  });
});

describe('vistoria: encaixada em operação', () => {
  const aberta = criar({ vistoria: 'aberta' }, 'b');
  const agendada = criar({ vistoria: 'data', vistoriaData: '2026-12-12' }, 'a');
  const gabinete = criar({ tipo: 'gabinete' }, 'g');
  const encaixadas = new Set(['a', 'b', 'g']);

  it('em operação vale para quem não tem data; a data específica vence; fora do campo continua sem vistoria', () => {
    expect(situacaoVistoria(aberta, encaixadas)).toBe('em-operacao');
    expect(textoVistoria(aberta, encaixadas)).toBe('em operação (data a registrar)');
    expect(situacaoVistoria(agendada, encaixadas)).toBe('agendada');
    expect(situacaoVistoria(gabinete, encaixadas)).toBeNull();
    expect(situacaoVistoria(aberta)).toBe('aberta');
  });
  it('listarSemVistoria desconta as encaixadas', () => {
    const outra = criar({ vistoria: 'aberta' }, 'c');
    expect(listarSemVistoria([aberta, outra], encaixadas).map((d) => d.id)).toEqual(['c']);
    expect(listarSemVistoria([aberta, outra]).map((d) => d.id)).toEqual(['b', 'c']);
  });
  it('filtro "sem-encaixe" tira as encaixadas; "sem-data" as mantém', () => {
    const outra = criar({ vistoria: 'aberta' }, 'c');
    const todas = [agendada, aberta, outra];
    expect(filtrarDemandas(todas, { ...FILTROS_VAZIOS, vistoria: 'sem-encaixe' }, encaixadas).map((d) => d.id)).toEqual(['c']);
    expect(filtrarDemandas(todas, { ...FILTROS_VAZIOS, vistoria: 'sem-data' }, encaixadas).map((d) => d.id)).toEqual(['b', 'c']);
    expect(filtrarDemandas(todas, { ...FILTROS_VAZIOS, vistoria: 'agendada' }, encaixadas).map((d) => d.id)).toEqual(['a']);
  });
});
