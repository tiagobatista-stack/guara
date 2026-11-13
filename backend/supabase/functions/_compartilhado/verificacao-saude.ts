// Verificação de saúde (seção 9.7): executa o autoteste de cada habilidade
// e deriva o estado dos agentes. Nenhum estado OK sem execução real.

import type { ContratoAgente, Estado } from './tipos.ts';
import type { HabilidadeRegistrada } from './catalogo.ts';
import { primeiraDiferenca, validarEsquema } from './validacao.ts';

export interface ResultadoComponente {
  componente: string;
  estado: Estado;
  detalhe: string;
  duracaoMs: number;
  executadoEm: string | null;
}

function agora(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** Executa o autoteste de uma habilidade: valida a entrada, executa, valida a saída e compara com o esperado. */
export function executarAutoteste(h: HabilidadeRegistrada): ResultadoComponente {
  const inicio = agora();
  const executadoEm = new Date().toISOString();
  const fim = (estado: Estado, detalhe: string): ResultadoComponente => ({
    componente: h.contrato.id,
    estado,
    detalhe,
    duracaoMs: Math.round((agora() - inicio) * 100) / 100,
    executadoEm,
  });

  try {
    const errosEntrada = validarEsquema(h.autoteste.entrada, h.contrato.esquemaEntrada);
    if (errosEntrada.length) return fim('FALHA', `entrada fora do esquema: ${errosEntrada[0]}`);

    const saida = h.executar(h.autoteste.entrada);

    const errosSaida = validarEsquema(saida, h.contrato.esquemaSaida);
    if (errosSaida.length) return fim('FALHA', `saída fora do esquema: ${errosSaida[0]}`);

    const diferenca = primeiraDiferenca(saida, h.autoteste.saidaEsperada);
    if (diferenca) return fim('FALHA', `saída diverge do esperado em ${diferenca}`);

    return fim('OK', `autoteste "${h.autoteste.descricao}" aprovado`);
  } catch (erro) {
    return fim('FALHA', `exceção: ${erro instanceof Error ? erro.message : String(erro)}`);
  }
}

/** Estado do agente derivado das habilidades e da coerência do catálogo. */
export function estadoDoAgente(
  agente: ContratoAgente,
  catalogo: readonly HabilidadeRegistrada[],
  resultados: Record<string, ResultadoComponente | undefined>,
): { estado: Estado; detalhe: string } {
  for (const id of agente.habilidades) {
    const h = catalogo.find((x) => x.contrato.id === id);
    if (!h) return { estado: 'FALHA', detalhe: `habilidade "${id}" não existe no catálogo` };
    if (h.contrato.agenteResponsavel !== agente.id) {
      return { estado: 'FALHA', detalhe: `habilidade "${id}" pertence a "${h.contrato.agenteResponsavel}"` };
    }
  }
  const estados = agente.habilidades.map((id) => resultados[id]?.estado ?? 'NÃO TESTADO');
  if (estados.includes('FALHA')) return { estado: 'FALHA', detalhe: 'ao menos uma habilidade falhou' };
  if (estados.includes('NÃO TESTADO')) return { estado: 'NÃO TESTADO', detalhe: 'habilidades ainda não testadas' };
  if (estados.includes('ATENÇÃO')) return { estado: 'ATENÇÃO', detalhe: 'há habilidade com alerta' };
  return { estado: 'OK', detalhe: `${estados.length} habilidade(s) aprovada(s)` };
}

export interface RelatorioVerificacao {
  executadoEm: string;
  modo: 'local' | 'supabase';
  habilidades: Record<string, ResultadoComponente>;
  agentes: Record<string, { estado: Estado; detalhe: string }>;
  resumo: { ok: number; falha: number; total: number };
}

export function executarVerificacao(
  catalogo: readonly HabilidadeRegistrada[],
  agentesCatalogo: readonly ContratoAgente[],
  modo: 'local' | 'supabase' = 'local',
  inativas: ReadonlySet<string> = new Set(),
): RelatorioVerificacao {
  const resultados: Record<string, ResultadoComponente> = {};
  for (const h of catalogo) {
    resultados[h.contrato.id] = inativas.has(h.contrato.id)
      ? { componente: h.contrato.id, estado: 'ATENÇÃO', detalhe: 'habilidade desativada; autoteste não executado', duracaoMs: 0, executadoEm: null }
      : executarAutoteste(h);
  }
  const agentes: RelatorioVerificacao['agentes'] = {};
  for (const a of agentesCatalogo) {
    agentes[a.id] = inativas.has(a.id)
      ? { estado: 'ATENÇÃO', detalhe: 'agente desativado' }
      : estadoDoAgente(a, catalogo, resultados);
  }
  const lista = Object.values(resultados);
  return {
    executadoEm: new Date().toISOString(),
    modo,
    habilidades: resultados,
    agentes,
    resumo: {
      ok: lista.filter((r) => r.estado === 'OK').length,
      falha: lista.filter((r) => r.estado === 'FALHA').length,
      total: lista.length,
    },
  };
}
