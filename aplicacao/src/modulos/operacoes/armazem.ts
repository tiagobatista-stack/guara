// Armazém das operações no localStorage (lista local, como atalhos e contatos).
// Começa vazio. Coordenadas podem identificar imóvel: ficam só neste navegador, fora do backup, da tela compartilhada e do MCP.

import { criarListaLocal, novoId } from '../atalhos/lista-local.ts';
import { dataValida } from '../demandas/regras.ts';
import { CHAVE_OPERACOES, LIMITES_OPERACAO, type Operacao, type Ponto } from './modelo.ts';
import { periodoDosPontos, problemasDeDatas, validarListaOperacoes, type Periodo } from './regras.ts';

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
  return problemaDoPeriodo(d.inicio, d.fim);
}

export function criarOperacao(d: DadosOperacao, agoraIso: string): { ok: true; id: string } | { ok: false; erro: string } {
  const atuais = obterOperacoes();
  if (atuais.length >= LIMITES_OPERACAO.operacoes) return { ok: false, erro: `O limite é de ${LIMITES_OPERACAO.operacoes} operações.` };
  const erro = problemaDaOperacao(d);
  if (erro) return { ok: false, erro };
  const id = novoId('op', atuais);
  const origem = d.origem.trim();
  lista.gravar([...atuais, { id, nome: d.nome.trim(), ...(d.inicio ? { inicio: d.inicio } : {}), ...(d.fim ? { fim: d.fim } : {}), ...(origem ? { origem } : {}), pontos: [], criadaEm: agoraIso }]);
  return { ok: true, id };
}

/** Cria a operação já com os pontos conferidos, numa gravação só (nada fica pela metade). O período vazio vem das datas dos pontos. */
export function criarOperacaoComPontos(d: DadosOperacao, agoraIso: string, novos: readonly Omit<Ponto, 'id'>[]): { ok: true; id: string } | { ok: false; erro: string } {
  const atuais = obterOperacoes();
  if (atuais.length >= LIMITES_OPERACAO.operacoes) return { ok: false, erro: `O limite é de ${LIMITES_OPERACAO.operacoes} operações.` };
  const erro = problemaDaOperacao(d);
  if (erro) return { ok: false, erro };
  if (novos.length > LIMITES_OPERACAO.pontos) return { ok: false, erro: `O limite é de ${LIMITES_OPERACAO.pontos} pontos por operação.` };
  const doArquivo = periodoDosPontos(novos);
  const inicio = d.inicio || doArquivo.inicio;
  const fim = d.fim || doArquivo.fim;
  for (const p of novos) {
    const erros = problemasDeDatas(p, { inicio, fim });
    if (erros.length) return { ok: false, erro: erros[0] };
  }
  const id = novoId('op', atuais);
  const pontos: Ponto[] = [];
  for (const p of novos) pontos.push({ id: novoId('pt', pontos), ...p });
  const origem = d.origem.trim();
  lista.gravar([...atuais, { id, nome: d.nome.trim(), ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}), ...(origem ? { origem } : {}), pontos, criadaEm: agoraIso }]);
  return { ok: true, id };
}

export function excluirOperacao(id: string): void {
  lista.gravar(obterOperacoes().filter((o) => o.id !== id));
}

/** Acrescenta pontos já conferidos (vindos da importação ou do formulário). Devolve o problema ou null. */
export function incluirPontos(operacaoId: string, novos: readonly Omit<Ponto, 'id'>[]): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op) return 'Operação não encontrada.';
  if (op.pontos.length + novos.length > LIMITES_OPERACAO.pontos) return `O limite é de ${LIMITES_OPERACAO.pontos} pontos por operação.`;
  for (const p of novos) {
    const erros = problemasDeDatas(p, { inicio: op.inicio, fim: op.fim });
    if (erros.length) return erros[0];
  }
  const pontos = [...op.pontos];
  for (const p of novos) pontos.push({ id: novoId('pt', pontos), ...p });
  // O período que a pessoa informou vale; só o lado que falta vem das datas dos pontos.
  const doArquivo = periodoDosPontos(novos);
  const inicio = op.inicio ?? doArquivo.inicio;
  const fim = op.fim ?? doArquivo.fim;
  lista.gravar(atuais.map((o) => (o.id === operacaoId ? { ...o, ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}), pontos } : o)));
  return null;
}

/** Define ou corrige o período (vazio = sem período). Recusa o que deixa pontos de fora. */
export function alterarPeriodo(operacaoId: string, inicio: string, fim: string): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  if (!op) return 'Operação não encontrada.';
  const erro = problemaDoPeriodo(inicio, fim);
  if (erro) return erro;
  const janela: Periodo = { ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}) };
  if (op.pontos.some((p) => problemasDeDatas(p, janela).some((e) => e.includes('fora do período')))) {
    return 'Há pontos com data fora desse período: ajuste as datas dos pontos primeiro.';
  }
  const { inicio: _i, fim: _f, ...resto } = op;
  void [_i, _f];
  lista.gravar(atuais.map((o) => (o.id === operacaoId ? { ...resto, ...janela } : o)));
  return null;
}

/** Altera campos de um ponto (equipe, datas, grupo, demandas, situação, notas). Devolve o problema ou null. */
export function alterarPonto(operacaoId: string, pontoId: string, mudancas: Partial<Omit<Ponto, 'id' | 'coordenada'>>): string | null {
  const atuais = obterOperacoes();
  const op = atuais.find((o) => o.id === operacaoId);
  const ponto = op?.pontos.find((p) => p.id === pontoId);
  if (!op || !ponto) return 'Ponto não encontrado.';
  const novo: Ponto = { ...ponto, ...mudancas };
  // Campo de texto apagado sai do ponto.
  for (const k of ['equipe', 'grupo', 'saida', 'retorno'] as const) {
    if (novo[k] !== undefined && String(novo[k]).trim() === '') delete novo[k];
  }
  const erros = problemasDeDatas(novo, { inicio: op.inicio, fim: op.fim });
  if (erros.length) return erros[0];
  if ((novo.equipe ?? '').length > LIMITES_OPERACAO.equipe) return `A equipe pode ter no máximo ${LIMITES_OPERACAO.equipe} caracteres.`;
  if ((novo.grupo ?? '').length > LIMITES_OPERACAO.grupo) return `O grupo pode ter no máximo ${LIMITES_OPERACAO.grupo} caracteres.`;
  if (novo.notas.length > LIMITES_OPERACAO.notas) return `As notas podem ter no máximo ${LIMITES_OPERACAO.notas} caracteres.`;
  if (novo.demandas.length > LIMITES_OPERACAO.demandasPorPonto) return `O limite é de ${LIMITES_OPERACAO.demandasPorPonto} demandas por ponto.`;
  lista.gravar(atuais.map((o) => (o.id === operacaoId ? { ...o, pontos: o.pontos.map((p) => (p.id === pontoId ? novo : p)) } : o)));
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
