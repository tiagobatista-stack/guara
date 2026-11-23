import { fireEvent, render, screen, within } from '@testing-library/react';
import { SaudeDoSistema } from './SaudeDoSistema.tsx';
import { nomearMascote } from '../../compartilhado/preferencias-mascote.ts';

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

  it('o mascote usa o nome dado nas Configurações, para a espécie que o estado escolher', () => {
    localStorage.clear();
    nomearMascote('lobo-guara', 'Tobias');
    nomearMascote('capivara', 'Dona Cida');
    render(<SaudeDoSistema />);
    expect(screen.getByRole('img', { name: 'Tobias, Lobo-guará (Cerrado), cauteloso' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    expect(screen.getByRole('img', { name: 'Dona Cida, Capivara (Pantanal), tranquilo' })).toBeInTheDocument();
    localStorage.clear();
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

  it('o fluxo usa a demanda escolhida: entrada e modo aparecem; sem documento, o gate bloqueia', () => {
    render(<SaudeDoSistema />);
    fireEvent.change(screen.getByLabelText(/Demanda fictícia do fluxo/), { target: { value: 'DEM-FIC-0101' } });
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    expect(screen.getByTestId('entrada-do-fluxo')).toHaveTextContent('DEM-FIC-0101');
    expect(screen.getByTestId('entrada-do-fluxo')).toHaveTextContent('FIC-2026-0101');
    expect(screen.getByTestId('modo-do-fluxo')).toHaveTextContent('determinístico');
    fireEvent.change(screen.getByLabelText(/Demanda fictícia do fluxo/), { target: { value: 'DEM-FIC-0002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    expect(screen.getAllByTestId('entrada-do-fluxo')[0]).toHaveTextContent('documento nenhum');
    expect(screen.getAllByText('bloqueou').length).toBeGreaterThan(0);
  });

  it('fluxo bloqueado pelo gate não é falha do sistema: Estado geral e Última verificação seguem OK', () => {
    render(<SaudeDoSistema />);
    fireEvent.change(screen.getByLabelText(/Demanda fictícia do fluxo/), { target: { value: 'DEM-FIC-0002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    const resultado = screen.getByTestId('resultado-do-fluxo');
    expect(resultado).toHaveTextContent('Fluxo DEM-FIC-0002: bloqueado pelo gate (falha em extrair-documento');
    expect(resultado).toHaveTextContent('BLOQUEADO');
    expect(resultado).not.toHaveTextContent('FALHA');
    expect(screen.getByTestId('estado-geral')).toHaveTextContent('OK');
    expect(screen.getByTestId('estado-geral')).not.toHaveTextContent('FALHA');
    const verificacao = screen.getByText(/habilidades OK/);
    expect(verificacao).toHaveTextContent('0 com falha');
    expect(verificacao).toHaveTextContent('OK');
    expect(verificacao).not.toHaveTextContent('FALHA');
  });

  it('padrões A–F com demanda bloqueada: "não exercido" em tom neutro, sem FALHOU na coluna do produto', () => {
    render(<SaudeDoSistema />);
    fireEvent.change(screen.getByLabelText(/Demanda fictícia do fluxo/), { target: { value: 'DEM-FIC-0004' } });
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    expect(screen.getAllByText(/NÃO EXERCIDO NESTA EXECUÇÃO/).length).toBe(4);
    expect(screen.queryByText(/FALHOU/)).not.toBeInTheDocument();
  });

  it('fluxo liberado aparece com o selo LIBERADO', () => {
    render(<SaudeDoSistema />);
    fireEvent.click(screen.getByRole('button', { name: 'Executar verificação' }));
    expect(screen.getByTestId('resultado-do-fluxo')).toHaveTextContent('Fluxo DEM-FIC-0001: liberado pelo gate');
    expect(screen.getByTestId('resultado-do-fluxo')).toHaveTextContent('LIBERADO');
  });
});
