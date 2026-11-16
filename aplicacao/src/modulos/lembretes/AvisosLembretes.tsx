// Aviso dos lembretes pessoais, separado da conversa e com destaque próprio (ROTINA_LEMBRETES.md 5.1).
// Montado uma vez em Aplicacao, fora do painel e da gaveta: aparece em qualquer tela.
// Nível 1: balão com faixa colorida, mascote em alerta e bipe. Nível 2 (sem resposta depois de
// 10 min, só lembrete firme): bipe duplo, notificação do navegador, vibração e título piscando.
// Nível 3 (sem resposta depois de 3 insistências): o balão sai e fica o selo ⚠️ até a pessoa abrir.
// Enquanto a pessoa digita, o aviso espera (até 20 s sem digitar); o selo mostra que há aviso.

import { useEffect, useRef, useState } from 'react';
import { acordarMascotes, Mascote } from '../../compartilhado/Mascote.tsx';
import { usePreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';
import { useAjusteFeriados, useEstadoDemandas } from '../demandas/armazem.ts';
import { avisosNaTela, contagem, descreverRegra, insistencia, type LembretePessoal } from './agendador.ts';
import { cancelarDeDemandasFechadas, executarRelogio, responderAviso, useLembretesPessoais } from './armazem.ts';
import { textoHora } from './interpretar.ts';
import { estaDigitando, notificar, ouvirDigitacao, piscarTitulo, tocarSom, vibrar } from './sinais.ts';

/** De quanto em quanto tempo o relógio olha os lembretes. */
export const TIQUE_MS = 15_000;

type TipoVisual = 'remedio' | 'demanda' | 'habito' | 'geral';

function tipoVisual(l: LembretePessoal): TipoVisual {
  if (l.remedio) return 'remedio';
  if (l.demandaId) return 'demanda';
  if (!l.firme) return 'habito';
  return 'geral';
}

const ICONE: Record<TipoVisual, string> = { remedio: '💊', demanda: '📎', habito: '💧', geral: '⏰' };

export function AvisosLembretes({ agora = () => new Date(), tiqueMs = TIQUE_MS }: { agora?: () => Date; tiqueMs?: number }) {
  const itens = useLembretesPessoais();
  const { demandas } = useEstadoDemandas();
  const preferencias = usePreferenciasMascote();
  const instante = agora();
  const ajuste = useAjusteFeriados(instante);
  const [, setTique] = useState(0);
  const [abrirSelo, setAbrirSelo] = useState(false);
  const sinalizados = useRef(new Set<string>());

  useEffect(() => {
    ouvirDigitacao();
    const id = setInterval(() => setTique((t) => t + 1), tiqueMs);
    const aoVoltar = () => setTique((t) => t + 1);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', aoVoltar); };
  }, [tiqueMs]);

  // O relógio anda a cada tique (e a cada mudança dos lembretes); só grava quando algo muda.
  useEffect(() => { executarRelogio(instante, ajuste); });

  // Demanda concluída ou excluída leva junto os lembretes ligados a ela.
  useEffect(() => {
    cancelarDeDemandasFechadas(new Set(demandas.filter((d) => d.status !== 'Concluída').map((d) => d.id)));
  }, [demandas]);

  const naTela = avisosNaTela(itens, instante);
  const noSelo = naTela.filter((a) => a.nivel === 3);
  const mostraveis = naTela.filter((a) => abrirSelo || a.nivel < 3);
  const digitando = !abrirSelo && estaDigitando();
  const atual = digitando ? undefined : mostraveis[0];
  const escondida = typeof document !== 'undefined' && document.hidden;

  // Sinais fora do balão: uma vez por toque e por insistência.
  useEffect(() => {
    for (const { lembrete, nivel } of naTela) {
      const chave = `${lembrete.numero}|${lembrete.disparo!.previsto}|${lembrete.disparo!.desde}|${insistencia(lembrete, instante)}`;
      if (sinalizados.current.has(chave)) continue;
      sinalizados.current.add(chave);
      if (nivel === 3) continue;
      acordarMascotes();
      tocarSom(nivel === 2 ? 2 : 1);
      if (lembrete.firme && (nivel === 2 || escondida)) {
        notificar(textoHora(new Date(lembrete.disparo!.previsto)));
        vibrar();
      }
    }
  });

  const piscar = naTela.some((a) => a.nivel === 2) || (escondida && naTela.some((a) => a.lembrete.firme));
  useEffect(() => piscarTitulo(piscar), [piscar]);

  useEffect(() => { if (abrirSelo && noSelo.length === 0 && mostraveis.length === 0) setAbrirSelo(false); }, [abrirSelo, noSelo.length, mostraveis.length]);

  const responder = (l: LembretePessoal, resposta: Parameters<typeof responderAviso>[1]) => responderAviso(l.numero, resposta, agora(), ajuste);

  const pendentesFora = digitando ? naTela.length : noSelo.length;

  return (
    <>
      {atual && (() => {
        const l = atual.lembrete;
        const previsto = new Date(l.disparo!.previsto);
        const tipo = tipoVisual(l);
        const c = l.remedio ? contagem(l, previsto, ajuste) : null;
        return (
          <section className="aviso-lembrete" aria-label={`Lembrete ${l.numero}`} data-nivel={atual.nivel} data-tipo={tipo} data-testid="aviso-lembrete">
            <div className="aviso-lembrete-faixa">
              <span aria-hidden="true">{ICONE[tipo]}</span>
              <span>{textoHora(previsto)}</span>
              {mostraveis.length > 1 && <span>· 1 de {mostraveis.length}</span>}
              {atual.nivel === 2 && <span>· insistindo</span>}
            </div>
            <div className="aviso-lembrete-corpo">
              <Mascote especie={preferencias.principal} humor="atento" tamanho={44} decorativo />
              <div>
                <p role="alert" className="aviso-lembrete-texto">
                  {l.disparo!.atrasado ? `Era às ${textoHora(previsto)}: ` : ''}{l.texto}
                  {c?.total ? ` (dose ${c.esta} de ${c.total})` : ''}
                </p>
                {l.demandaTitulo && <p className="texto-pequeno">Demanda: {l.demandaTitulo}</p>}
                <p className="texto-pequeno texto-suave">Lembrete {l.numero} · {descreverRegra(l.regra)}</p>
              </div>
            </div>
            <div className="acoes-aviso" role="group" aria-label={`Responder ao lembrete ${l.numero}`}>
              <button type="button" className="botao botao--primario botao--pequeno" onClick={() => responder(l, { acao: 'feito' })}>
                {l.remedio ? 'Tomei' : 'Feito'}
              </button>
              <button type="button" className="botao botao--pequeno" onClick={() => responder(l, { acao: 'adiar', minutos: 10 })}>Mais 10 min</button>
              <button type="button" className="botao botao--pequeno" onClick={() => responder(l, { acao: 'adiar', minutos: 60 })}>Mais 1 h</button>
              {l.regra && (
                <button type="button" className="botao botao--pequeno" onClick={() => responder(l, { acao: 'pular' })}>
                  {l.remedio ? 'Pular esta dose' : 'Pular esta vez'}
                </button>
              )}
              {l.demandaId && (
                <button type="button" className="botao botao--pequeno" onClick={() => { window.location.hash = '/demandas'; }}>Ver demanda</button>
              )}
            </div>
          </section>
        );
      })()}
      {pendentesFora > 0 && !abrirSelo && (
        <button
          type="button"
          className="selo-lembretes"
          data-testid="selo-lembretes"
          onClick={() => setAbrirSelo(true)}
          aria-label={digitando ? `${pendentesFora} lembrete(s) esperando você terminar de digitar; mostrar` : `${pendentesFora} lembrete(s) sem resposta; mostrar`}
        >
          <span aria-hidden="true">{digitando ? '⏰' : '⚠️'} {pendentesFora}</span>
        </button>
      )}
    </>
  );
}
