import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHAVE_MASCOTE,
  escolherPrincipal,
  limparNome,
  nomearMascote,
  nomeDoMascote,
  obterPreferencias,
  PREFERENCIAS_PADRAO,
  validarPreferencias,
} from './preferencias-mascote.ts';

beforeEach(() => localStorage.clear());

describe('preferências do mascote', () => {
  it('sem nada gravado, o principal é a capivara e os nomes são os das espécies', () => {
    const p = obterPreferencias();
    expect(p).toEqual(PREFERENCIAS_PADRAO);
    expect(nomeDoMascote(p, 'capivara')).toBe('Capivara');
    expect(nomeDoMascote(p, 'lobo-guara')).toBe('Lobo-guará');
  });

  it('limpa o nome: espaços sobrando saem e o tamanho é limitado a 20 caracteres', () => {
    expect(limparNome('  Dona   Cida  ')).toBe('Dona Cida');
    expect(limparNome('   ')).toBe('');
    expect(limparNome('a'.repeat(30))).toHaveLength(20);
  });

  it('grava o principal e os nomes no localStorage e lê de volta', () => {
    escolherPrincipal('lobo-guara');
    nomearMascote('lobo-guara', '  Tobias ');
    expect(JSON.parse(localStorage.getItem(CHAVE_MASCOTE)!)).toEqual({ principal: 'lobo-guara', nomes: { 'lobo-guara': 'Tobias' } });
    const p = obterPreferencias();
    expect(p.principal).toBe('lobo-guara');
    expect(nomeDoMascote(p, 'lobo-guara')).toBe('Tobias');
    expect(nomeDoMascote(p, 'ariranha')).toBe('Ariranha');
  });

  it('nome vazio volta a mostrar a espécie', () => {
    nomearMascote('capivara', 'Cida');
    nomearMascote('capivara', '   ');
    expect(obterPreferencias().nomes).toEqual({});
    expect(nomeDoMascote(obterPreferencias(), 'capivara')).toBe('Capivara');
  });

  it('gravação corrompida ou alterada à mão volta ao padrão, parte por parte', () => {
    localStorage.setItem(CHAVE_MASCOTE, '{não é json');
    expect(obterPreferencias()).toEqual(PREFERENCIAS_PADRAO);
    expect(validarPreferencias(null)).toEqual(PREFERENCIAS_PADRAO);
    expect(validarPreferencias({ principal: 'onça', nomes: { capivara: 42, ariranha: ' Nina ', tatu: 'x' } })).toEqual({
      principal: 'capivara',
      nomes: { ariranha: 'Nina' },
    });
  });

  it('relê quando o conteúdo gravado muda por fora (outra aba ou limpeza)', () => {
    nomearMascote('ariranha', 'Nina');
    localStorage.setItem(CHAVE_MASCOTE, JSON.stringify({ principal: 'ariranha', nomes: {} }));
    expect(obterPreferencias()).toEqual({ principal: 'ariranha', nomes: {} });
    localStorage.clear();
    expect(obterPreferencias()).toEqual(PREFERENCIAS_PADRAO);
  });
});
