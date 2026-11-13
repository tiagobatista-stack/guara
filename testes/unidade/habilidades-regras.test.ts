// Casos negativos e de borda das habilidades (além do autoteste feliz).

import { registrarDemanda } from '../../backend/supabase/functions/_compartilhado/habilidades/registrar-demanda/implementacao.ts';
import { classificarDemanda } from '../../backend/supabase/functions/_compartilhado/habilidades/classificar-demanda/implementacao.ts';
import { extrairDocumento } from '../../backend/supabase/functions/_compartilhado/habilidades/extrair-documento/implementacao.ts';
import { montarChecklist } from '../../backend/supabase/functions/_compartilhado/habilidades/montar-checklist/implementacao.ts';
import { conferirRequisitos } from '../../backend/supabase/functions/_compartilhado/habilidades/conferir-requisitos/implementacao.ts';
import { avaliarPrazos } from '../../backend/supabase/functions/_compartilhado/habilidades/avaliar-prazos/implementacao.ts';
import { validarEvidencias } from '../../backend/supabase/functions/_compartilhado/habilidades/validar-evidencias/implementacao.ts';
import { relatorioExecutivo } from '../../backend/supabase/functions/_compartilhado/habilidades/relatorio-executivo/implementacao.ts';
import { validarPds } from '../../backend/supabase/functions/_compartilhado/habilidades/validar-pds/implementacao.ts';
import { validarEsquema } from '../../backend/supabase/functions/_compartilhado/validacao.ts';

describe('registrar-demanda', () => {
  it('recusa processo fora do padrão fictício e data inválida', () => {
    const r = registrarDemanda({ processo: '123.456/2026', titulo: 'Teste ok', tipo: 'x', prazo: '2026-02-30', descricao: '' });
    expect(r.valida).toBe(false);
    expect(r.demanda).toBeUndefined();
    expect(r.erros).toHaveLength(2);
  });
});

describe('classificar-demanda', () => {
  it('sem regra aplicável vai para triagem humana', () => {
    expect(classificarDemanda({ titulo: 'Assunto genérico', descricao: 'sem palavras-chave' }).setor).toBe('triagem-humana');
  });
});

describe('extrair-documento', () => {
  it('lista campos ausentes em vez de inventar', () => {
    const r = extrairDocumento({ documentoId: 'DOC-FIC-X', paginas: [{ numero: 1, texto: 'Processo: FIC-2026-0099' }] });
    expect(r.campos).toEqual([{ campo: 'processo', valor: 'FIC-2026-0099', pagina: 1 }]);
    expect(r.camposAusentes).toContain('outorgaAgua');
  });
});

describe('montar-checklist', () => {
  it('tipo sem configuração retorna configurado=false', () => {
    expect(montarChecklist({ tipo: 'inexistente' })).toEqual({ tipo: 'inexistente', configurado: false, itens: [] });
  });
});

describe('conferir-requisitos', () => {
  it('campo ausente é pendente; item sem campo é não verificável', () => {
    const r = conferirRequisitos({
      itens: [
        { id: 'A', descricao: 'a', campoEvidencia: 'processo' },
        { id: 'B', descricao: 'b', campoEvidencia: null },
      ],
      campos: [],
    });
    expect(r.resultados.map((x) => x.situacao)).toEqual(['pendente', 'nao-verificavel']);
  });
});

describe('avaliar-prazos', () => {
  it('detecta demanda vencida e ignora concluída', () => {
    const r = avaliarPrazos({
      dataReferencia: '2026-11-13', diasInatividade: 5, diasPrazoProximo: 3,
      demandas: [
        { id: 'V', prazo: '2026-11-10', ultimaMovimentacao: '2026-11-12', situacao: 'aberta' },
        { id: 'C', prazo: '2026-11-01', ultimaMovimentacao: '2026-10-01', situacao: 'concluida' },
      ],
    });
    expect(r.vencidas).toEqual(['V']);
    expect(r.ignoradasConcluidas).toEqual(['C']);
    expect(r.paradas).toEqual([]);
  });
});

describe('validar-evidencias', () => {
  it('reprova item atendido sem evidência', () => {
    const r = validarEvidencias({ resultados: [{ itemId: 'X', situacao: 'atendido', justificativa: 'sem fonte' }] });
    expect(r.aprovado).toBe(false);
    expect(r.erros[0]).toContain('sem evidência');
  });
});

describe('relatorio-executivo', () => {
  it('recusa gerar relatório de resultados não validados', () => {
    const r = relatorioExecutivo({ dataReferencia: '2026-11-13', validado: false, demandas: [{ id: 'D', setor: 's', situacao: 'aberta' }] });
    expect(r.liberado).toBe(false);
    expect(r.fontes).toEqual([]);
  });
});

describe('validar-pds', () => {
  it('nunca emite conformidade, mesmo com tudo atendido', () => {
    const r = validarPds({
      entrega: { buildPassou: true, testesPassaram: true, documentacaoAtualizada: true, segredosVersionados: false, evidenciasRegistradas: true },
      documentoOficialPds: false,
    });
    expect(r.conclusaoConformidade).toBe('nao-emitida');
    expect(r.aviso).toContain('NÃO é o PDS oficial');
  });
});

describe('validarEsquema', () => {
  it('aponta campo obrigatório ausente e valor fora da lista', () => {
    const erros = validarEsquema(
      { a: 'z' },
      { tipo: 'objeto', campos: { a: { tipo: 'texto', valores: ['x'] }, b: { tipo: 'numero' } } },
    );
    expect(erros).toHaveLength(2);
  });
});
