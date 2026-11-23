// Estados vazios com o mascote (etapa 6 do plano dos mascotes).

import { act, render, screen, within } from '@testing-library/react';
import { EstadoVazio } from './EstadoVazio.tsx';
import { EmConstrucao } from './EmConstrucao.tsx';
import { definirConvidados, escolherPrincipal } from './preferencias-mascote.ts';
import { ContextoArmazem, criarArmazem } from '../modulos/demandas/armazem.ts';
import { Demandas } from '../modulos/demandas/Demandas.tsx';
import { Kanban } from '../modulos/kanban/Kanban.tsx';
import { STATUS } from '../modulos/demandas/modelo.ts';

beforeEach(() => localStorage.clear());

function comArmazem(tela: React.ReactNode) {
  const armazem = criarArmazem(localStorage, { exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}>{tela}</ContextoArmazem.Provider>);
}

describe('estado vazio', () => {
  it('mostra a frase e a dica; o rosto é o do mascote principal e fica escondido do leitor de tela', () => {
    const { container } = render(<EstadoVazio texto="Nada por aqui." dica="Faça isto para começar." />);
    expect(screen.getByText('Nada por aqui.')).toBeInTheDocument();
    expect(screen.getByText('Faça isto para começar.')).toBeInTheDocument();
    const rosto = container.querySelector('svg.mascote')!;
    expect(rosto).toHaveAttribute('data-especie', 'lobo-guara');
    expect(rosto).toHaveAttribute('aria-hidden', 'true');
    expect(rosto).not.toHaveClass('mascote--vivo');
    expect(screen.queryByRole('img')).toBeNull();

    act(() => escolherPrincipal('ariranha'));
    expect(container.querySelector('svg.mascote')).toHaveAttribute('data-especie', 'ariranha');
  });

  it('Demandas sem nenhuma demanda sugere o próximo passo', () => {
    comArmazem(<Demandas />);
    const vazio = screen.getByTestId('estado-vazio');
    expect(vazio).toHaveTextContent('Nenhuma demanda cadastrada.');
    expect(vazio).toHaveTextContent('Use “Nova demanda” para registrar a primeira.');
  });

  it('Kanban vazio: cada coluna tem o estado vazio compacto, com o rosto pequeno', () => {
    comArmazem(<Kanban />);
    for (const status of STATUS) {
      const vazio = within(screen.getByTestId(`coluna-${status}`)).getByTestId('estado-vazio');
      expect(vazio).toHaveClass('estado-vazio--compacto');
      expect(vazio).toHaveTextContent('Nenhuma demanda.');
      expect(vazio.querySelector('svg.mascote')).toHaveAttribute('width', '32');
    }
  });

  it('com ocasião, o convidado da personalidade aparece; desligando os convidados, volta o principal', () => {
    const { container, rerender } = render(<EstadoVazio texto="Nada." ocasiao="vazio-descoberta" />);
    expect(container.querySelector('svg.mascote')).toHaveAttribute('data-especie', 'ariranha');
    expect(screen.getByTestId('estado-vazio')).toHaveAttribute('data-especie', 'ariranha');
    act(() => definirConvidados(false));
    rerender(<EstadoVazio texto="Nada." ocasiao="vazio-descoberta" />);
    expect(container.querySelector('svg.mascote')).toHaveAttribute('data-especie', 'lobo-guara');
    act(() => definirConvidados(true));
  });


  it('módulo ainda não implementado mostra o mascote e onde ver a situação', () => {
    render(<EmConstrucao titulo="Documentos" />);
    expect(screen.getByRole('heading', { name: 'Documentos' })).toBeInTheDocument();
    expect(screen.getByTestId('estado-vazio')).toHaveTextContent('Módulo previsto no planejamento e ainda não implementado.');
    expect(screen.getByTestId('estado-vazio')).toHaveTextContent('gestao/STATUS.md');
  });
});
