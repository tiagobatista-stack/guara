// Demanda travada (ideia do TOCA, `travada_modulo.py`): bloqueio opcional com
// motivo por categoria, destravar, reavaliação e compatibilidade com dados antigos.

import { criarArmazem } from '../../aplicacao/src/modulos/demandas/armazem.ts';
import { CHAVE_DEMANDAS, type Demanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import {
  confirmarBloqueio, destravarDemanda, ehDemandaValida, filtrarDemandas, FILTROS_VAZIOS, mudarStatus, travarDemanda,
} from '../../aplicacao/src/modulos/demandas/regras.ts';
import { textoBloqueio } from '../../aplicacao/src/modulos/alertas/bloqueio.ts';
import { validarImportacao } from '../../aplicacao/src/modulos/alertas/dados-portaveis.ts';
import { montarResumo } from '../../aplicacao/src/modulos/demandas/resumo.ts';

const T0 = '2026-11-13T12:00:00.000Z';
const T1 = '2026-11-16T12:00:00.000Z';
const BASE: Demanda = {
  id: 'd1', titulo: 'Analisar processo FIC-0001', descricao: '', responsavel: 'Equipe', prioridade: 'Média',
  status: 'Em Andamento', criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T00:00:00.000Z',
};

describe('regras do bloqueio', () => {
  it('travar grava motivo e "desde" e conta como ação relevante, sem mudar o status', () => {
    const t = travarDemanda(BASE, 'documento', T0)!;
    expect(t.bloqueio).toEqual({ motivo: 'documento', desde: T0 });
    expect(t.status).toBe('Em Andamento');
    expect(t.ultimaAcaoRelevante).toBe(T0);
  });
  it('mudar o motivo mantém o "desde"; o mesmo motivo não muda nada', () => {
    const t = travarDemanda(BASE, 'documento', T0)!;
    expect(travarDemanda(t, 'documento', T1)).toBe(t);
    expect(travarDemanda(t, 'setor', T1)!.bloqueio).toEqual({ motivo: 'setor', desde: T0 });
  });
  it('concluída não trava; concluir remove o bloqueio', () => {
    expect(travarDemanda({ ...BASE, status: 'Concluída' }, 'campo', T0)).toBeNull();
    const t = travarDemanda(BASE, 'campo', T0)!;
    expect(mudarStatus(t, 'Concluída', T1)).not.toHaveProperty('bloqueio');
    expect(mudarStatus(t, 'Em Validação', T1).bloqueio?.motivo).toBe('campo');
  });
  it('destravar remove o bloqueio; "ainda travada" renova a última ação e registra a reavaliação', () => {
    const t = travarDemanda(BASE, 'outro', T0)!;
    expect(destravarDemanda(t, T1)).not.toHaveProperty('bloqueio');
    expect(destravarDemanda(t, T1).ultimaAcaoRelevante).toBe(T1);
    expect(confirmarBloqueio(t, T1)).toEqual({
      ...t, ultimaAcaoRelevante: T1, historico: [...t.historico!, { quando: T1, acao: 'ainda-travada', motivo: 'outro' }],
    });
    expect(confirmarBloqueio(BASE, T1)).toBe(BASE);
    expect(destravarDemanda(BASE, T1)).toBe(BASE);
  });
});

describe('texto do bloqueio (dias úteis)', () => {
  const t = { bloqueio: { motivo: 'documento' as const, desde: '2026-11-13T12:00:00.000Z' } };
  it('hoje, e sexta 13/11 → quarta 18/11 = 3 dias úteis', () => {
    expect(textoBloqueio(t, new Date('2026-11-13T15:00:00.000Z'))).toBe('⛔ travada hoje: falta documento');
    expect(textoBloqueio(t, new Date('2026-11-18T15:00:00.000Z'))).toBe('⛔ travada há 3 dias úteis: falta documento');
  });
  it('pula o feriado de 20/11: sexta 13/11 → segunda 23/11 = 5 dias úteis', () => {
    expect(textoBloqueio(t, new Date('2026-11-23T15:00:00.000Z'))).toBe('⛔ travada há 5 dias úteis: falta documento');
  });
  it('sem bloqueio = null', () => {
    expect(textoBloqueio({}, new Date())).toBeNull();
  });
});

describe('validação e compatibilidade', () => {
  it('demanda antiga, sem bloqueio, continua válida; bloqueio malformado é recusado', () => {
    expect(ehDemandaValida(BASE)).toBe(true);
    expect(ehDemandaValida({ ...BASE, bloqueio: { motivo: 'documento', desde: T0 } })).toBe(true);
    expect(ehDemandaValida({ ...BASE, bloqueio: { motivo: 'inventado', desde: T0 } })).toBe(false);
    expect(ehDemandaValida({ ...BASE, bloqueio: { motivo: 'documento', desde: 'ontem' } })).toBe(false);
    expect(ehDemandaValida({ ...BASE, bloqueio: { motivo: 'toString', desde: T0 } })).toBe(false);
    expect(ehDemandaValida({ ...BASE, bloqueio: null })).toBe(false);
  });
  it('importação aceita o bloqueio no formato versao 1', () => {
    const r = validarImportacao(JSON.stringify({
      formato: 'guara-dados', versao: 1, ficticio: true, configuracao: { diasInatividade: 3 },
      demandas: [{ ...BASE, bloqueio: { motivo: 'setor', desde: T0 } }],
    }));
    expect(r.ok && r.dados.demandas[0].bloqueio?.motivo).toBe('setor');
  });
  it('filtro: só travadas e sem bloqueio', () => {
    const lista = [BASE, { ...BASE, id: 'd2', bloqueio: { motivo: 'campo' as const, desde: T0 } }];
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, bloqueio: 'travadas' }).map((d) => d.id)).toEqual(['d2']);
    expect(filtrarDemandas(lista, { ...FILTROS_VAZIOS, bloqueio: 'livres' }).map((d) => d.id)).toEqual(['d1']);
  });
});

describe('armazém', () => {
  beforeEach(() => localStorage.clear());
  it('travar grava no localStorage, persiste ao recarregar e editar não apaga o bloqueio', () => {
    const a = criarArmazem(localStorage, { agora: () => new Date(T0), exemplos: () => [{ ...BASE }] });
    expect(a.travar('d1', 'setor').ok).toBe(true);
    expect(localStorage.getItem(CHAVE_DEMANDAS)).toContain('"motivo":"setor"');
    const b = criarArmazem(localStorage, { agora: () => new Date(T1), exemplos: () => [] });
    expect(b.obter().demandas[0].bloqueio).toEqual({ motivo: 'setor', desde: T0 });
    b.editar('d1', { titulo: 'Analisar processo FIC-0001 (revisto)', descricao: '', responsavel: 'Equipe', prioridade: 'Alta', status: 'Em Andamento', prazo: '' });
    expect(b.obter().demandas[0].bloqueio?.motivo).toBe('setor');
    expect(b.destravar('d1').ok).toBe(true);
    expect(b.obter().demandas[0]).not.toHaveProperty('bloqueio');
  });
  it('travar demanda concluída é recusado com mensagem e nada é gravado', () => {
    const a = criarArmazem(localStorage, { agora: () => new Date(T0), exemplos: () => [{ ...BASE, status: 'Concluída' }] });
    const antes = localStorage.getItem(CHAVE_DEMANDAS);
    expect(a.travar('d1', 'documento')).toEqual({ ok: false, mensagem: 'Demanda concluída não pode ser travada.' });
    expect(localStorage.getItem(CHAVE_DEMANDAS)).toBe(antes);
  });
});

describe('detalhe livre do bloqueio (pedido do responsável, 14/11/2026)', () => {
  beforeEach(() => localStorage.clear());
  const DETALHE = 'Aguardando resposta do ofício enviado ao setor de cadastro (fictício).';

  it('grava o detalhe junto com o motivo; mudar só o detalhe mantém o "desde" e conta como ação relevante', () => {
    const t = travarDemanda(BASE, 'setor', T0, DETALHE)!;
    expect(t.bloqueio).toEqual({ motivo: 'setor', desde: T0, detalhe: DETALHE });
    expect(travarDemanda(t, 'setor', T1, DETALHE)).toBe(t);
    const outro = travarDemanda(t, 'setor', T1, 'Ofício reiterado (fictício).')!;
    expect(outro.bloqueio).toEqual({ motivo: 'setor', desde: T0, detalhe: 'Ofício reiterado (fictício).' });
    expect(outro.ultimaAcaoRelevante).toBe(T1);
    expect(travarDemanda(outro, 'setor', T1, '')!.bloqueio).toEqual({ motivo: 'setor', desde: T0 });
  });

  it('o armazém limpa espaços, recusa acima de 300 caracteres sem gravar e o detalhe sobrevive ao recarregar', () => {
    const a = criarArmazem(localStorage, { agora: () => new Date(T0), exemplos: () => [{ ...BASE }] });
    const antes = localStorage.getItem(CHAVE_DEMANDAS);
    expect(a.travar('d1', 'documento', 'x'.repeat(301))).toEqual({ ok: false, mensagem: 'O detalhe do bloqueio tem no máximo 300 caracteres.' });
    expect(localStorage.getItem(CHAVE_DEMANDAS)).toBe(antes);
    expect(a.travar('d1', 'documento', `  ${DETALHE}\n  `).ok).toBe(true);
    const b = criarArmazem(localStorage, { agora: () => new Date(T1), exemplos: () => [] });
    expect(b.obter().demandas[0].bloqueio).toEqual({ motivo: 'documento', desde: T0, detalhe: DETALHE });
    expect(a.travar('d1', 'documento', '   ').ok).toBe(true);
    expect(a.obter().demandas[0].bloqueio).toEqual({ motivo: 'documento', desde: T0 });
  });

  it('validação: detalhe vazio, de outro tipo ou longo demais torna a demanda inválida; sem detalhe continua válida', () => {
    const ok = { ...BASE, bloqueio: { motivo: 'campo', desde: T0, detalhe: DETALHE } };
    expect(ehDemandaValida(ok)).toBe(true);
    expect(ehDemandaValida({ ...BASE, bloqueio: { motivo: 'campo', desde: T0 } })).toBe(true);
    expect(ehDemandaValida({ ...BASE, bloqueio: { motivo: 'campo', desde: T0, detalhe: '  ' } })).toBe(false);
    expect(ehDemandaValida({ ...BASE, bloqueio: { motivo: 'campo', desde: T0, detalhe: 42 } })).toBe(false);
    expect(ehDemandaValida({ ...BASE, bloqueio: { motivo: 'campo', desde: T0, detalhe: 'x'.repeat(301) } })).toBe(false);
  });

  it('o detalhe não entra no texto do bloqueio nem na tela compartilhada', () => {
    const t = travarDemanda(BASE, 'setor', T0, DETALHE)!;
    expect(textoBloqueio(t, new Date(T0))).toBe('⛔ travada hoje: aguardando outro setor');
    expect(JSON.stringify(montarResumo(t, new Date(T0)))).not.toContain('ofício');
  });
});
