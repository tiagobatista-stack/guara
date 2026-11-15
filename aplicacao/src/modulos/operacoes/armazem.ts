// Armazém das operações no localStorage (lista local, como atalhos e contatos).
// Começa vazio. Coordenadas podem identificar imóvel: ficam só neste navegador, fora do backup, da tela compartilhada e do MCP.

import { criarListaLocal, novoId } from '../atalhos/lista-local.ts';
import { dataValida } from '../demandas/regras.ts';
import { CHAVE_OPERACOES, LIMITES_OPERACAO, type Operacao, type Ponto } from './modelo.ts';
import { problemasDeDatas, validarListaOperacoes } from './regras.ts';

const lista = criarListaLocal<Operacao>(CHAVE_OPERACOES, () => [], validarListaOperacoes);

export const obterOperacoes = lista.obter;
export const useOperacoes = lista.useLista;
export const useOperacoesSoNaMemoria = lista.useSoNaMemoria;

export interface DadosOperacao {
  nome: string;
  inicio: string;
  fim: string;
  origem: string;
}

/** Devolve a mensagem do problema ou null. */
function problemaDaOperacao(d: DadosOperacao): string | null {
  const nome = d.nome.trim();
  if (!nome) return 'Informe o nome da operação.';
  if (nome.length > LIMITES_OPERACAO.nome) return `O nome pode ter no máximo ${LIMITES_OPERACAO.nome} caracteres.`;
  if (d.origem.trim().length > LIMITES_OPERACAO.origem) return `A origem pode ter no máximo ${LIMITES_OPERACAO.origem} caracteres.`;
  if (!dataValida(d.inicio) || !dataValida(d.fim)) return 'Informe as datas de início e de fim.';
  if (d.fim < d.inicio) return 'O fim da operação não pode ser antes do início.';
  return null;
}

export function criarOperacao(d: DadosOperacao, agoraIso: string): { ok: true; id: string } | { ok: false; erro: string } {
  const atuais = obterOperacoes();
  if (atuais.length >= LIMITES_OPERACAO.operacoes) return { ok: false, erro: `O limite é de ${LIMITES_OPERACAO.operacoes} operações.` };
  const erro = problemaDaOperacao(d);
  if (erro) return { ok: false, erro };
  const id = novoId('op', atuais);
  const origem = d.origem.trim();
  lista.gravar([...atuais, { id, nome: d.nome.trim(), inicio: d.inicio, fim: d.fim, ...(origem ? { origem } : {}), pontos: [], criadaEm: agoraIso }]);
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
  lista.gravar(atuais.map((o) => (o.id === operacaoId ? { ...o, pontos } : o)));
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
