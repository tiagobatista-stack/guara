import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SaudeDoSistema } from './SaudeDoSistema.tsx';

// Exceção real na execução do fluxo (diferente de bloqueio pelo gate): continua contando como FALHA.
vi.mock('@catalogo/fluxo-padrao.ts', async (importarOriginal) => ({
  ...(await importarOriginal<typeof import('@catalogo/fluxo-padrao.ts')>()),
  executarFluxoPadrao: () => {
    throw new Error('falha simulada no orquestrador');
  },
}));

describe('Saúde do sistema: exceção no fluxo', () => {
  it('conta como FALHA no Estado geral e aparece no resultado do fluxo', () => {
    render(<SaudeDoSistema />);
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    expect(screen.getByTestId('resultado-do-fluxo')).toHaveTextContent('Exceção na execução do fluxo: falha simulada no orquestrador');
    expect(screen.getByTestId('resultado-do-fluxo')).toHaveTextContent('FALHA');
    expect(screen.getByTestId('estado-geral')).toHaveTextContent('FALHA');
  });
});
