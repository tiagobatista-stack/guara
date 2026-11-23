import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHAVE_MASCOTE,
  definirConvidados,
  especiePara,
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
  it('sem nada gravado, o principal é o lobo-guará e os nomes são os das espécies', () => {
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
    expect(JSON.parse(localStorage.getItem(CHAVE_MASCOTE)!)).toEqual({ principal: 'lobo-guara', nomes: { 'lobo-guara': 'Tobias' }, convidados: true });
    const p = obterPreferencias();
    expect(p.principal).toBe('lobo-guara');
    expect(nomeDoMascote(p, 'lobo-guara')).toBe('Tobias');
    expect(nomeDoMascote(p, 'ariranha')).toBe('Ariranha');
  });

  it('convidados entram só nas ocasiões e só quando ligados; sem ocasião, vale o principal', () => {
    const p = obterPreferencias();
    expect(especiePara(p)).toBe('lobo-guara');
    expect(especiePara(p, 'aviso')).toBe('lobo-guara');
    expect(especiePara(p, 'vazio-acolhedor')).toBe('capivara');
    expect(especiePara(p, 'vazio-descoberta')).toBe('ariranha');
    expect(especiePara(p, 'marco')).toBe('capivara');
    definirConvidados(false);
    expect(obterPreferencias().convidados).toBe(false);
    expect(JSON.parse(localStorage.getItem(CHAVE_MASCOTE)!).convidados).toBe(false);
    expect(especiePara(obterPreferencias(), 'vazio-acolhedor')).toBe('lobo-guara');
    definirConvidados(true);
    expect(especiePara(obterPreferencias(), 'vazio-acolhedor')).toBe('capivara');
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
      principal: 'lobo-guara',
      nomes: { ariranha: 'Nina' },
      convidados: true,
    });
    expect(validarPreferencias({ convidados: 'sim' }).convidados).toBe(true);
    expect(validarPreferencias({ convidados: false }).convidados).toBe(false);
  });

  it('relê quando o conteúdo gravado muda por fora (outra aba ou limpeza)', () => {
    nomearMascote('ariranha', 'Nina');
    localStorage.setItem(CHAVE_MASCOTE, JSON.stringify({ principal: 'ariranha', nomes: {} }));
    expect(obterPreferencias()).toEqual({ principal: 'ariranha', nomes: {}, convidados: true });
    localStorage.clear();
    expect(obterPreferencias()).toEqual(PREFERENCIAS_PADRAO);
  });
});
