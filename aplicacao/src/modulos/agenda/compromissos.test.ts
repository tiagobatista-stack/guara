import { beforeEach, describe, expect, it } from 'vitest';
import {
  adiarCompromisso, CHAVE_COMPROMISSOS, concluirCompromisso, concluirOcorrencia, criarCompromisso, diaCompleto, editarCompromisso,
  encerrarSerieAntesDe, excluirCompromisso, reabrirOcorrencia, guardarRascunho, limparRascunho, marcarCienteCompromisso, obterCompromissos, obterRascunho, problemaDoCompromisso,
  reabrirCompromisso, tituloDoCompromisso, validarCompromissos,
} from './compromissos.ts';
import { compromissosParaAvisar, horariosDeAviso, textoDoCompromisso } from './avisosDeCompromissos.ts';
import { gerarIcs, montarAgenda } from './regras.ts';

const AGORA = '2026-11-21T13:00:00.000Z';
const base = { tipo: 'reunião', data: '2026-12-10', assunto: 'licenciamento' } as const;

beforeEach(() => localStorage.clear());

describe('armazém de compromissos', () => {
  it('cria, grava em guara:compromissos:v1 e relê', () => {
    const r = criarCompromisso({ ...base, hora: '14:30', demanda: 'DEM-FIC-0003' }, AGORA);
    expect(r.ok).toBe(true);
    const [c] = obterCompromissos();
    expect(c).toMatchObject({ tipo: 'reunião', data: '2026-12-10', hora: '14:30', assunto: 'licenciamento', demanda: 'DEM-FIC-0003', criadoEm: AGORA });
    expect(JSON.parse(localStorage.getItem(CHAVE_COMPROMISSOS)!)).toHaveLength(1);
  });

  it('recusa dados inválidos sem gravar', () => {
    expect(criarCompromisso({ ...base, data: '2026-02-31' }, AGORA)).toMatchObject({ ok: false });
    expect(criarCompromisso({ ...base, hora: '25:00' }, AGORA)).toMatchObject({ ok: false });
    expect(criarCompromisso({ ...base, assunto: '   ' }, AGORA)).toMatchObject({ ok: false });
    expect(criarCompromisso({ ...base, demanda: 'x' }, AGORA)).toMatchObject({ ok: false });
    expect(criarCompromisso({ ...base, assunto: 'a'.repeat(121) }, AGORA)).toMatchObject({ ok: false });
    expect(obterCompromissos()).toEqual([]);
  });

  it('edita, conclui, reabre e exclui um por vez', () => {
    criarCompromisso(base, AGORA);
    criarCompromisso({ ...base, assunto: 'outro' }, AGORA);
    const [a, b] = obterCompromissos();
    expect(editarCompromisso(a.id, { ...base, assunto: 'editado', hora: '09:00' })).toEqual({ ok: true });
    concluirCompromisso(a.id);
    expect(obterCompromissos()[0]).toMatchObject({ assunto: 'editado', hora: '09:00', concluido: true });
    reabrirCompromisso(a.id);
    expect(obterCompromissos()[0].concluido).toBeUndefined();
    excluirCompromisso(a.id);
    expect(obterCompromissos().map((c) => c.id)).toEqual([b.id]);
  });

  it('mudar data ou hora zera "ciente" e "em 2 horas"; mudar só o assunto mantém', () => {
    criarCompromisso(base, AGORA);
    const [c] = obterCompromissos();
    marcarCienteCompromisso(c.id, new Date(AGORA));
    expect(obterCompromissos()[0].cienteEm).toBeDefined();
    editarCompromisso(c.id, { ...base, assunto: 'novo texto' });
    expect(obterCompromissos()[0].cienteEm).toBeDefined();
    editarCompromisso(c.id, { ...base, data: '2026-12-11' });
    expect(obterCompromissos()[0].cienteEm).toBeUndefined();
    adiarCompromisso(c.id, new Date(AGORA));
    expect(obterCompromissos()[0]).toMatchObject({ adiadoAte: AGORA });
  });

  it('validação descarta lixo, id repetido e dados ruins, sem derrubar o resto', () => {
    const bom = { id: 'cmp-1', criadoEm: AGORA, ...base };
    const lista = validarCompromissos([bom, bom, { ...bom, id: 'cmp-2', tipo: 'festa' }, { ...bom, id: 'cmp-3', data: 'ontem' }, null, 'x', { ...bom, id: 'cmp-4', hora: '99:99', concluido: true }]);
    expect(lista.map((c) => c.id)).toEqual(['cmp-1', 'cmp-4']);
    expect(lista[1].hora).toBeUndefined();
    expect(lista[1].concluido).toBe(true);
    expect(validarCompromissos('lixo')).toEqual([]);
  });

  it('conteúdo corrompido no localStorage não quebra: lista vazia', () => {
    localStorage.setItem(CHAVE_COMPROMISSOS, '{não é json');
    expect(obterCompromissos()).toEqual([]);
  });

  it('o rascunho fica em outra chave e some ao limpar', () => {
    guardarRascunho(base);
    expect(obterRascunho()).toMatchObject(base);
    expect(localStorage.getItem(CHAVE_COMPROMISSOS)).toBeNull();
    limparRascunho();
    expect(obterRascunho()).toBeNull();
  });

  it('textos: dia da semana, título e problema do formulário', () => {
    expect(diaCompleto('2026-12-10')).toBe('quinta, 10/12/2026');
    expect(tituloDoCompromisso(base)).toBe('Reunião — licenciamento');
    expect(tituloDoCompromisso({ tipo: 'curso', assunto: 'Curso' })).toBe('Curso');
    expect(problemaDoCompromisso({ ...base })).toBeNull();
    expect(problemaDoCompromisso({ ...base, tipo: 'x' })).toBe('Escolha o tipo.');
  });
});

describe('intervalo e repetição no armazém', () => {
  it('registro antigo, sem os campos novos, continua válido e sem migração', () => {
    const antigo = { id: 'cmp-1', criadoEm: AGORA, ...base, hora: '14:30', concluido: true };
    localStorage.setItem(CHAVE_COMPROMISSOS, JSON.stringify([antigo]));
    expect(obterCompromissos()).toEqual([antigo]);
    expect(obterCompromissos()[0].dataFim).toBeUndefined();
    expect(obterCompromissos()[0].repeticao).toBeUndefined();
  });

  it('grava dataFim e repetição; dataFim igual à data e "nenhuma" não são guardados', () => {
    criarCompromisso({ ...base, dataFim: '2026-12-12' }, AGORA);
    criarCompromisso({ ...base, assunto: 'um dia', dataFim: '2026-12-10', repeticao: 'nenhuma' as never, repetirAte: '2027-01-01' }, AGORA);
    criarCompromisso({ ...base, assunto: 'série', repeticao: 'semanal', repetirAte: '2027-01-14' }, AGORA);
    const [a, b, c] = obterCompromissos();
    expect(a).toMatchObject({ dataFim: '2026-12-12' });
    expect(b).not.toHaveProperty('dataFim');
    expect(b).not.toHaveProperty('repeticao');
    expect(b).not.toHaveProperty('repetirAte');
    expect(c).toMatchObject({ repeticao: 'semanal', repetirAte: '2027-01-14' });
  });

  it('ao salvar, recusa data de fim e fim de repetição inválidos e a combinação vários dias + hora + repetição', () => {
    expect(problemaDoCompromisso({ ...base, dataFim: '2026-12-09' })).toBe('A data de fim não pode ser antes da data de início.');
    expect(problemaDoCompromisso({ ...base, dataFim: '2026-02-31' })).toBe('Informe uma data de fim válida.');
    expect(problemaDoCompromisso({ ...base, dataFim: '2028-12-10' })).toMatch(/no máximo 366 dias/);
    expect(problemaDoCompromisso({ ...base, repeticao: 'quinzenal' })).toBe('Escolha uma repetição válida.');
    expect(problemaDoCompromisso({ ...base, repeticao: 'semanal', repetirAte: '2026-12-09' })).toBe('O fim da repetição não pode ser antes da data de início.');
    expect(problemaDoCompromisso({ ...base, repeticao: 'semanal', hora: '09:00', dataFim: '2026-12-11' })).toMatch(/vários dias com hora não pode se repetir/);
    // Combinações permitidas.
    expect(problemaDoCompromisso({ ...base, repeticao: 'semanal', dataFim: '2026-12-11' })).toBeNull();
    expect(problemaDoCompromisso({ ...base, hora: '09:00', dataFim: '2026-12-11' })).toBeNull();
    expect(problemaDoCompromisso({ ...base, repeticao: 'semanal', hora: '09:00' })).toBeNull();
    expect(criarCompromisso({ ...base, dataFim: '2026-12-09' }, AGORA)).toMatchObject({ ok: false });
    expect(obterCompromissos()).toEqual([]);
  });

  it('na leitura, dado inconsistente é descartado sem perder o registro', () => {
    const lista = validarCompromissos([
      { id: 'a', criadoEm: AGORA, ...base, dataFim: '2026-12-09' },
      { id: 'b', criadoEm: AGORA, ...base, repeticao: 'quinzenal', repetirAte: '2027-01-01' },
      { id: 'c', criadoEm: AGORA, ...base, repetirAte: '2027-01-01' },
      { id: 'd', criadoEm: AGORA, ...base, repeticao: 'diaria', repetirAte: '2026-01-01' },
      { id: 'e', criadoEm: AGORA, ...base, hora: '09:00', dataFim: '2026-12-11', repeticao: 'semanal' },
      { id: 'f', criadoEm: AGORA, ...base, dataFim: '2026-12-12', concluidasEm: ['2026-12-10'] },
      { id: 'g', criadoEm: AGORA, ...base, repeticao: 'semanal', concluidasEm: ['2026-12-10', 'x', '2026-12-10', '2026-12-17'] },
    ]);
    expect(lista.map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(lista[0].dataFim).toBeUndefined();
    expect(lista[1].repeticao).toBeUndefined();
    expect(lista[1].repetirAte).toBeUndefined();
    expect(lista[2].repetirAte).toBeUndefined();
    expect(lista[3].repeticao).toBe('diaria');
    expect(lista[3].repetirAte).toBeUndefined();
    expect(lista[4]).toMatchObject({ repeticao: 'semanal', hora: '09:00' });
    expect(lista[4].dataFim).toBeUndefined();
    expect(lista[5].concluidasEm).toBeUndefined();
    expect(lista[6].concluidasEm).toEqual(['2026-12-10', '2026-12-17']);
  });

  it('o rascunho guarda intervalo e repetição', () => {
    guardarRascunho({ ...base, dataFim: '2026-12-12' });
    expect(obterRascunho()).toMatchObject({ dataFim: '2026-12-12' });
    guardarRascunho({ ...base, repeticao: 'semanal', repetirAte: '2027-01-14' });
    expect(obterRascunho()).toMatchObject({ repeticao: 'semanal', repetirAte: '2027-01-14' });
  });

  it('concluir uma ocorrência da série não apaga as seguintes; reabrir desfaz só aquela', () => {
    criarCompromisso({ ...base, repeticao: 'semanal' }, AGORA);
    const [c] = obterCompromissos();
    concluirOcorrencia(c.id, '2026-12-10');
    concluirOcorrencia(c.id, '2026-12-17');
    expect(obterCompromissos()[0]).toMatchObject({ concluidasEm: ['2026-12-10', '2026-12-17'] });
    expect(obterCompromissos()[0].concluido).toBeUndefined();
    reabrirOcorrencia(c.id, '2026-12-10');
    expect(obterCompromissos()[0].concluidasEm).toEqual(['2026-12-17']);
    reabrirOcorrencia(c.id, '2026-12-17');
    expect(obterCompromissos()[0].concluidasEm).toBeUndefined();
  });

  it('sem repetição, concluir a ocorrência é o mesmo que concluir o compromisso', () => {
    criarCompromisso({ ...base, dataFim: '2026-12-12' }, AGORA);
    const [c] = obterCompromissos();
    concluirOcorrencia(c.id, '2026-12-10');
    expect(obterCompromissos()[0].concluido).toBe(true);
    reabrirOcorrencia(c.id, '2026-12-10');
    expect(obterCompromissos()[0].concluido).toBeUndefined();
  });

  it('o limite de concluidasEm guarda as mais recentes', () => {
    criarCompromisso({ ...base, repeticao: 'diaria' }, AGORA);
    const [c] = obterCompromissos();
    for (let i = 0; i < 405; i++) concluirOcorrencia(c.id, new Date(Date.UTC(2026, 11, 10 + i)).toISOString().slice(0, 10));
    const datas = obterCompromissos()[0].concluidasEm!;
    expect(datas).toHaveLength(400);
    expect(datas[0]).toBe(new Date(Date.UTC(2026, 11, 15)).toISOString().slice(0, 10));
  });

  it('encerrar a série antes de um dia define repetirAte no dia anterior; no início, exclui', () => {
    criarCompromisso({ ...base, repeticao: 'semanal' }, AGORA);
    const [c] = obterCompromissos();
    concluirOcorrencia(c.id, '2026-12-10');
    concluirOcorrencia(c.id, '2026-12-24');
    expect(encerrarSerieAntesDe(c.id, '2026-12-24')).toBe('encerrado');
    expect(obterCompromissos()[0]).toMatchObject({ repetirAte: '2026-12-23', concluidasEm: ['2026-12-10'] });
    expect(encerrarSerieAntesDe(c.id, '2026-12-10')).toBe('excluido');
    expect(obterCompromissos()).toEqual([]);
    expect(encerrarSerieAntesDe('nao-existe', '2026-12-10')).toBe('nada');
  });

  it('editar: mudar a série zera ciente e concluídas; mudar só o assunto mantém', () => {
    criarCompromisso({ ...base, repeticao: 'semanal' }, AGORA);
    const [c] = obterCompromissos();
    concluirOcorrencia(c.id, '2026-12-10');
    marcarCienteCompromisso(c.id, new Date(AGORA));
    editarCompromisso(c.id, { ...base, assunto: 'novo texto', repeticao: 'semanal' });
    expect(obterCompromissos()[0]).toMatchObject({ concluidasEm: ['2026-12-10'] });
    expect(obterCompromissos()[0].cienteEm).toBeDefined();
    editarCompromisso(c.id, { ...base, repeticao: 'semanal', repetirAte: '2027-01-01' });
    expect(obterCompromissos()[0].concluidasEm).toBeUndefined();
    expect(obterCompromissos()[0].cienteEm).toBeUndefined();
    marcarCienteCompromisso(c.id, new Date(AGORA));
    editarCompromisso(c.id, { ...base, dataFim: '2026-12-11' });
    expect(obterCompromissos()[0]).not.toHaveProperty('repeticao');
    expect(obterCompromissos()[0].cienteEm).toBeUndefined();
  });
});

describe('compromissos na agenda', () => {
  const cmp = (extra: object) => ({ id: 'c1', criadoEm: AGORA, ...base, ...extra }) as never;

  it('entram no dia, ordenados por hora (sem hora primeiro), junto das vistorias', () => {
    const dias = montarAgenda(
      [{ titulo: 'V1', status: 'Em andamento', vistoria: { data: '2026-12-10' } }] as never, [],
      [cmp({ id: 'a', hora: '15:00', assunto: 'tarde' }), cmp({ id: 'b', assunto: 'dia todo' }), cmp({ id: 'c', hora: '08:30', assunto: 'cedo' })],
    );
    expect(dias).toHaveLength(1);
    expect(dias[0].itens.filter((i) => i.tipo === 'compromisso').map((i) => i.id)).toEqual(['b', 'c', 'a']);
    expect(dias[0].itens.some((i) => i.tipo === 'vistoria')).toBe(true);
  });

  it('.ics: compromisso com hora tem horário; concluído fica de fora', () => {
    const dias = montarAgenda([], [], [cmp({ hora: '14:30' }), cmp({ id: 'c2', concluido: true })]);
    const ics = gerarIcs(dias.flatMap((d) => d.itens), new Date(2026, 10, 21));
    expect(ics).toContain('DTSTART:20261210T143000');
    expect(ics).toContain('SUMMARY:Reunião — licenciamento');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });
});

describe('quando o compromisso pede aviso', () => {
  const c = (extra: object = {}) => ({ id: 'c1', criadoEm: AGORA, ...base, ...extra }) as ReturnType<typeof obterCompromissos>[number];
  const ids = (lista: ReturnType<typeof obterCompromissos>, agora: Date) => compromissosParaAvisar(lista, agora).map((x) => x.id);

  it('às 8h do dia; antes disso, não', () => {
    expect(ids([c()], new Date(2026, 11, 10, 7, 59))).toEqual([]);
    expect(ids([c()], new Date(2026, 11, 10, 8, 0))).toEqual(['c1']);
    expect(ids([c()], new Date(2026, 11, 9, 20))).toEqual([]);
  });

  it('com hora marcada, avisa às 8h e de novo na hora', () => {
    expect(horariosDeAviso(c({ hora: '14:30' })).map((d) => d.getHours() * 60 + d.getMinutes())).toEqual([480, 870]);
    const ciente = c({ hora: '14:30', cienteEm: new Date(2026, 11, 10, 8, 5).toISOString() });
    expect(ids([ciente], new Date(2026, 11, 10, 12))).toEqual([]);
    expect(ids([ciente], new Date(2026, 11, 10, 14, 30))).toEqual(['c1']);
  });

  it('concluído nunca avisa; "ciente" sem hora vale pelo dia; "em 2 horas" esconde até a hora', () => {
    const dia = new Date(2026, 11, 10, 9);
    expect(ids([c({ concluido: true })], dia)).toEqual([]);
    expect(ids([c({ cienteEm: dia.toISOString() })], new Date(2026, 11, 10, 18))).toEqual([]);
    const adiado = c({ adiadoAte: new Date(2026, 11, 10, 11).toISOString() });
    expect(ids([adiado], new Date(2026, 11, 10, 10, 59))).toEqual([]);
    expect(ids([adiado], new Date(2026, 11, 10, 11, 0))).toEqual(['c1']);
  });

  it('passou e ninguém tratou: aparece por 7 dias, depois deixa de insistir', () => {
    expect(ids([c()], new Date(2026, 11, 17, 12))).toEqual(['c1']);
    expect(ids([c()], new Date(2026, 11, 18, 12))).toEqual([]);
  });

  it('descreve com hoje, amanhã ou a data completa', () => {
    const agora = new Date(2026, 11, 10, 9);
    expect(textoDoCompromisso(c({ hora: '14:30' }), agora)).toBe('Reunião — licenciamento · hoje às 14:30');
    expect(textoDoCompromisso(c(), new Date(2026, 11, 9, 9))).toBe('Reunião — licenciamento · amanhã · dia todo');
    expect(textoDoCompromisso(c(), new Date(2026, 11, 1, 9))).toBe('Reunião — licenciamento · quinta, 10/12/2026 · dia todo');
  });
});
