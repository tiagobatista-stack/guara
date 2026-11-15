import {
  ATALHOS_PADRAO, CHAVE_ATALHOS, MAXIMO_ATALHOS, editarAtalho, excluirAtalho, incluirAtalho, obterAtalhos,
  restaurarAtalhosIniciais, validarAtalho, validarEndereco, validarLista,
} from './atalhos.ts';

beforeEach(() => localStorage.clear());

describe('atalhos para sistemas externos', () => {
  it('sem nada gravado, começa com SIGPAS, SIGADOC e Portal SEMA', () => {
    expect(obterAtalhos().map((a) => a.nome)).toEqual(['SIGPAS', 'SIGADOC', 'Portal SEMA']);
    expect(obterAtalhos().map((a) => a.url)).toEqual([
      'https://sigpas.seplag.mt.gov.br/sigpas/',
      'https://www.sigadoc.mt.gov.br/siga/app/principal',
      'https://portal.sema.mt.gov.br/#/login?returnUrl=%2F',
    ]);
  });

  it('inclui, edita e exclui, gravando no localStorage', () => {
    expect(incluirAtalho('  SIMCAR  ', 'https://exemplo.mt.gov.br/simcar')).toBeNull();
    const novo = obterAtalhos().at(-1)!;
    expect(novo.nome).toBe('SIMCAR');
    expect(JSON.parse(localStorage.getItem(CHAVE_ATALHOS)!)).toHaveLength(4);

    expect(editarAtalho(novo.id, 'SIMCAR novo', 'https://exemplo.mt.gov.br/novo')).toBeNull();
    expect(obterAtalhos().at(-1)).toMatchObject({ id: novo.id, nome: 'SIMCAR novo', url: 'https://exemplo.mt.gov.br/novo' });

    excluirAtalho(novo.id);
    expect(obterAtalhos().map((a) => a.id)).toEqual(ATALHOS_PADRAO.map((a) => a.id));
  });

  it('recusa nome vazio, nome longo, endereço sem protocolo e esquemas perigosos', () => {
    expect(validarAtalho('   ', 'https://a.gov.br').ok).toBe(false);
    expect(validarAtalho('x'.repeat(41), 'https://a.gov.br').ok).toBe(false);
    expect(validarEndereco('sigadoc.mt.gov.br').ok).toBe(false);
    expect(validarEndereco('javascript:alert(1)').ok).toBe(false);
    expect(validarEndereco('data:text/html,oi').ok).toBe(false);
    expect(validarEndereco('ftp://a.gov.br').ok).toBe(false);
    expect(validarEndereco('https://').ok).toBe(false);
    expect(incluirAtalho('Ruim', 'javascript:alert(1)')).toMatch(/https:\/\//);
    expect(obterAtalhos()).toHaveLength(3);
  });

  it('editar com dado inválido não muda nada', () => {
    expect(editarAtalho('sigpas', 'SIGPAS', 'javascript:alert(1)')).not.toBeNull();
    expect(obterAtalhos()[0].url).toBe('https://sigpas.seplag.mt.gov.br/sigpas/');
    expect(editarAtalho('nao-existe', 'X', 'https://a.gov.br')).toBe('Atalho não encontrado.');
  });

  it('não passa do limite de atalhos', () => {
    for (let i = obterAtalhos().length; i < MAXIMO_ATALHOS; i++) {
      expect(incluirAtalho('Sistema ' + i, 'https://s' + i + '.gov.br')).toBeNull();
    }
    expect(incluirAtalho('Mais um', 'https://mais.gov.br')).toMatch(/limite/);
    expect(obterAtalhos()).toHaveLength(MAXIMO_ATALHOS);
  });

  it('lista vazia gravada continua vazia; restaurar volta aos três iniciais', () => {
    for (const a of [...obterAtalhos()]) excluirAtalho(a.id);
    expect(obterAtalhos()).toEqual([]);
    expect(localStorage.getItem(CHAVE_ATALHOS)).toBe('[]');
    restaurarAtalhosIniciais();
    expect(obterAtalhos()).toHaveLength(3);
  });

  it('gravação corrompida volta ao padrão e itens inválidos são descartados', () => {
    localStorage.setItem(CHAVE_ATALHOS, '{quebrado');
    expect(obterAtalhos()).toHaveLength(3);
    expect(validarLista([
      { id: 'a', nome: 'Bom', url: 'https://bom.gov.br' },
      { id: 'b', nome: 'Ruim', url: 'javascript:alert(1)' },
      { id: 'a', nome: 'Repetido', url: 'https://bom.gov.br' },
      null,
    ])).toEqual([{ id: 'a', nome: 'Bom', url: 'https://bom.gov.br/' }]);
  });
});
