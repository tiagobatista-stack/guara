// Comandos de lembrete na conversa do assistente. Devolve null quando a frase não é sobre
// lembretes, para o assistente seguir com os outros comandos ("prazos", "ajuda").
// A leitura da frase é por regras: a confirmação sai como inferência ("confira"), com o que foi
// entendido por extenso e o botão de desfazer.

import type { Mensagem } from '../assistente/conversa.ts';
import { descreverRegra, textoQuando, type LembretePessoal } from './agendador.ts';
import { cancelarLembrete, criarLembrete, obterLembretesPessoais, reativarLembrete } from './armazem.ts';
import { interpretarLembrete, textoHora } from './interpretar.ts';
import { estadoNotificacoes, pedirNotificacoes } from './sinais.ts';

export interface DemandaParaLembrete {
  id: string;
  titulo: string;
  status: string;
  processo?: string;
}

export interface ContextoLembretes {
  agora: Date;
  demandas: readonly DemandaParaLembrete[];
}

const FONTE_LEITURA = 'leitura da frase por regras (sem IA); confira data e hora';
const FONTE_LISTA = 'lembretes deste navegador';

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const soAlfanumerico = (s: string) => normalizar(s).replace(/[^a-z0-9]/g, '');

const fato = (texto: string, opcoes?: Mensagem['opcoes']): Mensagem => ({ autor: 'assistente', natureza: 'fato', fonte: FONTE_LISTA, texto, ...(opcoes ? { opcoes } : {}) });

function descrever(l: LembretePessoal, agora: Date): string {
  const partes = [`«${l.texto}»`, textoQuando(new Date(l.adiadoAte ?? l.proximo), agora)];
  if (l.regra) partes.push(descreverRegra(l.regra));
  if (l.fim) partes.push(`até ${textoQuando(new Date(new Date(l.fim).getTime() - 60_000), agora).replace(/ às .*$/, '')}`);
  return partes.join(', ');
}

function listar(agora: Date): Mensagem[] {
  const ativos = obterLembretesPessoais().filter((l) => l.estado === 'ativo');
  if (!ativos.length) {
    return [fato('Nenhum lembrete ativo. Exemplo: "me lembre de beber água daqui 30 min".')];
  }
  const linhas = ativos.map((l) => `${l.numero}) ${descrever(l, agora)}${l.disparo ? ' · ⚠️ esperando resposta' : ''}${l.demandaTitulo ? ` · demanda: ${l.demandaTitulo}` : ''}`);
  return [fato(`Lembretes ativos: ${linhas.join(' · ')}. Para cancelar: "cancelar lembrete N".`)];
}

const ROTULO_RESULTADO: Record<string, string> = { feito: '✅ feito', pulado: '⏭ pulado', 'sem-resposta': '⚠️ sem resposta', perdido: '⚠️ página fechada' };

function avisosRecentes(agora: Date): Mensagem[] {
  const desde = agora.getTime() - 24 * 3_600_000;
  const linhas = obterLembretesPessoais()
    .flatMap((l) => l.registro.map((r) => ({ l, r })))
    .filter(({ r }) => new Date(r.previsto).getTime() >= desde)
    .sort((a, b) => a.r.previsto.localeCompare(b.r.previsto))
    .map(({ l, r }) => `${textoHora(new Date(r.previsto))} «${l.texto}»: ${ROTULO_RESULTADO[r.resultado]}`);
  return [fato(linhas.length ? `Avisos das últimas 24 h: ${linhas.join(' · ')}.` : 'Nenhum aviso de lembrete nas últimas 24 h.')];
}

function acharDemanda(processo: string | undefined, demandas: readonly DemandaParaLembrete[]) {
  if (!processo) return { demanda: undefined, varias: 0 };
  const p = soAlfanumerico(processo);
  const abertas = demandas.filter((d) => d.status !== 'Concluída'
    && ((d.processo && soAlfanumerico(d.processo) === p) || soAlfanumerico(d.titulo).includes(p)));
  return { demanda: abertas.length === 1 ? abertas[0] : undefined, varias: abertas.length };
}

function cancelar(numero: number): Mensagem[] {
  const l = cancelarLembrete(numero);
  if (!l) return [fato(`Não achei o lembrete ${numero} entre os ativos. Veja a lista com "lembretes".`)];
  return [fato(`Lembrete ${numero} cancelado («${l.texto}»).`, [{ rotulo: 'Desfazer', comando: `reativar lembrete ${numero}` }])];
}

export function responderLembretes(comando: string, ctx: ContextoLembretes): Mensagem[] | null {
  const c = normalizar(comando).replace(/[?!.]+$/, '').trim();

  if (/^(?:meus |ver |listar )?lembretes$/.test(c)) return listar(ctx.agora);
  if (/^(?:avisos|avisos de hoje|o que (?:eu )?perdi)$/.test(c)) return avisosRecentes(ctx.agora);

  if (/^ativar (?:as )?notificac(?:oes|ao)$/.test(c)) {
    const estado = estadoNotificacoes();
    if (estado === 'indisponivel') return [fato('Este navegador não tem notificações. Os lembretes continuam no balão, com som, enquanto a página estiver aberta.')];
    if (estado === 'negadas') return [fato('As notificações estão bloqueadas para este site. Libere nas configurações do navegador (ícone ao lado do endereço).')];
    if (estado === 'permitidas') return [fato('As notificações já estão ativas.')];
    void pedirNotificacoes();
    return [fato('Pedi a permissão ao navegador: responda na janela que ele abriu. A notificação mostra só a hora do lembrete, nunca o texto.')];
  }

  const reativar = /^reativar (?:o )?lembrete (\d+)$/.exec(c);
  if (reativar) {
    const l = reativarLembrete(Number(reativar[1]));
    return [fato(l ? `Lembrete ${l.numero} ativo de novo: ${descrever(l, ctx.agora)}.` : `Não achei o lembrete ${reativar[1]} entre os cancelados.`)];
  }

  const porNumero = /^(?:cancelar|apagar|excluir|remover|parar|desativar) (?:o )?lembrete (?:n[o.]? ?)?(\d+)$/.exec(c);
  if (porNumero) return cancelar(Number(porNumero[1]));

  const porTexto = /^(?:cancelar|apagar|excluir|remover|desativar) (?:o )?lembrete (?:d[aoe]s? |para |pra )?(.+)$|^parar de me lembrar (?:d[aoe]s? |de )?(.+)$/.exec(c);
  if (porTexto) {
    const trecho = normalizar(porTexto[1] ?? porTexto[2]);
    const achados = obterLembretesPessoais().filter((l) => l.estado === 'ativo' && trecho.split(/\s+/).every((p) => normalizar(l.texto).includes(p)));
    if (achados.length === 1) return cancelar(achados[0].numero);
    if (!achados.length) return [fato(`Não achei lembrete ativo com «${trecho}». Veja a lista com "lembretes".`)];
    return [fato(`Há ${achados.length} lembretes com «${trecho}». Qual cancelar?`, achados.slice(0, 4).map((l) => ({ rotulo: `${l.numero}) ${l.texto}`.slice(0, 40), comando: `cancelar lembrete ${l.numero}` })))];
  }

  const leitura = interpretarLembrete(comando, ctx.agora);
  if (leitura.tipo === 'nao-e-lembrete') return null;
  if (leitura.tipo === 'pergunta') {
    return [{ autor: 'assistente', natureza: 'sugestão', fonte: 'falta informação no pedido de lembrete', texto: leitura.texto, opcoes: leitura.opcoes }];
  }

  const { pedido } = leitura;
  const { demanda, varias } = acharDemanda(pedido.processo, ctx.demandas);
  const l = criarLembrete(pedido, ctx.agora, demanda ? { id: demanda.id, titulo: demanda.titulo } : undefined);
  const icone = l.remedio ? '💊' : l.firme ? '⏰' : '💧';
  const partes = [`${icone} Lembrete ${l.numero}: ${descrever(l, ctx.agora)}.`];
  if (pedido.notas.length) partes.push(`Obs.: ${pedido.notas.join('; ')}.`);
  if (demanda) partes.push(`Ligado à demanda ${demanda.id} (${demanda.titulo}); some quando ela for concluída.`);
  else if (varias > 1) partes.push(`Há ${varias} demandas abertas com ${pedido.processo}: o lembrete ficou sem vínculo.`);
  else if (pedido.processo) partes.push(`Nenhuma demanda aberta com ${pedido.processo}: ficou um lembrete simples.`);
  if (!l.firme) partes.push('É um hábito: espera você terminar de digitar, não insiste e não acumula.');
  partes.push('O aviso só toca com o GUARÁ aberto neste navegador.');
  const opcoes: NonNullable<Mensagem['opcoes']> = [{ rotulo: 'Desfazer', comando: `cancelar lembrete ${l.numero}` }];
  if (l.firme && estadoNotificacoes() === 'perguntar') opcoes.push({ rotulo: 'Ativar notificações', comando: 'ativar notificações' });
  return [{ autor: 'assistente', natureza: 'inferência', fonte: FONTE_LEITURA, texto: partes.join(' '), opcoes }];
}
