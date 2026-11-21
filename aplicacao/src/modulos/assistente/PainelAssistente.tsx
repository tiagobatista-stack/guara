// Painel do assistente: mascote principal, notificações e campo de conversa.
// MVP: comandos determinísticos, sem modelo de IA. Toda resposta indica a natureza
// (fato extraído, inferência ou sugestão) e a fonte.

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mascote, MASCOTES, type HumorMascote } from '../../compartilhado/Mascote.tsx';
import { nomeDoMascote, usePreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';
import { Icone } from '../../compartilhado/Icone.tsx';
import { useAjusteFeriados, useEstadoDemandas } from '../demandas/armazem.ts';
import { avisosDoDia, resumoDosAvisos, type Aviso, type TipoAviso } from './avisos.ts';
import { acrescentarFalas, useConversa, type Mensagem } from './conversa.ts';
import { useDemandaEmFoco } from './demanda-em-foco.ts';
import { METODO_DETERMINISTICO, respostaSobreDemanda } from './sobre-demanda.ts';
import { classificar } from './classificar.ts';
import { extrairIds } from './extrair.ts';
import { respostaDeLembrete } from './lembrarPelaConversa.ts';
import { respostaDeAjuda, respostaDeCumprimento } from './ajuda.ts';
import { respostaDePrioridades } from './respostaPrioridades.ts';
import { FilaDoDia } from './FilaDoDia.tsx';
import { priorizarDemandas } from './priorizar.ts';
import { useLimiteDeAvisos } from './preferencias-avisos.ts';
import { adiarLembrete, limparLembretesSemAviso, marcarCiente, mostrarDeNovo, opcoesDeAdiamento, separarAvisos, silenciarDemanda, textoDoRetorno, useLembretes } from './lembretes.ts';

const ROTULO_DO_TIPO: Record<TipoAviso, string> = { vencida: 'Vencidas', 'prazo-proximo': 'Prazo próximo', parada: 'Paradas' };

/** Os mesmos avisos do painel, agrupados por tipo, com o id de cada demanda. */
function textoDosPrazos(avisos: readonly Aviso[]): string {
  return (Object.keys(ROTULO_DO_TIPO) as TipoAviso[])
    .map((tipo) => `${ROTULO_DO_TIPO[tipo]}: ${avisos.filter((a) => a.tipo === tipo).map((a) => a.id).join(', ') || 'nenhuma'}.`)
    .join(' ');
}

function responder(comando: string, avisos: readonly Aviso[], origem: string, sobreDemanda: (idDaFrase?: string) => Mensagem[], prioridades: () => Mensagem[], lembrete: (id: string | null) => Mensagem[]): Mensagem[] {
  // Etapa 1 da conversa (20/11/2026): a frase passa pelo classificador (`classificar.ts`), que
  // reconhece sinônimos e frases comuns ("o que tá vencido?", "me ajuda") sem IA.
  const intencao = classificar(comando)?.id;
  // Código de demanda escrito na frase: vale mais que a demanda aberta na tela. Sem outra intenção,
  // a frase "DEM-FIC-0002" (ou qualquer frase só com o código) é um pedido de resumo daquela demanda.
  const [idDaFrase] = extrairIds(comando);
  if (intencao === 'prazos') {
    const fato: Mensagem = { autor: 'assistente', natureza: 'fato', fonte: origem, texto: textoDosPrazos(avisos) };
    if (avisos.length === 0) return [fato];
    // A ordem é uma regra (vencidas, prazo próximo, paradas), não uma avaliação do mérito: por isso é inferência.
    const [primeiro] = avisos;
    return [
      fato,
      {
        autor: 'assistente',
        natureza: 'inferência',
        fonte: 'ordem dos avisos: vencidas, prazo próximo e paradas; confira antes de agir',
        texto: `Pela ordem das regras, a mais urgente é ${primeiro.id} (${primeiro.texto})`,
      },
    ];
  }
  if (intencao === 'prioridades') return prioridades();
  if (intencao === 'lembrete') return lembrete(idDaFrase ?? null);
  if (intencao === 'demanda') return sobreDemanda(idDaFrase);
  if (!intencao && idDaFrase) return sobreDemanda(idDaFrase);
  if (intencao === 'ajuda') return [respostaDeAjuda(ATALHOS.map((a) => a.comando))];
  if (intencao === 'cumprimento') return [respostaDeCumprimento()];
  return [{
    autor: 'assistente',
    natureza: 'sugestão',
    fonte: 'regra de comando não reconhecido',
    texto: 'Ainda não entendo linguagem livre (o MVP não usa IA). Experimente "prazos", "prioridades", "demanda" ou "ajuda".',
    acoes: [{ rotulo: 'Ver o que eu sei fazer', comando: 'ajuda' }],
  }];
}

// Pose de cada natureza de resposta (etapa 5): reforça o selo de texto, não o substitui.
const HUMOR_DA_NATUREZA: Record<NonNullable<Mensagem['natureza']>, HumorMascote> = {
  fato: 'tranquilo',
  inferência: 'pensativo',
  sugestão: 'curioso',
};

// Comandos oferecidos como atalho abaixo da conversa: rótulo em linguagem de gente, comando por trás.
const ATALHOS: readonly { rotulo: string; comando: string }[] = [
  { rotulo: 'Ver prazos', comando: 'prazos' },
  { rotulo: 'O que faço primeiro?', comando: 'prioridades' },
  { rotulo: 'Sobre a demanda aberta', comando: 'demanda' },
  { rotulo: 'O que você faz?', comando: 'ajuda' },
];

// Primeira fala, sempre no topo da conversa (não é gravada).
const SAUDACAO: Mensagem = {
  autor: 'assistente', natureza: 'fato', fonte: 'sistema',
  texto: 'Olá! Trabalho só com dados fictícios. Escolha um atalho abaixo ou digite um comando.',
};

// A pessoa pode recolher a seção de notificações para ficar só com a conversa; a escolha fica
// neste navegador, porque a gaveta é desmontada a cada fechamento.
const CHAVE_NOTIFICACOES_RECOLHIDAS = 'guara:assistente:notificacoes-recolhidas:v1';
function lerRecolhidas(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_NOTIFICACOES_RECOLHIDAS) === '1';
  } catch {
    return false;
  }
}
function gravarRecolhidas(valor: boolean) {
  try {
    window.localStorage.setItem(CHAVE_NOTIFICACOES_RECOLHIDAS, valor ? '1' : '0');
  } catch {
    // Armazenamento bloqueado: a escolha vale só até fechar a página.
  }
}

// O humor resume o estado da tela: resposta de "não entendi" deixa o mascote curioso, inferência
// deixa pensativo; demanda vencida, com prazo próximo ou parada deixa atento. Ele conta prazos,
// não opina sobre o mérito.
function humorDoPainel(mensagens: Mensagem[], avisos: readonly Aviso[]): HumorMascote {
  const ultima = mensagens[mensagens.length - 1];
  if (ultima?.autor === 'assistente' && (ultima.natureza === 'sugestão' || ultima.natureza === 'inferência')) {
    return HUMOR_DA_NATUREZA[ultima.natureza];
  }
  return avisos.length > 0 ? 'atento' : 'tranquilo';
}

const TEXTO_DO_HUMOR: Record<HumorMascote, (avisos: readonly Aviso[], ocultos: number) => string> = {
  tranquilo: (_avisos, ocultos) => ocultos
    ? `Tranquilo: ${ocultos} aviso(s) ciente(s) ou adiado(s); nada novo pede atenção.`
    : 'Tranquilo: nenhuma demanda vencida, com prazo próximo ou parada.',
  atento: (avisos) => `Atento: ${resumoDosAvisos(avisos)}.`,
  curioso: () => 'Curioso: não entendi o último comando.',
  pensativo: () => 'Pensativo: a última resposta é uma inferência; confira antes de agir.',
  cauteloso: () => 'Cauteloso: há algo ainda não testado.',
};

/** Avisos do dia sobre as demandas deste navegador, com o limiar e os feriados gravados. */
export function useAvisosDoDia(instante: Date): Aviso[] {
  const { demandas, diasInatividade } = useEstadoDemandas();
  const ajuste = useAjusteFeriados(instante);
  return avisosDoDia(demandas, instante, diasInatividade, ajuste);
}

/**
 * Avisos do dia separados em visíveis e escondidos (ciente ou adiado). O assistente só insiste nos
 * visíveis; as outras telas continuam mostrando tudo.
 */
export function useAvisosVisiveis(instante: Date) {
  const avisos = useAvisosDoDia(instante);
  const lembretes = useLembretes();
  return { todos: avisos, ...separarAvisos(avisos, lembretes, instante) };
}

/** Nome acessível dos botões que abrem o assistente, com o resumo dos avisos. */
export const rotuloAbrirAssistente = (avisos: readonly Aviso[]) =>
  avisos.length ? `Abrir assistente: ${resumoDosAvisos(avisos)}` : 'Abrir assistente';

/**
 * Rosto do mascote principal nos botões que abrem o assistente (celular e tablet), onde o painel
 * fica fechado: atento quando há aviso, e reage, dorme e comemora como o do painel.
 */
export function RostoDoAssistente({ tamanho, avisos }: { tamanho: number; avisos: readonly Aviso[] }) {
  const preferencias = usePreferenciasMascote();
  const especie = preferencias.principal;
  return (
    <Mascote especie={especie} humor={avisos.length ? 'atento' : 'tranquilo'} tamanho={tamanho} nome={nomeDoMascote(preferencias, especie)} />
  );
}

export function PainelAssistente({ agora = () => new Date() }: { agora?: () => Date }) {
  // Mascote principal e nome vêm das Configurações.
  const preferencias = usePreferenciasMascote();
  const especie = preferencias.principal;
  const nome = nomeDoMascote(preferencias, especie);
  const temNomeProprio = nome !== MASCOTES[especie].nome;
  const [texto, setTexto] = useState('');
  // O mascote olha para o primeiro aviso (o mais urgente) quando o ponteiro está parado.
  const [primeiroAviso, setPrimeiroAviso] = useState<HTMLLIElement | null>(null);
  const conversa = useRef<HTMLOListElement>(null);
  // A conversa fica guardada neste navegador: fechar a gaveta ou recarregar não a apaga.
  const guardadas = useConversa();
  const mensagens = [SAUDACAO, ...guardadas];

  // A cada fala nova, a conversa rola até a última (no celular, a área da conversa é pequena).
  useEffect(() => {
    const ultima = conversa.current?.lastElementChild;
    if (ultima && typeof ultima.scrollIntoView === 'function') ultima.scrollIntoView({ block: 'nearest' });
  }, [mensagens.length]);

  const enviarComando = (comando: string) => {
    if (!comando.trim()) return;
    const origemDoComando = `demandas deste navegador · ${instante.toLocaleDateString('pt-BR')}`;
    const sobreDemanda = (idDaFrase?: string) => respostaSobreDemanda(idDaFrase ?? emFoco, demandas, instante, diasInatividade, ajusteDoDia, origemDoComando, Boolean(idDaFrase));
    const prioridades = () => respostaDePrioridades(demandas, instante, diasInatividade, ajusteDoDia, origemDoComando);
    const lembrete = (idDaFrase: string | null) => respostaDeLembrete(comando, idDaFrase ?? emFoco, todos, demandas, instante, ajusteDoDia, origemDoComando);
    acrescentarFalas([{ autor: 'usuario', texto: comando }, ...responder(comando, todos, origemDoComando, sobreDemanda, prioridades, lembrete)]);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    enviarComando(texto);
    setTexto('');
  };

  const instante = agora();
  // Avisos listados de uma vez (Configurações); os demais ficam no Dashboard e em Alertas.
  const maximoDeAvisos = useLimiteDeAvisos();
  const emFoco = useDemandaEmFoco();
  const { demandas, diasInatividade } = useEstadoDemandas();
  const ajusteDoDia = useAjusteFeriados(instante);
  const { todos, visiveis: avisos, ocultos } = useAvisosVisiveis(instante);
  const fila = priorizarDemandas(demandas, instante, diasInatividade, ajusteDoDia);
  const origem = `fato · fonte: demandas deste navegador · ${instante.toLocaleDateString('pt-BR')}`;
  const humor = humorDoPainel(mensagens, avisos);
  const [mostrandoOcultos, setMostrandoOcultos] = useState(false);
  const [recolhidas, setRecolhidas] = useState(lerRecolhidas);
  const alternarRecolhidas = () => {
    setRecolhidas((v) => { gravarRecolhidas(!v); return !v; });
  };
  const opcoes = opcoesDeAdiamento(instante, useAjusteFeriados(instante));

  // Demanda concluída ou excluída não precisa mais do registro de ciente ou adiamento.
  useEffect(() => limparLembretesSemAviso(todos), [todos]);

  return (
    <div className="assistente">
      <div className="assistente-topo">
        <div className="mascote-palco">
          <Mascote especie={especie} humor={humor} tamanho={88} nome={nome} alvo={avisos.length > 0 ? primeiroAviso : null} />
        </div>
        <div>
          <p>
            <strong data-testid="nome-do-mascote">{nome}</strong>
            {temNomeProprio && <span className="texto-pequeno texto-suave"> · {MASCOTES[especie].nome}</span>}
          </p>
          <p className="texto-pequeno" data-testid="humor-do-mascote">{TEXTO_DO_HUMOR[humor](avisos, ocultos.length)}</p>
        </div>
      </div>

      <section aria-label="Fila do dia" className="assistente-secao">
        <h2 className="titulo-notificacoes"><strong>Fila do dia</strong></h2>
        <FilaDoDia itens={fila} origem={`demandas deste navegador · ${instante.toLocaleDateString('pt-BR')}`} />
      </section>

      <section aria-label="Notificações" className={recolhidas ? 'assistente-secao assistente-secao--recolhida' : 'assistente-secao'}>
        <h2 className="titulo-notificacoes">
          <button type="button" className="botao-titulo" aria-expanded={!recolhidas} aria-controls="notificacoes-do-assistente" onClick={alternarRecolhidas}>
            <strong>Notificações</strong>
            {recolhidas && avisos.length > 0 && <span className="sino-contagem" aria-hidden="true">{avisos.length}</span>}
            <span className="sr-only">{recolhidas ? ` (${avisos.length} novo(s), recolhidas; mostrar)` : ' (recolher)'}</span>
          </button>
        </h2>
        <div id="notificacoes-do-assistente" hidden={recolhidas}>
        {avisos.length === 0 && ocultos.length === 0 && <p className="texto-suave">Nenhum aviso.</p>}
        {avisos.length === 0 && ocultos.length > 0 && <p className="texto-suave">Nenhum aviso novo.</p>}
        {avisos.length > 0 && (
          <ul className="lista-limpa avisos-assistente">
            {avisos.slice(0, maximoDeAvisos).map((aviso, i) => (
              // Cada aviso é uma fala curta do mascote, com a origem e a data do cálculo.
              <li key={aviso.id} ref={i === 0 ? setPrimeiroAviso : undefined} className="fala" data-testid={`aviso-${aviso.id}`} data-tipo={aviso.tipo}>
                <Mascote especie={especie} humor="atento" tamanho={28} decorativo />
                <div className="mensagem">
                  <span className="sr-only">{nome}: </span>
                  {aviso.texto}
                  <span className="mensagem-meta">{origem}</span>
                  {/* Decisões da pessoa sobre o lembrete: não mudam a demanda nem as outras telas. */}
                  <div className="acoes-aviso" role="group" aria-label={`Lembrete de ${aviso.id}`}>
                    <button type="button" className="botao botao--pequeno" onClick={() => marcarCiente(aviso, agora())}>Ciente</button>
                    {opcoes.map((o) => (
                      <button key={o.rotulo} type="button" className="botao botao--pequeno" onClick={() => adiarLembrete(aviso, o.ate)}>
                        {o.rotulo}
                      </button>
                    ))}
                    <button type="button" className="botao botao--pequeno" onClick={() => silenciarDemanda(aviso, agora())}>Não mostrar para esta demanda</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {avisos.length > maximoDeAvisos && (
          <p className="texto-pequeno texto-suave">E mais {avisos.length - maximoDeAvisos}: veja o Dashboard e a tela Alertas.</p>
        )}
        {ocultos.length > 0 && (
          <div className="avisos-ocultos">
            <button type="button" className="botao botao--pequeno" aria-expanded={mostrandoOcultos} onClick={() => setMostrandoOcultos((v) => !v)}>
              {ocultos.filter((o) => o.motivo === 'ciente').length} ciente(s) e {ocultos.filter((o) => o.motivo === 'adiado').length} adiado(s)
              {ocultos.some((o) => o.motivo === 'silenciado') && ` e ${ocultos.filter((o) => o.motivo === 'silenciado').length} silenciada(s)`}
            </button>
            {mostrandoOcultos && (
              <ul className="lista-limpa avisos-assistente">
                {ocultos.map(({ aviso, motivo, ate }) => (
                  <li key={aviso.id} className="mensagem texto-pequeno" data-testid={`oculto-${aviso.id}`}>
                    {aviso.texto} <span className="texto-suave">({motivo === 'adiado' && ate ? `adiado até ${textoDoRetorno(ate, instante)}` : motivo === 'silenciado' ? 'silenciada' : 'ciente'})</span>
                    <div className="acoes-aviso">
                      <button type="button" className="botao botao--pequeno" onClick={() => mostrarDeNovo(aviso.id)}>Mostrar de novo</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        </div>
      </section>

      <ol ref={conversa} className="conversa" aria-live="polite">
        {mensagens.map((m, i) =>
          m.autor === 'usuario' ? (
            <li key={i} className="mensagem mensagem--usuario">
              <span className="sr-only">Você: </span>
              {m.texto}
            </li>
          ) : (
            // O rosto pequeno ao lado mostra que a fala é do mascote; o nome vai para o leitor de tela.
            <li key={i} className="fala">
              <Mascote especie={especie} humor={m.natureza ? HUMOR_DA_NATUREZA[m.natureza] : 'tranquilo'} tamanho={28} decorativo />
              <div className="mensagem">
                <span className="sr-only">{nome}: </span>
                <span className="mensagem-texto">{m.texto}</span>
                {m.acoes && (
                  <div className="acoes-aviso" role="group" aria-label="Comandos sugeridos">
                    {m.acoes.map((a) => (
                      <button key={a.comando} type="button" className="botao botao--pequeno" onClick={() => enviarComando(a.comando)}>
                        {a.rotulo}
                      </button>
                    ))}
                  </div>
                )}
                {m.natureza && (
                  <span className="mensagem-meta">
                    {m.natureza} · fonte: {m.fonte} · {METODO_DETERMINISTICO}
                  </span>
                )}
              </div>
            </li>
          ),
        )}
      </ol>

      <div className="rodape-conversa">
        {/* Atalhos: os mesmos comandos, sem precisar digitar (útil no celular). */}
        <div className="atalhos-conversa" role="group" aria-label="Atalhos de comando">
          {ATALHOS.map(({ rotulo, comando }) => (
            <button key={comando} type="button" className="botao botao--pequeno" onClick={() => enviarComando(comando)}>{rotulo}</button>
          ))}
        </div>
        <form onSubmit={enviar} className="formulario-conversa">
          <label>
            <span className="sr-only">Mensagem ao assistente</span>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder='Ex.: "prazos"'
              className="campo"
              autoComplete="off"
              enterKeyHint="send"
            />
          </label>
          <button type="submit" className="botao botao--primario" aria-label="Enviar">
            <Icone nome="enviar" />
          </button>
        </form>
      </div>
    </div>
  );
}
