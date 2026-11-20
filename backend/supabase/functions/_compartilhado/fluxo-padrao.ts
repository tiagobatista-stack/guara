// Fluxo padrão de uma demanda (seção 9.4), executado de forma determinística
// sobre dados fictícios. Aplica a regra orquestrador → agente → habilidade:
// um agente só executa habilidades atribuídas a ele, e só se ambos estiverem ativos.

import type { ContratoAgente, Estado } from './tipos.ts';
import type { HabilidadeRegistrada } from './catalogo.ts';
import { validarEsquema } from './validacao.ts';
import { avaliarGate, type SaidaGate } from './gate-de-qualidade/gate.ts';
import { DATA_REFERENCIA, demandasFicticias, type DemandaFicticia } from '../../../../dados-ficticios/demandas.ts';
import { documentosFicticios } from '../../../../dados-ficticios/documentos.ts';
import { modeloMinuta } from '../../../../dados-ficticios/checklists.ts';

export interface EtapaExecucao {
  ordem: number;
  agente: string;
  habilidade: string;
  estado: Exclude<Estado, 'NÃO TESTADO'>;
  detalhe: string;
  duracaoMs: number;
  tentativa: number;
  /** FALHA por condição da entrada (demanda sem documento, não fictícia): bloqueio esperado, sem exceção. */
  bloqueioEsperado?: true;
}

/** O modo do fluxo é sempre este: regras fixas, dados fictícios, nenhuma chamada a modelo de IA. */
export const MODO_DO_FLUXO = 'determinístico · dados fictícios · sem modelo de IA';

export interface EntradaDoFluxo {
  demanda: string;
  processo: string;
  titulo: string;
  tipo: string;
  prazo: string;
  documento: string | null;
}

export interface ExecucaoFluxo {
  id: string;
  demanda: string;
  /** Entrada com que o fluxo foi executado (a demanda recebida). */
  entrada: EntradaDoFluxo;
  modo: typeof MODO_DO_FLUXO;
  iniciadoEm: string;
  concluidoEm: string;
  etapas: EtapaExecucao[];
  tentativasRedacao: number;
  gate: SaidaGate;
  liberado: boolean;
  consolidado: { minuta: string[]; pendencias: string[]; alertasPrazo: string[] } | null;
}

const MAX_TENTATIVAS = 2;

export function executarFluxoPadrao(
  catalogo: readonly HabilidadeRegistrada[],
  agentes: readonly ContratoAgente[],
  inativos: ReadonlySet<string> = new Set(),
  /** Demanda fictícia a processar; sem ela, a primeira (comportamento anterior). */
  demanda: DemandaFicticia = demandasFicticias[0],
): ExecucaoFluxo {
  const iniciadoEm = new Date().toISOString();
  const etapas: EtapaExecucao[] = [];
  let tentativa = 1;

  /** Executa uma habilidade por meio de um agente; devolve null em caso de falha. */
  function etapa<S>(agenteId: string, habilidadeId: string, entrada: unknown): S | null {
    const inicio = Date.now();
    const registrar = (estado: EtapaExecucao['estado'], detalhe: string) =>
      etapas.push({ ordem: etapas.length + 1, agente: agenteId, habilidade: habilidadeId, estado, detalhe, duracaoMs: Date.now() - inicio, tentativa });

    const agente = agentes.find((a) => a.id === agenteId);
    const h = catalogo.find((x) => x.contrato.id === habilidadeId);
    if (!agente || !h) return (registrar('FALHA', 'agente ou habilidade inexistente'), null);
    if (!agente.habilidades.includes(habilidadeId)) {
      return (registrar('FALHA', `agente "${agenteId}" não tem permissão para "${habilidadeId}"`), null);
    }
    if (inativos.has(agenteId)) return (registrar('FALHA', `agente "${agenteId}" desativado`), null);
    if (inativos.has(habilidadeId)) return (registrar('FALHA', `habilidade "${habilidadeId}" desativada`), null);

    const errosEntrada = validarEsquema(entrada, h.contrato.esquemaEntrada);
    if (errosEntrada.length) return (registrar('FALHA', `entrada inválida: ${errosEntrada[0]}`), null);
    try {
      const saida = h.executar(entrada) as S;
      const errosSaida = validarEsquema(saida, h.contrato.esquemaSaida);
      if (errosSaida.length) return (registrar('FALHA', `saída inválida: ${errosSaida[0]}`), null);
      registrar('OK', 'saída validada pelo esquema');
      return saida;
    } catch (erro) {
      return (registrar('FALHA', `exceção: ${erro instanceof Error ? erro.message : String(erro)}`), null);
    }
  }

  // Modo fictício: só entra demanda marcada como tal (a checagem vale também em tempo de execução).
  const documento = demanda.ficticio === true ? (documentosFicticios.find((d) => demanda.documentos.includes(d.id)) ?? null) : null;
  const contexto = [demanda, ...demandasFicticias.filter((d) => d.id !== demanda.id)];
  let consolidado: ExecucaoFluxo['consolidado'] = null;
  let gate: SaidaGate = avaliarGate({ etapasOk: false, revisaoAprovada: false, minutaARevisar: false, autorMinuta: 'redator', revisor: 'revisor' });

  executar: {
    if (demanda.ficticio !== true) {
      etapas.push({ ordem: 1, agente: 'orquestrador', habilidade: 'verificar-modo-ficticio', estado: 'FALHA', detalhe: 'demanda não marcada como fictícia: o fluxo só roda em modo fictício', duracaoMs: 0, tentativa, bloqueioEsperado: true });
      break executar;
    }
    // 1. Triagem: registro e classificação (roteamento).
    const registro = etapa<{ valida: boolean }>('triagem', 'registrar-demanda', {
      processo: demanda.processo, titulo: demanda.titulo, tipo: demanda.tipo, prazo: demanda.prazo, descricao: demanda.descricao,
    });
    if (!registro?.valida) break executar;
    const classe = etapa<{ tipo: string }>('triagem', 'classificar-demanda', { titulo: demanda.titulo, descricao: demanda.descricao });
    if (!classe) break executar;

    // 2. Documental: extração (delegação simples).
    // Sem documento fictício vinculado à demanda, não há o que extrair: falha explícita, e o gate bloqueia.
    if (!documento) {
      etapas.push({ ordem: etapas.length + 1, agente: 'documental', habilidade: 'extrair-documento', estado: 'FALHA', detalhe: `demanda ${demanda.id} sem documento fictício vinculado`, duracaoMs: 0, tentativa, bloqueioEsperado: true });
      break executar;
    }
    const extracao = etapa<{ campos: unknown[] }>('documental', 'extrair-documento', {
      documentoId: documento.id, paginas: documento.paginas,
    });
    if (!extracao) break executar;

    // 3. Analista e prazos sobre a mesma demanda (executados em sequência neste modo local).
    const checklist = etapa<{ itens: unknown[] }>('analista', 'montar-checklist', { tipo: classe.tipo });
    if (!checklist) break executar;
    const conferencia = etapa<{ resultados: unknown[] }>('analista', 'conferir-requisitos', { itens: checklist.itens, campos: extracao.campos });
    if (!conferencia) break executar;
    const prazos = etapa<{ prazoProximo: string[]; paradas: string[]; vencidas: string[] }>('prazos', 'avaliar-prazos', {
      dataReferencia: DATA_REFERENCIA,
      diasInatividade: 5,
      diasPrazoProximo: 3,
      demandas: contexto.map(({ id, prazo, ultimaMovimentacao, situacao }) => ({ id, prazo, ultimaMovimentacao, situacao })),
    });
    if (!prazos) break executar;

    // 4–6. Redator → revisor → gate, com no máximo duas tentativas.
    for (tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
      const minuta = etapa<{ situacao: string; paragrafos: string[]; pendencias: string[] }>('redator', 'redigir-minuta', {
        processo: demanda.processo, modeloId: modeloMinuta.id, resultados: conferencia.resultados,
      });
      const revisao = etapa<{ aprovado: boolean }>('revisor', 'validar-evidencias', { resultados: conferencia.resultados });
      // Autor e revisor vêm do registro de etapas desta tentativa, não de constantes.
      const daTentativa = etapas.filter((e) => e.tentativa === tentativa && e.estado === 'OK');
      gate = avaliarGate({
        etapasOk: etapas.every((e) => e.estado === 'OK'),
        revisaoAprovada: revisao?.aprovado === true,
        minutaARevisar: minuta?.situacao === 'a-revisar',
        autorMinuta: daTentativa.find((e) => e.habilidade === 'redigir-minuta')?.agente ?? '(sem autor)',
        revisor: daTentativa.find((e) => e.habilidade === 'validar-evidencias')?.agente ?? '(sem revisor)',
      });
      if (gate.aprovado && minuta) {
        // 7. Consolidação pelo orquestrador (supervisor/agregador).
        consolidado = {
          minuta: minuta.paragrafos,
          pendencias: minuta.pendencias,
          alertasPrazo: [...new Set([...prazos.vencidas, ...prazos.prazoProximo, ...prazos.paradas])],
        };
        break;
      }
    }
    if (tentativa > MAX_TENTATIVAS) tentativa = MAX_TENTATIVAS;
  }

  if (!consolidado && etapas.some((e) => e.estado === 'FALHA')) {
    gate = avaliarGate({ etapasOk: false, revisaoAprovada: false, minutaARevisar: false, autorMinuta: 'redator', revisor: 'revisor' });
  }

  return {
    id: `EXE-LOCAL-${iniciadoEm}`,
    demanda: demanda.id,
    entrada: { demanda: demanda.id, processo: demanda.processo, titulo: demanda.titulo, tipo: demanda.tipo, prazo: demanda.prazo, documento: documento?.id ?? null },
    modo: MODO_DO_FLUXO,
    iniciadoEm,
    concluidoEm: new Date().toISOString(),
    etapas,
    tentativasRedacao: etapas.some((e) => e.habilidade === 'redigir-minuta') ? tentativa : 0,
    gate,
    liberado: gate.aprovado && consolidado !== null,
    consolidado,
  };
}
