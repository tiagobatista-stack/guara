// Armazém das operações no localStorage (lista local, como atalhos e contatos).
// Começa vazio. Coordenadas podem identificar imóvel: ficam só neste navegador, fora do backup, da tela compartilhada e do MCP.

import { criarListaLocal, novoId } from '../atalhos/lista-local.ts';
import { dataValida } from '../demandas/regras.ts';
import {
  CHAVE_OPERACOES, LIMITES_OPERACAO, RESULTADOS_COM_MOTIVO,
  type EventoOperacao, type MotivoPeriodo, type Operacao, type Ponto, type PontoNovo, type ResultadoPonto, type Viagem,
} from './modelo.ts';
import { codigosEmUso, encaixarEmViagens, gerarCodigo, limparNomes, periodoDosPontos, problemasDeDatas, situacaoDoPonto, validarListaOperacoes, type Periodo } from './regras.ts';

const lista = criarListaLocal<Operacao>(CHAVE_OPERACOES, () => [], validarListaOperacoes);

export const obterOperacoes = lista.obter;
export const useOperacoes = lista.useLista;
export const useOperacoesSoNaMemoria = lista.useSoNaMemoria;

export interface DadosOperacao {
  nome: string;
  /** Vazios = sem período (vem do CSV ao importar). */
  inicio: string;
  fim: string;
  origem: string;
  /** Setor que fiscaliza (AG_FISCALIZACAO); opcional. */
  setor?: string;
}

/** Problema do período informado (lados vazios são permitidos) ou null. */
function problemaDoPeriodo(inicio: string, fim: string): string | null {
  if ((inicio && !dataValida(inicio)) || (fim && !dataValida(fim))) return 'Informe datas válidas para o período.';
  if (inicio && fim && fim < inicio) return 'O fim da operação não pode ser antes do início.';
  return null;
}

/** Devolve a mensagem do problema ou null. */
function problemaDaOperacao(d: DadosOperacao): string | null {
  const nome = d.nome.trim();
  if (!nome) return 'Informe o nome da operação.';
  if (nome.length > LIMITES_OPERACAO.nome) return `O nome pode ter no máximo ${LIMITES_OPERACAO.nome} caracteres.`;
  if (d.origem.trim().length > LIMITES_OPERACAO.origem) return `A origem pode ter no máximo ${LIMITES_OPERACAO.origem} caracteres.`;
  if ((d.setor ?? '').trim().length > LIMITES_OPERACAO.setor) return `O setor pode ter no máximo ${LIMITES_OPERACAO.setor} caracteres.`;
  return problemaDoPeriodo(d.inicio, d.fim);
}

export function criarOperacao(d: DadosOperacao, agoraIso: string): { ok: true; id: string } | { ok: false; erro: string } {
  const atuais = obterOperacoes();
  if (atuais.length >= LIMITES_OPERACAO.operacoes) return { ok: false, erro: `O limite é de ${LIMITES_OPERACAO.operacoes} operações.` };
  const erro = problemaDaOperacao(d);
  if (erro) return { ok: false, erro };
  const id = novoId('op', atuais);
  const origem = d.origem.trim();
  const setor = (d.setor ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  lista.gravar([...atuais, { id, nome: d.nome.trim(), ...(d.inicio ? { inicio: d.inicio } : {}), ...(d.fim ? { fim: d.fim } : {}), ...(origem ? { origem } : {}), ...(setor ? { setor } : {}), viagens: [], pontos: [], criadaEm: agoraIso, historico: [{ quando: agoraIso, acao: 'criada' }] }]);
  return { ok: true, id };
}

/** Cria a operação já com os pontos (viagens e códigos como em `incluirPontos`). Valida tudo antes e grava uma vez; exige ao menos um ponto. */
export function criarOperacaoComPontos(d: DadosOperacao, agoraIso: string, novos: readonly PontoNovo[]): { ok: true; id: string } | { ok: false; erro: string } {
  if (novos.length === 0) return { ok: false, erro: 'Nenhuma linha válida para criar a operação.' };
  const atuais = obterOperacoes();
  if (atuais.length >= LIMITES_OPERACAO.operacoes) return { ok: false, erro: `O limite é de ${LIMITES_OPERACAO.operacoes} operações.` };
  const erro = problemaDaOperacao(d);
  if (erro) return { ok: false, erro };
  const id = novoId('op', atuais);
  const origem = d.origem.trim();
  const setor = (d.setor ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  const vazia: Operacao = { id, nome: d.nome.trim(), ...(d.inicio ? { inicio: d.inicio } : {}), ...(d.fim ? { fim: d.fim } : {}), ...(origem ? { origem } : {}), ...(setor ? { setor } : {}), viagens: [], pontos: [], criadaEm: agoraIso, historico: [{ quando: agoraIso, acao: 'criada' }] };
  const r = acrescentarPontos(atuais, vazia, novos);
  if (!r.ok) return r;
  lista.gravar([...atuais, completarCodigos(r.op, atuais)]);
  return { ok: true, id };
}

export function excluirOperacao(id: string): void {
  lista.gravar(obterOperacoes().filter((o) => o.id !== id));
}

/**
 * Dá código aos pontos da operação que ainda não têm (MUNICIPIO+AAAAMM-NN). Código já dado não muda.
 * Se o gerado já existir em outra operação, o ponto fica sem código (a tela mostra o conflito).
 */
function completarCodigos(op: Operacao, todas: readonly Operacao[]): Operacao {
  const emUso = codigosEmUso(todas.filter((o) => o.id !== op.id));
  for (const p of op.pontos) if (p.codigo) emUso.set(p.codigo.toUpperCase(), { operacao: op.nome, ponto: p.id });
  let mudou = false;
  const pontos = op.pontos.map((p) => {
    if (p.codigo) return p;
    const codigo = gerarCodigo(p.municipio, op.inicio, p.numero);
    if (!codigo || emUso.has(codigo)) return p;
    emUso.set(codigo, { operacao: op.nome, ponto: p.id });
    mudou = true;
    return { ...p, codigo };
  });
  return mudou ? { ...op, pontos } : op;
}

/** Grava a operação alterada, já com os códigos que faltavam. */
function gravarOperacao(atuais: readonly Operacao[], nova: Operacao) {
  const completa = completarCodigos(nova, atuais);
  lista.gravar(atuais.map((o) => (o.id === nova.id ? completa : o)));
}

/** Código que o ponto teria e por que ainda não tem (para a tela); null quando já tem ou não há como gerar. */
export function conflitoDeCodigo(op: Operacao, p: Ponto): string | null {
  if (p.codigo) return null;
  const codigo = gerarCodigo(p.municipio, op.inicio, p.numero);
  if (!codigo) return null;
  const onde = codigosEmUso(obterOperacoes()).get(codigo);
  return onde ? `O código ${codigo} já existe (${onde.operacao}). Mude o número do ponto para gerar outro.` : null;
}

/**
 * Acrescenta pontos já conferidos (vindos da importação ou do formulário). Equipe e datas da linha viram a viagem:
 * a que já existe com a mesma equipe, saída e retorno, ou uma nova. Devolve o problema ou null.
 */
export function incluirPontos(operacaoId: string, novos: readonly PontoNovo[]): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op) return 'Operação não encontrada.';
  const r = acrescentarPontos(atuais, op, novos);
  if (!r.ok) return r.erro;
  gravarOperacao(atuais, r.op);
  return null;
}

/** Valida e monta a operação com os pontos acrescentados, sem gravar nada. */
function acrescentarPontos(atuais: readonly Operacao[], op: Operacao, novos: readonly PontoNovo[]): { ok: true; op: Operacao } | { ok: false; erro: string } {
  if (op.pontos.length + novos.length > LIMITES_OPERACAO.pontos) return { ok: false, erro: `O limite é de ${LIMITES_OPERACAO.pontos} pontos por operação.` };
  for (const p of novos) {
    const erros = problemasDeDatas(p, { inicio: op.inicio, fim: op.fim });
    if (erros.length) return { ok: false, erro: erros[0] };
  }
  // Código vindo da planilha: não pode repetir outro já usado, nem dentro do próprio arquivo.
  const emUso = codigosEmUso(atuais);
  for (const p of novos) {
    if (!p.codigo) continue;
    const codigo = p.codigo.trim();
    if (codigo.length > LIMITES_OPERACAO.codigo) return { ok: false, erro: `O código ${codigo.slice(0, 20)}… passa de ${LIMITES_OPERACAO.codigo} caracteres.` };
    const onde = emUso.get(codigo.toUpperCase());
    if (onde) return { ok: false, erro: `O código ${codigo} já existe (${onde.operacao}).` };
    emUso.set(codigo.toUpperCase(), { operacao: op.nome, ponto: '' });
  }
  const { viagens, itens } = encaixarEmViagens(novos, op.viagens, (conhecidas) => novoId('vg', conhecidas));
  if (viagens.length > LIMITES_OPERACAO.viagens) return { ok: false, erro: `O limite é de ${LIMITES_OPERACAO.viagens} viagens por operação.` };
  const pontos = [...op.pontos];
  // Ponto sem número recebe o próximo livre da operação (o número entra no código).
  let proximo = Math.max(0, ...pontos.map((p) => p.numero ?? 0), ...itens.map((p) => p.numero ?? 0)) + 1;
  for (const p of itens) {
    const { codigo, ...resto } = p;
    pontos.push({ id: novoId('pt', pontos), ...resto, ...(p.numero === undefined ? { numero: proximo++ } : {}), ...(codigo?.trim() ? { codigo: codigo.trim() } : {}) });
  }
  // O período que a pessoa informou vale; só o lado que falta vem das datas das linhas.
  const doArquivo = periodoDosPontos(novos);
  const inicio = op.inicio ?? doArquivo.inicio;
  const fim = op.fim ?? doArquivo.fim;
  return { ok: true, op: { ...op, ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}), viagens, pontos } };
}

/** Acrescenta um evento ao histórico do pedido (guarda os mais recentes, até o limite). */
const comEvento = (o: Operacao, e: EventoOperacao): EventoOperacao[] => [...(o.historico ?? []), e].slice(-LIMITES_OPERACAO.historico);

/**
 * Define, corrige ou limpa o período (vazio = sem período). Recusa o que deixa viagens de fora.
 * Quando o período muda de fato, registra no histórico do pedido o anterior, o novo e o motivo (opcional).
 */
export function alterarPeriodo(operacaoId: string, inicio: string, fim: string, registro: { quando?: string; motivo?: MotivoPeriodo } = {}): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op) return 'Operação não encontrada.';
  const erro = problemaDoPeriodo(inicio, fim);
  if (erro) return erro;
  const janela: Periodo = { ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}) };
  if (op.viagens.some((v) => problemasDeDatas(v, janela).some((e) => e.includes('fora do período')))) {
    return 'Há viagens com data fora desse período: ajuste as datas das viagens primeiro.';
  }
  if ((op.inicio ?? '') === inicio && (op.fim ?? '') === fim) return null;
  const { inicio: _i, fim: _f, ...resto } = op;
  void [_i, _f];
  const evento: EventoOperacao = {
    quando: registro.quando ?? new Date().toISOString(), acao: 'periodo',
    de: { ...(op.inicio ? { inicio: op.inicio } : {}), ...(op.fim ? { fim: op.fim } : {}) }, para: janela,
    ...(registro.motivo ? { motivo: registro.motivo } : {}),
  };
  gravarOperacao(atuais, { ...resto, ...janela, historico: comEvento(op, evento) });
  return null;
}

/**
 * Altera campos de um ponto (número, município, tipo de dano, viagem, grupo, demandas, situação, notas).
 * Texto vazio tira o campo do ponto. O código, depois de dado, não muda. Devolve o problema ou null.
 */
export function alterarPonto(operacaoId: string, pontoId: string, mudancas: Partial<Omit<Ponto, 'id' | 'coordenada' | 'codigo'>>): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  const ponto = op?.pontos.find((p) => p.id === pontoId);
  if (!op || !ponto) return 'Ponto não encontrado.';
  const novo: Ponto = { ...ponto, ...mudancas };
  for (const k of ['viagem', 'grupo', 'tipoDano'] as const) {
    if (novo[k] !== undefined && String(novo[k]).trim() === '') delete novo[k];
  }
  if (novo.numero !== undefined && (!Number.isInteger(novo.numero) || novo.numero < 0)) return 'O número do ponto deve ser um inteiro.';
  if (novo.numero !== undefined && novo.numero !== ponto.numero && op.pontos.some((p) => p.id !== pontoId && p.numero === novo.numero)) {
    return `Já existe o ponto ${novo.numero} nesta operação.`;
  }
  if (novo.municipio.length > LIMITES_OPERACAO.municipio) return `O município pode ter no máximo ${LIMITES_OPERACAO.municipio} caracteres.`;
  if ((novo.tipoDano ?? '').length > LIMITES_OPERACAO.tipoDano) return `O tipo de dano pode ter no máximo ${LIMITES_OPERACAO.tipoDano} caracteres.`;
  if (novo.viagem && !op.viagens.some((v) => v.id === novo.viagem)) return 'Viagem não encontrada.';
  if ((novo.grupo ?? '').length > LIMITES_OPERACAO.grupo) return `O grupo pode ter no máximo ${LIMITES_OPERACAO.grupo} caracteres.`;
  if (novo.notas.length > LIMITES_OPERACAO.notas) return `As notas podem ter no máximo ${LIMITES_OPERACAO.notas} caracteres.`;
  if (novo.demandas.length > LIMITES_OPERACAO.demandasPorPonto) return `O limite é de ${LIMITES_OPERACAO.demandasPorPonto} demandas por ponto.`;
  gravarOperacao(atuais, { ...op, pontos: op.pontos.map((p) => (p.id === pontoId ? novo : p)) });
  return null;
}

export function excluirPonto(operacaoId: string, pontoId: string): void {
  lista.gravar(obterOperacoes().map((o) => (o.id === operacaoId ? { ...o, pontos: o.pontos.filter((p) => p.id !== pontoId) } : o)));
}

export interface DadosDemandaComoPonto {
  demandaId: string;
  coordenada: Ponto['coordenada'];
  municipio: string;
}

/** Agenda a demanda numa operação: cria um ponto planejado (sem equipe e sem datas) ligado a ela. Devolve o problema ou null. */
export function incluirDemandaComoPonto(operacaoId: string, d: DadosDemandaComoPonto): string | null {
  const op = obterOperacoes().find((o) => o.id === operacaoId);
  if (!op) return 'Operação não encontrada.';
  if (op.pontos.some((p) => p.situacao !== 'cancelado' && p.demandas.includes(d.demandaId))) return 'Esta demanda já está nesta operação.';
  return incluirPontos(operacaoId, [
    { coordenada: d.coordenada, municipio: d.municipio.trim().slice(0, LIMITES_OPERACAO.municipio), notas: '', demandas: [d.demandaId], situacao: 'planejado' },
  ]);
}

/** Liga a demanda a um ponto que já existe (por exemplo, um ponto já vistoriado). */
export function vincularDemandaAPonto(operacaoId: string, pontoId: string, demandaId: string): string | null {
  const ponto = obterOperacoes().find((o) => o.id === operacaoId)?.pontos.find((p) => p.id === pontoId);
  if (!ponto) return 'Ponto não encontrado.';
  if (ponto.demandas.includes(demandaId)) return 'Esta demanda já está ligada a este ponto.';
  return alterarPonto(operacaoId, pontoId, { demandas: [...ponto.demandas, demandaId] });
}

export function desvincularDemandaDePonto(operacaoId: string, pontoId: string, demandaId: string): string | null {
  const ponto = obterOperacoes().find((o) => o.id === operacaoId)?.pontos.find((p) => p.id === pontoId);
  if (!ponto) return 'Ponto não encontrado.';
  return alterarPonto(operacaoId, pontoId, { demandas: ponto.demandas.filter((id) => id !== demandaId) });
}

/** Põe os pontos escolhidos num grupo de uma vez; nome vazio tira os pontos do grupo. Devolve o problema ou null. */
export function definirGrupo(operacaoId: string, pontoIds: readonly string[], grupo: string): string | null {
  const nome = grupo.replace(/\s+/g, ' ').trim();
  if (nome.length > LIMITES_OPERACAO.grupo) return `O nome do grupo pode ter no máximo ${LIMITES_OPERACAO.grupo} caracteres.`;
  if (pontoIds.length === 0) return 'Selecione ao menos um ponto.';
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op) return 'Operação não encontrada.';
  const alvo = new Set(pontoIds);
  const pontos = op.pontos.map((p) => {
    if (!alvo.has(p.id)) return p;
    const { grupo: _antigo, ...resto } = p;
    void _antigo;
    return nome ? { ...resto, grupo: nome } : resto;
  });
  lista.gravar(atuais.map((o) => (o.id === operacaoId ? { ...o, pontos } : o)));
  return null;
}

// ---------- Viagens ----------

export interface DadosViagem {
  equipe: string;
  integrantes: readonly string[];
  veiculos: readonly string[];
  /** Vazios = sem data. */
  saida: string;
  retorno: string;
  notas: string;
}

/** Viagem limpa a partir do formulário, ou o problema. */
function montarViagem(op: Operacao, id: string, d: DadosViagem): Viagem | string {
  const equipe = d.equipe.replace(/\s+/g, ' ').trim();
  if (equipe.length > LIMITES_OPERACAO.equipe) return `O nome da equipe pode ter no máximo ${LIMITES_OPERACAO.equipe} caracteres.`;
  const integrantes = limparNomes(d.integrantes, LIMITES_OPERACAO.integrante);
  const veiculos = limparNomes(d.veiculos, LIMITES_OPERACAO.veiculo);
  if (integrantes.length > LIMITES_OPERACAO.integrantes) return `O limite é de ${LIMITES_OPERACAO.integrantes} integrantes por viagem.`;
  if (veiculos.length > LIMITES_OPERACAO.veiculos) return `O limite é de ${LIMITES_OPERACAO.veiculos} veículos por viagem.`;
  const notas = d.notas.trim();
  if (notas.length > LIMITES_OPERACAO.notas) return `As notas podem ter no máximo ${LIMITES_OPERACAO.notas} caracteres.`;
  const erros = problemasDeDatas({ saida: d.saida || undefined, retorno: d.retorno || undefined }, { inicio: op.inicio, fim: op.fim });
  if (erros.length) return erros[0];
  return { id, equipe, integrantes, veiculos, notas, ...(d.saida ? { saida: d.saida } : {}), ...(d.retorno ? { retorno: d.retorno } : {}) };
}

export function criarViagem(operacaoId: string, d: DadosViagem): { ok: true; id: string } | { ok: false; erro: string } {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op) return { ok: false, erro: 'Operação não encontrada.' };
  if (op.viagens.length >= LIMITES_OPERACAO.viagens) return { ok: false, erro: `O limite é de ${LIMITES_OPERACAO.viagens} viagens por operação.` };
  const viagem = montarViagem(op, novoId('vg', op.viagens), d);
  if (typeof viagem === 'string') return { ok: false, erro: viagem };
  lista.gravar(atuais.map((o) => (o.id === operacaoId ? { ...o, viagens: [...o.viagens, viagem] } : o)));
  return { ok: true, id: viagem.id };
}

/** Altera a viagem; os pontos dela acompanham (as datas são da viagem). Devolve o problema ou null. */
export function alterarViagem(operacaoId: string, viagemId: string, d: DadosViagem): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op || !op.viagens.some((v) => v.id === viagemId)) return 'Viagem não encontrada.';
  const viagem = montarViagem(op, viagemId, d);
  if (typeof viagem === 'string') return viagem;
  lista.gravar(atuais.map((o) => (o.id === operacaoId ? { ...o, viagens: o.viagens.map((v) => (v.id === viagemId ? viagem : v)) } : o)));
  return null;
}

/** Exclui a viagem; os pontos dela continuam na operação, sem viagem. */
export function excluirViagem(operacaoId: string, viagemId: string): void {
  lista.gravar(obterOperacoes().map((o) => {
    if (o.id !== operacaoId) return o;
    const pontos = o.pontos.map((p) => {
      if (p.viagem !== viagemId) return p;
      const { viagem: _v, ...resto } = p;
      void _v;
      return resto;
    });
    return { ...o, viagens: o.viagens.filter((v) => v.id !== viagemId), pontos };
  }));
}

/** Põe os pontos escolhidos numa viagem de uma vez; id vazio tira os pontos da viagem. Devolve o problema ou null. */
export function definirViagem(operacaoId: string, pontoIds: readonly string[], viagemId: string): string | null {
  if (pontoIds.length === 0) return 'Selecione ao menos um ponto.';
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op) return 'Operação não encontrada.';
  if (viagemId && !op.viagens.some((v) => v.id === viagemId)) return 'Viagem não encontrada.';
  const alvo = new Set(pontoIds);
  const pontos = op.pontos.map((p) => {
    if (!alvo.has(p.id)) return p;
    const { viagem: _antiga, ...resto } = p;
    void _antiga;
    return viagemId ? { ...resto, viagem: viagemId } : resto;
  });
  lista.gravar(atuais.map((o) => (o.id === operacaoId ? { ...o, pontos } : o)));
  return null;
}

// ---------- Resultado e reprogramação ----------

export interface DadosResultado {
  /** Vazio = apagar o resultado (o ponto volta a planejado). */
  resultado: '' | ResultadoPonto;
  motivo: string;
  protocolo: string;
  observacao: string;
  /** AAAA-MM-DD ou vazio. */
  dataVistoria: string;
}

/** Registra o resultado do ponto (FISCALIZADO_AUTUADO e o pós-campo). `hoje` (AAAA-MM-DD) impede data de vistoria futura. */
export function registrarResultado(operacaoId: string, pontoId: string, d: DadosResultado, hoje: string): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  const ponto = op?.pontos.find((p) => p.id === pontoId);
  if (!op || !ponto) return 'Ponto não encontrado.';
  if (ponto.reprogramado) return 'Este ponto já foi reprogramado em outra operação: registre o resultado lá.';
  const { resultado: _r, motivo: _m, protocolo: _p, observacao: _o, dataVistoria: _d, ...base } = ponto;
  void [_r, _m, _p, _o, _d];
  if (!d.resultado) {
    gravarOperacao(atuais, { ...op, pontos: op.pontos.map((p) => (p.id === pontoId ? { ...base, situacao: ponto.situacao === 'cancelado' ? 'cancelado' : 'planejado' } : p)) });
    return null;
  }
  const motivo = d.motivo.replace(/\s+/g, ' ').trim();
  const protocolo = d.protocolo.replace(/\s+/g, ' ').trim();
  const observacao = d.observacao.trim();
  if (RESULTADOS_COM_MOTIVO.includes(d.resultado) && !motivo) return 'Informe o motivo de não fiscalizar ou não autuar.';
  if (motivo.length > LIMITES_OPERACAO.motivo) return `O motivo pode ter no máximo ${LIMITES_OPERACAO.motivo} caracteres.`;
  if (protocolo.length > LIMITES_OPERACAO.protocolo) return `O protocolo pode ter no máximo ${LIMITES_OPERACAO.protocolo} caracteres.`;
  if (observacao.length > LIMITES_OPERACAO.observacao) return `A observação pode ter no máximo ${LIMITES_OPERACAO.observacao} caracteres.`;
  if (d.dataVistoria && !dataValida(d.dataVistoria)) return 'Informe uma data de vistoria válida.';
  if (d.dataVistoria && d.dataVistoria > hoje) return 'A data da vistoria não pode ser futura.';
  const novo: Ponto = {
    ...base,
    // "Não" = não fiscalizado: o ponto não foi vistoriado e fica a reprogramar.
    situacao: d.resultado === 'nao' ? 'planejado' : 'vistoriado',
    resultado: d.resultado,
    ...(motivo ? { motivo } : {}), ...(protocolo ? { protocolo } : {}), ...(observacao ? { observacao } : {}),
    ...(d.dataVistoria ? { dataVistoria: d.dataVistoria } : {}),
  };
  gravarOperacao(atuais, { ...op, pontos: op.pontos.map((p) => (p.id === pontoId ? novo : p)) });
  return null;
}

/**
 * Leva um ponto "Não" (a reprogramar) para outra operação: cria lá um ponto planejado no mesmo local,
 * com as demandas e o tipo de dano, e marca o original como reprogramado. Devolve o problema ou null.
 */
export function reprogramarPonto(origemId: string, pontoId: string, destinoId: string): string | null {
  const atuais = obterOperacoes();
  const origem = atuais.find((o) => o.id === origemId);
  const ponto = origem?.pontos.find((p) => p.id === pontoId);
  if (!origem || !ponto) return 'Ponto não encontrado.';
  if (situacaoDoPonto(ponto) !== 'a-reprogramar') return 'Só ponto com resultado "Não" (não fiscalizado) pode ser reprogramado.';
  if (destinoId === origemId) return 'Escolha outra operação.';
  const destino = atuais.find((o) => o.id === destinoId);
  if (!destino) return 'Operação de destino não encontrada.';
  const notas = [ponto.notas, `Reprogramado de ${ponto.codigo ?? origem.nome}${ponto.motivo ? ` (${ponto.motivo})` : ''}.`].filter(Boolean).join(' ').slice(0, LIMITES_OPERACAO.notas);
  const erro = incluirPontos(destinoId, [{
    coordenada: ponto.coordenada, municipio: ponto.municipio, notas, demandas: ponto.demandas, situacao: 'planejado',
    ...(ponto.tipoDano ? { tipoDano: ponto.tipoDano } : {}),
  }]);
  if (erro) return erro;
  const novo = obterOperacoes().find((o) => o.id === destinoId)!.pontos.at(-1)!;
  const depois = obterOperacoes();
  lista.gravar(depois.map((o) => (o.id === origemId
    ? { ...o, pontos: o.pontos.map((p) => (p.id === pontoId ? { ...p, reprogramado: { operacao: destinoId, ponto: novo.id } } : p)) }
    : o)));
  return null;
}

// ---------- Planilha da SEMA: setor e reimportação ----------

/** Define ou limpa o setor da operação (AG_FISCALIZACAO, ex.: DUDJUINA). Devolve o problema ou null. */
export function definirSetor(operacaoId: string, setor: string): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op) return 'Operação não encontrada.';
  const valor = setor.replace(/\s+/g, ' ').trim().toUpperCase();
  if (valor.length > LIMITES_OPERACAO.setor) return `O setor pode ter no máximo ${LIMITES_OPERACAO.setor} caracteres.`;
  const { setor: _s, ...resto } = op;
  void _s;
  lista.gravar(atuais.map((o) => (o.id === operacaoId ? { ...resto, ...(valor ? { setor: valor } : {}) } : o)));
  return null;
}

/**
 * Aplica, numa gravação, o que a planilha preenche em pontos que já existem (ver reimportar.ts):
 * só campos vazios no ponto; o planejamento não muda.
 */
export function aplicarAtualizacoes(operacaoId: string, itens: readonly { pontoId: string; preencher: Partial<Ponto> }[]): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op) return 'Operação não encontrada.';
  const porId = new Map(itens.map((i) => [i.pontoId, i.preencher] as const));
  const pontos = op.pontos.map((p) => {
    const extra = porId.get(p.id);
    if (!extra) return p;
    const novo: Record<string, unknown> = { ...p };
    for (const [k, v] of Object.entries(extra)) {
      if (k === 'situacao' || novo[k] === undefined || novo[k] === '') novo[k] = v;
    }
    return novo as unknown as Ponto;
  });
  gravarOperacao(atuais, { ...op, pontos });
  return null;
}
