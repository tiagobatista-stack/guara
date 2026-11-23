// Texto "Contexto do processo" para colar no relatório (pedido do responsável, 21/11/2026).
// Montado por LISTA BRANCA: só os campos abaixo são lidos. Ficam de fora, de propósito: status, prioridade,
// responsável, bloqueio (e o detalhe livre do bloqueio), anotações e histórico — são gestão interna.
// SIMP e processo judicial entram com o número completo: o relatório responde ao pedido (decisão do responsável).
// Dado que falta vira marcador entre colchetes, para o analista completar; a lista `faltam` diz quais.
// Com o ponto de operação ligado, entram a vistoria, a Equipe Técnica (integrantes da viagem) e a caracterização POP.

import type { Demanda } from './modelo.ts';
import { formatarGms } from './coordenadas.ts';
import { SITUACOES_CAR, type Operacao, type Ponto } from '../operacoes/modelo.ts';
import { viagemDoPonto } from '../operacoes/regras.ts';
import { blocoPopAtivo, textoCaracterizacao } from '../operacoes/pop-supressao.ts';

/** Os ÚNICOS campos da demanda que o texto lê. */
export const CAMPOS_DO_CONTEXTO = ['titulo', 'descricao', 'processo', 'simp', 'judicial', 'tipo', 'criadaEm', 'prazo', 'coordenada', 'vistoria'] as const;
type DemandaDoContexto = Pick<Demanda, (typeof CAMPOS_DO_CONTEXTO)[number]>;

export interface VinculoDoContexto { operacao: Pick<Operacao, 'viagens'>; ponto: Ponto }

export interface ContextoRelatorio {
  texto: string;
  /** Rótulos dos marcadores deixados no texto, na ordem em que aparecem. */
  faltam: string[];
}

export const TITULO_CONTEXTO = 'Contexto do processo';

const dataBr = (aaaammdd: string) => aaaammdd.split('-').reverse().join('/');
const dataDoIso = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const listaFalada = (itens: string[]) => (itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}` : itens[0] ?? '');
const preenchido = (t: string | undefined): t is string => !!t && t.trim() !== '';

/** "Renovação de licença…" vira "renovação de licença…"; siglas ("SIMP…", "CAR…") ficam como estão. */
function minusculaInicial(t: string): string {
  const [a, b] = [...t];
  return b && b === b.toLocaleLowerCase('pt-BR') && b !== b.toLocaleUpperCase('pt-BR') ? a.toLocaleLowerCase('pt-BR') + t.slice(a.length) : t;
}

function filtrar(d: Demanda): DemandaDoContexto {
  const saida: Partial<Record<string, unknown>> = {};
  for (const c of CAMPOS_DO_CONTEXTO) if (d[c] !== undefined) saida[c] = d[c];
  return saida as DemandaDoContexto;
}

/** Entre vários pontos ligados, prefere o vistoriado (o da vistoria que o relatório descreve). */
export function escolherVinculo<T extends { ponto: Pick<Ponto, 'situacao'> }>(vinculos: readonly T[]): T | undefined {
  return vinculos.find((v) => v.ponto.situacao === 'vistoriado') ?? vinculos[0];
}

export function contextoDoRelatorio(demanda: Demanda, vinculo?: VinculoDoContexto): ContextoRelatorio {
  const d = filtrar(demanda);
  const faltam: string[] = [];
  const ou = (valor: string | undefined, rotulo: string) => {
    if (preenchido(valor)) return valor.trim();
    faltam.push(rotulo);
    return `[${rotulo}]`;
  };

  // 1º parágrafo: o processo e o pedido.
  const pedidos = [
    preenchido(d.simp) ? `ao SIMP nº ${d.simp}` : '',
    preenchido(d.judicial) ? `ao Processo Judicial nº ${d.judicial}` : '',
  ].filter(Boolean);
  let p1 = `Trata-se do Processo Administrativo nº ${ou(d.processo, 'nº do processo administrativo')}`;
  if (pedidos.length) p1 += `, em atendimento ${listaFalada(pedidos)}`;
  p1 += `, referente a ${minusculaInicial(d.titulo.trim())}.`;
  if (preenchido(d.descricao)) p1 += ` Objeto: ${d.descricao.trim().replace(/\.?$/, '.')}`;
  p1 += ` A demanda foi recebida nesta unidade em ${dataDoIso(d.criadaEm)}, com prazo de atendimento até ${d.prazo ? dataBr(d.prazo) : ou(undefined, 'prazo')}`;
  p1 += d.tipo === 'campo' || vinculo ? ', e exige vistoria em campo.' : '.';
  const blocos = [TITULO_CONTEXTO, p1];

  // 2º parágrafo: a vistoria, quando é de campo ou está ligada a um ponto.
  if (d.tipo === 'campo' || vinculo) {
    const p = vinculo?.ponto;
    const dataVistoria = d.vistoria?.data ?? p?.dataVistoria;
    const coordenada = p?.coordenada ?? d.coordenada;
    let p2 = `A vistoria foi realizada em ${dataVistoria ? dataBr(dataVistoria) : ou(undefined, 'data da vistoria')}`;
    p2 += `, no município de ${ou(p?.municipio, 'município')}`;
    p2 += `, no imóvel ${ou(p?.imovel, 'imóvel')}`;
    if (p?.situacaoCar === 'sem-car') p2 += ', sem inscrição no CAR';
    else p2 += `, inscrito no CAR sob nº ${ou(p?.car, 'nº do CAR')}${p?.situacaoCar === 'com-car' ? '' : p?.situacaoCar ? ` (${SITUACOES_CAR[p.situacaoCar]})` : ''}`;
    p2 += `, com área de ${p?.areaHa !== undefined ? p.areaHa.toLocaleString('pt-BR', { maximumFractionDigits: 4 }) : ou(undefined, 'área')} ha`;
    if (coordenada) p2 += `, nas coordenadas ${formatarGms(coordenada)} (SIRGAS 2000)`;
    if (preenchido(p?.tipoDano)) p2 += `, para verificação de ${minusculaInicial(p.tipoDano.trim())}`;
    const integrantes = vinculo && p ? viagemDoPonto(vinculo.operacao, p)?.integrantes ?? [] : [];
    p2 += `, pela equipe técnica composta por ${integrantes.length ? listaFalada(integrantes) : ou(undefined, 'integrantes da equipe técnica')}.`;
    blocos.push(p2);

    // Caracterização POP: só com ponto ligado e bloco ativo (ou já preenchida).
    if (p && (blocoPopAtivo(p) || p.caracterizacao)) {
      const pop = textoCaracterizacao(p.caracterizacao, p);
      blocos.push(pop || ou(undefined, 'caracterização do dano (POP) não preenchida'));
    }
  }

  return { texto: blocos.join('\n\n'), faltam };
}
