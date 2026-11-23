import { describe, expect, it } from 'vitest';
import type { Demanda } from '../demandas/modelo.ts';
import { filtrarDemandas, FILTROS_VAZIOS } from '../demandas/regras.ts';
import { parametrosDaRota, rotaParaBuscarDemandas } from '../../nucleo/registro-modulos.ts';
import { validarConversa } from './conversa.ts';
import { respostaDeBusca } from './buscarPelaConversa.ts';

const d = (n: number, titulo: string, extra: Partial<Demanda> = {}): Demanda => ({
  id: `DEM-FIC-${String(n).padStart(4, '0')}`, titulo, descricao: '', responsavel: 'Equipe (fictícia)', prioridade: 'Média',
  status: 'A Fazer', criadaEm: '2026-11-01T10:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T10:00:00.000Z', ...extra,
}) as Demanda;

const demandas = [
  d(1, 'Licença de operação (FICTÍCIA)'),
  d(2, 'Vistoria de campo', { descricao: 'Verificar licença vencida' }),
  d(3, 'Parecer do embargo', { processo: '2026/001234' }),
];

describe('buscar pela conversa', () => {
  it('com termo: lista código, título e status, rotula como fato e oferece "Ver todos em Demandas"', () => {
    const [m] = respostaDeBusca('licença', demandas);
    expect(m.natureza).toBe('fato');
    expect(m.fonte).toBe('demandas deste navegador · busca por título, descrição ou número');
    expect(m.texto).toBe("Achei 2 demandas com 'licença':\n• DEM-FIC-0001 — Licença de operação (FICTÍCIA) (A Fazer)\n• DEM-FIC-0002 — Vistoria de campo (A Fazer)");
    expect(m.acoes).toEqual([{ rotulo: 'Ver todos em Demandas', comando: 'buscar licença', rota: '#/demandas?texto=licen%C3%A7a' }]);
  });

  it('acha pelo número do processo, como a tela Demandas', () => {
    expect(respostaDeBusca('001234', demandas)[0].texto).toContain('DEM-FIC-0003');
  });

  it('a conversa e a tela Demandas acham as mesmas demandas (mesma função de filtro)', () => {
    for (const termo of ['licença', 'LICENÇA', 'embargo', '2026', 'vistoria']) {
      const daTela = filtrarDemandas(demandas, { ...FILTROS_VAZIOS, texto: termo }).map((x) => x.id);
      const daConversa = respostaDeBusca(termo, demandas)[0].texto.match(/DEM-FIC-\d{4}/g) ?? [];
      expect(daConversa, termo).toEqual(daTela);
    }
  });

  it('mais de 5: mostra 5 e diz "e mais N"', () => {
    const muitas = Array.from({ length: 8 }, (_, i) => d(i + 1, `Licença ${i + 1}`));
    const [m] = respostaDeBusca('licença', muitas);
    expect(m.texto.split('\n')).toHaveLength(1 + 5 + 1);
    expect(m.texto).toContain("Achei 8 demandas com 'licença':");
    expect(m.texto).toMatch(/\ne mais 3\.$/);
    expect(m.texto).not.toContain('DEM-FIC-0006');
  });

  it("sem resultado: \"Não achei demanda com 'termo'.\" e nenhum botão próprio (o painel põe os de ajuda)", () => {
    const [m] = respostaDeBusca('xyz', demandas);
    expect(m.texto).toBe("Não achei demanda com 'xyz'.");
    expect(m.natureza).toBe('fato');
    expect(m.acoes).toBeUndefined();
  });

  it('sem termo: pergunta o que buscar, como sugestão', () => {
    const [m] = respostaDeBusca(null, demandas);
    expect(m.natureza).toBe('sugestão');
    expect(m.texto).toContain('O que você quer buscar?');
  });

  it('a rota leva o termo, é lida pela tela e passa pela validação da conversa gravada', () => {
    const rota = rotaParaBuscarDemandas('licença & "ação"');
    expect(parametrosDaRota(rota).get('texto')).toBe('licença & "ação"');
    const [m] = validarConversa([{ autor: 'assistente', texto: 'x', acoes: [{ rotulo: 'Ver', comando: 'buscar x', rota }, { rotulo: 'Mau', comando: 'y', rota: '#/demandas?texto=<script>' }] }]);
    expect(m.acoes?.[0].rota).toBe(rota);
    expect(m.acoes?.[1].rota).toBeUndefined();
  });
});
