// Aviso de persistência no topo do app (risco 3b): continua visível depois de
// uma importação bem-sucedida enquanto o armazenamento estiver só em memória.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem, criarArmazenamentoEmMemoria } from '../modulos/demandas/armazem.ts';
import { exportarDados, validarImportacao } from '../modulos/alertas/dados-portaveis.ts';
import { Aplicacao } from './Aplicacao.tsx';
import { comemorarMascotes } from '../compartilhado/Mascote.tsx';
import { marcarCiente, mostrarDeNovo } from '../modulos/assistente/lembretes.ts';

it('aviso de persistência continua visível após importar com o fallback em memória', () => {
  const armazem = criarArmazem(criarArmazenamentoEmMemoria(), { exemplos: () => [] });
  armazem.marcarSemPersistencia();
  render(
    <ContextoArmazem.Provider value={armazem}>
      <Aplicacao />
    </ContextoArmazem.Provider>,
  );
  expect(screen.getByText(/As alterações valem só até fechar a página/)).toBeInTheDocument();

  const dados = validarImportacao(exportarDados([], 3, new Date('2026-11-13T12:00:00.000Z')));
  if (!dados.ok) throw new Error('fixture inválida');
  act(() => { expect(armazem.importar(dados.dados).ok).toBe(true); });
  expect(screen.getByText(/As alterações valem só até fechar a página/)).toBeInTheDocument();
});

// Item 9a (21/11/2026): a barra de busca desativada saiu do cabeçalho; a busca virá pela conversa.
it('o cabeçalho não tem campo de busca, e mantém o selo, o sino e o botão do assistente', () => {
  localStorage.clear();
  const armazem = criarArmazem(criarArmazenamentoEmMemoria(), { exemplos: () => [] });
  const { container } = render(
    <ContextoArmazem.Provider value={armazem}>
      <Aplicacao />
    </ContextoArmazem.Provider>,
  );
  const cabecalho = container.querySelector('header.cabecalho') as HTMLElement;
  expect(cabecalho.querySelector('input')).toBeNull();
  expect(cabecalho.querySelector('.busca')).toBeNull();
  expect(screen.queryByPlaceholderText(/Buscar demanda/)).toBeNull();
  expect(within(cabecalho).getByText('Dados fictícios')).toBeInTheDocument();
  expect(within(cabecalho).getByRole('button', { name: /^Alertas/ })).toBeInTheDocument();
  expect(within(cabecalho).getByRole('button', { name: /^Abrir assistente/ })).toBeInTheDocument();
});

// Presença do mascote no celular e no tablet: o rosto fica nos botões que abrem o assistente.
it('o botão do assistente leva o rosto do mascote principal, atento com aviso e com o resumo no nome', () => {
  localStorage.clear();
  const armazem = criarArmazem(criarArmazenamentoEmMemoria(), { exemplos: () => [] });
  const { container } = render(
    <ContextoArmazem.Provider value={armazem}>
      <Aplicacao />
    </ContextoArmazem.Provider>,
  );
  const flutuante = container.querySelector('.botao-flutuante')!;
  expect(flutuante).toHaveAccessibleName('Abrir assistente');
  expect(flutuante.querySelector('svg.mascote--vivo')).toHaveAttribute('data-humor', 'tranquilo');
  expect(container.querySelector('.botao-assistente svg.mascote--vivo')).toHaveAttribute('data-especie', 'capivara');

  act(() => {
    armazem.criar({ titulo: 'Prazo antigo (fictício)', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '2020-01-02' });
  });
  expect(flutuante).toHaveAccessibleName('Abrir assistente: 1 vencida');
  expect(flutuante.querySelector('svg.mascote--vivo')).toHaveAttribute('data-humor', 'atento');
  expect(flutuante.querySelector('.botao-flutuante-contagem')).toHaveTextContent('1');
});

it('com o painel fechado, o mascote do botão flutuante também comemora', () => {
  const armazem = criarArmazem(criarArmazenamentoEmMemoria(), { exemplos: () => [] });
  const { container } = render(
    <ContextoArmazem.Provider value={armazem}>
      <Aplicacao />
    </ContextoArmazem.Provider>,
  );
  act(() => comemorarMascotes());
  expect(container.querySelector('.botao-flutuante svg.mascote--vivo')).toHaveClass('mascote--comemorando');
});

it('aviso marcado como ciente sai da contagem do botão flutuante; as outras telas não mudam', () => {
  localStorage.clear();
  mostrarDeNovo('x');
  const armazem = criarArmazem(criarArmazenamentoEmMemoria(), { exemplos: () => [] });
  const { container } = render(
    <ContextoArmazem.Provider value={armazem}>
      <Aplicacao />
    </ContextoArmazem.Provider>,
  );
  let id = '';
  act(() => {
    const r = armazem.criar({ titulo: 'Prazo antigo (fictício)', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '2020-01-02' });
    id = (r as { id?: string }).id ?? armazem.obter().demandas[0].id;
  });
  const flutuante = container.querySelector('.botao-flutuante')!;
  expect(flutuante).toHaveAccessibleName('Abrir assistente: 1 vencida');
  act(() => { marcarCiente({ id, tipo: 'vencida', texto: '', situacao: 'vencida|A Fazer' }, new Date()); });
  expect(flutuante).toHaveAccessibleName('Abrir assistente');
  expect(flutuante.querySelector('.botao-flutuante-contagem')).toBeNull();
  // A regra de vencida das outras telas não muda: o Dashboard continua contando.
  expect(screen.getAllByText(/vencida/i).length).toBeGreaterThan(0);
});

// Navegação até Configurações: pelo menu lateral (desktop e tablet) e pelo "Mais" (celular).
function montarApp() {
  window.location.hash = '';
  const armazem = criarArmazem(criarArmazenamentoEmMemoria(), { exemplos: () => [] });
  render(
    <ContextoArmazem.Provider value={armazem}>
      <Aplicacao />
    </ContextoArmazem.Provider>,
  );
}

it('menu lateral leva às Configurações e marca o item como página atual', () => {
  montarApp();
  const menu = screen.getByRole('navigation', { name: 'Menu principal' });
  fireEvent.click(within(menu).getByRole('button', { name: 'Configurações' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#/configuracoes');
  expect(within(menu).getByRole('button', { name: 'Configurações' })).toHaveAttribute('aria-current', 'page');
});

it('no celular, "Mais" abre o menu completo, que leva às Configurações e fecha', () => {
  montarApp();
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Navegação inferior' })).getByRole('button', { name: 'Mais' }));
  const gaveta = screen.getByRole('dialog', { name: 'Menu completo' });
  fireEvent.click(within(gaveta).getByRole('button', { name: 'Configurações' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#/configuracoes');
  expect(screen.queryByRole('dialog', { name: 'Menu completo' })).toBeNull();
});

it('menu lateral leva a Atalhos e contatos, com os sistemas externos e a lista de contatos', () => {
  montarApp();
  const menu = screen.getByRole('navigation', { name: 'Menu principal' });
  fireEvent.click(within(menu).getByRole('button', { name: 'Atalhos e contatos' }));
  expect(screen.getByRole('heading', { level: 1, name: 'Atalhos e contatos' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#/atalhos');
  expect(screen.getByRole('link', { name: 'SIGADOC (abre em nova aba)' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: 'Contatos' })).toBeInTheDocument();
});

describe('menu e painel recolhíveis', () => {
  const montar = () => {
    const armazem = criarArmazem(criarArmazenamentoEmMemoria(), { exemplos: () => [] });
    const r = render(<ContextoArmazem.Provider value={armazem}><Aplicacao /></ContextoArmazem.Provider>);
    return { armazem, ...r };
  };
  const larguraOriginal = window.innerWidth;
  beforeEach(() => { localStorage.clear(); window.innerWidth = 1400; });
  afterEach(() => { window.innerWidth = larguraOriginal; vi.restoreAllMocks(); });

  it('menu: alterna, mantém o item ativo e lembra a escolha', () => {
    const { container, unmount } = montar();
    expect(container.querySelector('.app')).not.toHaveClass('app--menu-recolhido');
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(container.querySelector('.app')).toHaveClass('app--menu-recolhido');
    const expandir = screen.getByRole('button', { name: 'Expandir menu' });
    expect(expandir).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('navigation', { name: 'Menu principal' }).querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    unmount();
    const de_novo = montar();
    expect(de_novo.container.querySelector('.app')).toHaveClass('app--menu-recolhido');
    fireEvent.click(screen.getByRole('button', { name: 'Expandir menu' }));
    expect(localStorage.getItem('guara:menu-recolhido:v1')).toBe('0');
  });

  it('painel: recolhido vira faixa com o rosto e o contador; aviso novo atualiza o contador; clicar abre', () => {
    const { armazem, container } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Recolher painel' }));
    expect(localStorage.getItem('guara:painel-recolhido:v1')).toBe('1');
    expect(screen.queryByTestId('contador-faixa')).toBeNull();
    const faixa = container.querySelector('.painel-faixa')!;
    expect(faixa.querySelector('svg.mascote--vivo')).toHaveAttribute('data-humor', 'tranquilo');
    act(() => { armazem.criar({ titulo: 'Prazo antigo (fictício)', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '2020-01-02' }); });
    expect(screen.getByTestId('contador-faixa')).toHaveTextContent('1');
    expect(faixa.querySelector('svg.mascote--vivo')).toHaveAttribute('data-humor', 'atento');
    expect(faixa).toHaveAccessibleName('Expandir painel do assistente: 1 vencida');
    fireEvent.click(faixa);
    expect(screen.getByRole('button', { name: 'Recolher painel' })).toBeInTheDocument();
    expect(container.querySelector('.painel-faixa')).toBeNull();
  });

  it('tela estreita (< 900 px): começa recolhido sem gravar; a escolha salva prevalece', () => {
    window.innerWidth = 800;
    const a = montar();
    expect(a.container.querySelector('.app')).toHaveClass('app--menu-recolhido', 'app--painel-recolhido');
    expect(localStorage.getItem('guara:menu-recolhido:v1')).toBeNull();
    a.unmount();
    localStorage.setItem('guara:menu-recolhido:v1', '0');
    const b = montar();
    expect(b.container.querySelector('.app')).not.toHaveClass('app--menu-recolhido');
    expect(b.container.querySelector('.app')).toHaveClass('app--painel-recolhido');
    expect(localStorage.getItem('guara:menu-recolhido:v1')).toBe('0');
  });

  it('armazenamento indisponível: abre (em tela larga) e alternar não quebra', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const { container } = montar();
    expect(container.querySelector('.app')).not.toHaveClass('app--menu-recolhido');
    fireEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(container.querySelector('.app')).toHaveClass('app--menu-recolhido');
  });
});
