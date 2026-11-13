// Tela Alertas (P06; cenário 10): demanda com última ação há 5 dias e limiar 3
// gera alerta; uma ação relevante (mudança de status) remove o alerta.
// Importação inválida e cancelada não alteram os dados.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import type { Demanda } from '../demandas/modelo.ts';
import { exportarDados } from './dados-portaveis.ts';
import { Alertas } from './Alertas.tsx';

const AGORA = new Date('2026-11-13T12:00:00.000Z');
const ANTIGA: Demanda = {
  id: 'velha', titulo: 'Demanda parada (fictícia)', descricao: '', responsavel: 'Equipe', prioridade: 'Alta',
  status: 'Em Andamento', criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-08T12:00:00.000Z',
};

function montar() {
  const armazem = criarArmazem(localStorage, { agora: () => AGORA, exemplos: () => [{ ...ANTIGA }] });
  render(
    <ContextoArmazem.Provider value={armazem}>
      <Alertas agora={() => AGORA} />
    </ContextoArmazem.Provider>,
  );
  return armazem;
}

const arquivo = (conteudo: string) => new File([conteudo], 'guara-dados.json', { type: 'application/json' });

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('tela Alertas', () => {
  it('alerta aparece com 5 dias e limiar 3, e some após ação relevante', () => {
    const armazem = montar();
    expect(screen.getByTestId('inativa-velha')).toHaveTextContent('há 5 dia(s)');
    act(() => { armazem.mudarStatus('velha', 'Em Validação'); });
    expect(screen.queryByTestId('inativa-velha')).toBeNull();
    expect(screen.getByText(/Nenhuma demanda inativa/)).toBeInTheDocument();
  });

  it('limiar maior remove o alerta e fica gravado', () => {
    const armazem = montar();
    fireEvent.change(screen.getByLabelText(/quantos dias corridos/), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar limiar' }));
    expect(screen.getByRole('status')).toHaveTextContent('7 dia(s)');
    expect(screen.queryByTestId('inativa-velha')).toBeNull();
    expect(armazem.obter().diasInatividade).toBe(7);
  });

  it('importação inválida é recusada sem alterar dados', async () => {
    const armazem = montar();
    fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo('{ruim')] } });
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Importação recusada'));
    expect(armazem.obter().demandas.map((d) => d.id)).toEqual(['velha']);
  });

  it('importação válida pede confirmação; cancelar não altera, confirmar substitui com backup', async () => {
    const armazem = montar();
    const novo = exportarDados([{ ...ANTIGA, id: 'nova1' }, { ...ANTIGA, id: 'nova2' }], 3, AGORA);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo(novo)] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importação cancelada'));
    expect(armazem.obter().demandas.map((d) => d.id)).toEqual(['velha']);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.change(screen.getByLabelText('Arquivo JSON para importar'), { target: { files: [arquivo(novo)] } });
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Importadas 2'));
    expect(armazem.obter().demandas.map((d) => d.id)).toEqual(['nova1', 'nova2']);
    expect(screen.getByRole('button', { name: 'Desfazer última importação' })).toBeEnabled();
  });
});
