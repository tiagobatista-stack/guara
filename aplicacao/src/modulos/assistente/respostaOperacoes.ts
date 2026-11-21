// Comando "operações" (item 10, 21/11/2026): o que falta do campo, com as MESMAS funções que
// alimentam o Dashboard (`pendenciasDeCampo`, `progressoDaOperacao`, `prazosDeElaboracao`): nenhuma
// regra nova, então os números da conversa são os da "Linha do tempo de prazos".
// Ordem da resposta: pendências de campo (fato) · operações em andamento ou próximas (fato) ·
// sugestão (a decisão é sua), uma por tipo de pendência. Só entra o que existe.
// Fora do escopo: busca por município ou código de ponto (BACKLOG).

import { MOTIVOS_BLOQUEIO } from '../demandas/modelo.ts';
import { prazosDeElaboracao } from '../operacoes/armazem.ts';
import type { Operacao } from '../operacoes/modelo.ts';
import {
  dataLocal, diasParado, pendenciasDeCampo, progressoDaOperacao, rotuloDoPonto, textoDoPeriodo, textoParado,
  type PendenciaDeCampo,
} from '../operacoes/regras.ts';
import { rotaDaTelaOperacoes, rotaParaAbrirOperacao } from '../../nucleo/registro-modulos.ts';
import type { AcaoDaFala, Mensagem } from './conversa.ts';

export const MAXIMO_DE_OPERACOES_LISTADAS = 5;
const MAXIMO_DE_TRAVADOS_LISTADOS = 3;
const TAMANHO_DO_NOME_NO_BOTAO = 50;

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Nomes distintos das operações dos pontos, na ordem em que aparecem. */
const nomesDas = (itens: readonly PendenciaDeCampo[]) => [...new Set(itens.map((x) => x.operacao.nome))];

export function respostaDeOperacoes(
  operacoes: readonly Operacao[],
  demandas: readonly { id: string; prazo?: string }[],
  instante: Date,
  dataDaFonte = instante.toLocaleDateString('pt-BR'),
): Mensagem[] {
  const fonte = `operações deste navegador · ${dataDaFonte}`;
  if (operacoes.length === 0) {
    return [{
      autor: 'assistente', natureza: 'fato', fonte,
      texto: 'Nenhuma operação cadastrada neste navegador.',
      acoes: [{ rotulo: 'Nova operação', comando: 'nova operação', rota: rotaDaTelaOperacoes() }],
    }];
  }

  const hoje = dataLocal(instante);
  const ctx = prazosDeElaboracao(demandas);
  const campo = pendenciasDeCampo(operacoes, hoje, ctx);
  const respostas: Mensagem[] = [];

  // 1. Pendências de campo (fato): os mesmos quatro números do Dashboard.
  const linhas: string[] = [];
  if (campo.semResultado.length) linhas.push(`• ${plural(campo.semResultado.length, 'ponto sem resultado', 'pontos sem resultado')} depois do retorno da viagem (${nomesDas(campo.semResultado).join(', ')}).`);
  if (campo.aReprogramar.length) linhas.push(`• ${plural(campo.aReprogramar.length, 'ponto não fiscalizado', 'pontos não fiscalizados')} a reprogramar em outra operação.`);
  if (campo.travados.length) {
    linhas.push(`• ${plural(campo.travados.length, 'ponto travado', 'pontos travados')}:`);
    for (const x of campo.travados.slice(0, MAXIMO_DE_TRAVADOS_LISTADOS)) {
      const b = x.ponto.bloqueio!;
      linhas.push(`   – ${rotuloDoPonto(x.ponto)}: ${MOTIVOS_BLOQUEIO[b.motivo]}, ${textoParado(diasParado(b, hoje))}.`);
    }
    if (campo.travados.length > MAXIMO_DE_TRAVADOS_LISTADOS) linhas.push(`   – e mais ${campo.travados.length - MAXIMO_DE_TRAVADOS_LISTADOS}.`);
  }
  if (campo.relatorioAtrasado.length) linhas.push(`• ${plural(campo.relatorioAtrasado.length, 'ponto', 'pontos')} com o prazo de elaboração do relatório vencido.`);
  respostas.push({
    autor: 'assistente', natureza: 'fato', fonte,
    texto: linhas.length ? ['Pendências de campo:', ...linhas].join('\n') : 'Nenhuma pendência de campo: nenhum ponto sem resultado, travado, a reprogramar ou com prazo de elaboração vencido.',
  });

  // 2. Operações em andamento ou próximas (fato), com o progresso da tela Operações.
  const emCurso = operacoes
    .map((o) => ({ o, progresso: progressoDaOperacao(o, hoje, ctx) }))
    .filter((x) => x.progresso.selo === 'em-andamento' || x.progresso.selo === 'planejada')
    .sort((a, b) => Number(b.progresso.selo === 'em-andamento') - Number(a.progresso.selo === 'em-andamento') || (a.o.inicio ?? '9999').localeCompare(b.o.inicio ?? '9999'));
  if (emCurso.length) {
    const mais = emCurso.length - MAXIMO_DE_OPERACOES_LISTADAS;
    respostas.push({
      autor: 'assistente', natureza: 'fato', fonte,
      texto: [
        `${plural(emCurso.length, 'operação em andamento ou próxima', 'operações em andamento ou próximas')}:`,
        ...emCurso.slice(0, MAXIMO_DE_OPERACOES_LISTADAS).map(({ o, progresso }) =>
          `• ${o.nome} (${textoDoPeriodo({ inicio: o.inicio, fim: o.fim })}): ${progresso.total === 0 ? 'sem pontos' : `${progresso.encerrados} de ${progresso.total} pontos encerrados`}.`),
        ...(mais > 0 ? [`e mais ${mais}.`] : []),
      ].join('\n'),
    });
  }

  // 3. Sugestão (decisão sua): uma por tipo de pendência.
  const sugestoes: string[] = [];
  if (campo.semResultado.length) sugestoes.push(`Registrar o resultado dos pontos de ${campo.semResultado[0].operacao.nome}`);
  if (campo.aReprogramar.length) sugestoes.push(`Reprogramar o ponto ${rotuloDoPonto(campo.aReprogramar[0].ponto)} em outra operação`);
  if (campo.travados.length) sugestoes.push(`Ver o motivo do bloqueio de ${rotuloDoPonto(campo.travados[0].ponto)}`);
  if (campo.relatorioAtrasado.length) sugestoes.push(`Enviar o relatório do ponto ${rotuloDoPonto(campo.relatorioAtrasado[0].ponto)}`);
  if (sugestoes.length) {
    respostas.push({
      autor: 'assistente', natureza: 'sugestão',
      fonte: 'regra: uma sugestão por tipo de pendência de campo · a decisão é sua',
      texto: ['Sugestões (a decisão é sua):', ...sugestoes.map((s) => `• ${s}`)].join('\n'),
    });
  }

  // Botões: Abrir Operações e, quando há uma operação em foco (a da primeira pendência, ou a primeira em curso), "Abrir <operação>".
  const foco = [...campo.semResultado, ...campo.aReprogramar, ...campo.travados, ...campo.relatorioAtrasado][0]?.operacao ?? emCurso[0]?.o;
  const acoes: AcaoDaFala[] = [{ rotulo: 'Abrir Operações', comando: 'abrir operações', rota: rotaDaTelaOperacoes() }];
  if (foco) acoes.push({ rotulo: `Abrir ${foco.nome.slice(0, TAMANHO_DO_NOME_NO_BOTAO)}`, comando: `abrir operação ${foco.nome.slice(0, TAMANHO_DO_NOME_NO_BOTAO)}`, rota: rotaParaAbrirOperacao(foco.id) });
  respostas[respostas.length - 1] = { ...respostas[respostas.length - 1], acoes };
  return respostas;
}
