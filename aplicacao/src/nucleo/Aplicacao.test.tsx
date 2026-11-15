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
