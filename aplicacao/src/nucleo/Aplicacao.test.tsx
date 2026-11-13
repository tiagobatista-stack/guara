// Aviso de persistência no topo do app (risco 3b): continua visível depois de
// uma importação bem-sucedida enquanto o armazenamento estiver só em memória.

import { act, render, screen } from '@testing-library/react';
import { ContextoArmazem, criarArmazem, criarArmazenamentoEmMemoria } from '../modulos/demandas/armazem.ts';
import { exportarDados, validarImportacao } from '../modulos/alertas/dados-portaveis.ts';
import { Aplicacao } from './Aplicacao.tsx';

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
