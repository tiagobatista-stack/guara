import { beforeEach, describe, expect, it } from 'vitest';
import { criarCompromisso, obterCompromissos, obterRascunho } from '../agenda/compromissos.ts';
import { classificar } from './classificar.ts';
import { lerRotaDeCompromisso, respostaDeAgenda, respostaDeCompromisso, respostaDeDecisao, rotaParaCorrigirCompromisso } from './compromissoPelaConversa.ts';
import { respostaDeLembrete } from './lembrarPelaConversa.ts';
import { validarMensagem } from './conversa.ts';
import type { Demanda } from '../demandas/modelo.ts';

// Sábado, 21/11/2026, 10h.
const SABADO = new Date(2026, 10, 21, 10);
const demandas = [{ id: 'DEM-FIC-0003', titulo: 'Licença de Sinop' }] as unknown as Demanda[];
const pedir = (frase: string) => respostaDeCompromisso(frase, demandas, SABADO);

beforeEach(() => localStorage.clear());

describe('confirmação antes de gravar', () => {
  it('"reunião dia 10/12 sobre licenciamento" mostra o que entendeu e NÃO grava', () => {
    const [m] = pedir('reunião dia 10/12 sobre licenciamento');
    expect(m.natureza).toBe('inferência');
    expect(m.fonte).toBe('interpretação da frase por regras; confira');
    expect(m.texto).toBe('Vou anotar: Reunião — licenciamento · quinta, 10/12/2026 · dia todo.');
    expect(m.acoes?.map((a) => a.rotulo)).toEqual(['Confirmar', 'Corrigir', 'Cancelar']);
    expect(obterCompromissos()).toEqual([]);
    expect(obterRascunho()).toMatchObject({ tipo: 'reunião', data: '2026-12-10', assunto: 'licenciamento' });
  });

  it('mostra hora e demanda vinculada', () => {
    const [m] = pedir('palestra amanhã às 14h sobre DEM-FIC-0003');
    expect(m.texto).toContain('Palestra — Licença de Sinop · domingo, 22/11/2026 · às 14:00 · demanda DEM-FIC-0003');
  });

  it('código de demanda inexistente: avisa e segue sem vínculo', () => {
    const [m] = pedir('reunião amanhã sobre DEM-FIC-0099');
    expect(m.texto).toContain('Não encontrei DEM-FIC-0099');
    expect(obterRascunho()?.demanda).toBeUndefined();
  });

  it('Confirmar grava; a resposta é fato e some o rascunho', () => {
    pedir('reunião dia 10/12 sobre licenciamento');
    const [m] = respostaDeDecisao('confirmar compromisso', SABADO)!;
    expect(m.natureza).toBe('fato');
    expect(m.texto).toContain('Anotado: Reunião — licenciamento');
    expect(obterCompromissos()).toHaveLength(1);
    expect(obterRascunho()).toBeNull();
    // Confirmar de novo não grava duas vezes.
    expect(respostaDeDecisao('confirmar compromisso', SABADO)![0].texto).toContain('nenhum compromisso esperando');
    expect(obterCompromissos()).toHaveLength(1);
  });

  it('Cancelar não grava nada; "sim" e "não" digitados valem só com algo pendente', () => {
    expect(respostaDeDecisao('sim', SABADO)).toBeNull();
    pedir('curso amanhã');
    expect(respostaDeDecisao('cancelar compromisso', SABADO)![0].texto).toBe('Cancelado. Nada foi gravado.');
    expect(obterCompromissos()).toEqual([]);
    pedir('curso amanhã');
    respostaDeDecisao('sim', SABADO);
    expect(obterCompromissos()).toHaveLength(1);
    pedir('curso 25/11');
    respostaDeDecisao('não', SABADO);
    expect(obterCompromissos()).toHaveLength(1);
  });

  it('"Corrigir" leva à Agenda com o formulário preenchido, em rota aceita pela conversa', () => {
    const [m] = pedir('reunião dia 10/12 às 9h sobre licenciamento | x');
    const corrigir = m.acoes!.find((a) => a.rotulo === 'Corrigir')!;
    expect(corrigir.rota).toMatch(/^#\/agenda\?novo=/);
    const url = new URL(corrigir.rota!.replace('#', 'http://x/'));
    void url;
    const valor = decodeURIComponent(corrigir.rota!.split('?novo=')[1]);
    expect(lerRotaDeCompromisso(valor)).toEqual({ tipo: 'reunião', data: '2026-12-10', hora: '09:00', assunto: 'licenciamento | x' });
    // A conversa guardada só aceita rotas conhecidas: a do "Corrigir" passa.
    const guardada = validarMensagem({ autor: 'assistente', texto: 't', natureza: 'inferência', fonte: 'f', acoes: [corrigir] });
    expect(guardada?.acoes?.[0].rota).toBe(corrigir.rota);
  });

  it('os botões Confirmar e Cancelar levam a ação direta, que sobrevive à conversa guardada e é validada', () => {
    const [m] = pedir('reunião dia 10/12 sobre licenciamento');
    const [confirmar, , cancelar] = m.acoes!;
    expect(confirmar.acao).toMatchObject({ tipo: 'confirmar-compromisso', dados: { tipo: 'reunião', data: '2026-12-10', assunto: 'licenciamento' } });
    expect(cancelar.acao).toEqual({ tipo: 'cancelar-compromisso' });
    const guardada = validarMensagem(JSON.parse(JSON.stringify(m)));
    expect(guardada?.acoes?.[0].acao).toEqual(confirmar.acao);
    const adulterada = validarMensagem({ ...m, acoes: [{ ...confirmar, acao: { tipo: 'confirmar-compromisso', dados: { tipo: 'reunião', data: '2026-02-31', assunto: 'x' } } }] });
    expect(adulterada?.acoes?.[0].acao).toBeUndefined();
    expect(validarMensagem({ ...m, acoes: [{ ...confirmar, acao: { tipo: 'apagar-tudo' } }] })?.acoes?.[0].acao).toBeUndefined();
  });

  it('a leitura da rota descarta o que não cabe nos campos', () => {
    expect(lerRotaDeCompromisso('festa|ontem|99:99|x|texto')).toEqual({ assunto: 'texto' });
    expect(lerRotaDeCompromisso(null)).toBeNull();
    expect(rotaParaCorrigirCompromisso({ tipo: 'curso', data: '2026-12-01', assunto: 'a b' })).toBe('#/agenda?novo=curso%7C2026-12-01%7C%7C%7Ca%20b');
  });
});

describe('perguntas quando falta ou está errado', () => {
  it.each([
    ['reunião sobre licenciamento', 'Não entendi a data'],
    ['reunião 31/02', 'não existe'],
    ['reunião 10/11/2026', 'já passou'],
    ['reunião amanhã às 25h', 'Não entendi a hora'],
    ['reunião hoje às 9h', 'já passou'],
  ])('%s → pergunta e não grava', (frase, trecho) => {
    const [m] = pedir(frase);
    expect(m.natureza).toBe('sugestão');
    expect(m.texto).toContain(trecho);
    expect(m.acoes?.map((a) => a.rotulo)).toEqual(['Abrir formulário']);
    expect(obterRascunho()).toBeNull();
    expect(obterCompromissos()).toEqual([]);
  });
});

describe('classificação: tipo + data vence gatilho de outro comando', () => {
  it('"reunião dia 10/12 sobre prazos" é compromisso, não o comando prazos', () => {
    expect(classificar('reunião dia 10/12 sobre prazos', SABADO)?.id).toBe('compromisso');
    expect(classificar('prazos', SABADO)?.id).toBe('prazos');
  });
  it('agenda e variações', () => {
    for (const f of ['agenda', 'compromissos', 'o que tenho hoje?', 'o que tenho amanhã', 'o que tenho na semana']) expect(classificar(f, SABADO)?.id, f).toBe('agenda');
  });
});

describe('comando agenda', () => {
  const cmp = (data: string, tipo: 'reunião' | 'lembrete', assunto: string, hora?: string) => criarCompromisso({ tipo, data, assunto, ...(hora ? { hora } : {}) }, SABADO.toISOString());
  const listar = (frase: string) => respostaDeAgenda(frase, obterCompromissos(), [], [], SABADO)[0];

  it('hoje, amanhã e próximos 7 dias, com hora e tipo; concluído fica de fora', () => {
    cmp('2026-11-21', 'reunião', 'licenciamento', '14:30');
    cmp('2026-11-22', 'lembrete', 'ligar para o João');
    cmp('2026-11-30', 'reunião', 'longe');
    expect(listar('o que tenho hoje?').texto).toBe('Agenda hoje:\n• 14:30 Reunião — licenciamento');
    expect(listar('o que tenho amanhã').texto).toBe('Agenda amanhã:\n• Lembrete — ligar para o João');
    const semana = listar('agenda').texto;
    expect(semana).toContain('sábado, 21/11/2026:');
    expect(semana).toContain('domingo, 22/11/2026:');
    expect(semana).not.toContain('longe');
    expect(listar('agenda').natureza).toBe('fato');
  });

  it('sem nada marcado, diz isso', () => {
    expect(listar('o que tenho hoje').texto).toBe('Nada marcado hoje.');
  });
});

describe('lembrete próprio x soneca (precedência)', () => {
  const avisos: Parameters<typeof respostaDeLembrete>[2] = [{ id: 'DEM-FIC-0003', titulo: 'x', tipo: 'vencida', texto: 'x', situacao: 'v' }] as never;
  const lembrar = (frase: string, id: string | null, av = avisos) => respostaDeLembrete(frase, id, av, demandas, SABADO, {}, 'origem');

  it('com aviso ativo, "lembrar DEM-FIC-0003 amanhã" continua sendo a soneca (grava direto, sem confirmação)', () => {
    const [m] = lembrar('lembrar DEM-FIC-0003 amanhã', 'DEM-FIC-0003');
    expect(m.fonte).toBe('lembrete criado agora');
    expect(obterRascunho()).toBeNull();
  });

  it('sem aviso ativo, vira lembrete próprio com confirmação (corrige a limitação do item 3)', () => {
    const [m] = lembrar('lembrar DEM-FIC-0003 amanhã às 9h', 'DEM-FIC-0003', []);
    expect(m.texto).toBe('Vou anotar: Lembrete — Licença de Sinop · domingo, 22/11/2026 · às 09:00 · demanda DEM-FIC-0003.');
    respostaDeDecisao('confirmar compromisso', SABADO);
    expect(obterCompromissos()[0]).toMatchObject({ tipo: 'lembrete', demanda: 'DEM-FIC-0003', hora: '09:00' });
  });

  it('lembrete livre, sem código: "lembrar de ligar para o João amanhã"', () => {
    const [m] = lembrar('lembrar de ligar para o João amanhã', null, []);
    expect(m.texto).toContain('Vou anotar: Lembrete — ligar para o João');
  });

  it('"lembrar" sem quando continua perguntando', () => {
    expect(lembrar('lembrar', null)[0].natureza).toBe('sugestão');
    expect(obterRascunho()).toBeNull();
  });
});
