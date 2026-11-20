import { sugerirNomeOperacao, type LinhaParaNome } from './regras.ts';

const l = (municipio: string, extra: Partial<LinhaParaNome> = {}): LinhaParaNome => ({ municipio, ...extra });
const vezes = (n: number, linha: LinhaParaNome) => Array.from({ length: n }, () => linha);

describe('sugerirNomeOperacao', () => {
  it('usa o município com mais pontos, o mês de MES_PPROG e o travessão', () => {
    const linhas = [...vezes(3, l('Castanheira', { mes: '202612' })), ...vezes(2, l('Juína', { mes: '202612' }))];
    expect(sugerirNomeOperacao(linhas, [])).toBe('Operação Castanheira – dez/2026');
  });

  it('conta só os pontos sem resultado; se todos têm resultado, conta todos', () => {
    const feitos = vezes(5, l('Juína', { resultado: 'FISCALIZADO', mes: '202701' }));
    const abertos = vezes(2, l('Aripuanã', { mes: '202701' }));
    expect(sugerirNomeOperacao([...feitos, ...abertos], [])).toBe('Operação Aripuanã – jan/2027');
    expect(sugerirNomeOperacao([...feitos, ...vezes(2, l('Aripuanã', { resultado: 'AUTUADO', mes: '202701' }))], [])).toBe('Operação Juína – jan/2027');
  });

  it('empate: ordem alfabética em pt-BR, com o texto como veio', () => {
    expect(sugerirNomeOperacao([l('Juína', { mes: '202610' }), l('Ápice', { mes: '202610' })], [])).toBe('Operação Ápice – out/2026');
  });

  it('mês: MES_PPROG ou, sem ele, a menor DATA_SAIDA; sem mês e sem município', () => {
    expect(sugerirNomeOperacao([l('X', { saida: '2026-10-22' }), l('X', { saida: '2026-10-19' })], [])).toBe('Operação X – out/2026');
    expect(sugerirNomeOperacao([l('X', { mes: '202611', saida: '2026-10-19' })], [])).toBe('Operação X – nov/2026');
    expect(sugerirNomeOperacao([l('X')], [])).toBe('Operação X');
    expect(sugerirNomeOperacao([l('', { mes: '202603' })], [])).toBe('Operação mar/2026');
    expect(sugerirNomeOperacao([l('')], [])).toBe('');
    expect(sugerirNomeOperacao([], [])).toBe('');
  });

  it('nome repetido (sem diferenciar maiúsculas e acentos) ganha (2) e (3)', () => {
    const linhas = [l('Aripuanã', { mes: '202701' })];
    expect(sugerirNomeOperacao(linhas, [{ nome: 'operacao aripuana – JAN/2027' }])).toBe('Operação Aripuanã – jan/2027 (2)');
    expect(sugerirNomeOperacao(linhas, [{ nome: 'Operação Aripuanã – jan/2027' }, { nome: 'Operação Aripuanã – jan/2027 (2)' }])).toBe('Operação Aripuanã – jan/2027 (3)');
  });
});

describe('nome longo', () => {
  it('corta no último espaço antes de 80 caracteres, sem deixar " –" no fim, e mantém o sufixo', () => {
    const longo = 'Município com um nome absurdamente comprido para forçar o corte do nome da operação';
    const nome = sugerirNomeOperacao([l(longo, { mes: '202612' })], []);
    expect(nome.length).toBeLessThanOrEqual(80);
    expect(nome).not.toMatch(/[\s–-]$/);
    expect(longo.startsWith(nome.replace('Operação ', ''))).toBe(true);
    const repetido = sugerirNomeOperacao([l(longo, { mes: '202612' })], [{ nome }]);
    expect(repetido.length).toBeLessThanOrEqual(80);
    expect(repetido.endsWith(' (2)')).toBe(true);
    expect(repetido).not.toBe(nome);
  });
});
