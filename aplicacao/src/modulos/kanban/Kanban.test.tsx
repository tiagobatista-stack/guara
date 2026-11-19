// Kanban + Dashboard sobre a mesma fonte de verdade (P05; cenário 7 do PLANO.md).

import { fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import type { Demanda } from '../demandas/modelo.ts';
import { Demandas } from '../demandas/Demandas.tsx';
import { Painel } from '../painel/Painel.tsx';
import { Kanban } from './Kanban.tsx';
import { Mascote } from '../../compartilhado/Mascote.tsx';

const EXEMPLOS: Demanda[] = [
  { id: 'k1', titulo: 'Revisar checklist de laboratório', descricao: '', responsavel: 'Equipe A', prioridade: 'Alta', status: 'A Fazer', criadaEm: '2026-11-13T09:00:00.000Z', ultimaAcaoRelevante: '2026-11-13T09:00:00.000Z' },
  { id: 'k2', titulo: 'Conferir evidências de testes', descricao: '', responsavel: 'Equipe C', prioridade: 'Baixa', status: 'Em Validação', criadaEm: '2026-11-13T09:00:00.000Z', ultimaAcaoRelevante: '2026-11-13T09:00:00.000Z' },
];

const contagem = (status: string) => within(screen.getByTestId(`coluna-${status}`)).getByLabelText(/^\d+ demandas?$/).textContent;

beforeEach(() => localStorage.clear());

describe('Kanban', () => {
  it('move pelo menu, atualiza colunas, dashboard e localStorage, e persiste ao recarregar', () => {
    const armazem = criarArmazem(localStorage, { exemplos: () => EXEMPLOS.map((d) => ({ ...d })) });
    const agora = () => new Date('2026-11-13T12:00:00.000Z');
    render(
      <ContextoArmazem.Provider value={armazem}>
        <Kanban />
        <Painel agora={agora} />
      </ContextoArmazem.Provider>,
    );
    expect(contagem('A Fazer')).toBe('1');
    expect(contagem('Em Andamento')).toBe('0');
    expect(within(screen.getByTestId('metrica-status-Em Andamento')).getByText('0')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Mover "Revisar checklist de laboratório" para'), { target: { value: 'Em Andamento' } });

    expect(screen.getByRole('status')).toHaveTextContent('movida para Em Andamento');
    expect(contagem('A Fazer')).toBe('0');
    expect(contagem('Em Andamento')).toBe('1');
    expect(within(screen.getByTestId('coluna-Em Andamento')).getByText('Revisar checklist de laboratório')).toBeInTheDocument();
    expect(within(screen.getByTestId('metrica-status-Em Andamento')).getByText('1')).toBeInTheDocument();
    expect(screen.getByTestId('metrica-total')).toHaveTextContent('2');

    const recarregado = criarArmazem(localStorage, { exemplos: () => [] });
    expect(recarregado.obter().demandas.find((d) => d.id === 'k1')?.status).toBe('Em Andamento');
  });

  it('dashboard conta vencidas e inativas com relógio controlado', () => {
    const armazem = criarArmazem(localStorage, {
      exemplos: () => [
        { ...EXEMPLOS[0], prazo: '2026-11-10' },
        { ...EXEMPLOS[1], ultimaAcaoRelevante: '2026-11-08T09:00:00.000Z' },
      ],
    });
    render(
      <ContextoArmazem.Provider value={armazem}>
        <Painel agora={() => new Date('2026-11-13T12:00:00.000Z')} limiarDias={3} />
      </ContextoArmazem.Provider>,
    );
    expect(screen.getByTestId('metrica-vencidas')).toHaveTextContent('1');
    expect(screen.getByTestId('metrica-inativas')).toHaveTextContent('1');
    expect(screen.getByText(/parada há 5 dia/)).toBeInTheDocument();
  });

  it('mostra o prazo em dias úteis no Kanban, no dashboard e na lista, pulando o feriado de 20/11', () => {
    const armazem = criarArmazem(localStorage, {
      exemplos: () => [
        { ...EXEMPLOS[0], prazo: '2026-11-23' },
        { ...EXEMPLOS[1], prazo: '2026-11-10' },
        { ...EXEMPLOS[1], id: 'k3', titulo: 'Arquivar relatório', status: 'Concluída', prazo: '2026-11-10' },
      ],
    });
    const agora = () => new Date(2026, 10, 13, 12, 0); // sexta 13/11/2026, fuso local
    render(
      <ContextoArmazem.Provider value={armazem}>
        <Kanban agora={agora} />
        <Painel agora={agora} />
        <Demandas agora={agora} />
      </ContextoArmazem.Provider>,
    );
    expect(within(screen.getByTestId('coluna-A Fazer')).getByTestId('prazo-k1')).toHaveTextContent('faltam 5 dias úteis');
    const vencido = within(screen.getByTestId('coluna-Em Validação')).getByTestId('prazo-k2');
    expect(vencido).toHaveTextContent('vencido há 3 dias úteis');
    expect(vencido).toHaveClass('texto--falha');
    expect(screen.queryAllByTestId('prazo-k3')).toHaveLength(0);
    expect(screen.getByText(/vencida em 10\/11\/2026 \(vencido há 3 dias úteis\)/)).toBeInTheDocument();
    expect(within(screen.getByTestId('demanda-k1')).getByText('23/11/2026 · faltam 5 dias úteis')).toBeInTheDocument();
    expect(within(screen.getByTestId('demanda-k3')).getByText('10/11/2026')).toBeInTheDocument();
  });

  it('mostra o tempo em andamento só nas demandas "Em Andamento", no Kanban e na lista', () => {
    const armazem = criarArmazem(localStorage, {
      exemplos: () => [
        { ...EXEMPLOS[0], status: 'Em Andamento', ultimaAcaoRelevante: '2026-11-09T09:00:00.000Z' },
        EXEMPLOS[1],
      ],
    });
    const agora = () => new Date('2026-11-13T12:00:00.000Z');
    render(
      <ContextoArmazem.Provider value={armazem}>
        <Kanban agora={agora} />
        <Demandas agora={agora} />
      </ContextoArmazem.Provider>,
    );
    expect(within(screen.getByTestId('coluna-Em Andamento')).getByTestId('andamento-k1')).toHaveTextContent('em andamento · última ação há 4 dias');
    expect(within(screen.getByTestId('demanda-k1')).getByTestId('andamento-k1')).toHaveTextContent('última ação há 4 dias');
    expect(screen.queryAllByTestId('andamento-k2')).toHaveLength(0);
  });

  it('cartão travado mostra o motivo no Kanban, sem mudar de coluna', () => {
    const armazem = criarArmazem(localStorage, {
      exemplos: () => [{ ...EXEMPLOS[0], bloqueio: { motivo: 'documento', desde: '2026-11-13T12:00:00.000Z' } }],
    });
    render(
      <ContextoArmazem.Provider value={armazem}>
        <Kanban agora={() => new Date('2026-11-18T12:00:00.000Z')} />
      </ContextoArmazem.Provider>,
    );
    expect(within(screen.getByTestId('coluna-A Fazer')).getByTestId('bloqueio-k1')).toHaveTextContent('⛔ travada há 3 dias úteis: falta documento');
  });

  it('dashboard avisa quantas demandas em aberto estão sem prazo (concluída não conta)', () => {
    const armazem = criarArmazem(localStorage, {
      exemplos: () => [EXEMPLOS[0], EXEMPLOS[1], { ...EXEMPLOS[1], id: 'k3', status: 'Concluída' }, { ...EXEMPLOS[1], id: 'k4', prazo: '2026-11-30' }],
    });
    render(
      <ContextoArmazem.Provider value={armazem}>
        <Painel agora={() => new Date('2026-11-13T12:00:00.000Z')} />
      </ContextoArmazem.Provider>,
    );
    expect(screen.getByTestId('sem-prazo')).toHaveTextContent('2 demandas em aberto estão sem prazo. Faça a triagem na tela Alertas.');
  });
});

describe('Kanban e mascotes', () => {
  it('concluir uma demanda faz o mascote comemorar; concluir a última em aberto dá a festa grande', () => {
    const armazem = criarArmazem(localStorage, { exemplos: () => EXEMPLOS.map((d) => ({ ...d })) });
    const { container } = render(
      <ContextoArmazem.Provider value={armazem}>
        <Kanban />
        <Mascote especie="capivara" humor="tranquilo" />
      </ContextoArmazem.Provider>,
    );
    const mascote = container.querySelector('svg.mascote--vivo')!;

    fireEvent.change(screen.getByLabelText('Mover "Revisar checklist de laboratório" para'), { target: { value: 'Em Andamento' } });
    expect(mascote).not.toHaveClass('mascote--comemorando');

    fireEvent.change(screen.getByLabelText('Mover "Revisar checklist de laboratório" para'), { target: { value: 'Concluída' } });
    expect(mascote).toHaveClass('mascote--comemorando');
    expect(mascote).not.toHaveClass('mascote--festa-grande');

    fireEvent.change(screen.getByLabelText('Mover "Conferir evidências de testes" para'), { target: { value: 'Concluída' } });
    expect(mascote).toHaveClass('mascote--comemorando', 'mascote--festa-grande');
  });
});
