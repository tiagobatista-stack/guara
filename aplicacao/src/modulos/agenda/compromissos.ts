// Compromissos e lembretes próprios (item 14, 21/11/2026), em `guara:compromissos:v1`.
// Registro separado dos avisos das demandas (`guara:avisos:v1`): reunião, palestra, curso, compromisso
// ou lembrete, com data, hora opcional, assunto e demanda opcional. Mesmo desenho dos outros armazéns:
// localStorage com validação e memória quando o navegador bloqueia a gravação.
// O rascunho pendente de confirmação (frase entendida pelo assistente, ainda não gravada) fica em outra chave.

import { novoId, criarListaLocal } from '../atalhos/lista-local.ts';
import { dataValida } from '../demandas/regras.ts';
import { duracaoEmDias, MAXIMO_DE_DIAS_DO_EVENTO, REPETICOES, repete, somarDias, type Repeticao } from './recorrencia.ts';

export { REPETICOES, type Repeticao };

export const CHAVE_COMPROMISSOS = 'guara:compromissos:v1';
export const CHAVE_RASCUNHO_COMPROMISSO = 'guara:compromissos:rascunho:v1';
export const LIMITES_COMPROMISSO = { compromissos: 2000, assunto: 120, concluidasEm: 400 } as const;

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
  /** AAAA-MM-DD; só existe quando é depois de `data` (sem ele, ou igual a `data`, o evento tem 1 dia). */
  dataFim?: string;
  /** Só existe quando há repetição (ausente = 'nenhuma'). */
  repeticao?: Exclude<Repeticao, 'nenhuma'>;
  /** AAAA-MM-DD; último dia em que a repetição vale. Só existe com repetição. */
  repetirAte?: string;
}

export interface Compromisso extends DadosCompromisso {
  id: string;
  criadoEm: string;
  /** Evento sem repetição concluído (em série, vale para todas as ocorrências). */
  concluido?: true;
  /** Só de série: datas de início das ocorrências concluídas, sem apagar as seguintes. */
  concluidasEm?: string[];
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

/** Intervalo e repetição de dados já lidos: o que não se sustenta é descartado (nunca derruba o registro). */
function quandoValido(b: Record<string, unknown>, data: string, hora: string | undefined): Pick<DadosCompromisso, 'dataFim' | 'repeticao' | 'repetirAte'> {
  const saida: Pick<DadosCompromisso, 'dataFim' | 'repeticao' | 'repetirAte'> = {};
  if (typeof b.repeticao === 'string' && b.repeticao !== 'nenhuma' && (REPETICOES as readonly string[]).includes(b.repeticao)) {
    saida.repeticao = b.repeticao as Exclude<Repeticao, 'nenhuma'>;
    if (typeof b.repetirAte === 'string' && dataValida(b.repetirAte) && b.repetirAte >= data) saida.repetirAte = b.repetirAte;
  }
  if (typeof b.dataFim === 'string' && dataValida(b.dataFim) && b.dataFim > data && duracaoEmDias({ data, dataFim: b.dataFim }) < MAXIMO_DE_DIAS_DO_EVENTO) {
    // Vários dias com hora não combina com repetição: vale a repetição.
    if (!(hora && saida.repeticao)) saida.dataFim = b.dataFim;
  }
  return saida;
}

function dadosValidos(b: Record<string, unknown>): DadosCompromisso | null {
  if (!(TIPOS_DE_COMPROMISSO as readonly unknown[]).includes(b.tipo)) return null;
  if (typeof b.data !== 'string' || !dataValida(b.data)) return null;
  if (typeof b.assunto !== 'string' || !limparAssunto(b.assunto)) return null;
  const d: DadosCompromisso = { tipo: b.tipo as TipoDeCompromisso, data: b.data, assunto: limparAssunto(b.assunto) };
  if (typeof b.hora === 'string' && HORA.test(b.hora)) d.hora = b.hora;
  if (typeof b.demanda === 'string' && DEMANDA.test(b.demanda)) d.demanda = b.demanda;
  return { ...d, ...quandoValido(b, d.data, d.hora) };
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
    if (c.repeticao && Array.isArray(b.concluidasEm)) {
      const datas = [...new Set(b.concluidasEm.filter((x): x is string => typeof x === 'string' && dataValida(x)))].sort().slice(-LIMITES_COMPROMISSO.concluidasEm);
      if (datas.length) c.concluidasEm = datas;
    }
    if (dataIso(b.cienteEm)) c.cienteEm = b.cienteEm;
    if (dataIso(b.adiadoAte)) c.adiadoAte = b.adiadoAte;
    saida.push(c);
  }
  return saida;
}

const lista = criarListaLocal<Compromisso>(CHAVE_COMPROMISSOS, () => [], validarCompromissos);
export const CHAVE_BACKUP_COMPROMISSOS = 'guara:compromissos:backup-antes-importacao:v1';

/** Importação de arquivo: só aceita a lista inteira válida (nada é descartado em silêncio). */
export function compromissosImportaveis(x: unknown): { ok: true; lista: Compromisso[] } | { ok: false; erro: string } {
  if (!Array.isArray(x)) return { ok: false, erro: 'A lista de compromissos do arquivo não é uma lista.' };
  if (x.length > LIMITES_COMPROMISSO.compromissos) return { ok: false, erro: `Mais de ${LIMITES_COMPROMISSO.compromissos} compromissos.` };
  const lista = validarCompromissos(x);
  if (lista.length !== x.length) return { ok: false, erro: 'Há compromisso inválido ou com id repetido no arquivo.' };
  return { ok: true, lista };
}

/**
 * Troca a agenda pelos compromissos importados, guardando antes a lista atual para o "Desfazer última importação".
 * Devolve erro (e não troca nada) se o navegador não deixar gravar.
 */
export function substituirCompromissos(novos: Compromisso[], agoraIso: string): { ok: true } | { ok: false; erro: string } {
  const antes = lista.obter();
  try {
    window.localStorage.setItem(CHAVE_BACKUP_COMPROMISSOS, JSON.stringify({ salvoEm: agoraIso, compromissos: antes }));
  } catch {
    return { ok: false, erro: 'O navegador não deixou guardar a agenda atual; os compromissos não foram importados.' };
  }
  lista.gravar(novos);
  if (lista.soNaMemoria()) {
    lista.gravar(antes);
    return { ok: false, erro: 'O navegador recusou gravar os compromissos; a agenda anterior foi mantida.' };
  }
  return { ok: true };
}

/** Arquivo sem compromissos não mexe na agenda; o backup antigo deixa de valer para não restaurar uma lista velha. */
export function descartarBackupDeCompromissos() {
  try { window.localStorage.removeItem(CHAVE_BACKUP_COMPROMISSOS); } catch { /* sem armazenamento: nada a descartar */ }
}

/** Desfaz a última importação da agenda. 'sem-backup' = a importação não trouxe compromissos (nada a restaurar). */
export function restaurarCompromissos(): 'restaurado' | 'sem-backup' | 'erro' {
  let bruto: string | null;
  try { bruto = window.localStorage.getItem(CHAVE_BACKUP_COMPROMISSOS); } catch { return 'erro'; }
  if (bruto === null) return 'sem-backup';
  let anterior: Compromisso[];
  try {
    const b = JSON.parse(bruto) as { compromissos?: unknown };
    const r = compromissosImportaveis(b.compromissos);
    if (!r.ok) return 'erro';
    anterior = r.lista;
  } catch { return 'erro'; }
  const atual = lista.obter();
  lista.gravar(anterior);
  if (lista.soNaMemoria()) { lista.gravar(atual); return 'erro'; }
  descartarBackupDeCompromissos();
  return 'restaurado';
}

export const obterCompromissos = lista.obter;
export const useCompromissos = lista.useLista;
export const useCompromissosSoNaMemoria = lista.useSoNaMemoria;

/** Problema dos dados (mensagem para a tela) ou null. */
export function problemaDoCompromisso(d: { tipo: string; data: string; hora?: string; assunto: string; demanda?: string; dataFim?: string; repeticao?: string; repetirAte?: string }): string | null {
  if (!(TIPOS_DE_COMPROMISSO as readonly string[]).includes(d.tipo)) return 'Escolha o tipo.';
  if (!dataValida(d.data)) return 'Informe uma data válida.';
  if (d.hora && !HORA.test(d.hora)) return 'Informe uma hora válida (de 00:00 a 23:59) ou deixe em branco para o dia todo.';
  const assunto = limparAssunto(d.assunto);
  if (!assunto) return 'Informe o assunto.';
  if (d.assunto.replace(/\s+/g, ' ').trim().length > LIMITES_COMPROMISSO.assunto) return `O assunto pode ter no máximo ${LIMITES_COMPROMISSO.assunto} caracteres.`;
  if (d.demanda && !DEMANDA.test(d.demanda)) return 'O código da demanda deve ser como DEM-FIC-0003.';
  if (d.dataFim) {
    if (!dataValida(d.dataFim)) return 'Informe uma data de fim válida.';
    if (d.dataFim < d.data) return 'A data de fim não pode ser antes da data de início.';
    if (duracaoEmDias({ data: d.data, dataFim: d.dataFim }) >= MAXIMO_DE_DIAS_DO_EVENTO) return `O evento pode durar no máximo ${MAXIMO_DE_DIAS_DO_EVENTO} dias.`;
  }
  if (d.repeticao && !(REPETICOES as readonly string[]).includes(d.repeticao)) return 'Escolha uma repetição válida.';
  const serie = d.repeticao && d.repeticao !== 'nenhuma';
  if (serie && d.repetirAte) {
    if (!dataValida(d.repetirAte)) return 'Informe uma data válida para "Repetir até".';
    if (d.repetirAte < d.data) return 'O fim da repetição não pode ser antes da data de início.';
  }
  if (serie && d.hora && d.dataFim && d.dataFim > d.data) return 'Evento de vários dias com hora não pode se repetir. Deixe-o de dia inteiro ou sem repetição.';
  return null;
}

function dadosLimpos(d: DadosCompromisso): DadosCompromisso {
  const serie = d.repeticao && (d.repeticao as string) !== 'nenhuma';
  return {
    tipo: d.tipo, data: d.data, ...(d.hora ? { hora: d.hora } : {}), assunto: limparAssunto(d.assunto), ...(d.demanda ? { demanda: d.demanda } : {}),
    ...(d.dataFim && d.dataFim > d.data ? { dataFim: d.dataFim } : {}),
    ...(serie ? { repeticao: d.repeticao } : {}),
    ...(serie && d.repetirAte ? { repetirAte: d.repetirAte } : {}),
  };
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
  const mudouSerie = novo.data !== antigo.data || novo.dataFim !== antigo.dataFim || novo.repeticao !== antigo.repeticao || novo.repetirAte !== antigo.repetirAte;
  const mudouQuando = mudouSerie || novo.hora !== antigo.hora;
  const mantidos = mudouQuando ? {} : { ...(antigo.cienteEm ? { cienteEm: antigo.cienteEm } : {}), ...(antigo.adiadoAte ? { adiadoAte: antigo.adiadoAte } : {}) };
  const concluidas = !mudouSerie && novo.repeticao && antigo.concluidasEm?.length ? { concluidasEm: antigo.concluidasEm } : {};
  const editado: Compromisso = { id, criadoEm: antigo.criadoEm, ...(antigo.concluido ? { concluido: true as const } : {}), ...concluidas, ...novo, ...mantidos };
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

/**
 * Conclui só a ocorrência que começa em `inicio`. Sem repetição é o mesmo que `concluirCompromisso`;
 * em série, guarda a data e as demais ocorrências continuam abertas.
 */
export function concluirOcorrencia(id: string, inicio: string) {
  alterar(id, (c) => {
    if (!repete(c)) return { ...c, concluido: true };
    const datas = [...new Set([...(c.concluidasEm ?? []), inicio])].sort().slice(-LIMITES_COMPROMISSO.concluidasEm);
    return { ...c, concluidasEm: datas };
  });
}

/** Desfaz "Concluído" de uma ocorrência (e reabre a série toda, se ela estava marcada como concluída). */
export function reabrirOcorrencia(id: string, inicio: string) {
  alterar(id, ({ concluido: _concluido, concluidasEm, ...c }) => {
    const restantes = (concluidasEm ?? []).filter((x) => x !== inicio);
    return restantes.length ? { ...c, concluidasEm: restantes } : c;
  });
}

/**
 * "Encerrar a série antes de `dia`": a repetição vale até o dia anterior. Se não sobrar nenhuma ocorrência
 * (o dia é o início da série), o compromisso é excluído. Devolve o que aconteceu.
 */
export function encerrarSerieAntesDe(id: string, dia: string): 'encerrado' | 'excluido' | 'nada' {
  const c = obterCompromissos().find((x) => x.id === id);
  if (!c || !repete(c)) return 'nada';
  const ate = somarDias(dia, -1);
  if (ate < c.data) { excluirCompromisso(id); return 'excluido'; }
  alterar(id, (x) => ({ ...x, repetirAte: ate, ...(x.concluidasEm ? { concluidasEm: x.concluidasEm.filter((d) => d <= ate) } : {}) }));
  return 'encerrado';
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

/** Pergunta do mascote ainda sem resposta: hora ("dia todo ou tem hora?"), fim ("só nesse dia ou até quando?") ou repetição. */
export const ETAPAS_DO_RASCUNHO = ['hora', 'fim', 'repete'] as const;
export type EtapaDoRascunho = (typeof ETAPAS_DO_RASCUNHO)[number];

// O rascunho é [dados] ou [dados, { etapa }]; a etapa existe só enquanto o mascote espera uma resposta.
type ItemDoRascunho = DadosCompromisso | { etapa: EtapaDoRascunho };

const rascunho = criarListaLocal<ItemDoRascunho>(CHAVE_RASCUNHO_COMPROMISSO, () => [], (x) => {
  if (!Array.isArray(x)) return [];
  const d = typeof x[0] === 'object' && x[0] !== null ? dadosValidos(x[0] as Record<string, unknown>) : null;
  if (!d) return [];
  const e = typeof x[1] === 'object' && x[1] !== null ? (x[1] as Record<string, unknown>).etapa : undefined;
  return (ETAPAS_DO_RASCUNHO as readonly unknown[]).includes(e) ? [d, { etapa: e as EtapaDoRascunho }] : [d];
});

export const obterRascunho = (): DadosCompromisso | null => (rascunho.obter()[0] as DadosCompromisso | undefined) ?? null;
export const obterEtapaDoRascunho = (): EtapaDoRascunho | null => (rascunho.obter()[1] as { etapa: EtapaDoRascunho } | undefined)?.etapa ?? null;
export const guardarRascunho = (d: DadosCompromisso, etapa?: EtapaDoRascunho) => rascunho.gravar(etapa ? [dadosLimpos(d), { etapa }] : [dadosLimpos(d)]);
export const limparRascunho = () => { if (rascunho.obter().length) rascunho.gravar([]); };
