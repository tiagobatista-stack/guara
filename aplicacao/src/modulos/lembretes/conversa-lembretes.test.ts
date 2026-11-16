import { beforeEach, describe, expect, it } from 'vitest';
import { limparLembretesPessoais, obterLembretesPessoais } from './armazem.ts';
import { responderLembretes, type DemandaParaLembrete } from './conversa-lembretes.ts';

// Domingo, 15/11/2026, 22h50.
const AGORA = new Date(2026, 10, 15, 22, 50);
const DEMANDAS: DemandaParaLembrete[] = [
  { id: 'DEM-1', titulo: 'Vistoria (fictícia)', status: 'A Fazer', processo: 'FIC-2026-0001' },
  { id: 'DEM-2', titulo: 'Parecer antigo (fictício)', status: 'Concluída', processo: 'FIC-2026-0002' },
];
const falar = (comando: string) => responderLembretes(comando, { agora: AGORA, demandas: DEMANDAS });

beforeEach(() => limparLembretesPessoais());

describe('lembretes na conversa', () => {
  it('cria o lembrete e confirma como inferência, com a hora por extenso e "Desfazer"', () => {
    const [r] = falar('me lembre de beber água daqui 1 min')!;
    expect(r.natureza).toBe('inferência');
    expect(r.texto).toContain('Lembrete 1: «beber água», hoje às 22h51 (daqui 1 min).');
    expect(r.texto).toContain('É um hábito');
    expect(r.opcoes).toEqual([{ rotulo: 'Desfazer', comando: 'cancelar lembrete 1' }]);
    expect(obterLembretesPessoais()).toHaveLength(1);
  });

  it('comandos que não são de lembrete devolvem null (o assistente segue com "prazos", "ajuda")', () => {
    expect(falar('prazos')).toBeNull();
    expect(falar('ajuda')).toBeNull();
    expect(falar('bom dia')).toBeNull();
  });

  it('pergunta quando falta informação, com respostas prontas', () => {
    const [r] = falar('me lembre de tomar antibiótico 3x ao dia')!;
    expect(r.natureza).toBe('sugestão');
    expect(r.opcoes!.map((o) => o.rotulo)).toEqual(['Agora', 'Às 8h', 'Às 12h']);
    expect(obterLembretesPessoais()).toHaveLength(0);
  });

  it('com nº de processo de uma demanda aberta, o lembrete fica ligado a ela', () => {
    const [r] = falar('ligar para o proprietário do processo FIC-2026-0001 amanhã de manhã')!;
    expect(r.texto).toContain('amanhã (seg 16/11) às 9h');
    expect(r.texto).toContain('Ligado à demanda DEM-1');
    expect(obterLembretesPessoais()[0]).toMatchObject({ demandaId: 'DEM-1', demandaTitulo: 'Vistoria (fictícia)' });

    const [semVinculo] = falar('me lembre de revisar FIC-2026-0002 amanhã')!;
    expect(semVinculo.texto).toContain('Nenhuma demanda aberta com FIC-2026-0002');
  });

  it('"lembretes" lista; "cancelar lembrete N" cancela com desfazer; "parar de me lembrar da água" acha pelo texto', () => {
    falar('me lembre de beber água de hora em hora');
    falar('me lembre de pagar a conta sexta');
    const [lista] = falar('lembretes')!;
    expect(lista.texto).toContain('1) «beber água»');
    expect(lista.texto).toContain('2) «pagar a conta», sex 20/11 às 9h');

    const [cancelado] = falar('cancelar lembrete 2')!;
    expect(cancelado.texto).toBe('Lembrete 2 cancelado («pagar a conta»).');
    expect(cancelado.opcoes).toEqual([{ rotulo: 'Desfazer', comando: 'reativar lembrete 2' }]);
    expect(falar('reativar lembrete 2')![0].texto).toContain('Lembrete 2 ativo de novo');

    expect(falar('parar de me lembrar da água')![0].texto).toBe('Lembrete 1 cancelado («beber água»).');
    expect(falar('cancelar lembrete 9')![0].texto).toContain('Não achei o lembrete 9');
  });

  it('"avisos" sem nada nas últimas 24 h', () => {
    expect(falar('avisos')![0].texto).toBe('Nenhum aviso de lembrete nas últimas 24 h.');
  });
});
