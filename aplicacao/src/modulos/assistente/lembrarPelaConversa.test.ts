import { beforeEach, describe, expect, it } from 'vitest';
import type { Demanda } from '../demandas/modelo.ts';
import type { Aviso } from './avisos.ts';
import { descreverQuando, respostaDeLembrete } from './lembrarPelaConversa.ts';
import { obterLembretes, silenciarDemanda } from './lembretes.ts';

// Sábado, 21/11/2026, 10h; segunda, 16/11/2026, 10h.
const SABADO = new Date(2026, 10, 21, 10);
const SEGUNDA = new Date(2026, 10, 16, 10);
const demandas = [{ id: 'DEM-FIC-0003' }, { id: 'DEM-FIC-0004' }] as unknown as Demanda[];
const avisos: Aviso[] = [{ id: 'DEM-FIC-0003', tipo: 'vencida', texto: 'x', situacao: 'vencida|A Fazer' }];
const ORIGEM = 'demandas deste navegador';
const pedir = (frase: string, id: string | null, agora = SABADO, av = avisos) =>
  respostaDeLembrete(frase, id, av, demandas, agora, {}, ORIGEM);

beforeEach(() => localStorage.clear());

describe('lembrete pela conversa', () => {
  it('segunda a partir de sábado: grava via adiarLembrete e confirma com data e hora absolutas', () => {
    const [m] = pedir('DEM-FIC-0003 lembrar segunda feira', 'DEM-FIC-0003');
    expect(m).toMatchObject({ natureza: 'fato', fonte: 'lembrete criado agora' });
    expect(m.texto).toContain('Tirei o aviso de DEM-FIC-0003 da lista; ele volta na segunda, 23/11/2026, às 8h, se a demanda ainda estiver atrasada ou parada.');
    expect(new Date(obterLembretes()['DEM-FIC-0003']!.adiadoAte!)).toEqual(new Date(2026, 10, 23, 8));
  });

  it('"segunda" dita numa segunda é a segunda seguinte', () => {
    const [m] = pedir('lembrar DEM-FIC-0003 segunda', 'DEM-FIC-0003', SEGUNDA);
    expect(m.texto).toContain('na segunda, 23/11/2026, às 8h');
  });

  it('em 2 horas e amanhã', () => {
    expect(pedir('lembrar em 2 horas', 'DEM-FIC-0003')[0].texto).toContain('hoje, 21/11/2026, às 12h');
    expect(pedir('lembrar amanhã', 'DEM-FIC-0003')[0].texto).toContain('amanhã, 22/11/2026, às 8h');
  });

  it('sem horário: pede o horário e oferece opções, sem gravar', () => {
    const [m] = pedir('lembrar DEM-FIC-0003', 'DEM-FIC-0003');
    expect(m.natureza).toBe('sugestão');
    expect(m.acoes!.length).toBeGreaterThanOrEqual(1);
    expect(m.acoes![0].comando).toMatch(/^lembrar DEM-FIC-0003 /);
    expect(obterLembretes()).toEqual({});
  });

  it('id inexistente, sem id, sem aviso e silenciada não gravam nada', () => {
    expect(pedir('lembrar amanhã', 'DEM-FIC-0099')[0].texto).toContain('Não encontrei DEM-FIC-0099');
    expect(pedir('lembrar amanhã', null)[0].natureza).toBe('sugestão');
    expect(pedir('lembrar amanhã', 'DEM-FIC-0004')[0].texto).toContain('Lembretes livres ainda não existem');
    silenciarDemanda(avisos[0], SABADO);
    expect(pedir('lembrar amanhã', 'DEM-FIC-0003')[0].texto).toContain('silenciada');
    expect(obterLembretes()['DEM-FIC-0003']!.adiadoAte).toBeUndefined();
  });

  it('descreverQuando: data distante vira "em dd/mm/aaaa"', () => {
    expect(descreverQuando(new Date(2026, 11, 10, 14, 30), SABADO)).toBe('em 10/12/2026, às 14h30');
  });
});
