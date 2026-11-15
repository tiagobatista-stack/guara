import { fireEvent, render, screen, within } from '@testing-library/react';
import { SaudeDoSistema } from './SaudeDoSistema.tsx';

const HABILIDADES = [
  'registrar-demanda', 'classificar-demanda', 'extrair-documento', 'montar-checklist', 'conferir-requisitos',
  'avaliar-prazos', 'redigir-minuta', 'validar-evidencias', 'relatorio-executivo', 'validar-pds',
];

describe('tela Saúde do sistema', () => {
  it('indica o modo local e começa sem nenhum OK', () => {
    render(<SaudeDoSistema />);
    expect(screen.getByText(/Modo local, sem Supabase/)).toBeInTheDocument();
    for (const id of HABILIDADES) {
      expect(within(screen.getByTestId(`habilidade-${id}`)).getByText('NÃO TESTADO')).toBeInTheDocument();
    }
    expect(screen.queryAllByText('OK')).toHaveLength(0);
  });

  it('“Executar verificação” roda os autotestes e marca todas as habilidades como OK', () => {
    render(<SaudeDoSistema />);
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    for (const id of HABILIDADES) {
      expect(within(screen.getByTestId(`habilidade-${id}`)).getByText('OK')).toBeInTheDocument();
    }
    expect(within(screen.getByTestId('agente-revisor')).getByText('OK')).toBeInTheDocument();
    expect(screen.getByText(/10 de 10 habilidades OK/)).toBeInTheDocument();
  });

  it('mascote cauteloso enquanto nada foi testado; tranquilo quando a verificação passa', () => {
    render(<SaudeDoSistema />);
    expect(screen.getByRole('img', { name: 'Lobo-guará (Cerrado), cauteloso' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), tranquilo' })).toBeInTheDocument();
  });

  it('o revisor não pode ser desativado', () => {
    render(<SaudeDoSistema />);
    expect(within(screen.getByTestId('agente-revisor')).getByRole('button', { name: 'Não desativável' })).toBeDisabled();
  });

  it('desativar uma habilidade invalida a verificação e o gate bloqueia o fluxo', () => {
    render(<SaudeDoSistema />);
    fireEvent.click(within(screen.getByTestId('habilidade-extrair-documento')).getByRole('button', { name: 'Desativar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    expect(within(screen.getByTestId('habilidade-extrair-documento')).getByText('ATENÇÃO')).toBeInTheDocument();
    expect(screen.getByText(/gate:/).textContent).toContain('bloqueou');
  });
});
