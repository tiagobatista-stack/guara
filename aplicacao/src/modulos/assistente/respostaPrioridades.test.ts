import { describe, expect, it } from 'vitest';
import type { Demanda } from '../demandas/modelo.ts';
import { MAXIMO_NA_FILA, respostaDePrioridades } from './respostaPrioridades.ts';

const AGORA = new Date(2026, 10, 13, 10, 0, 0); // sexta, 13/11/2026
const ORIGEM = 'demandas deste navegador · 13/11/2026';

const demanda = (o: Partial<Demanda> = {}): Demanda => ({
  id: 'DEM-FIC-0001', titulo: 'Demanda fictícia', descricao: '', responsavel: 'Ana Teste', prioridade: 'Baixa',
  status: 'Em Andamento', criadaEm: AGORA.toISOString(), ultimaAcaoRelevante: AGORA.toISOString(),
  natureza: 'comum', prazo: '2026-12-30', ...o,
});
const responder = (ds: Demanda[]) => respostaDePrioridades(ds, AGORA, 3, {}, ORIGEM);

describe('resposta do comando "prioridades"', () => {
  it('sem nada pedindo atenção: uma fala de fato, sem sugestão', () => {
    const r = responder([demanda(), demanda({ id: 'B', status: 'Concluída', prazo: '2026-11-01' })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ natureza: 'fato', fonte: ORIGEM });
    expect(r[0].texto).toContain('Nenhuma demanda aberta pede atenção');
  });

  it('lista a fila como inferência, com motivo e pontos, e a próxima ação como sugestão', () => {
    const r = responder([demanda({ id: 'A', prazo: '2026-11-11', prioridade: 'Alta' }), demanda({ id: 'B', prazo: undefined })]);
    expect(r.map((m) => m.natureza)).toEqual(['inferência', 'sugestão']);
    expect(r[0].texto).toContain('2 demandas pedem atenção');
    expect(r[0].texto).toContain('1. A — Demanda fictícia\n   prazo: vencido há 2 dias úteis + prioridade alta (74 pontos)');
    expect(r[0].texto).toContain('2. B — Demanda fictícia\n   sem prazo definido (10 pontos)');
    expect(r[0].fonte).toContain('determinístico');
    expect(r[1].texto).toBe('A → decidir: prorrogar o prazo ou concluir.');
  });

  it('mostra só as primeiras e avisa quantas ficaram de fora', () => {
    const muitas = Array.from({ length: MAXIMO_NA_FILA + 2 }, (_, i) => demanda({ id: `D${i}`, prazo: undefined }));
    const [fila] = responder(muitas);
    expect(fila.texto.match(/^\d+\. /gm)).toHaveLength(MAXIMO_NA_FILA);
    expect(fila.texto).toContain('E mais 2 no Dashboard e em Alertas.');
  });

  it('título longo é encurtado e o detalhe do bloqueio não aparece', () => {
    const d = demanda({ titulo: 'x'.repeat(100), bloqueio: { motivo: 'documento', desde: AGORA.toISOString(), detalhe: 'Fulano segredo' } });
    const texto = JSON.stringify(responder([d]));
    expect(texto).not.toContain('x'.repeat(61));
    expect(texto).not.toContain('Fulano');
    expect(texto).toContain('falta documento');
  });
});
