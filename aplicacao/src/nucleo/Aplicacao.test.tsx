// Aviso de persistência no topo do app (risco 3b): continua visível depois de
// uma importação bem-sucedida enquanto o armazenamento estiver só em memória.

import { act, render, screen } from '@testing-library/react';
import { ContextoArmazem, criarArmazem, criarArmazenamentoEmMemoria } from '../modulos/demandas/armazem.ts';
import { exportarDados, validarImportacao } from '../modulos/alertas/dados-portaveis.ts';
import { Aplicacao } from './Aplicacao.tsx';
import { comemorarMascotes } from '../compartilhado/Mascote.tsx';

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
