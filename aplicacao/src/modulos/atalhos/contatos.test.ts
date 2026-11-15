import {
  CHAVE_CONTATOS, CONTATO_VAZIO, MAXIMO_CONTATOS, editarContato, excluirContato, filtrarContatos, formatarCelular,
  incluirContato, limparCelular, obterContatos, ordenarContatos, validarContato, validarListaContatos, type DadosContato,
} from './contatos.ts';

beforeEach(() => localStorage.clear());

// Pessoas fictícias (seção 12): nada de dado real nos testes.
const ANA: DadosContato = {
  nome: '  Ana   Fictícia ', instituicao: 'SEMA-MT', setor: 'Coordenadoria (fictícia)',
  email: ' Ana.Ficticia@Exemplo.invalid ', celular: '+55 (65) 99999-1234', observacoes: 'Atende à tarde.',
};

describe('contatos', () => {
  it('começa vazio, sem nenhum dado pessoal pré-carregado', () => {
    expect(obterContatos()).toEqual([]);
  });

  it('inclui limpando os campos: espaços, e-mail em minúsculas e celular só com dígitos', () => {
    expect(incluirContato(ANA)).toBeNull();
    expect(obterContatos()[0]).toMatchObject({
      nome: 'Ana Fictícia', instituicao: 'SEMA-MT', email: 'ana.ficticia@exemplo.invalid', celular: '65999991234', observacoes: 'Atende à tarde.',
    });
    expect(localStorage.getItem(CHAVE_CONTATOS)).toContain('Ana Fictícia');
  });

  it('só o nome é obrigatório', () => {
    expect(incluirContato({ ...CONTATO_VAZIO, nome: 'Beto Fictício' })).toBeNull();
    expect(incluirContato({ ...CONTATO_VAZIO })).toBe('Informe o nome do contato.');
  });

  it('recusa e-mail e celular inválidos e textos longos', () => {
    expect(validarContato({ ...CONTATO_VAZIO, nome: 'X', email: 'sem-arroba' }).ok).toBe(false);
    expect(validarContato({ ...CONTATO_VAZIO, nome: 'X', celular: '9999-1234' }).ok).toBe(false);
    expect(validarContato({ ...CONTATO_VAZIO, nome: 'x'.repeat(81) }).ok).toBe(false);
    expect(validarContato({ ...CONTATO_VAZIO, nome: 'X', observacoes: 'x'.repeat(501) }).ok).toBe(false);
    expect(validarContato({ ...CONTATO_VAZIO, nome: 'X', celular: '(65) 3613-1234' }).ok).toBe(true);
  });

  it('formata o celular para a tela', () => {
    expect(limparCelular('+55 65 99999-1234')).toBe('65999991234');
    expect(formatarCelular('65999991234')).toBe('(65) 99999-1234');
    expect(formatarCelular('6536131234')).toBe('(65) 3613-1234');
  });

  it('edita e exclui um por vez', () => {
    incluirContato(ANA);
    incluirContato({ ...CONTATO_VAZIO, nome: 'Beto Fictício' });
    const [ana, beto] = obterContatos();
    expect(editarContato(ana.id, { ...ANA, setor: 'Gabinete (fictício)' })).toBeNull();
    expect(obterContatos()[0].setor).toBe('Gabinete (fictício)');
    expect(editarContato(ana.id, { ...ANA, email: 'ruim' })).not.toBeNull();
    expect(obterContatos()[0].email).toBe('ana.ficticia@exemplo.invalid');
    excluirContato(beto.id);
    expect(obterContatos().map((c) => c.nome)).toEqual(['Ana Fictícia']);
  });

  it('ordena pelo nome e busca sem diferenciar acentos', () => {
    incluirContato({ ...CONTATO_VAZIO, nome: 'Zeca Fictício' });
    incluirContato({ ...CONTATO_VAZIO, nome: 'Álvaro Fictício', instituicao: 'Prefeitura (fictícia)' });
    incluirContato({ ...CONTATO_VAZIO, nome: 'beto Fictício' });
    expect(ordenarContatos(obterContatos()).map((c) => c.nome)).toEqual(['Álvaro Fictício', 'beto Fictício', 'Zeca Fictício']);
    expect(filtrarContatos(obterContatos(), 'prefeitura').map((c) => c.nome)).toEqual(['Álvaro Fictício']);
    expect(filtrarContatos(obterContatos(), 'alvaro')).toHaveLength(1);
    expect(filtrarContatos(obterContatos(), '  ')).toHaveLength(3);
  });

  it('não passa do limite de contatos', () => {
    for (let i = 0; i < MAXIMO_CONTATOS; i++) expect(incluirContato({ ...CONTATO_VAZIO, nome: 'Pessoa ' + i })).toBeNull();
    expect(incluirContato({ ...CONTATO_VAZIO, nome: 'Mais uma' })).toMatch(/limite/);
  });

  it('gravação corrompida vira lista vazia e itens inválidos são descartados', () => {
    localStorage.setItem(CHAVE_CONTATOS, '{quebrado');
    expect(obterContatos()).toEqual([]);
    expect(validarListaContatos([
      { id: 'a', nome: 'Ana' },
      { id: 'b', nome: 'Ruim', email: 'sem-arroba' },
      { id: 'a', nome: 'Repetido' },
      'texto',
    ]).map((c) => c.id)).toEqual(['a']);
  });
});
