import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Demanda } from '../demandas/modelo.ts';
import { FilaDoDia, MAXIMO_NA_FILA_DO_DIA } from './FilaDoDia.tsx';
import { priorizarDemandas } from './priorizar.ts';

const AGORA = new Date(2026, 10, 13, 10, 0, 0);
const demanda = (o: Partial<Demanda> = {}): Demanda => ({
  id: 'DEM-FIC-0001', titulo: 'Demanda fictícia', descricao: '', responsavel: 'Ana Teste', prioridade: 'Baixa',
  status: 'Em Andamento', criadaEm: AGORA.toISOString(), ultimaAcaoRelevante: AGORA.toISOString(),
  natureza: 'comum', prazo: '2026-12-30', ...o,
});
const fila = (ds: Demanda[]) => priorizarDemandas(ds, AGORA, 3, {});

describe('FilaDoDia', () => {
  it('sem itens, diz que nada pede atenção', () => {
    render(<FilaDoDia itens={[]} origem="x" />);
    expect(screen.getByTestId('fila-vazia')).toHaveTextContent('Nada pede atenção agora.');
  });

  it('cada item mostra por que está aqui (com a marca) e a sugestão; só o primeiro abre aberto', () => {
    render(<FilaDoDia itens={fila([demanda({ id: 'A', prazo: '2026-11-11', prioridade: 'Alta' }), demanda({ id: 'B', prazo: undefined })])} origem="demandas deste navegador" />);
    const a = screen.getByTestId('fila-A');
    expect(a).toHaveTextContent('prazo: vencido há 2 dias úteis');
    expect(a).toHaveTextContent('(fato, 54 pontos)');
    expect(a).toHaveTextContent('prioridade alta (fato, 20 pontos)');
    expect(a).toHaveTextContent('Decidir: prorrogar o prazo ou concluir.');
    expect(within(a).getByText('Sugestão (decisão sua)')).toBeInTheDocument();
    expect(a.querySelector('details')).toHaveAttribute('open');
    expect(screen.getByTestId('fila-B').querySelector('details')).not.toHaveAttribute('open');
  });

  it('limita a lista e manda ao comando "prioridades" para o resto', () => {
    const muitas = Array.from({ length: MAXIMO_NA_FILA_DO_DIA + 2 }, (_, i) => demanda({ id: `D${i}`, prazo: undefined }));
    render(<FilaDoDia itens={fila(muitas)} origem="x" />);
    expect(screen.getByTestId('fila-do-dia').children).toHaveLength(MAXIMO_NA_FILA_DO_DIA);
    expect(screen.getByText(/E mais 2/)).toBeInTheDocument();
    expect(screen.getByText(/método determinístico/)).toBeInTheDocument();
  });
});
