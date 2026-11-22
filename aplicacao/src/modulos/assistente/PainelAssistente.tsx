// Painel do assistente: mascote principal, notificações e campo de conversa.
// MVP: comandos determinísticos, sem modelo de IA. Toda resposta indica a natureza
// (fato extraído, inferência ou sugestão) e a fonte.

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Mascote, MASCOTES, type HumorMascote } from '../../compartilhado/Mascote.tsx';
import { nomeDoMascote, usePreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';
import { Icone } from '../../compartilhado/Icone.tsx';
import { useAjusteFeriados, useEstadoDemandas } from '../demandas/armazem.ts';
import { avisosDoDia, naturezaDoAviso, resumoDosAvisos, type Aviso, type TipoAviso } from './avisos.ts';
import { acrescentarFalas, useConversa, type AcaoDaFala, type Mensagem } from './conversa.ts';
import { useDemandaEmFoco } from './demanda-em-foco.ts';
import { METODO_DETERMINISTICO, respostaSobreDemanda } from './sobre-demanda.ts';
import { classificar } from './classificar.ts';
import { extrairIds, extrairTermoDeBusca, restoDaFrase } from './extrair.ts';
import { rotaParaAbrirDemanda } from '../../nucleo/registro-modulos.ts';
import { respostaDeBusca } from './buscarPelaConversa.ts';
import { respostaDeOperacoes } from './respostaOperacoes.ts';
import { useOperacoes } from '../operacoes/armazem.ts';
import { respostaDeProrrogar } from './prorrogar.ts';
import { respostaDeLembrete } from './lembrarPelaConversa.ts';
import { BOTOES_DE_ABERTURA, comBotoes, type ContextoDaResposta } from './botoes.ts';
import { respostaDeAjuda, respostaDeCumprimento } from './ajuda.ts';
import { respostaDePrioridades } from './respostaPrioridades.ts';
import { FilaDoDia } from './FilaDoDia.tsx';
import { abaPedida, abaPorTecla, ABAS, gravarAba, lerAba, pedirAba, rotuloDaAba, type Aba } from './abas.ts';
import { priorizarDemandas } from './priorizar.ts';
import { nomeDaDemanda } from './rotuloDaDemanda.ts';
import { useLimiteDeAvisos } from './preferencias-avisos.ts';
import { cancelarCompromisso, confirmarCompromisso, respostaDeAgenda, respostaDeCompromisso, respostaDeDecisao } from './compromissoPelaConversa.ts';
import { adiarCompromisso, concluirOcorrencia, marcarCienteCompromisso, tituloDoCompromisso, useCompromissos } from '../agenda/compromissos.ts';
import { OPCAO_EM_DUAS_HORAS, textoDoCompromisso, useCompromissosParaAvisar, type CompromissoAvisado } from '../agenda/avisosDeCompromissos.ts';
import { adiarLembrete, limparLembretesSemAviso, marcarCiente, mostrarDeNovo, opcoesDeAdiamento, separarAvisos, silenciarDemanda, textoDoRetorno, useLembretes } from './lembretes.ts';

const ROTULO_DO_TIPO: Record<TipoAviso, string> = { vencida: 'Vencidas', 'prazo-proximo': 'Prazo próximo', parada: 'Paradas' };

/** Os mesmos avisos do painel, agrupados por tipo, com o id de cada demanda. */
function textoDosPrazos(avisos: readonly Aviso[]): string {
  return (Object.keys(ROTULO_DO_TIPO) as TipoAviso[])
    .map((tipo) => `${ROTULO_DO_TIPO[tipo]}: ${avisos.filter((a) => a.tipo === tipo).map((a) => nomeDaDemanda(a.id, a.titulo)).join(', ') || 'nenhuma'}.`)
    .join(' ');
}

function responder(comando: string, avisos: readonly Aviso[], origem: string, sobreDemanda: (idDaFrase?: string) => Mensagem[], prioridades: () => Mensagem[], lembrete: (id: string | null) => Mensagem[], prorrogar: (id: string | null) => Mensagem[], buscar: (termo: string | null) => Mensagem[], operacoes: () => Mensagem[], agenda: { agora: Date; compromisso: () => Mensagem[]; agendaDoDia: () => Mensagem[]; decisao: () => Mensagem[] | null }): Mensagem[] {
  // "Confirmar"/"Cancelar" do compromisso entendido (botão ou digitado) valem antes de qualquer outra regra.
  const decidida = agenda.decisao();
  if (decidida) return decidida;
  // Etapa 1 da conversa (20/11/2026): a frase passa pelo classificador (`classificar.ts`), que
  // reconhece sinônimos e frases comuns ("o que tá vencido?", "me ajuda") sem IA.
  const intencao = classificar(comando, agenda.agora)?.id;
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
        texto: `Pela ordem das regras, a mais urgente é ${nomeDaDemanda(primeiro.id, primeiro.titulo)} (${primeiro.texto})`,
      },
    ];
  }
  if (intencao === 'prioridades') return prioridades();
  if (intencao === 'operacoes') return operacoes();
  if (intencao === 'compromisso') return agenda.compromisso();
  if (intencao === 'agenda') return agenda.agendaDoDia();
  if (intencao === 'lembrete') return lembrete(idDaFrase ?? null);
  if (intencao === 'prorrogar') return prorrogar(idDaFrase ?? null);
  if (intencao === 'buscar') {
    const termo = extrairTermoDeBusca(comando);
    // "cadê DEM-FIC-0002": só o código, sem outra palavra, vira o resumo daquela demanda.
    if (idDaFrase && restoDaFrase(termo ?? '').length === 0) return sobreDemanda(idDaFrase);
    return buscar(termo);
  }
  if (intencao === 'demanda') return sobreDemanda(idDaFrase);
  if (!intencao && idDaFrase) {
    // Só o código (ou o código com "fala dela"): resumo. Com outra coisa, diz o que reconheceu.
    if (restoDaFrase(comando).length === 0) return sobreDemanda(idDaFrase);
    return [{
      autor: 'assistente',
      natureza: 'sugestão',
      fonte: 'regra de comando não reconhecido',
      texto: `Reconheci ${idDaFrase}, mas não entendi o restante. Para essa demanda posso: resumo, lembrete, abrir para prorrogar.`,
      acoes: [
        { rotulo: `Resumo de ${idDaFrase}`, comando: idDaFrase },
        { rotulo: 'Lembrar', comando: `lembrar ${idDaFrase}` },
        { rotulo: 'Abrir demanda', comando: `abrir ${idDaFrase}`, rota: rotaParaAbrirDemanda(idDaFrase) },
      ],
    }];
  }
  if (intencao === 'ajuda') return [respostaDeAjuda(['prazos', 'prioridades', 'demanda', 'ajuda'])];
  if (intencao === 'cumprimento') return [respostaDeCumprimento()];
  return [{
    autor: 'assistente',
    natureza: 'sugestão',
    fonte: 'regra de comando não reconhecido',
    texto: 'Ainda não entendi essa frase (o MVP não usa IA). Experimente "prazos", "prioridades", "operações" ou "ajuda".',
  }];
}

// Pose de cada natureza de resposta (etapa 5): reforça o selo de texto, não o substitui.
const HUMOR_DA_NATUREZA: Record<NonNullable<Mensagem['natureza']>, HumorMascote> = {
  fato: 'tranquilo',
  inferência: 'pensativo',
  sugestão: 'curioso',
};

// Primeira fala, sempre no topo da conversa (não é gravada).
const SAUDACAO: Mensagem = {
  autor: 'assistente', natureza: 'fato', fonte: 'sistema',
  texto: 'Olá! Trabalho só com dados fictícios. Toque num botão ou digite um comando.',
  acoes: [...BOTOES_DE_ABERTURA],
};

// O humor resume o estado da tela: resposta de "não entendi" deixa o mascote curioso, inferência
// deixa pensativo; demanda vencida, com prazo próximo ou parada deixa atento. Ele conta prazos,
// não opina sobre o mérito.
function humorDoPainel(mensagens: Mensagem[], avisos: readonly Aviso[], compromissos = 0): HumorMascote {
  const ultima = mensagens[mensagens.length - 1];
  if (ultima?.autor === 'assistente' && (ultima.natureza === 'sugestão' || ultima.natureza === 'inferência')) {
    return HUMOR_DA_NATUREZA[ultima.natureza];
  }
  return avisos.length > 0 || compromissos > 0 ? 'atento' : 'tranquilo';
}

const TEXTO_DO_HUMOR: Record<HumorMascote, (avisos: readonly Aviso[], ocultos: number, compromissos: number) => string> = {
  tranquilo: (_avisos, ocultos) => ocultos
    ? `Tranquilo: ${ocultos} aviso(s) ciente(s) ou adiado(s); nada novo pede atenção.`
    : 'Tranquilo: nenhuma demanda vencida, com prazo próximo ou parada.',
  atento: (avisos, _ocultos, compromissos) => {
    const deCompromisso = compromissos ? `${compromissos} compromisso(s) ou lembrete(s) para hoje` : '';
    return `Atento: ${[avisos.length ? resumoDosAvisos(avisos) : '', deCompromisso].filter(Boolean).join('; ')}.`;
  },
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
export const rotuloAbrirAssistente = (avisos: readonly Aviso[], compromissos = 0) => {
  const partes = [avisos.length ? resumoDosAvisos(avisos) : '', compromissos ? `${compromissos} compromisso(s) ou lembrete(s)` : ''].filter(Boolean);
  return partes.length ? `Abrir assistente: ${partes.join('; ')}` : 'Abrir assistente';
};

/**
 * Rosto do mascote principal nos botões que abrem o assistente (celular e tablet), onde o painel
 * fica fechado: atento quando há aviso, e reage, dorme e comemora como o do painel.
 */
export function RostoDoAssistente({ tamanho, avisos, compromissos = 0 }: { tamanho: number; avisos: readonly Aviso[]; compromissos?: number }) {
  const preferencias = usePreferenciasMascote();
  const especie = preferencias.principal;
  return (
    <Mascote especie={especie} humor={avisos.length || compromissos ? 'atento' : 'tranquilo'} tamanho={tamanho} nome={nomeDoMascote(preferencias, especie)} />
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
    const prorrogar = (idDaFrase: string | null) => respostaDeProrrogar(idDaFrase ?? emFoco, demandas, origemDoComando);
    const buscar = (termo: string | null) => respostaDeBusca(termo, demandas);
    const operacoesDaConversa = () => respostaDeOperacoes(operacoes, demandas, instante);
    const lembrete = (idDaFrase: string | null) => respostaDeLembrete(comando, idDaFrase ?? emFoco, todos, demandas, instante, ajusteDoDia, origemDoComando);
    const resposta = responder(comando, todos, origemDoComando, sobreDemanda, prioridades, lembrete, prorrogar, buscar, operacoesDaConversa, {
      agora: instante,
      compromisso: () => respostaDeCompromisso(comando, demandas, instante),
      agendaDoDia: () => respostaDeAgenda(comando, compromissos, demandas, operacoes, instante),
      decisao: () => respostaDeDecisao(comando, instante),
    });
    const intencao = classificar(comando, instante)?.id;
    const temId = extrairIds(comando).length > 0;
    const contexto: ContextoDaResposta =
      intencao === 'cumprimento' ? 'inicio'
        : intencao === 'prazos' || intencao === 'prioridades' ? 'lista'
        : intencao === 'ajuda' ? 'ajuda'
        : intencao === 'buscar' && !resposta[resposta.length - 1].acoes?.length && !temId ? 'nao-entendi'
        : !intencao && !temId ? 'nao-entendi'
        : 'outro';
    // Toda resposta termina com 2 a 4 botões coerentes com o contexto (não há mais fileira fixa de atalhos).
    const comandoDado = intencao === 'prazos' || intencao === 'prioridades' || intencao === 'ajuda' || intencao === 'demanda' ? intencao : undefined;
    acrescentarFalas([{ autor: 'usuario', texto: comando }, ...comBotoes(resposta, contexto, Boolean(emFoco), comandoDado)]);
  };

  // Botões que gravam ou descartam executam a ação direto: o texto do botão nunca passa pelo classificador.
  const executarAcao = (a: AcaoDaFala) => {
    if (!a.acao) return;
    const resposta = a.acao.tipo === 'confirmar-compromisso' ? confirmarCompromisso(a.acao.dados, instante) : cancelarCompromisso();
    acrescentarFalas([{ autor: 'usuario', texto: a.rotulo }, ...comBotoes(resposta, 'outro', Boolean(emFoco))]);
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
  const operacoes = useOperacoes();
  const compromissos = useCompromissos();
  const compromissosDoAviso = useCompromissosParaAvisar(instante);
  const ajusteDoDia = useAjusteFeriados(instante);
  const { todos, visiveis: avisos, ocultos } = useAvisosVisiveis(instante);
  const fila = priorizarDemandas(demandas, instante, diasInatividade, ajusteDoDia);
  const origemDoAviso = `demandas deste navegador · ${instante.toLocaleDateString('pt-BR')}`;
  const humor = humorDoPainel(mensagens, avisos, compromissosDoAviso.length);
  const [mostrandoOcultos, setMostrandoOcultos] = useState(false);
  // Abas (item 11a): a última escolhida vale ao reabrir; um recado de "Avisos" (botão do cabeçalho com aviso
  // urgente) abre em Avisos e volta para a aba anterior quando o aviso urgente é dispensado.
  const idBase = useId();
  const [aba, setAba] = useState<Aba>(() => abaPedida() ?? lerAba());
  const [voltarPara, setVoltarPara] = useState<Aba | null>(() => (abaPedida() ? lerAba() : null));
  useEffect(() => { pedirAba(null); }, []);
  const botoesDasAbas = useRef<Partial<Record<Aba, HTMLButtonElement | null>>>({});
  const escolherAba = (a: Aba) => { setAba(a); setVoltarPara(null); gravarAba(a); };
  const temUrgente = avisos.some((x) => x.tipo === 'vencida');
  useEffect(() => {
    if (voltarPara && !temUrgente) { setAba(voltarPara); setVoltarPara(null); }
  }, [voltarPara, temUrgente]);
  const teclasDasAbas = (e: KeyboardEvent<HTMLDivElement>) => {
    const proxima = abaPorTecla(aba, e.key);
    if (!proxima) return;
    e.preventDefault();
    escolherAba(proxima);
    botoesDasAbas.current[proxima]?.focus();
  };
  const numeroDaAba: Record<Aba, number> = { conversa: 0, fila: fila.length, avisos: avisos.length + compromissosDoAviso.length };
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
          <p className="texto-pequeno" data-testid="humor-do-mascote">{TEXTO_DO_HUMOR[humor](avisos, ocultos.length, compromissosDoAviso.length)}</p>
        </div>
      </div>

      <div role="tablist" aria-label="Seções do assistente" className="abas-assistente" onKeyDown={teclasDasAbas}>
        {ABAS.map((a) => {
          const r = rotuloDaAba(a, numeroDaAba[a]);
          return (
            <button
              key={a}
              ref={(el) => { botoesDasAbas.current[a] = el; }}
              type="button"
              role="tab"
              id={`${idBase}-aba-${a}`}
              aria-selected={aba === a}
              aria-controls={`${idBase}-painel-${a}`}
              aria-label={r.nome}
              tabIndex={aba === a ? 0 : -1}
              className="aba-assistente"
              onClick={() => escolherAba(a)}
            >
              {r.visivel}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${idBase}-painel-fila`} aria-labelledby={`${idBase}-aba-fila`} hidden={aba !== 'fila'} className="aba-painel">
        <FilaDoDia itens={fila} origem={`demandas deste navegador · ${instante.toLocaleDateString('pt-BR')}`} aoVerLista={() => { escolherAba('conversa'); enviarComando('prioridades'); }} />
      </div>

      <div role="tabpanel" id={`${idBase}-painel-avisos`} aria-labelledby={`${idBase}-aba-avisos`} hidden={aba !== 'avisos'} className="aba-painel">
        {avisos.length === 0 && ocultos.length === 0 && compromissosDoAviso.length === 0 && <p className="texto-suave">Nenhum aviso.</p>}
        {avisos.length === 0 && ocultos.length > 0 && compromissosDoAviso.length === 0 && <p className="texto-suave">Nenhum aviso novo.</p>}
        {compromissosDoAviso.length > 0 && (
          <ul className="lista-limpa avisos-assistente" aria-label="Compromissos e lembretes">
            {compromissosDoAviso.map((c) => (
              <AvisoDeCompromisso key={`${c.id}-${c.ocorrencia}`} compromisso={c} agora={instante} aoMarcarCiente={() => marcarCienteCompromisso(c.id, agora())} aoConcluir={() => concluirOcorrencia(c.id, c.ocorrencia)} aoAdiar={() => adiarCompromisso(c.id, new Date(agora().getTime() + OPCAO_EM_DUAS_HORAS.horas * 3_600_000))} />
            ))}
          </ul>
        )}
        {avisos.length > 0 && (
          <ul className="lista-limpa avisos-assistente">
            {avisos.slice(0, maximoDeAvisos).map((aviso, i) => (
              // Cada aviso é uma fala curta do mascote, com a origem e a data do cálculo.
              <li key={aviso.id} ref={i === 0 ? setPrimeiroAviso : undefined} className="fala" data-testid={`aviso-${aviso.id}`} data-tipo={aviso.tipo}>
                <Mascote especie={especie} humor="atento" tamanho={28} decorativo />
                <div className="mensagem">
                  <span className="sr-only">{nome}: </span>
                  {aviso.texto}
                  <span className="mensagem-meta">{naturezaDoAviso(aviso)} · fonte: {origemDoAviso}</span>
                  {/* Decisões da pessoa sobre o lembrete: não mudam a demanda nem as outras telas. */}
                  <div className="acoes-aviso" role="group" aria-label={`Lembrete de ${nomeDaDemanda(aviso.id, aviso.titulo)}`}>
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
        {/* O sino do cabeçalho conta outra coisa (demandas inativas, tela Alertas): a nota evita achar que os números deveriam ser iguais. */}
        <p className="texto-pequeno texto-suave" data-testid="nota-sino">
          Avisos do dia: prazo vencido, prazo próximo e demanda parada. O número do sino, no cabeçalho, conta só demandas inativas (tela Alertas).
        </p>
      </div>

      <div role="tabpanel" id={`${idBase}-painel-conversa`} aria-labelledby={`${idBase}-aba-conversa`} hidden={aba !== 'conversa'} className="aba-conversa">
      <ol ref={conversa} className="conversa" aria-live="polite">
        {mensagens.map((m, i) => {
          // Só os botões da última fala do assistente ficam ativos; os das anteriores seguem à vista, apagados.
          const ativa = i === mensagens.length - 1;
          return m.autor === 'usuario' ? (
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
                  <div className={ativa ? 'acoes-aviso' : 'acoes-aviso acoes-aviso--antigas'} role="group" aria-label="Comandos sugeridos">
                    {m.acoes.map((a) => (
                      <button
                        key={a.comando}
                        type="button"
                        className="botao botao--pequeno"
                        aria-disabled={ativa ? undefined : true}
                        aria-label={a.rota?.includes('campo=prazo') ? `${a.rotulo} ${a.comando.replace(/^abrir /, '')}, no campo Prazo` : undefined}
                        onClick={() => { if (!ativa) return; if (a.acao) executarAcao(a); else if (a.aba) escolherAba(a.aba); else if (a.rota) window.location.assign(a.rota); else enviarComando(a.comando); }}
                      >
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
          );
        })}
      </ol>

      <div className="rodape-conversa">
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
    </div>
  );
}

/** Aviso de um compromisso ou lembrete próprio, com a cor própria de lembrete (não é prazo de demanda). */
function AvisoDeCompromisso({ compromisso: c, agora, aoMarcarCiente, aoConcluir, aoAdiar }: { compromisso: CompromissoAvisado; agora: Date; aoMarcarCiente: () => void; aoConcluir: () => void; aoAdiar: () => void }) {
  const titulo = tituloDoCompromisso(c);
  return (
    <li className="fala aviso-compromisso" data-testid={`compromisso-${c.id}`}>
      <div className="mensagem">
        <strong>{c.tipo === 'lembrete' ? 'Lembrete' : 'Compromisso'}</strong>: {textoDoCompromisso(c, agora)}
        <span className="mensagem-meta">fato · fonte: compromissos deste navegador</span>
        <div className="acoes-aviso" role="group" aria-label={`Aviso de ${titulo}`}>
          <button type="button" className="botao botao--pequeno" onClick={aoMarcarCiente}>Ciente</button>
          <button type="button" className="botao botao--pequeno" onClick={aoConcluir}>Concluído</button>
          <button type="button" className="botao botao--pequeno" onClick={aoAdiar}>{OPCAO_EM_DUAS_HORAS.rotulo}</button>
        </div>
      </div>
    </li>
  );
}
