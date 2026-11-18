import { fireEvent, render, screen } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Agenda } from './Agenda.tsx';
import { gerarIcs, gradeDoMes, montarAgenda, operacoesNoDia } from './regras.ts';
import type { Operacao } from '../operacoes/modelo.ts';

const op = (saida: string | undefined, situacao: 'planejado' | 'cancelado' = 'planejado'): Operacao => ({
  id: 'o1', nome: 'Op', criadaEm: '2026-11-01T00:00:00Z',
  pontos: [{ id: 'p1', coordenada: { lat: -11, lon: -58 }, municipio: 'Cidade', equipe: 'A', saida, notas: '', demandas: [], situacao }],
});

function montar() {
  localStorage.clear();
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Agenda agora={() => new Date('2026-12-01T10:00:00')} /></ContextoArmazem.Provider>);
}

describe('agenda', () => {
  it('agrupa por dia ordenado: vistoria aberta, saída planejada; ignora concluída, cancelado e sem data', () => {
    const dias = montarAgenda(
      [
        { titulo: 'V1', status: 'Em andamento', vistoria: { data: '2026-12-02' } },
        { titulo: 'V2', status: 'Concluída', vistoria: { data: '2026-12-02' } },
        { titulo: 'V3', status: 'Nova', vistoria: {} },
      ] as never,
      [op('2026-12-01'), op('2026-12-02'), op('2026-12-03', 'cancelado'), op(undefined)],
    );
    expect(dias.map((d) => d.dia)).toEqual(['2026-12-01', '2026-12-02']);
    expect(dias[1].itens.map((i) => i.tipo)).toEqual(['vistoria', 'saida']);
  });

  it('a tela abre no mês atual, sem eventos', () => {
    montar();
    expect(screen.getByRole('heading', { level: 1, name: 'Agenda' })).toBeInTheDocument();
    expect(screen.getByTestId('agenda-mes')).toHaveTextContent(/dezembro de 2026/i);
    expect(screen.getByText('Nada marcado neste dia.')).toBeInTheDocument();
  });
});

describe('calendário mensal e .ics', () => {
  it('a grade começa no domingo e cobre o mês inteiro em semanas completas', () => {
    const g = gradeDoMes(2026, 11); // 1/11/2026 é domingo; 30/11 é segunda
    expect(g[0][0]).toEqual({ data: '2026-11-01', doMes: true });
    expect(g.every((s) => s.length === 7)).toBe(true);
    expect(g.flat().some((c) => c.data === '2026-11-30' && c.doMes)).toBe(true);
    expect(g.at(-1)![6].doMes).toBe(false);
  });

  it('gera .ics com evento de dia inteiro, escape e fim exclusivo', () => {
    const ics = gerarIcs([{ data: '2026-12-31', tipo: 'vistoria', texto: 'A, B; C' }], new Date('2026-12-01T10:00:00Z'));
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101');
    expect(ics).toContain('SUMMARY:Vistoria: A\\, B\\; C');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('navega o mês e volta com "Hoje"', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
    expect(screen.getByTestId('agenda-mes')).toHaveTextContent(/janeiro de 2027/i);
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(screen.getByTestId('agenda-mes')).toHaveTextContent(/dezembro de 2026/i);
  });
});

describe('período da operação', () => {
  it('cobre os dias de inicio a fim; com um lado só, aquele dia; sem período, nenhum', () => {
    const ops = [{ nome: 'A', inicio: '2026-12-01', fim: '2026-12-05' }, { nome: 'B', inicio: '2026-12-10' }, { nome: 'C' }];
    expect(operacoesNoDia(ops, '2026-12-03')).toEqual(['A']);
    expect(operacoesNoDia(ops, '2026-12-05')).toEqual(['A']);
    expect(operacoesNoDia(ops, '2026-12-06')).toEqual([]);
    expect(operacoesNoDia(ops, '2026-12-10')).toEqual(['B']);
    expect(operacoesNoDia(ops, '2026-12-11')).toEqual([]);
  });

  it('a tela marca os dias da operação em vermelho', () => {
    localStorage.clear();
    localStorage.setItem('guara:operacoes:v1', JSON.stringify([{ id: 'o1', nome: 'Op X', inicio: '2026-12-07', fim: '2026-12-11', criadaEm: '2026-11-01T00:00:00Z', pontos: [] }]));
    const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
    render(<ContextoArmazem.Provider value={armazem}><Agenda agora={() => new Date('2026-12-01T10:00:00')} /></ContextoArmazem.Provider>);
    expect(screen.getByTestId('dia-2026-12-09').className).toContain('agenda-dia--operacao');
    expect(screen.getByTestId('dia-2026-12-12').className).not.toContain('agenda-dia--operacao');
    fireEvent.click(screen.getByTestId('dia-2026-12-09'));
    expect(screen.getByText('Em operação: Op X')).toBeInTheDocument();
  });
});
