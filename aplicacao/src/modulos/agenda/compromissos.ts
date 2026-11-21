// Compromissos e lembretes próprios (item 14, 21/11/2026), em `guara:compromissos:v1`.
// Registro separado dos avisos das demandas (`guara:avisos:v1`): reunião, palestra, curso, compromisso
// ou lembrete, com data, hora opcional, assunto e demanda opcional. Mesmo desenho dos outros armazéns:
// localStorage com validação e memória quando o navegador bloqueia a gravação.
// O rascunho pendente de confirmação (frase entendida pelo assistente, ainda não gravada) fica em outra chave.

import { novoId, criarListaLocal } from '../atalhos/lista-local.ts';
import { dataValida } from '../demandas/regras.ts';

export const CHAVE_COMPROMISSOS = 'guara:compromissos:v1';
export const CHAVE_RASCUNHO_COMPROMISSO = 'guara:compromissos:rascunho:v1';
export const LIMITES_COMPROMISSO = { compromissos: 2000, assunto: 120 } as const;

export const TIPOS_DE_COMPROMISSO = ['reunião', 'palestra', 'curso', 'compromisso', 'lembrete'] as const;
export type TipoDeCompromisso = (typeof TIPOS_DE_COMPROMISSO)[number];

/** Campos que a pessoa informa (ou o assistente entende), sem os de controle. */
export interface DadosCompromisso {
  tipo: TipoDeCompromisso;
  /** AAAA-MM-DD. */
  data: string;
  /** HH:MM; sem hora = dia todo. */
  hora?: string;
  assunto: string;
  /** DEM-FIC-nnnn. */
  demanda?: string;
}

export interface Compromisso extends DadosCompromisso {
  id: string;
  criadoEm: string;
  concluido?: true;
  /** Última vez que a pessoa disse "Ciente" ao aviso (ISO). */
  cienteEm?: string;
  /** "Em 2 horas": o aviso fica escondido até este instante (ISO). */
  adiadoAte?: string;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEMANDA = /^DEM-FIC-\d{4}$/;
const dataIso = (x: unknown): x is string => typeof x === 'string' && !Number.isNaN(Date.parse(x));

export const rotuloDoTipo = (tipo: TipoDeCompromisso) => tipo[0].toUpperCase() + tipo.slice(1);

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** "quinta, 10/12/2026": sempre a data completa, para a pessoa conferir. */
export function diaCompleto(data: string): string {
  const [a, m, d] = data.split('-').map(Number);
  return `${DIAS[new Date(a, m - 1, d).getDay()]}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
}

/** "Reunião — licenciamento" (sem repetir quando o assunto é só o nome do tipo). */
export function tituloDoCompromisso(c: Pick<Compromisso, 'tipo' | 'assunto'>): string {
  const tipo = rotuloDoTipo(c.tipo);
  return c.assunto.toLowerCase() === tipo.toLowerCase() ? tipo : `${tipo} — ${c.assunto}`;
}

/** Texto do assunto limpo: espaços reduzidos e no máximo 120 caracteres. */
export const limparAssunto = (x: string) => x.replace(/\s+/g, ' ').trim().slice(0, LIMITES_COMPROMISSO.assunto).trim();

function dadosValidos(b: Record<string, unknown>): DadosCompromisso | null {
  if (!(TIPOS_DE_COMPROMISSO as readonly unknown[]).includes(b.tipo)) return null;
  if (typeof b.data !== 'string' || !dataValida(b.data)) return null;
  if (typeof b.assunto !== 'string' || !limparAssunto(b.assunto)) return null;
  const d: DadosCompromisso = { tipo: b.tipo as TipoDeCompromisso, data: b.data, assunto: limparAssunto(b.assunto) };
  if (typeof b.hora === 'string' && HORA.test(b.hora)) d.hora = b.hora;
  if (typeof b.demanda === 'string' && DEMANDA.test(b.demanda)) d.demanda = b.demanda;
  return d;
}

export function validarCompromissos(x: unknown): Compromisso[] {
  if (!Array.isArray(x)) return [];
  const ids = new Set<string>();
  const saida: Compromisso[] = [];
  for (const bruto of x.slice(0, LIMITES_COMPROMISSO.compromissos)) {
    if (typeof bruto !== 'object' || bruto === null) continue;
    const b = bruto as Record<string, unknown>;
    const d = dadosValidos(b);
    if (!d || typeof b.id !== 'string' || !b.id || ids.has(b.id) || !dataIso(b.criadoEm)) continue;
    ids.add(b.id);
    const c: Compromisso = { ...d, id: b.id, criadoEm: b.criadoEm };
    if (b.concluido === true) c.concluido = true;
    if (dataIso(b.cienteEm)) c.cienteEm = b.cienteEm;
    if (dataIso(b.adiadoAte)) c.adiadoAte = b.adiadoAte;
    saida.push(c);
  }
  return saida;
}

const lista = criarListaLocal<Compromisso>(CHAVE_COMPROMISSOS, () => [], validarCompromissos);
export const obterCompromissos = lista.obter;
export const useCompromissos = lista.useLista;
export const useCompromissosSoNaMemoria = lista.useSoNaMemoria;

/** Problema dos dados (mensagem para a tela) ou null. */
export function problemaDoCompromisso(d: { tipo: string; data: string; hora?: string; assunto: string; demanda?: string }): string | null {
  if (!(TIPOS_DE_COMPROMISSO as readonly string[]).includes(d.tipo)) return 'Escolha o tipo.';
  if (!dataValida(d.data)) return 'Informe uma data válida.';
  if (d.hora && !HORA.test(d.hora)) return 'Informe uma hora válida (de 00:00 a 23:59) ou deixe em branco para o dia todo.';
  const assunto = limparAssunto(d.assunto);
  if (!assunto) return 'Informe o assunto.';
  if (d.assunto.replace(/\s+/g, ' ').trim().length > LIMITES_COMPROMISSO.assunto) return `O assunto pode ter no máximo ${LIMITES_COMPROMISSO.assunto} caracteres.`;
  if (d.demanda && !DEMANDA.test(d.demanda)) return 'O código da demanda deve ser como DEM-FIC-0003.';
  return null;
}

function dadosLimpos(d: DadosCompromisso): DadosCompromisso {
  return { tipo: d.tipo, data: d.data, ...(d.hora ? { hora: d.hora } : {}), assunto: limparAssunto(d.assunto), ...(d.demanda ? { demanda: d.demanda } : {}) };
}

export function criarCompromisso(d: DadosCompromisso, agoraIso: string): { ok: true; id: string } | { ok: false; erro: string } {
  const atuais = obterCompromissos();
  if (atuais.length >= LIMITES_COMPROMISSO.compromissos) return { ok: false, erro: `O limite é de ${LIMITES_COMPROMISSO.compromissos} compromissos. Exclua algum antes.` };
  const erro = problemaDoCompromisso(d);
  if (erro) return { ok: false, erro };
  const id = novoId('cmp', atuais);
  lista.gravar([...atuais, { ...dadosLimpos(d), id, criadoEm: agoraIso }]);
  return { ok: true, id };
}

/** Edita os campos; mudar data ou hora zera "ciente" e "em 2 horas", para o aviso valer de novo. */
export function editarCompromisso(id: string, d: DadosCompromisso): { ok: true } | { ok: false; erro: string } {
  const atuais = obterCompromissos();
  const antigo = atuais.find((c) => c.id === id);
  if (!antigo) return { ok: false, erro: 'Compromisso não encontrado.' };
  const erro = problemaDoCompromisso(d);
  if (erro) return { ok: false, erro };
  const novo = dadosLimpos(d);
  const mudouQuando = novo.data !== antigo.data || novo.hora !== antigo.hora;
  const mantidos = mudouQuando ? {} : { ...(antigo.cienteEm ? { cienteEm: antigo.cienteEm } : {}), ...(antigo.adiadoAte ? { adiadoAte: antigo.adiadoAte } : {}) };
  const editado: Compromisso = { id, criadoEm: antigo.criadoEm, ...(antigo.concluido ? { concluido: true as const } : {}), ...novo, ...mantidos };
  lista.gravar(atuais.map((c) => (c.id === id ? editado : c)));
  return { ok: true };
}

/** Exclui um compromisso (sempre um por vez; a confirmação é da tela). */
export function excluirCompromisso(id: string) {
  lista.gravar(obterCompromissos().filter((c) => c.id !== id));
}

function alterar(id: string, mudar: (c: Compromisso) => Compromisso) {
  lista.gravar(obterCompromissos().map((c) => (c.id === id ? mudar(c) : c)));
}

/** "Concluído": o aviso some e o item aparece riscado na Agenda. */
export function concluirCompromisso(id: string) {
  alterar(id, (c) => ({ ...c, concluido: true }));
}

export function reabrirCompromisso(id: string) {
  alterar(id, ({ concluido: _concluido, ...c }) => c);
}

/** "Ciente": some até o próximo horário de aviso (se houver hora marcada). */
export function marcarCienteCompromisso(id: string, agora: Date) {
  alterar(id, ({ adiadoAte: _a, ...c }) => ({ ...c, cienteEm: agora.toISOString() }));
}

/** "Em 2 horas" (ou outro horário): o aviso volta no instante dado. */
export function adiarCompromisso(id: string, ate: Date) {
  alterar(id, ({ cienteEm: _c, ...c }) => ({ ...c, adiadoAte: ate.toISOString() }));
}

// ---------- Rascunho: o que o assistente entendeu e espera confirmação ----------

const rascunho = criarListaLocal<DadosCompromisso>(CHAVE_RASCUNHO_COMPROMISSO, () => [], (x) => {
  if (!Array.isArray(x)) return [];
  const d = typeof x[0] === 'object' && x[0] !== null ? dadosValidos(x[0] as Record<string, unknown>) : null;
  return d ? [d] : [];
});

export const obterRascunho = (): DadosCompromisso | null => rascunho.obter()[0] ?? null;
export const guardarRascunho = (d: DadosCompromisso) => rascunho.gravar([dadosLimpos(d)]);
export const limparRascunho = () => { if (rascunho.obter().length) rascunho.gravar([]); };
