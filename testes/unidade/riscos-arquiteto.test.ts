// Correção dos 5 riscos apontados pelo subagente arquiteto (P09, padrão A).
// Cada teste reproduz o cenário do critério verificável do relatório.

import {
  CHAVE_BACKUP, CHAVE_CONFIGURACAO, criarArmazem, criarArmazenamentoEmMemoria, obterArmazenamento,
} from '../../aplicacao/src/modulos/demandas/armazem.ts';
import { CHAVE_DEMANDAS, type Demanda } from '../../aplicacao/src/modulos/demandas/modelo.ts';
import { exportarDados, validarImportacao } from '../../aplicacao/src/modulos/alertas/dados-portaveis.ts';

const AGORA = new Date('2026-11-13T12:00:00.000Z');
const D = (id: string, p: Partial<Demanda> = {}): Demanda => ({
  id, titulo: `Demanda ${id}`, descricao: '', responsavel: 'Equipe', prioridade: 'Média', status: 'A Fazer',
  criadaEm: '2026-11-01T00:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T00:00:00.000Z', ...p,
});

/** Storage em memória que pode falhar a partir da N-ésima chamada de setItem. */
function storageComFalha(falharNaGravacao: number | null, falharLeitura = false): Storage {
  const base = criarArmazenamentoEmMemoria();
  let gravacoes = 0;
  return {
    get length() { return base.length; },
    clear: () => base.clear(),
    key: (i: number) => base.key(i),
    removeItem: (k: string) => base.removeItem(k),
    getItem: (k: string) => {
      if (falharLeitura) throw new Error('SecurityError simulado');
      return base.getItem(k);
    },
    setItem: (k: string, v: string) => {
      gravacoes++;
      if (falharNaGravacao !== null && gravacoes >= falharNaGravacao) throw new Error('QuotaExceededError simulado');
      base.setItem(k, v);
    },
  };
}

describe('risco 1 (ALTO): importação exige a marca de dados fictícios', () => {
  it('arquivo sem "ficticio" ou com "ficticio": false é recusado', () => {
    const valido = JSON.parse(exportarDados([D('a')], 3, AGORA));
    const sem = { ...valido }; delete sem.ficticio;
    for (const dados of [sem, { ...valido, ficticio: false }, { ...valido, ficticio: 'sim' }]) {
      const r = validarImportacao(JSON.stringify(dados));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erro).toContain('fictício');
    }
    expect(validarImportacao(JSON.stringify(valido)).ok).toBe(true);
  });
});

describe('risco 2 (MÉDIO): falha parcial na importação é revertida', () => {
  it('se a 2ª gravação falhar, os dados, o limiar e o backup voltam ao estado anterior', () => {
    // Estado inicial gravado: 1 demanda e limiar 5.
    const copia = criarArmazenamentoEmMemoria();
    criarArmazem(copia, { exemplos: () => [D('original')] }).definirDiasInatividade(5);
    const antes = copia.getItem(CHAVE_DEMANDAS);

    // A partir daqui, a 2ª gravação falha (a 1ª da importação é o backup; a 2ª, as demandas).
    let gravacoes = 0;
    let ativo = false;
    const combinado: Storage = {
      get length() { return copia.length; },
      getItem: (k: string) => copia.getItem(k),
      removeItem: (k: string) => copia.removeItem(k),
      setItem: (k: string, v: string) => {
        if (ativo && ++gravacoes === 2) throw new Error('falha simulada');
        copia.setItem(k, v);
      },
      key: (i: number) => copia.key(i),
      clear: () => copia.clear(),
    };
    const b = criarArmazem(combinado, { exemplos: () => [] });
    ativo = true;
    const dados = validarImportacao(exportarDados([D('nova1'), D('nova2')], 9, AGORA));
    if (!dados.ok) throw new Error('fixture inválida');

    const r = b.importar(dados.dados);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensagem).toContain('desfeita');
    expect(b.obter().demandas.map((d) => d.id)).toEqual(['original']);
    expect(b.obter().diasInatividade).toBe(5);
    expect(copia.getItem(CHAVE_BACKUP)).toBeNull();
    expect(copia.getItem(CHAVE_DEMANDAS)).toBe(antes);
  });
});

describe('risco 3 (MÉDIO): localStorage indisponível na inicialização não quebra o app', () => {
  it('gravação recusada na 1ª carga: abre com exemplos e mostra aviso', () => {
    const a = criarArmazem(storageComFalha(1), { exemplos: () => [D('ex')] });
    expect(a.obter().demandas.map((d) => d.id)).toEqual(['ex']);
    expect(a.obter().avisoPersistencia).toContain('não permitiu gravar');
  });

  it('leitura bloqueada: não lança erro e abre com exemplos em memória', () => {
    expect(() => criarArmazem(storageComFalha(null, true), { exemplos: () => [D('ex')] })).not.toThrow();
    const a = criarArmazem(storageComFalha(null, true), { exemplos: () => [D('ex')] });
    expect(a.obter().demandas).toHaveLength(1);
    expect(a.obter().avisoPersistencia).not.toBeNull();
  });

  it('obterArmazenamento cai para memória quando o acesso ao localStorage lança erro', () => {
    const janela = { get localStorage(): Storage { throw new Error('SecurityError'); } };
    const r = obterArmazenamento(janela);
    expect(r.persistente).toBe(false);
    r.armazenamento.setItem('x', '1');
    expect(r.armazenamento.getItem('x')).toBe('1');
    expect(obterArmazenamento(window).persistente).toBe(true);
  });
});

describe('risco 4 (MÉDIO): sincronização entre abas', () => {
  beforeEach(() => localStorage.clear());

  it('evento "storage" de outra aba recarrega o estado', () => {
    const abaA = criarArmazem(localStorage, { exemplos: () => [D('a')] });
    const abaB = criarArmazem(localStorage, { exemplos: () => [] });
    const parar = abaB.escutarOutrasAbas(window);

    abaA.criar({ titulo: 'Criada na aba A', descricao: '', responsavel: '', prioridade: 'Alta', status: 'A Fazer', prazo: '' });
    expect(abaB.obter().demandas).toHaveLength(1); // ainda desatualizada
    window.dispatchEvent(new StorageEvent('storage', { key: CHAVE_DEMANDAS }));
    expect(abaB.obter().demandas.map((d) => d.titulo)).toContain('Criada na aba A');

    // Chaves de outros sistemas não disparam recarga.
    abaA.excluir('a');
    window.dispatchEvent(new StorageEvent('storage', { key: 'outro-app:chave' }));
    expect(abaB.obter().demandas).toHaveLength(2);
    parar();
  });
});

describe('risco 5 (BAIXO): importação aplica os mesmos limites do formulário', () => {
  it.each([
    ['título de 2 caracteres', { titulo: 'ab' }],
    ['título de 121 caracteres', { titulo: 'x'.repeat(121) }],
    ['descrição de 2001 caracteres', { descricao: 'x'.repeat(2001) }],
    ['responsável de 81 caracteres', { responsavel: 'y'.repeat(81) }],
  ])('recusa %s', (_nome, extra) => {
    const r = validarImportacao(exportarDados([D('a', extra)], 3, AGORA));
    expect(r.ok).toBe(false);
  });
});

describe('risco 3b: o aviso de persistência não some enquanto os dados não persistem', () => {
  const dadosImportados = () => {
    const r = validarImportacao(exportarDados([D('imp1')], 4, AGORA));
    if (!r.ok) throw new Error('fixture inválida');
    return r.dados;
  };

  it.each([
    ['importar', (a: ReturnType<typeof criarArmazem>) => { expect(a.importar(dadosImportados()).ok).toBe(true); }],
    ['desfazer importação', (a: ReturnType<typeof criarArmazem>) => { expect(a.restaurarBackup().ok).toBe(true); }],
    ['recarregar', (a: ReturnType<typeof criarArmazem>) => { a.recarregar(); }],
    ['evento "storage"', (a: ReturnType<typeof criarArmazem>) => {
      const parar = a.escutarOutrasAbas(window);
      window.dispatchEvent(new StorageEvent('storage', { key: CHAVE_DEMANDAS }));
      parar();
    }],
  ])('fallback em memória: o aviso continua após %s', (_nome, operacao) => {
    const a = criarArmazem(criarArmazenamentoEmMemoria(), { exemplos: () => [D('ex')] });
    expect(a.importar(dadosImportados()).ok).toBe(true); // prepara um backup para o "desfazer"
    a.marcarSemPersistencia();
    expect(a.obter().avisoPersistencia).not.toBeNull();
    operacao(a);
    expect(a.obter().avisoPersistencia).not.toBeNull();
  });

  it('falha de gravação: o aviso continua após recarregar', () => {
    // 1ª gravação (exemplos iniciais) passa; a 2ª (criar) falha.
    const a = criarArmazem(storageComFalha(2), { exemplos: () => [D('ex')] });
    expect(a.obter().avisoPersistencia).toBeNull();
    const r = a.criar({ titulo: 'Nova fictícia', descricao: '', responsavel: '', prioridade: 'Alta', status: 'A Fazer', prazo: '' });
    expect(r.ok).toBe(false);
    expect(a.obter().avisoPersistencia).not.toBeNull();
    a.recarregar();
    expect(a.obter().avisoPersistencia).not.toBeNull();
  });

  it('aviso presente e importação recusada pelo navegador: o aviso continua', () => {
    // 1ª gravação (exemplos iniciais) passa; a importação falha e é revertida.
    const a = criarArmazem(storageComFalha(2), { exemplos: () => [D('ex')] });
    a.marcarSemPersistencia();
    expect(a.importar(dadosImportados()).ok).toBe(false);
    expect(a.obter().avisoPersistencia).not.toBeNull();
  });

  it('armazenamento persistente sem falhas não exibe aviso', () => {
    const a = criarArmazem(criarArmazenamentoEmMemoria(), { exemplos: () => [D('ex')] });
    expect(a.importar(dadosImportados()).ok).toBe(true);
    a.recarregar();
    expect(a.obter().avisoPersistencia).toBeNull();
  });
});

describe('risco 3c: falha de gravação ao desfazer a importação não deixa estado parcial', () => {
  /** Storage em memória que, depois de ativado, falha na N-ésima escrita (setItem ou removeItem). */
  function storageFalhaNaEscrita() {
    const base = criarArmazenamentoEmMemoria();
    const ctrl = { falharEm: null as number | null, todasDepois: false, escritas: 0 };
    const escrever = (f: () => void) => {
      if (ctrl.falharEm !== null) {
        ctrl.escritas++;
        if (ctrl.escritas === ctrl.falharEm || (ctrl.todasDepois && ctrl.escritas > ctrl.falharEm)) {
          throw new Error('QuotaExceededError simulado');
        }
      }
      f();
    };
    const storage: Storage = {
      get length() { return base.length; },
      clear: () => base.clear(),
      key: (i: number) => base.key(i),
      getItem: (k: string) => base.getItem(k),
      removeItem: (k: string) => escrever(() => base.removeItem(k)),
      setItem: (k: string, v: string) => escrever(() => base.setItem(k, v)),
    };
    return { storage, base, ctrl };
  }

  const CHAVES = [CHAVE_DEMANDAS, CHAVE_CONFIGURACAO, CHAVE_BACKUP];

  function prepararImportado() {
    const s = storageFalhaNaEscrita();
    const a = criarArmazem(s.storage, { exemplos: () => [D('original')] });
    expect(a.definirDiasInatividade(5).ok).toBe(true);
    const dados = validarImportacao(exportarDados([D('imp1'), D('imp2')], 9, AGORA));
    if (!dados.ok) throw new Error('fixture inválida');
    expect(a.importar(dados.dados).ok).toBe(true);
    const fotografia = CHAVES.map((k) => s.base.getItem(k));
    return { ...s, a, fotografia };
  }

  // Escritas do desfazer: 1 = demandas, 2 = configuração, 3 = remoção do backup.
  it.each([
    ['demandas', 1],
    ['configuração', 2],
    ['remoção do backup', 3],
  ])('falha na gravação de %s: armazenamento volta ao estado anterior e a mensagem é honesta', (_nome, n) => {
    const { a, base, ctrl, fotografia } = prepararImportado();
    ctrl.falharEm = n;

    const r = a.restaurarBackup();
    expect(r.ok).toBe(false);
    // Armazenamento igual ao de antes do desfazer.
    expect(CHAVES.map((k) => base.getItem(k))).toEqual(fotografia);
    // Memória reflete o armazenamento: continuam os dados importados.
    expect(a.obter().demandas.map((d) => d.id)).toEqual(['imp1', 'imp2']);
    expect(a.obter().diasInatividade).toBe(9);
    expect(a.obter().temBackup).toBe(true);
    if (!r.ok) {
      expect(r.mensagem).not.toContain('nada foi alterado');
      expect(r.mensagem).not.toContain('ilegível');
      expect(r.mensagem).toContain('recusou a gravação');
    }
    // Falha de gravação liga o aviso de persistência, como nas demais gravações.
    expect(a.obter().avisoPersistencia).not.toBeNull();
  });

  it('falha na configuração e também na reversão: a mensagem não diz "nada foi alterado" e a memória reflete o armazenamento', () => {
    const { a, base, ctrl } = prepararImportado();
    ctrl.falharEm = 2;
    ctrl.todasDepois = true;

    const r = a.restaurarBackup();
    expect(r.ok).toBe(false);
    // A memória acompanha o que ficou gravado (demandas já restauradas ao original).
    const gravadas = (JSON.parse(base.getItem(CHAVE_DEMANDAS) ?? '{}').demandas ?? []) as Demanda[];
    expect(a.obter().demandas.map((d) => d.id)).toEqual(gravadas.map((d) => d.id));
    expect(a.obter().demandas.map((d) => d.id)).toEqual(['original']);
    if (!r.ok) {
      expect(r.mensagem).not.toContain('nada foi alterado');
      expect(r.mensagem).toContain('não foi possível');
    }
    expect(a.obter().avisoPersistencia).not.toBeNull();
  });

  it('backup ilegível: nada é gravado e a mensagem diz isso', () => {
    const { a, base, ctrl } = prepararImportado();
    base.setItem(CHAVE_BACKUP, '{corrompido');
    const fotografia = CHAVES.map((k) => base.getItem(k));
    ctrl.falharEm = 999;

    const r = a.restaurarBackup();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.mensagem).toContain('nada foi alterado');
    expect(ctrl.escritas).toBe(0);
    expect(CHAVES.map((k) => base.getItem(k))).toEqual(fotografia);
    expect(a.obter().avisoPersistencia).toBeNull();
  });
});
