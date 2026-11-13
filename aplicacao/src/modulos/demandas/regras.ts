// Regras puras de demanda (sem acesso a armazenamento), testáveis isoladamente.

import { LIMITES, PRIORIDADES, STATUS, type Demanda, type EntradaDemanda, type Status } from './modelo.ts';

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
  };
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
    (novos.prazo ?? '') !== (d.prazo ?? '');
  if (!mudou) return { ok: true, valor: d };
  const { prazo: _prazoAntigo, ...semPrazo } = d;
  void _prazoAntigo;
  return { ok: true, valor: { ...semPrazo, ...novos, ultimaAcaoRelevante: agoraIso } };
}

export function mudarStatus(d: Demanda, status: Status, agoraIso: string): Demanda {
  if (d.status === status) return d;
  return { ...d, status, ultimaAcaoRelevante: agoraIso };
}

export function paraEntrada(d: Demanda): EntradaDemanda {
  return {
    titulo: d.titulo,
    descricao: d.descricao,
    responsavel: d.responsavel,
    prioridade: d.prioridade,
    status: d.status,
    prazo: d.prazo ?? '',
  };
}

export interface Filtros {
  texto: string;
  status: Status | '';
  prioridade: Demanda['prioridade'] | '';
  responsavel: string;
}

export const FILTROS_VAZIOS: Filtros = { texto: '', status: '', prioridade: '', responsavel: '' };

export function filtrarDemandas(lista: readonly Demanda[], f: Filtros): Demanda[] {
  const texto = f.texto.trim().toLocaleLowerCase('pt-BR');
  return lista.filter(
    (d) =>
      (!texto || `${d.titulo} ${d.descricao}`.toLocaleLowerCase('pt-BR').includes(texto)) &&
      (!f.status || d.status === f.status) &&
      (!f.prioridade || d.prioridade === f.prioridade) &&
      (!f.responsavel || d.responsavel === f.responsavel),
  );
}

/** Valida uma demanda vinda do armazenamento ou de importação. */
export function ehDemandaValida(x: unknown): x is Demanda {
  if (typeof x !== 'object' || x === null) return false;
  const d = x as Record<string, unknown>;
  return (
    typeof d.id === 'string' && d.id.length > 0 &&
    typeof d.titulo === 'string' &&
    typeof d.descricao === 'string' &&
    typeof d.responsavel === 'string' &&
    PRIORIDADES.includes(d.prioridade as never) &&
    STATUS.includes(d.status as never) &&
    typeof d.criadaEm === 'string' && !Number.isNaN(Date.parse(d.criadaEm)) &&
    typeof d.ultimaAcaoRelevante === 'string' && !Number.isNaN(Date.parse(d.ultimaAcaoRelevante)) &&
    (d.prazo === undefined || (typeof d.prazo === 'string' && dataValida(d.prazo)))
  );
}
