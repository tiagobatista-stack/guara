// Backup completo (operações e demandas) em um arquivo .json, e a importação com prévia.
// As operações vão como estão gravadas (inclusive o que não abre), para nada se perder. O arquivo tem coordenadas
// de pontos e os contatos de trabalho: é só para o responsável guardar; o JSON das demandas (fonte do MCP local) continua sendo outro.
// A chave do GeoServer NÃO vai no backup (preencher de novo após importar).

import { exportarDados, validarImportacao, type DadosPortaveis } from '../alertas/dados-portaveis.ts';
import { CHAVE_FERIADOS, validarFeriados } from '../alertas/feriados-locais.ts';
import { CHAVE_ATALHOS, validarLista as validarAtalhos } from '../atalhos/atalhos.ts';
import { CHAVE_CONTATOS, validarListaContatos } from '../atalhos/contatos.ts';
import type { Armazem } from '../demandas/armazem.ts';
import type { Demanda } from '../demandas/modelo.ts';
import { definirDiasPadraoElaboracao, lerDiasPadraoElaboracao, lerOperacoesPreservando, substituirOperacoes } from '../operacoes/armazem.ts';
import { CHAVE_OPERACOES } from '../operacoes/modelo.ts';
import { guardarEmQuarentena, lerQuarentena, type ItemQuarentena } from '../operacoes/quarentena.ts';
import { migrarOperacao } from '../operacoes/regras.ts';
import { baixar } from '../../compartilhado/baixar.ts';
import { definirPreferencias, obterPreferencias, type PreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';
import { registrarBackup } from '../../compartilhado/ultimo-backup.ts';

export const FORMATO_BACKUP = 'guara-backup';
export const TAMANHO_MAXIMO_BACKUP = 20_000_000;

export interface Backup {
  formato: typeof FORMATO_BACKUP;
  versao: 1;
  exportadoEm: string;
  /** Operações como estão gravadas (cada item pode ser ilegível). */
  operacoes: unknown[];
  quarentena: ItemQuarentena[];
  /** Listas locais gravadas como estão: atalhos, contatos e feriados locais (cada uma só existe se foi gravada). */
  extras?: { atalhos?: unknown; contatos?: unknown; feriados?: unknown };
  /** Mesmo formato do JSON de demandas (guara-dados), com configuração e mascote. */
  dados: DadosPortaveis;
}

/** Operações gravadas, sem validar; JSON ilegível vai para a quarentena em vez de se perder. */
function operacoesGravadas(): unknown[] {
  let bruto: string | null = null;
  try { bruto = localStorage.getItem(CHAVE_OPERACOES); } catch { /* bloqueado */ }
  if (bruto === null) return [];
  try {
    const j = JSON.parse(bruto);
    return Array.isArray(j) ? j : [j];
  } catch {
    guardarEmQuarentena(bruto, 'JSON das operações ilegível (no backup)');
    return [];
  }
}

const CHAVES_EXTRAS = { atalhos: CHAVE_ATALHOS, contatos: CHAVE_CONTATOS, feriados: CHAVE_FERIADOS } as const;

function extrasGravados(): NonNullable<Backup['extras']> {
  const extras: Record<string, unknown> = {};
  for (const [nome, chave] of Object.entries(CHAVES_EXTRAS)) {
    try {
      const bruto = localStorage.getItem(chave);
      if (bruto !== null) extras[nome] = JSON.parse(bruto);
    } catch { /* ilegível ou bloqueado: fica de fora (a lista já cai no padrão ao ler) */ }
  }
  return extras;
}

/** `registrar`: marca a data do último backup (a cópia automática antes de importar não conta). */
export function montarBackup(agora: Date, demandas: readonly Demanda[], diasInatividade: number, mascote: PreferenciasMascote, diasPadraoElaboracao?: number, registrar = true): string {
  const dados = JSON.parse(exportarDados(demandas, diasInatividade, agora, mascote, diasPadraoElaboracao)) as DadosPortaveis;
  const backup: Backup = { formato: FORMATO_BACKUP, versao: 1, exportadoEm: agora.toISOString(), operacoes: operacoesGravadas(), quarentena: lerQuarentena(), extras: extrasGravados(), dados };
  if (registrar) registrarBackup(agora);
  return JSON.stringify(backup, null, 2);
}

export interface Previa {
  exportadoEm: string;
  operacoes: number;
  pontos: number;
  ilegiveis: number;
  demandas: number;
  contatos: number;
  atalhos: number;
  feriados: number;
  backup: Backup;
  dados: DadosPortaveis;
}

/** Valida o arquivo sem alterar nada. */
export function analisarBackup(texto: string): { ok: true; previa: Previa } | { ok: false; erro: string } {
  if (texto.length > TAMANHO_MAXIMO_BACKUP) return { ok: false, erro: 'Arquivo grande demais para ser um backup do GUARÁ.' };
  let b: Partial<Backup>;
  try { b = JSON.parse(texto) as Partial<Backup>; } catch { return { ok: false, erro: 'O arquivo não é um JSON válido.' }; }
  if (typeof b !== 'object' || b === null || b.formato !== FORMATO_BACKUP || b.versao !== 1) return { ok: false, erro: 'Não é um backup do GUARÁ (versão 1).' };
  if (!Array.isArray(b.operacoes)) return { ok: false, erro: 'O backup não traz a lista de operações.' };
  const dados = validarImportacao(JSON.stringify(b.dados ?? null));
  if (!dados.ok) return { ok: false, erro: `Demandas do backup: ${dados.erro}` };
  const ex = (b.extras ?? {}) as NonNullable<Backup['extras']>;
  if (ex.contatos !== undefined && !Array.isArray(ex.contatos)) return { ok: false, erro: 'Contatos do backup: formato inválido.' };
  if (ex.atalhos !== undefined && !Array.isArray(ex.atalhos)) return { ok: false, erro: 'Atalhos do backup: formato inválido.' };
  const feriados = ex.feriados === undefined ? null : validarFeriados(ex.feriados);
  if (ex.feriados !== undefined && feriados === null) return { ok: false, erro: 'Feriados locais do backup: formato inválido.' };
  const abertas = b.operacoes.map(migrarOperacao).filter((o) => o !== null);
  const quarentena = Array.isArray(b.quarentena)
    ? b.quarentena.filter((i): i is ItemQuarentena => typeof i?.bruto === 'string' && typeof i?.motivo === 'string' && typeof i?.quando === 'string')
    : [];
  return {
    ok: true,
    previa: {
      exportadoEm: typeof b.exportadoEm === 'string' ? b.exportadoEm : '',
      operacoes: abertas.length,
      pontos: abertas.reduce((n, o) => n + o.pontos.length, 0),
      ilegiveis: b.operacoes.length - abertas.length,
      demandas: dados.dados.demandas.length,
      contatos: ex.contatos === undefined ? 0 : validarListaContatos(ex.contatos).length,
      atalhos: ex.atalhos === undefined ? 0 : validarAtalhos(ex.atalhos).length,
      feriados: feriados ? feriados.extras.length + feriados.remover.length : 0,
      backup: { ...(b as Backup), quarentena },
      dados: dados.dados,
    },
  };
}

const dois = (n: number) => String(n).padStart(2, '0');
/** guara-antes-da-importacao-AAAA-MM-DD-HHMM.json */
export const nomeDaCopia = (d: Date) => `guara-antes-da-importacao-${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}-${dois(d.getHours())}${dois(d.getMinutes())}.json`;

/**
 * Substitui os dados atuais pelos do backup. As demandas entram primeiro (têm desfazer próprio e podem falhar);
 * as operações atuais vão para a quarentena antes de serem trocadas, e as ilegíveis do arquivo também.
 */
export function aplicarBackup(previa: Previa, armazem: Armazem, agora: Date = new Date(), baixarArquivo: typeof baixar = baixar): { ok: true } | { ok: false; mensagem: string } {
  // Cópia automática do estado atual, baixada ANTES de qualquer troca; se não der para gerá-la, nada é importado.
  try {
    const { demandas, diasInatividade } = armazem.obter();
    baixarArquivo(nomeDaCopia(agora), montarBackup(agora, demandas, diasInatividade, obterPreferencias(), lerDiasPadraoElaboracao(), false));
  } catch {
    return { ok: false, mensagem: 'Não foi possível gerar a cópia dos dados atuais; nada foi importado.' };
  }
  // Feriados locais entram antes das demandas: o armazém das demandas os relê ao importar.
  const ex = previa.backup.extras ?? {};
  try {
    for (const [nome, chave] of Object.entries(CHAVES_EXTRAS)) if (ex[nome as keyof typeof ex] !== undefined) localStorage.setItem(chave, JSON.stringify(ex[nome as keyof typeof ex]));
  } catch { return { ok: false, mensagem: 'O navegador recusou a gravação; nada foi importado.' }; }
  const g = armazem.importar(previa.dados);
  if (!g.ok) return { ok: false, mensagem: g.mensagem };
  if (previa.dados.mascote) definirPreferencias(previa.dados.mascote);
  if (previa.dados.configuracao.diasPadraoElaboracao !== undefined) definirDiasPadraoElaboracao(previa.dados.configuracao.diasPadraoElaboracao);
  const atuais = operacoesGravadas();
  if (atuais.length > 0 && JSON.stringify(atuais) !== JSON.stringify(previa.backup.operacoes)) {
    guardarEmQuarentena(JSON.stringify(atuais), 'operações anteriores à importação do backup');
  }
  substituirOperacoes(lerOperacoesPreservando(previa.backup.operacoes));
  for (const i of previa.backup.quarentena) guardarEmQuarentena(i.bruto, i.motivo, i.quando);
  window.dispatchEvent(new Event('storage')); // listas locais (atalhos, contatos) já abertas se relêem
  return { ok: true };
}
