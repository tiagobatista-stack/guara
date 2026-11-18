// Regras puras das operações: validação (com a migração do ponto com equipe e datas para a viagem),
// o que falta encaixar, conflito de agenda, distância e "local já visitado".

import { coordenadaValida, type Coordenada } from '../demandas/coordenadas.ts';
import { bloqueioValido, dataValida } from '../demandas/regras.ts';
import { anotacoesValidas } from '../../compartilhado/anotacoes.ts';
import { caracterizacaoValida } from './pop-supressao.ts';
import {
  LIMITES_OPERACAO, MINIMOS_VIAGEM, MOTIVOS_PERIODO, RESULTADOS, SITUACOES_ACOMPANHAMENTO, SITUACOES_PONTO, type Operacao, type Ponto, type SituacaoAcompanhamento, type Viagem,
} from './modelo.ts';

// ---------- Datas ----------

/** Texto de data brasileiro (DD/MM/AAAA) ou ISO (AAAA-MM-DD) para ISO; null se não for data válida. */
export function lerData(texto: string): string | null {
  const t = texto.trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const iso = br ? `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}` : t;
  return dataValida(iso) ? iso : null;
}

export interface Periodo {
  inicio?: string;
  fim?: string;
}

/** Problemas das datas de saída e retorno (de uma viagem ou linha do CSV) dentro da janela da operação; lista vazia = ok. */
export function problemasDeDatas(p: { saida?: string; retorno?: string }, janela?: Periodo): string[] {
  const erros: string[] = [];
  if (p.saida && !dataValida(p.saida)) erros.push('Data de saída inválida.');
  if (p.retorno && !dataValida(p.retorno)) erros.push('Data de retorno inválida.');
  if (erros.length) return erros;
  if (p.saida && p.retorno && p.retorno < p.saida) erros.push('O retorno é anterior à saída.');
  if (janela) {
    for (const [nome, d] of [['saída', p.saida], ['retorno', p.retorno]] as const) {
      if (d && ((janela.inicio && d < janela.inicio) || (janela.fim && d > janela.fim))) erros.push(`A data de ${nome} fica fora do período da operação.`);
    }
  }
  return erros;
}

/** Menor e maior data de saída/retorno; lado ausente quando não há data. */
export function periodoDosPontos(itens: readonly { saida?: string; retorno?: string }[]): Periodo {
  const datas = itens.flatMap((p) => [p.saida, p.retorno]).filter((d): d is string => !!d).sort();
  return datas.length ? { inicio: datas[0], fim: datas[datas.length - 1] } : {};
}

/** Período (vazio = sem limite) contém a data? */
export const dentroDoPeriodo = (d: string, janela: Periodo) => !((janela.inicio && d < janela.inicio) || (janela.fim && d > janela.fim));

/** "18/09/2027 a 22/09/2027"; lado ausente vira "…". */
export const textoDoPeriodo = (p: Periodo) => {
  const br = (d?: string) => (d ? d.split('-').reverse().join('/') : '…');
  return p.inicio || p.fim ? `${br(p.inicio)} a ${br(p.fim)}` : 'sem período definido';
};

/** Menor período que contém os dois (para "ampliar"): lado sem data no período atual continua sem limite. */
export function unirPeriodos(atual: Periodo, outro: Periodo): Periodo {
  const inicio = atual.inicio && outro.inicio ? (outro.inicio < atual.inicio ? outro.inicio : atual.inicio) : atual.inicio;
  const fim = atual.fim && outro.fim ? (outro.fim > atual.fim ? outro.fim : atual.fim) : atual.fim;
  return { ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}) };
}

// ---------- Texto ----------

/** Para comparar nomes: sem acento, minúsculo e com espaços simples. */
export const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Lista de nomes limpa: sem vazios e sem repetição (ignorando acento e maiúsculas), na ordem dada. */
export function limparNomes(nomes: readonly string[], max: number): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const bruto of nomes) {
    const nome = bruto.replace(/\s+/g, ' ').trim().slice(0, max);
    const chave = normalizar(nome);
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(nome);
  }
  return saida;
}

// ---------- Validação e migração ----------

const texto = (x: unknown, max: number) => typeof x === 'string' && x.length <= max;
const dataOpcional = (x: unknown) => x === undefined || (typeof x === 'string' && dataValida(x));
const listaDeTextos = (x: unknown, maxItens: number, maxTexto: number) =>
  Array.isArray(x) && x.length <= maxItens && x.every((t) => texto(t, maxTexto));

function viagemValida(x: unknown): x is Viagem {
  if (typeof x !== 'object' || x === null) return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.id === 'string' && v.id.length > 0 &&
    texto(v.equipe, LIMITES_OPERACAO.equipe) &&
    listaDeTextos(v.integrantes, LIMITES_OPERACAO.integrantes, LIMITES_OPERACAO.integrante) &&
    listaDeTextos(v.veiculos, LIMITES_OPERACAO.veiculos, LIMITES_OPERACAO.veiculo) &&
    dataOpcional(v.saida) && dataOpcional(v.retorno) &&
    !(typeof v.saida === 'string' && typeof v.retorno === 'string' && v.retorno < v.saida) &&
    texto(v.notas, LIMITES_OPERACAO.notas)
  );
}

const ladoPeriodo = (x: unknown) =>
  typeof x === 'object' && x !== null && dataOpcional((x as Record<string, unknown>).inicio) && dataOpcional((x as Record<string, unknown>).fim);

function eventoValido(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.quando === 'string' && !Number.isNaN(Date.parse(e.quando)) &&
    (e.acao === 'criada' || (e.acao === 'periodo' && ladoPeriodo(e.de) && ladoPeriodo(e.para))) &&
    (e.motivo === undefined || (typeof e.motivo === 'string' && e.motivo in MOTIVOS_PERIODO))
  );
}

function droneValido(x: unknown): boolean {
  const d = x as { voou?: unknown; arquivo?: unknown } | null;
  return typeof d === 'object' && d !== null && typeof d.voou === 'boolean' && (d.arquivo === undefined || (typeof d.arquivo === 'string' && d.arquivo.length <= 100));
}

function relatorioValido(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return dataOpcional(r.enviadoEm) && (r.protocoloSiga === undefined || texto(r.protocoloSiga, LIMITES_OPERACAO.protocolo)) && (r.notas === undefined || texto(r.notas, LIMITES_OPERACAO.observacao));
}

/** Ponto gravado; aceita o formato antigo (equipe e datas no ponto), que a migração converte. */
function pontoValido(x: unknown): boolean {
  if (typeof x !== 'object' || x === null) return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === 'string' && p.id.length > 0 &&
    (p.numero === undefined || (typeof p.numero === 'number' && Number.isInteger(p.numero) && p.numero >= 0)) &&
    coordenadaValida(p.coordenada) &&
    texto(p.municipio, LIMITES_OPERACAO.municipio) &&
    (p.viagem === undefined || (typeof p.viagem === 'string' && p.viagem.length > 0)) &&
    (p.equipe === undefined || texto(p.equipe, LIMITES_OPERACAO.equipe)) &&
    dataOpcional(p.saida) && dataOpcional(p.retorno) &&
    texto(p.notas, LIMITES_OPERACAO.notas) &&
    (p.grupo === undefined || texto(p.grupo, LIMITES_OPERACAO.grupo)) &&
    (p.codigo === undefined || (texto(p.codigo, LIMITES_OPERACAO.codigo) && (p.codigo as string).trim().length > 0)) &&
    (p.tipoDano === undefined || texto(p.tipoDano, LIMITES_OPERACAO.tipoDano)) &&
    (p.resultado === undefined || (typeof p.resultado === 'string' && p.resultado in RESULTADOS)) &&
    (p.motivo === undefined || texto(p.motivo, LIMITES_OPERACAO.motivo)) &&
    (p.protocolo === undefined || texto(p.protocolo, LIMITES_OPERACAO.protocolo)) &&
    (p.observacao === undefined || texto(p.observacao, LIMITES_OPERACAO.observacao)) &&
    dataOpcional(p.dataVistoria) &&
    (p.bloqueio === undefined || bloqueioValido(p.bloqueio)) &&
    (p.relatorio === undefined || relatorioValido(p.relatorio)) &&
    (p.anotacoes === undefined || anotacoesValidas(p.anotacoes)) &&
    (p.caracterizacao === undefined || caracterizacaoValida(p.caracterizacao)) &&
    (['coordenadaAferida', 'waypoint', 'fotos', 'pessoaContatada'] as const).every((k) => p[k] === undefined || (typeof p[k] === 'string' && p[k].length <= 100)) &&
    (p.drone === undefined || droneValido(p.drone)) &&
    (p.motivoCancelamento === undefined || (typeof p.motivoCancelamento === 'string' && p.motivoCancelamento.length <= 100)) &&
    (p.reprogramado === undefined || (typeof p.reprogramado === 'object' && p.reprogramado !== null &&
      typeof (p.reprogramado as Record<string, unknown>).operacao === 'string' && typeof (p.reprogramado as Record<string, unknown>).ponto === 'string')) &&
    Array.isArray(p.demandas) && p.demandas.length <= LIMITES_OPERACAO.demandasPorPonto && p.demandas.every((d) => typeof d === 'string') &&
    SITUACOES_PONTO.includes(p.situacao as never)
  );
}

/** Chave que identifica a viagem de uma linha da planilha: mesma equipe, saída e retorno = mesma viagem. */
export const chaveViagem = (v: { equipe?: string; saida?: string; retorno?: string }) =>
  `${normalizar(v.equipe ?? '')}|${v.saida ?? ''}|${v.retorno ?? ''}`;

const temDadosDeViagem = (v: { equipe?: string; saida?: string; retorno?: string }) => !!(v.equipe?.trim() || v.saida || v.retorno);

/**
 * Encaixa pontos com equipe e datas (planilha ou formato antigo) nas viagens: usa a viagem com a mesma
 * equipe, saída e retorno ou cria uma nova. Linhas sem equipe nem datas ficam sem viagem.
 * `novoIdViagem` recebe as viagens já conhecidas, para não repetir id.
 */
export function encaixarEmViagens<T extends { equipe?: string; saida?: string; retorno?: string; integrantes?: string[] }>(
  itens: readonly T[],
  viagens: readonly Viagem[],
  novoIdViagem: (conhecidas: readonly Viagem[]) => string,
): { viagens: Viagem[]; itens: (Omit<T, 'equipe' | 'saida' | 'retorno' | 'integrantes'> & { viagem?: string })[] } {
  const todas = [...viagens];
  const porChave = new Map(todas.map((v) => [chaveViagem(v), v.id] as const));
  const saida = itens.map((item) => {
    const { equipe, saida: s, retorno, integrantes, ...resto } = item;
    if (!temDadosDeViagem({ equipe, saida: s, retorno })) return resto;
    const chave = chaveViagem({ equipe, saida: s, retorno });
    let id = porChave.get(chave);
    if (!id) {
      id = novoIdViagem(todas);
      todas.push({
        id, equipe: (equipe ?? '').replace(/\s+/g, ' ').trim().slice(0, LIMITES_OPERACAO.equipe), integrantes: [], veiculos: [], notas: '',
        ...(s ? { saida: s } : {}), ...(retorno ? { retorno } : {}),
      });
      porChave.set(chave, id);
    }
    // SERVIDOR_EQUIPE: os nomes da linha entram nos integrantes da viagem (sem repetir).
    if (integrantes?.length) {
      const i = todas.findIndex((v) => v.id === id);
      const juntos = limparNomes([...todas[i].integrantes, ...integrantes], LIMITES_OPERACAO.integrante).slice(0, LIMITES_OPERACAO.integrantes);
      if (juntos.length !== todas[i].integrantes.length) todas[i] = { ...todas[i], integrantes: juntos };
    }
    return { ...resto, viagem: id };
  });
  return { viagens: todas, itens: saida };
}

/** Id determinístico para a migração (a leitura não pode gerar ids diferentes a cada vez). */
const idMigracao = (conhecidas: readonly Viagem[]) => {
  let n = conhecidas.length + 1;
  while (conhecidas.some((v) => v.id === `vg-${n}`)) n++;
  return `vg-${n}`;
};

/** Operação gravada (formato atual ou antigo) para o formato atual; null se for inválida. */
export function migrarOperacao(x: unknown): Operacao | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  const valida =
    typeof o.id === 'string' && o.id.length > 0 &&
    typeof o.nome === 'string' && o.nome.trim().length > 0 && o.nome.length <= LIMITES_OPERACAO.nome &&
    dataOpcional(o.inicio) && dataOpcional(o.fim) &&
    (o.inicio === undefined || o.fim === undefined || (o.fim as string) >= (o.inicio as string)) &&
    (o.origem === undefined || texto(o.origem, LIMITES_OPERACAO.origem)) &&
    (o.setor === undefined || texto(o.setor, LIMITES_OPERACAO.setor)) &&
    typeof o.criadaEm === 'string' && !Number.isNaN(Date.parse(o.criadaEm)) &&
    (o.viagens === undefined || (Array.isArray(o.viagens) && o.viagens.length <= LIMITES_OPERACAO.viagens && o.viagens.every(viagemValida))) &&
    Array.isArray(o.pontos) && o.pontos.length <= LIMITES_OPERACAO.pontos && o.pontos.every(pontoValido) &&
    (o.historico === undefined || (Array.isArray(o.historico) && o.historico.length <= LIMITES_OPERACAO.historico && o.historico.every(eventoValido)));
  if (!valida) return null;
  const operacao = o as unknown as Omit<Operacao, 'viagens' | 'pontos'> & { viagens?: Viagem[]; pontos: (Ponto & { equipe?: string; saida?: string; retorno?: string })[] };
  const { viagens, itens } = encaixarEmViagens(operacao.pontos, operacao.viagens ?? [], idMigracao);
  const ids = new Set(viagens.map((v) => v.id));
  // Ponto que aponta para viagem que não existe fica sem viagem (melhor que esconder o ponto).
  const pontos = itens.map((p) => {
    if (p.viagem === undefined || ids.has(p.viagem)) return p as Ponto;
    const { viagem: _v, ...resto } = p;
    void _v;
    return resto as Ponto;
  });
  return { ...operacao, viagens, pontos };
}

export function operacaoValida(x: unknown): boolean {
  return migrarOperacao(x) !== null;
}

/** Lista gravada: só as operações válidas, já no formato atual; qualquer coisa que não seja lista vira vazia. */
export function validarListaOperacoes(x: unknown): Operacao[] {
  if (!Array.isArray(x)) return [];
  return x.map(migrarOperacao).filter((o): o is Operacao => o !== null).slice(0, LIMITES_OPERACAO.operacoes);
}

// ---------- Viagens ----------

export const viagemDoPonto = (o: Pick<Operacao, 'viagens'>, p: Pick<Ponto, 'viagem'>): Viagem | undefined =>
  p.viagem ? o.viagens.find((v) => v.id === p.viagem) : undefined;

/** O que falta para a viagem ficar completa; lista vazia = completa. */
export function faltasDaViagem(v: Viagem): string[] {
  const faltas: string[] = [];
  if (!v.equipe.trim()) faltas.push('nome da equipe');
  if (v.integrantes.length < MINIMOS_VIAGEM.integrantes) faltas.push(`integrantes (mínimo ${MINIMOS_VIAGEM.integrantes})`);
  if (v.veiculos.length < MINIMOS_VIAGEM.veiculos) faltas.push('veículo');
  if (!v.saida) faltas.push('data de saída');
  if (!v.retorno) faltas.push('data de retorno');
  return faltas;
}

/** Viagens em ordem de cronograma: saída, depois equipe; sem data por último. */
export function ordenarViagens(viagens: readonly Viagem[]): Viagem[] {
  return [...viagens].sort((a, b) =>
    (a.saida ?? '9999').localeCompare(b.saida ?? '9999') || a.equipe.localeCompare(b.equipe, 'pt-BR'));
}

/** "Equipe A · 18/09/2026 a 22/09/2026". */
export function textoViagem(v: Viagem): string {
  const br = (d?: string) => (d ? d.split('-').reverse().join('/') : '…');
  const datas = v.saida || v.retorno ? `${br(v.saida)} a ${br(v.retorno)}` : 'sem datas';
  return `${v.equipe.trim() || 'Equipe sem nome'} · ${datas}`;
}

export interface ConflitoAgenda {
  /** Operação e viagem com quem há sobreposição. */
  operacao: string;
  viagem: Viagem;
  pessoas: string[];
  veiculos: string[];
}

/** Chave da viagem no mapa de conflitos: o id da viagem só é único dentro da operação. */
export const chaveAgenda = (operacaoId: string, viagemId: string) => `${operacaoId}:${viagemId}`;

/**
 * Mesma pessoa ou mesmo veículo em viagens com datas sobrepostas, em qualquer operação. Viagem sem saída não entra.
 * Devolve, para cada viagem (chave `chaveAgenda`), com quem ela conflita. Sugestão: quem decide é o analista.
 */
export function conflitosDeAgenda(operacoes: readonly Operacao[]): Map<string, ConflitoAgenda[]> {
  const todas = operacoes.flatMap((o) => o.viagens.filter((v) => v.saida).map((v) => ({ o, v, fim: v.retorno ?? v.saida! })));
  const mapa = new Map<string, ConflitoAgenda[]>();
  const comuns = (a: readonly string[], b: readonly string[]) => {
    const nb = new Set(b.map(normalizar));
    return a.filter((x) => nb.has(normalizar(x)));
  };
  for (let i = 0; i < todas.length; i++) {
    for (let j = i + 1; j < todas.length; j++) {
      const a = todas[i];
      const b = todas[j];
      if (a.v.saida! > b.fim || b.v.saida! > a.fim) continue;
      const pessoas = comuns(a.v.integrantes, b.v.integrantes);
      const veiculos = comuns(a.v.veiculos, b.v.veiculos);
      if (!pessoas.length && !veiculos.length) continue;
      const ka = chaveAgenda(a.o.id, a.v.id);
      const kb = chaveAgenda(b.o.id, b.v.id);
      mapa.set(ka, [...(mapa.get(ka) ?? []), { operacao: b.o.nome, viagem: b.v, pessoas, veiculos }]);
      mapa.set(kb, [...(mapa.get(kb) ?? []), { operacao: a.o.nome, viagem: a.v, pessoas, veiculos }]);
    }
  }
  return mapa;
}

/** Nomes já usados em todas as operações, para sugerir ao digitar (sem repetir; ordem alfabética). */
export function sugestoesDeViagem(operacoes: readonly Operacao[]): { equipes: string[]; integrantes: string[]; veiculos: string[] } {
  const viagens = operacoes.flatMap((o) => o.viagens);
  const ordenar = (nomes: string[], max: number) => limparNomes(nomes, max).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return {
    equipes: ordenar(viagens.map((v) => v.equipe), LIMITES_OPERACAO.equipe),
    integrantes: ordenar(viagens.flatMap((v) => v.integrantes), LIMITES_OPERACAO.integrante),
    veiculos: ordenar(viagens.flatMap((v) => v.veiculos), LIMITES_OPERACAO.veiculo),
  };
}

// ---------- O que falta encaixar ----------

/** Ponto ainda planejado (sem resultado) sem viagem, ou cuja viagem não tem data de saída. */
export const pontoPendente = (o: Pick<Operacao, 'viagens'>, p: Ponto) => situacaoDoPonto(p) === 'planejado' && !viagemDoPonto(o, p)?.saida;

/** Pontos ainda planejados (sem resultado) e sem viagem. */
export const pontosSemViagem = (o: Pick<Operacao, 'viagens' | 'pontos'>): Ponto[] =>
  o.pontos.filter((p) => situacaoDoPonto(p) === 'planejado' && !viagemDoPonto(o, p));

/** Pontos planejados sem viagem ou com viagem sem data, de todas as operações (aviso do Painel). */
export function contarPontosPendentes(operacoes: readonly Operacao[]): number {
  return operacoes.reduce((n, o) => n + o.pontos.filter((p) => pontoPendente(o, p)).length, 0);
}

// ---------- Código, resultado e acompanhamento ----------

/** Texto de FISCALIZADO_AUTUADO para o resultado ("Fiscalizado não autuado" → 'fiscalizado-nao-autuado'); null se não reconhecer. */
export function resultadoDaPlanilha(texto: string): keyof typeof RESULTADOS | null {
  const t = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  const mapa: Record<string, keyof typeof RESULTADOS> = { SIM: 'sim', FISCALIZADONAOAUTUADO: 'fiscalizado-nao-autuado', NAOCABEATUACAO: 'nao-cabe-atuacao', NAO: 'nao' };
  return mapa[t] ?? null;
}

/** Município para o código: sem acento, sem espaço e em maiúsculas ("São José do Rio Claro" → "SAOJOSEDORIOCLARO"). */
export const municipioParaCodigo = (m: string) => m.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/** MUNICIPIO+AAAAMM-NN (ex.: JUINA202610-01); null se faltar município, início da operação ou número. */
export function gerarCodigo(municipio: string, inicioOperacao: string | undefined, numero: number | undefined): string | null {
  const m = municipioParaCodigo(municipio);
  if (!m || !inicioOperacao || numero === undefined) return null;
  return `${m}${inicioOperacao.slice(0, 4)}${inicioOperacao.slice(5, 7)}-${String(numero).padStart(2, '0')}`;
}

/** Códigos em uso em todas as operações (comparação sem diferença de maiúsculas), com onde cada um está. */
export function codigosEmUso(operacoes: readonly Operacao[]): Map<string, { operacao: string; ponto: string }> {
  const mapa = new Map<string, { operacao: string; ponto: string }>();
  for (const o of operacoes) for (const p of o.pontos) if (p.codigo) mapa.set(p.codigo.toUpperCase(), { operacao: o.nome, ponto: p.id });
  return mapa;
}

export interface PlanoDeCodigos {
  /** Pontos que ganham código (na ordem da operação). */
  gerar: { pontoId: string; rotulo: string; codigo: string }[];
  /** Pontos sem código que continuam sem: falta dado ou o código já existe. */
  fora: { pontoId: string; rotulo: string; motivo: string }[];
}

/**
 * O que "gerar códigos" faria na operação: só pontos sem código; nunca troca um código existente.
 * Código igual ao de outra operação (ou de outro ponto desta) deixa o ponto de fora, com o motivo.
 */
export function planejarCodigos(op: Operacao, todas: readonly Operacao[]): PlanoDeCodigos {
  const emUso = codigosEmUso(todas.filter((o) => o.id !== op.id));
  for (const p of op.pontos) if (p.codigo) emUso.set(p.codigo.toUpperCase(), { operacao: op.nome, ponto: p.id });
  const plano: PlanoDeCodigos = { gerar: [], fora: [] };
  for (const p of op.pontos) {
    if (p.codigo) continue;
    const rotulo = rotuloDoPonto(p);
    const falta = [!municipioParaCodigo(p.municipio) && 'município', p.numero === undefined && 'número do ponto', !op.inicio && 'início da operação'].filter(Boolean);
    if (falta.length) { plano.fora.push({ pontoId: p.id, rotulo, motivo: `falta ${falta.join(' e ')}` }); continue; }
    const codigo = gerarCodigo(p.municipio, op.inicio, p.numero)!;
    const onde = emUso.get(codigo);
    if (onde) { plano.fora.push({ pontoId: p.id, rotulo, motivo: `o código ${codigo} já existe (${onde.operacao})` }); continue; }
    emUso.set(codigo, { operacao: op.nome, ponto: p.id });
    plano.gerar.push({ pontoId: p.id, rotulo, codigo });
  }
  return plano;
}

/** Situação de acompanhamento do ponto (ver SITUACOES_ACOMPANHAMENTO). */
export function situacaoDoPonto(p: Pick<Ponto, 'situacao' | 'resultado' | 'reprogramado'>): SituacaoAcompanhamento {
  if (p.situacao === 'cancelado') return 'cancelado';
  if (p.reprogramado) return 'reprogramado';
  if (p.resultado === 'nao') return 'a-reprogramar';
  if (p.resultado) return 'finalizado';
  return p.situacao === 'vistoriado' ? 'resultado-pendente' : 'planejado';
}

/** Dias (AAAA-MM-DD) da saída ao retorno, inclusive; só a saída = um dia; sem saída ou retorno antes da saída = nenhum. Para no limite de 400 dias. */
export function diasDaViagem(v: Pick<Viagem, 'saida' | 'retorno'> | undefined): string[] {
  if (!v?.saida) return [];
  const fim = v.retorno ?? v.saida;
  const dias: string[] = [];
  const d = new Date(`${v.saida}T00:00:00Z`);
  while (dias.length < 400) {
    const iso = d.toISOString().slice(0, 10);
    if (iso > fim) break;
    dias.push(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dias;
}

/** Data fora do período da viagem (saída a retorno; só a saída = aquele dia). Sem viagem, sem saída ou sem data: false. */
export function dataForaDaViagem(v: Pick<Viagem, 'saida' | 'retorno'> | undefined, data: string): boolean {
  if (!v?.saida || !data) return false;
  return data < v.saida || data > (v.retorno ?? v.saida);
}

/** "vistoria" cai fora? Texto do período da viagem: "06/10 a 09/10/2026" (ou "06/10/2026"). */
export function textoPeriodoViagem(v: Pick<Viagem, 'saida' | 'retorno'>): string {
  const br = (d: string) => d.split('-').reverse().join('/');
  if (!v.saida) return '';
  if (!v.retorno || v.retorno === v.saida) return br(v.saida);
  return v.saida.slice(0, 4) === v.retorno.slice(0, 4) ? `${br(v.saida).slice(0, 5)} a ${br(v.retorno)}` : `${br(v.saida)} a ${br(v.retorno)}`;
}

// ---------- Fase pós-campo, vencimento e progresso ----------

export type FaseDoPonto = 'campo' | 'elaboracao' | 'concluido';
export const ROTULO_FASE: Record<FaseDoPonto, string> = { campo: 'em campo', elaboracao: 'em elaboração', concluido: 'concluído' };

/**
 * Onde o ponto está: em campo (sem resultado), em elaboração (com resultado, relatório ainda não enviado no SIGA-MT) ou
 * concluído (relatório enviado). "Não" (a reprogramar), cancelado e reprogramado seguem a situação e ficam sem fase.
 */
export function faseDoPonto(p: Pick<Ponto, 'situacao' | 'resultado' | 'reprogramado' | 'relatorio'>): FaseDoPonto | null {
  const s = situacaoDoPonto(p);
  if (s === 'cancelado' || s === 'reprogramado' || s === 'a-reprogramar') return null;
  if (!p.resultado) return 'campo';
  return p.relatorio?.enviadoEm ? 'concluido' : 'elaboracao';
}

/** Prazo da elaboração: demandas ligadas (o prazo mais cedo) e, se não houver, o padrão em dias. Ambos vazios = sem prazo (não vence). */
export interface PrazosDeElaboracao {
  prazosDemandas?: ReadonlyMap<string, string>;
  /** Dias depois do retorno da viagem (ou da saída, se não há retorno). */
  diasPadrao?: number;
}

const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export function prazoDaElaboracao(o: Pick<Operacao, 'viagens'>, p: Pick<Ponto, 'demandas' | 'viagem'>, ctx: PrazosDeElaboracao = {}): string | null {
  const dasDemandas = p.demandas.map((id) => ctx.prazosDemandas?.get(id)).filter((x): x is string => !!x).sort();
  if (dasDemandas.length > 0) return dasDemandas[0];
  const v = viagemDoPonto(o, p);
  const fim = v?.retorno ?? v?.saida;
  return ctx.diasPadrao !== undefined && fim ? somarDias(fim, ctx.diasPadrao) : null;
}

/**
 * "Vencido" não é situação. Em campo: ponto ainda sem resultado cuja viagem terminou antes de `hoje` (retorno, ou a saída se não há retorno).
 * Em elaboração: o prazo da elaboração passou. Concluído, a reprogramar, cancelado e reprogramado nunca vencem.
 * O bloqueio não suspende o prazo: ponto travado vence como qualquer outro (regra única do progresso, do aviso e do mapa).
 */
export function pontoVencido(
  o: Pick<Operacao, 'viagens'>, p: Pick<Ponto, 'situacao' | 'resultado' | 'reprogramado' | 'viagem' | 'demandas' | 'relatorio'>, hoje: string, ctx: PrazosDeElaboracao = {},
): boolean {
  const fase = faseDoPonto(p);
  if (fase === 'campo') {
    const v = viagemDoPonto(o, p);
    const fim = v?.retorno ?? v?.saida;
    return !!fim && fim < hoje;
  }
  if (fase === 'elaboracao') {
    const prazo = prazoDaElaboracao(o, p, ctx);
    return !!prazo && prazo < hoje;
  }
  return false;
}

/** Ponto que não precisa mais de trabalho: relatório enviado, cancelado ou reprogramado. */
export const pontoEncerrado = (p: Ponto) => faseDoPonto(p) === 'concluido' || ['cancelado', 'reprogramado'].includes(situacaoDoPonto(p));

export type SeloDaOperacao = 'planejada' | 'em-andamento' | 'pendente' | 'campo-encerrado' | 'encerrada';

/** Ponto com bloqueio ativo que ainda não saiu do jogo (cancelado e reprogramado não contam). */
export const pontoTravado = (p: Ponto) => !!p.bloqueio && situacaoDoPonto(p) !== 'cancelado' && situacaoDoPonto(p) !== 'reprogramado';

/** Campo encerrado: há pontos e nenhum está em campo nem a reprogramar (sobra elaboração, relatório enviado, cancelado ou reprogramado). */
export const campoEncerrado = (o: Pick<Operacao, 'pontos'>) =>
  o.pontos.length > 0 && o.pontos.every((p) => situacaoDoPonto(p) !== 'a-reprogramar' && faseDoPonto(p) !== 'campo');

export interface ProgressoDaOperacao {
  total: number;
  /** Relatório enviado + cancelado + reprogramado. */
  encerrados: number;
  /** total − encerrados (o "a reprogramar" e a elaboração contam como a finalizar). */
  aFinalizar: number;
  porSituacao: Record<SituacaoAcompanhamento, number>;
  emElaboracao: number;
  concluidos: number;
  vencidos: number;
  /** Pontos com bloqueio ativo. */
  travados: number;
  selo: SeloDaOperacao;
}

/**
 * Andamento da operação. Selo: encerrada se todos os pontos estão concluídos, cancelados ou reprogramados e nenhum está travado;
 * campo encerrado se nada mais está em campo nem a reprogramar (sobra elaboração, ou bloqueio); pendente se todas as viagens com datas
 * já terminaram (retorno, ou a saída sem retorno, antes de `hoje`); em andamento se alguma saída é hoje ou antes; senão planejada. Sem pontos: planejada.
 */
export function progressoDaOperacao(o: Pick<Operacao, 'pontos' | 'viagens'>, hoje: string, ctx: PrazosDeElaboracao = {}): ProgressoDaOperacao {
  const porSituacao = Object.fromEntries(Object.keys(SITUACOES_ACOMPANHAMENTO).map((k) => [k, 0])) as Record<SituacaoAcompanhamento, number>;
  let encerrados = 0, vencidos = 0, travados = 0, emElaboracao = 0, concluidos = 0;
  for (const p of o.pontos) {
    porSituacao[situacaoDoPonto(p)]++;
    const fase = faseDoPonto(p);
    if (fase === 'elaboracao') emElaboracao++;
    if (fase === 'concluido') concluidos++;
    if (pontoTravado(p as Ponto)) travados++;
    if (pontoEncerrado(p as Ponto)) encerrados++;
    if (pontoVencido(o, p, hoje, ctx)) vencidos++;
  }
  const total = o.pontos.length;
  const comDatas = o.viagens.filter((v) => v.saida || v.retorno);
  let selo: SeloDaOperacao = 'planejada';
  if (total > 0) {
    if (encerrados === total && travados === 0) selo = 'encerrada';
    else if (campoEncerrado(o)) selo = 'campo-encerrado';
    else if (comDatas.length > 0 && comDatas.every((v) => (v.retorno ?? v.saida)! < hoje)) selo = 'pendente';
    else if (comDatas.some((v) => v.saida && v.saida <= hoje)) selo = 'em-andamento';
  }
  return { total, encerrados, aFinalizar: total - encerrados, porSituacao, emElaboracao, concluidos, vencidos, travados, selo };
}

/** Operação encerrada: tem pontos e todos estão concluídos, cancelados ou reprogramados (o bloqueio é tratado à parte, no selo). */
export const operacaoEncerrada = (o: Pick<Operacao, 'pontos'>) => o.pontos.length > 0 && o.pontos.every(pontoEncerrado);

export interface PendenciaDeCampo {
  operacao: Operacao;
  ponto: Ponto;
}

/** Dias corridos desde a data do bloqueio (0 = hoje). */
export const diasParado = (b: { desde: string }, hoje: string) =>
  Math.max(0, Math.round((Date.parse(`${hoje}T00:00:00Z`) - Date.parse(`${dataLocal(new Date(b.desde))}T00:00:00Z`)) / 86_400_000));
export const textoParado = (n: number) => (n === 0 ? 'parado desde hoje' : `parado há ${n} dia${n === 1 ? '' : 's'}`);

/**
 * O que acumula depois do campo: pontos sem resultado cuja viagem já voltou, relatórios com o prazo vencido, pontos "Não" ainda não
 * reprogramados e os pontos travados (do bloqueio mais antigo ao mais recente). O travado também entra nas listas de vencidos quando vence.
 */
export function pendenciasDeCampo(operacoes: readonly Operacao[], hoje: string, ctx: PrazosDeElaboracao = {}) {
  const semResultado: PendenciaDeCampo[] = [];
  const relatorioAtrasado: PendenciaDeCampo[] = [];
  const aReprogramar: PendenciaDeCampo[] = [];
  const travados: PendenciaDeCampo[] = [];
  for (const operacao of operacoes) {
    for (const ponto of operacao.pontos) {
      if (situacaoDoPonto(ponto) === 'a-reprogramar') aReprogramar.push({ operacao, ponto });
      else if (pontoVencido(operacao, ponto, hoje, ctx)) (faseDoPonto(ponto) === 'campo' ? semResultado : relatorioAtrasado).push({ operacao, ponto });
      if (pontoTravado(ponto)) travados.push({ operacao, ponto });
    }
  }
  travados.sort((a, b) => a.ponto.bloqueio!.desde.localeCompare(b.ponto.bloqueio!.desde));
  return { semResultado, relatorioAtrasado, aReprogramar, travados };
}

/** AAAA-MM-DD no fuso do navegador (não em UTC: à noite em Mato Grosso, o UTC já é o dia seguinte). */
export const dataLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Rótulo curto do ponto: o código, ou "Ponto N" enquanto não houver código. */
export const rotuloDoPonto = (p: Pick<Ponto, 'codigo' | 'numero'>) => p.codigo ?? (p.numero !== undefined ? `Ponto ${p.numero}` : 'Ponto');

// ---------- Mesmo local ----------

const RAIO_TERRA_M = 6_371_000;
/** Distância padrão abaixo da qual dois pontos contam como o mesmo local. */
export const RAIO_PADRAO_M = 200;

/** Distância em metros entre duas coordenadas (haversine). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface LocalProximo {
  origem: 'operacao' | 'demanda';
  /** Nome da operação ou título da demanda. */
  rotulo: string;
  distanciaM: number;
  equipe?: string;
  /** AAAA-MM-DD: retorno, ou saída, da viagem do ponto; ausente se não houver data. */
  data?: string;
  situacao?: Ponto['situacao'];
  /** Id do ponto ou da demanda. */
  id: string;
}

export interface DemandaComLocal {
  id: string;
  titulo: string;
  coordenada?: Coordenada;
}

/**
 * Outros pontos de operação e demandas a até `raioM` do ponto, do mais perto ao mais longe.
 * É sugestão com origem e data: quem decide se é o mesmo local é o analista.
 */
export function pontosProximos(
  ponto: Pick<Ponto, 'id' | 'coordenada'>,
  operacoes: readonly Operacao[],
  demandas: readonly DemandaComLocal[] = [],
  raioM = RAIO_PADRAO_M,
): LocalProximo[] {
  const achados: LocalProximo[] = [];
  for (const o of operacoes) {
    for (const p of o.pontos) {
      if (p.id === ponto.id) continue;
      const d = distanciaMetros(ponto.coordenada, p.coordenada);
      if (d <= raioM) {
        const v = viagemDoPonto(o, p);
        const data = v?.retorno ?? v?.saida;
        achados.push({
          origem: 'operacao', rotulo: o.nome, distanciaM: d, id: p.id, situacao: p.situacao,
          ...(v?.equipe.trim() ? { equipe: v.equipe.trim() } : {}),
          ...(data ? { data } : {}),
        });
      }
    }
  }
  for (const dm of demandas) {
    if (!dm.coordenada) continue;
    const d = distanciaMetros(ponto.coordenada, dm.coordenada);
    if (d <= raioM) achados.push({ origem: 'demanda', rotulo: dm.titulo, distanciaM: d, id: dm.id });
  }
  return achados.sort((a, b) => a.distanciaM - b.distanciaM);
}

/** "Operação X, Equipe A, vistoriado, 22/09/2023, a 35 m". */
export function textoLocalProximo(l: LocalProximo): string {
  const partes = [l.origem === 'operacao' ? `Operação ${l.rotulo}` : `Demanda ${l.rotulo}`];
  if (l.equipe) partes.push(l.equipe);
  if (l.situacao) partes.push(l.situacao);
  if (l.data) partes.push(l.data.split('-').reverse().join('/'));
  partes.push(`a ${Math.round(l.distanciaM)} m`);
  return partes.join(', ');
}

// ---------- Vínculo com demandas ----------

export interface VinculoDemanda {
  operacao: Operacao;
  ponto: Ponto;
}

/** Demanda → pontos que a listam, em qualquer operação. Ponto cancelado não conta como encaixe. */
export function vinculosDasDemandas(operacoes: readonly Operacao[]): Map<string, VinculoDemanda[]> {
  const mapa = new Map<string, VinculoDemanda[]>();
  for (const operacao of operacoes) {
    for (const ponto of operacao.pontos) {
      if (ponto.situacao === 'cancelado') continue;
      for (const id of ponto.demandas) mapa.set(id, [...(mapa.get(id) ?? []), { operacao, ponto }]);
    }
  }
  return mapa;
}

/** Ids das demandas já encaixadas em alguma operação. */
export const demandasEncaixadas = (operacoes: readonly Operacao[]): Set<string> => new Set(vinculosDasDemandas(operacoes).keys());

// ---------- Organização da lista ----------

export interface GrupoDePontos<T> {
  /** Nome do grupo; vazio = pontos sem grupo. */
  nome: string;
  pontos: T[];
  /** Equipes distintas dos pontos do grupo, em ordem alfabética. */
  equipes: string[];
}

/** Grupos existentes, em ordem alfabética, com "sem grupo" por último (só se houver). Sem nenhum grupo, devolve lista vazia. */
export function agruparPontos<T extends Pick<Ponto, 'grupo'>>(pontos: readonly T[], equipeDe: (p: T) => string | undefined = () => undefined): GrupoDePontos<T>[] {
  if (!pontos.some((p) => p.grupo?.trim())) return [];
  const mapa = new Map<string, T[]>();
  for (const p of pontos) {
    const nome = p.grupo?.trim() ?? '';
    mapa.set(nome, [...(mapa.get(nome) ?? []), p]);
  }
  const nomes = [...mapa.keys()].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  if (mapa.has('')) nomes.push('');
  return nomes.map((nome) => ({
    nome,
    pontos: mapa.get(nome)!,
    equipes: [...new Set(mapa.get(nome)!.map((p) => equipeDe(p)?.trim()).filter((e): e is string => !!e))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  }));
}

/** Nomes de grupo já usados na operação, em ordem alfabética. */
export const nomesDeGrupos = (pontos: readonly Pick<Ponto, 'grupo'>[]): string[] =>
  [...new Set(pontos.map((p) => p.grupo?.trim()).filter((g): g is string => !!g))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

// ---------- Nome sugerido da operação ----------

export interface LinhaParaNome {
  /** Município como veio na planilha. */
  municipio: string;
  /** FISCALIZADO_AUTUADO: vazio = ainda sem resultado. */
  resultado?: string;
  /** MES_PPROG, AAAAMM. */
  mes?: string;
  /** DATA_SAIDA, AAAA-MM-DD. */
  saida?: string;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const semAcentoMinusculo = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** "out/2026" a partir de MES_PPROG (AAAAMM) ou, sem ele, da menor data de saída; '' se não houver nenhum. */
function textoDoMes(linhas: readonly LinhaParaNome[]): string {
  const doPlano = linhas.map((l) => /^(\d{4})(0[1-9]|1[0-2])$/.exec((l.mes ?? '').trim())).filter((m) => m !== null).map((m) => `${m[1]}${m[2]}`).sort()[0];
  if (doPlano) return `${MESES[Number(doPlano.slice(4)) - 1]}/${doPlano.slice(0, 4)}`;
  const saida = linhas.map((l) => l.saida).filter((s): s is string => !!s && dataValida(s)).sort()[0];
  return saida ? `${MESES[Number(saida.slice(5, 7)) - 1]}/${saida.slice(0, 4)}` : '';
}

/** Corta no último espaço antes do limite, sem deixar separador (" –") pendurado no fim. */
function cortarNome(nome: string, limite: number): string {
  if (nome.length <= limite) return nome;
  const corte = nome.slice(0, limite);
  const ate = nome[limite] === ' ' ? limite : corte.lastIndexOf(' ');
  return (ate > 0 ? corte.slice(0, ate) : corte).replace(/[\s–-]+$/, '');
}

/**
 * "Operação <Município> – <mês>/<ano>". O município é o de mais pontos ainda sem resultado (se todos têm resultado,
 * o de mais pontos), empate em ordem alfabética. Nome já existente (sem diferenciar maiúsculas e acentos) ganha " (2)", " (3)"...
 * Devolve '' quando não há município nem mês.
 */
export function sugerirNomeOperacao(linhas: readonly LinhaParaNome[], existentes: readonly Pick<Operacao, 'nome'>[]): string {
  const comNome = linhas.filter((l) => l.municipio.trim());
  const semResultado = comNome.filter((l) => !(l.resultado ?? '').trim());
  const contagem = new Map<string, number>();
  for (const l of semResultado.length ? semResultado : comNome) contagem.set(l.municipio.trim(), (contagem.get(l.municipio.trim()) ?? 0) + 1);
  const municipio = [...contagem].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))[0]?.[0];
  const mes = textoDoMes(linhas);
  const base = [municipio && `Operação ${municipio}`, mes && (municipio ? mes : `Operação ${mes}`)].filter(Boolean).join(' – ');
  if (!base) return '';
  const usados = new Set(existentes.map((o) => semAcentoMinusculo(o.nome)));
  for (let n = 1; ; n++) {
    const sufixo = n === 1 ? '' : ` (${n})`;
    const nome = cortarNome(base, LIMITES_OPERACAO.nome - sufixo.length) + sufixo;
    if (!usados.has(semAcentoMinusculo(nome))) return nome;
  }
}

/** Pontos por viagem, na ordem do cronograma, com "sem viagem" por último. Só seções com pontos. */
export function pontosPorViagem(o: Pick<Operacao, 'viagens'>, pontos: readonly Ponto[]): { viagem?: Viagem; pontos: Ponto[] }[] {
  const secoes: { viagem?: Viagem; pontos: Ponto[] }[] = ordenarViagens(o.viagens)
    .map((viagem) => ({ viagem, pontos: pontos.filter((p) => p.viagem === viagem.id) }))
    .filter((s) => s.pontos.length > 0);
  const sem = pontos.filter((p) => !viagemDoPonto(o, p));
  if (sem.length) secoes.push({ pontos: sem });
  return secoes;
}

