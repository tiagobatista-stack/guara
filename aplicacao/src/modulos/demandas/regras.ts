// Regras puras de demanda (sem acesso a armazenamento), testáveis isoladamente.

import { LER_NUMERO, NUMEROS, numeroGravadoValido } from './identificadores.ts';
import { LIMITES, MOTIVOS_BLOQUEIO, PRIORIDADES, STATUS, type Demanda, type EntradaDemanda, type MotivoBloqueio, type Status } from './modelo.ts';

export type ErrosValidacao = Partial<Record<keyof EntradaDemanda, string>>;

export function dataValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [a, m, d] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  return data.getUTCFullYear() === a && data.getUTCMonth() === m - 1 && data.getUTCDate() === d;
}

export function validarEntrada(e: EntradaDemanda): ErrosValidacao {
  const erros: ErrosValidacao = {};
  const titulo = e.titulo.trim();
  if (titulo.length < LIMITES.tituloMin) erros.titulo = `Informe um título com pelo menos ${LIMITES.tituloMin} caracteres.`;
  else if (titulo.length > LIMITES.tituloMax) erros.titulo = `O título pode ter no máximo ${LIMITES.tituloMax} caracteres.`;
  if (e.descricao.length > LIMITES.descricaoMax) erros.descricao = `A descrição pode ter no máximo ${LIMITES.descricaoMax} caracteres.`;
  if (e.responsavel.trim().length > LIMITES.responsavelMax) erros.responsavel = `O responsável pode ter no máximo ${LIMITES.responsavelMax} caracteres.`;
  if (!PRIORIDADES.includes(e.prioridade)) erros.prioridade = 'Prioridade inválida.';
  if (!STATUS.includes(e.status)) erros.status = 'Status inválido.';
  if (e.prazo && !dataValida(e.prazo)) erros.prazo = 'Informe uma data válida.';
  for (const c of NUMEROS) {
    const texto = (e[c] ?? '').trim();
    if (!texto) continue;
    const r = LER_NUMERO[c](texto);
    if (!r.ok) erros[c] = r.erro;
  }
  return erros;
}

function normalizar(e: EntradaDemanda): Omit<Demanda, 'id' | 'criadaEm' | 'ultimaAcaoRelevante'> {
  return {
    titulo: e.titulo.trim(),
    descricao: e.descricao.trim(),
    responsavel: e.responsavel.trim(),
    prioridade: e.prioridade,
    status: e.status,
    ...(e.prazo ? { prazo: e.prazo } : {}),
    ...numerosNormalizados(e),
  };
}

/** Os números preenchidos, na forma normalizada (a entrada já foi validada). */
function numerosNormalizados(e: EntradaDemanda): Partial<Pick<Demanda, 'processo' | 'simp' | 'judicial'>> {
  const saida: Partial<Pick<Demanda, 'processo' | 'simp' | 'judicial'>> = {};
  for (const c of NUMEROS) {
    const r = LER_NUMERO[c]((e[c] ?? '').trim());
    if ((e[c] ?? '').trim() && r.ok) saida[c] = r.valor;
  }
  return saida;
}

export type Resultado<T> = { ok: true; valor: T } | { ok: false; erros: ErrosValidacao };

export function criarDemanda(e: EntradaDemanda, agoraIso: string, gerarId: () => string): Resultado<Demanda> {
  const erros = validarEntrada(e);
  if (Object.keys(erros).length) return { ok: false, erros };
  return { ok: true, valor: { id: gerarId(), ...normalizar(e), criadaEm: agoraIso, ultimaAcaoRelevante: agoraIso } };
}

/** Edita a demanda; só atualiza a última ação relevante se algum campo mudou de fato. */
export function editarDemanda(d: Demanda, e: EntradaDemanda, agoraIso: string): Resultado<Demanda> {
  const erros = validarEntrada(e);
  if (Object.keys(erros).length) return { ok: false, erros };
  const novos = normalizar(e);
  const mudou =
    novos.titulo !== d.titulo ||
    novos.descricao !== d.descricao ||
    novos.responsavel !== d.responsavel ||
    novos.prioridade !== d.prioridade ||
    novos.status !== d.status ||
    (novos.prazo ?? '') !== (d.prazo ?? '') ||
    NUMEROS.some((c) => (novos[c] ?? '') !== (d[c] ?? ''));
  if (!mudou) return { ok: true, valor: d };
  // Campos opcionais apagados no formulário saem da demanda.
  const { prazo: _prazo, processo: _processo, simp: _simp, judicial: _judicial, ...semOpcionais } = d;
  void [_prazo, _processo, _simp, _judicial];
  return { ok: true, valor: { ...semOpcionais, ...novos, ultimaAcaoRelevante: agoraIso } };
}

export function mudarStatus(d: Demanda, status: Status, agoraIso: string): Demanda {
  if (d.status === status) return d;
  // Concluir encerra o bloqueio: demanda concluída não fica travada.
  if (status === 'Concluída') return { ...semBloqueio(d), status, ultimaAcaoRelevante: agoraIso };
  return { ...d, status, ultimaAcaoRelevante: agoraIso };
}

function semBloqueio(d: Demanda): Demanda {
  const { bloqueio: _bloqueio, ...resto } = d;
  void _bloqueio;
  return resto;
}

export const ehMotivoBloqueio = (x: unknown): x is MotivoBloqueio =>
  typeof x === 'string' && Object.prototype.hasOwnProperty.call(MOTIVOS_BLOQUEIO, x);

/** Trava a demanda ou muda o motivo (mantendo o "desde"). Concluída não trava: devolve null. */
export function travarDemanda(d: Demanda, motivo: MotivoBloqueio, agoraIso: string): Demanda | null {
  if (d.status === 'Concluída') return null;
  if (d.bloqueio?.motivo === motivo) return d;
  return { ...d, bloqueio: { motivo, desde: d.bloqueio?.desde ?? agoraIso }, ultimaAcaoRelevante: agoraIso };
}

export function destravarDemanda(d: Demanda, agoraIso: string): Demanda {
  if (!d.bloqueio) return d;
  return { ...semBloqueio(d), ultimaAcaoRelevante: agoraIso };
}

/** "Ainda travada": a reavaliação conta como ação relevante e tira a demanda do alerta de inatividade. */
export function confirmarBloqueio(d: Demanda, agoraIso: string): Demanda {
  if (!d.bloqueio) return d;
  return { ...d, ultimaAcaoRelevante: agoraIso };
}

export function paraEntrada(d: Demanda): EntradaDemanda {
  return {
    titulo: d.titulo,
    descricao: d.descricao,
    responsavel: d.responsavel,
    prioridade: d.prioridade,
    status: d.status,
    prazo: d.prazo ?? '',
    processo: d.processo ?? '',
    simp: d.simp ?? '',
    judicial: d.judicial ?? '',
  };
}

export interface Filtros {
  texto: string;
  status: Status | '';
  prioridade: Demanda['prioridade'] | '';
  responsavel: string;
  bloqueio: '' | 'travadas' | 'livres';
}

export const FILTROS_VAZIOS: Filtros = { texto: '', status: '', prioridade: '', responsavel: '', bloqueio: '' };

export function filtrarDemandas(lista: readonly Demanda[], f: Filtros): Demanda[] {
  const texto = f.texto.trim().toLocaleLowerCase('pt-BR');
  return lista.filter(
    (d) =>
      (!texto || [d.titulo, d.descricao, d.processo, d.simp, d.judicial].join(' ').toLocaleLowerCase('pt-BR').includes(texto)) &&
      (!f.status || d.status === f.status) &&
      (!f.prioridade || d.prioridade === f.prioridade) &&
      (!f.responsavel || d.responsavel === f.responsavel) &&
      (!f.bloqueio || (f.bloqueio === 'travadas') === !!d.bloqueio),
  );
}

/** Valida uma demanda vinda do armazenamento ou de importação. */
export function ehDemandaValida(x: unknown): x is Demanda {
  if (typeof x !== 'object' || x === null) return false;
  const d = x as Record<string, unknown>;
  return (
    typeof d.id === 'string' && d.id.length > 0 &&
    typeof d.titulo === 'string' &&
    d.titulo.trim().length >= LIMITES.tituloMin && d.titulo.trim().length <= LIMITES.tituloMax &&
    typeof d.descricao === 'string' && d.descricao.length <= LIMITES.descricaoMax &&
    typeof d.responsavel === 'string' && d.responsavel.trim().length <= LIMITES.responsavelMax &&
    PRIORIDADES.includes(d.prioridade as never) &&
    STATUS.includes(d.status as never) &&
    typeof d.criadaEm === 'string' && !Number.isNaN(Date.parse(d.criadaEm)) &&
    typeof d.ultimaAcaoRelevante === 'string' && !Number.isNaN(Date.parse(d.ultimaAcaoRelevante)) &&
    (d.prazo === undefined || (typeof d.prazo === 'string' && dataValida(d.prazo))) &&
    (d.bloqueio === undefined || bloqueioValido(d.bloqueio)) &&
    NUMEROS.every((c) => d[c] === undefined || numeroGravadoValido(c, d[c]))
  );
}

function bloqueioValido(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const b = x as Record<string, unknown>;
  return ehMotivoBloqueio(b.motivo) && typeof b.desde === 'string' && !Number.isNaN(Date.parse(b.desde));
}
