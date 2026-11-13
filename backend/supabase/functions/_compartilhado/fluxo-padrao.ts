// Fluxo padrão de uma demanda (seção 9.4), executado de forma determinística
// sobre dados fictícios. Aplica a regra orquestrador → agente → habilidade:
// um agente só executa habilidades atribuídas a ele, e só se ambos estiverem ativos.

import type { ContratoAgente, Estado } from './tipos.ts';
import type { HabilidadeRegistrada } from './catalogo.ts';
import { validarEsquema } from './validacao.ts';
import { avaliarGate, type SaidaGate } from './gate-de-qualidade/gate.ts';
import { DATA_REFERENCIA, demandasFicticias } from '../../../../dados-ficticios/demandas.ts';
import { documentoRenovacao } from '../../../../dados-ficticios/documentos.ts';
import { modeloMinuta } from '../../../../dados-ficticios/checklists.ts';

export interface EtapaExecucao {
  ordem: number;
  agente: string;
  habilidade: string;
  estado: Exclude<Estado, 'NÃO TESTADO'>;
  detalhe: string;
  duracaoMs: number;
  tentativa: number;
}

export interface ExecucaoFluxo {
  id: string;
  demanda: string;
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

  const demanda = demandasFicticias[0];
  let consolidado: ExecucaoFluxo['consolidado'] = null;
  let gate: SaidaGate = avaliarGate({ etapasOk: false, revisaoAprovada: false, minutaARevisar: false, autorMinuta: 'redator', revisor: 'revisor' });

  executar: {
    // 1. Triagem: registro e classificação (roteamento).
    const registro = etapa<{ valida: boolean }>('triagem', 'registrar-demanda', {
      processo: demanda.processo, titulo: demanda.titulo, tipo: demanda.tipo, prazo: demanda.prazo, descricao: demanda.descricao,
    });
    if (!registro?.valida) break executar;
    const classe = etapa<{ tipo: string }>('triagem', 'classificar-demanda', { titulo: demanda.titulo, descricao: demanda.descricao });
    if (!classe) break executar;

    // 2. Documental: extração (delegação simples).
    const extracao = etapa<{ campos: unknown[] }>('documental', 'extrair-documento', {
      documentoId: documentoRenovacao.id, paginas: documentoRenovacao.paginas,
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
      demandas: demandasFicticias.map(({ id, prazo, ultimaMovimentacao, situacao }) => ({ id, prazo, ultimaMovimentacao, situacao })),
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
    iniciadoEm,
    concluidoEm: new Date().toISOString(),
    etapas,
    tentativasRedacao: etapas.some((e) => e.habilidade === 'redigir-minuta') ? tentativa : 0,
    gate,
    liberado: gate.aprovado && consolidado !== null,
    consolidado,
  };
}
