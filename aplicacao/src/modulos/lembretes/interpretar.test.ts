import { describe, expect, it } from 'vitest';
import { interpretarLembrete, temGatilhoDeLembrete, type PedidoLembrete } from './interpretar.ts';

// Domingo, 15/11/2026, 22h50, no fuso do navegador.
const AGORA = new Date(2026, 10, 15, 22, 50);
const em = (dia: number, h: number, m = 0) => new Date(2026, 10, dia, h, m);

function pedido(frase: string, agora = AGORA): PedidoLembrete {
  const r = interpretarLembrete(frase, agora);
  if (r.tipo !== 'lembrete') throw new Error(`esperava lembrete em "${frase}", veio ${JSON.stringify(r)}`);
  return r.pedido;
}

describe('lembretes: leitura da frase', () => {
  it('relativo: "daqui 1 min", "daqui meia hora", "daqui uma hora e meia", "daqui 2h", "daqui a pouco"', () => {
    expect(pedido('me lembre de beber água daqui 1 min')).toMatchObject({ texto: 'beber água', proximo: em(15, 22, 51), firme: false });
    expect(pedido('me avisa daqui meia hora')).toMatchObject({ texto: 'Lembrete', proximo: em(15, 23, 20) });
    expect(pedido('me lembre de ligar pro João (fictício) daqui uma hora e meia').proximo).toEqual(em(16, 0, 20));
    expect(pedido('me lembre de ligar daqui 2h').proximo).toEqual(em(16, 0, 50));
    expect(pedido('me lembra de conferir o e-mail daqui a pouco').proximo).toEqual(em(15, 23, 5));
  });

  it('hora de hoje que já passou vai para amanhã, com a observação', () => {
    const p = pedido('me lembre de buscar o carro às 14h');
    expect(p).toMatchObject({ texto: 'buscar o carro', proximo: em(16, 14) });
    expect(p.notas[0]).toMatch(/amanhã, porque 14h de hoje já passou/);
  });

  it('"às 3" sem "h" é da tarde; "às 7h" fica de manhã; "às 3 da manhã" respeita o período', () => {
    expect(pedido('lembrete reunião às 3').proximo).toEqual(em(16, 15));
    expect(pedido('lembrete reunião amanhã às 7h').proximo).toEqual(em(16, 7));
    expect(pedido('lembrete reunião amanhã às 3 da manhã').proximo).toEqual(em(16, 3));
    expect(pedido('lembrete reunião amanhã às 2 da tarde').proximo).toEqual(em(16, 14));
  });

  it('dia sem hora usa 9h; dia da semana, data e "daqui 3 dias"', () => {
    expect(pedido('me lembre de pagar a conta sexta')).toMatchObject({ texto: 'pagar a conta', proximo: em(20, 9) });
    expect(pedido('me lembre de enviar o relatório dia 20/11 às 10h')).toMatchObject({ texto: 'enviar o relatório', proximo: em(20, 10) });
    expect(pedido('me lembre de revisar FIC-2026-0001 daqui 3 dias').proximo).toEqual(em(18, 9));
  });

  it('períodos do dia: "amanhã de manhã" 9h, "depois do almoço" 13h, "à noite" 19h', () => {
    expect(pedido('me lembre de almoçar depois do almoço').proximo).toEqual(em(16, 13));
    expect(pedido('me lembre de regar as plantas amanhã à noite').proximo).toEqual(em(16, 19));
  });

  it('com nº de processo e sem "me lembre": verbo de ação + tempo vira lembrete ligado ao processo', () => {
    const p = pedido('ligar para o proprietário do processo 213456/2022 amanhã de manhã');
    expect(p).toMatchObject({ texto: 'ligar para o proprietário do processo 213456/2022', proximo: em(16, 9), firme: true, processo: '213456/2022' });
    expect(pedido('me lembre de revisar FIC-2026-0001 amanhã').processo).toBe('FIC-2026-0001');
  });

  it('frases que não são lembrete seguem para os outros comandos', () => {
    for (const frase of ['bom dia', 'prazos', 'ajuda', 'ligar', 'relatório mensal até sexta']) {
      expect(interpretarLembrete(frase, AGORA)).toEqual({ tipo: 'nao-e-lembrete' });
    }
    expect(temGatilhoDeLembrete('Me lembre de algo')).toBe(true);
    expect(temGatilhoDeLembrete('prazos')).toBe(false);
  });

  it('pedido sem quando: pergunta, com respostas prontas que completam a frase', () => {
    const r = interpretarLembrete('me lembre de pagar o boleto', AGORA);
    expect(r.tipo).toBe('pergunta');
    if (r.tipo !== 'pergunta') return;
    expect(r.texto).toContain('«pagar o boleto»');
    expect(r.opcoes.map((o) => o.comando)).toContain('me lembre de pagar o boleto daqui 10 min');
  });
});

describe('lembretes: repetição e remédio', () => {
  it('"3x ao dia": pergunta a primeira vez e depois a duração; nunca sugere dose', () => {
    const primeira = interpretarLembrete('me lembre de tomar antibiótico 3x ao dia', AGORA);
    expect(primeira.tipo).toBe('pergunta');
    if (primeira.tipo !== 'pergunta') return;
    expect(primeira.texto).toContain('8 em 8 horas');
    const comHora = primeira.opcoes.find((o) => o.rotulo === 'Às 8h')!.comando;

    const duracao = interpretarLembrete(comHora, AGORA);
    expect(duracao.tipo).toBe('pergunta');
    if (duracao.tipo !== 'pergunta') return;
    expect(duracao.texto).toContain('Siga a receita');

    const p = pedido(duracao.opcoes.find((o) => o.rotulo === '7 dias')!.comando);
    expect(p).toMatchObject({ texto: 'tomar antibiótico', regra: { tipo: 'intervalo', minutos: 480 }, proximo: em(16, 8), fim: em(23, 8), firme: true, remedio: true });
    expect(p.notas.join(' ')).toContain('cai às 0h');
  });

  it('"de 8 em 8 horas começando agora sem fim"', () => {
    expect(pedido('me lembre de tomar remédio de 8 em 8 horas começando agora sem fim')).toMatchObject({
      proximo: em(15, 22, 50), regra: { tipo: 'intervalo', minutos: 480 }, fim: undefined,
    });
  });

  it('hábito "de hora em hora" é suave e começa dentro da janela do dia (7h–22h)', () => {
    expect(pedido('me lembra de beber água de hora em hora')).toMatchObject({ texto: 'beber água', regra: { tipo: 'intervalo', minutos: 60 }, proximo: em(16, 7), firme: false });
    expect(pedido('me lembre de alongar a cada 30 min').regra).toEqual({ tipo: 'intervalo', minutos: 30 });
  });

  it('todo dia, dias úteis e dias da semana', () => {
    expect(pedido('tomar vitamina todo dia às 7h por 30 dias')).toMatchObject({ regra: { tipo: 'diario' }, proximo: em(16, 7), fim: new Date(2026, 11, 16, 7) });
    expect(pedido('lembrete relatório toda segunda e quarta às 8h')).toMatchObject({ texto: 'relatório', regra: { tipo: 'semanal', dias: [1, 3] }, proximo: em(16, 8) });
    // Quinta 19/11 às 18h: sexta 20/11 é feriado nacional (Consciência Negra), então a próxima é segunda 23/11.
    expect(pedido('lembrete ponto dias úteis às 8h', new Date(2026, 10, 19, 18)).proximo).toEqual(em(23, 8));
  });
});
