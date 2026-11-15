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

const ROTULO_DO_TIPO: Record<TipoAviso, string> = { vencida: 'Vencidas', 'prazo-proximo': 'Prazo próximo', parada: 'Paradas' };

/** Os mesmos avisos do painel, agrupados por tipo, com o id de cada demanda. */
function textoDosPrazos(avisos: readonly Aviso[]): string {
  return (Object.keys(ROTULO_DO_TIPO) as TipoAviso[])
    .map((tipo) => `${ROTULO_DO_TIPO[tipo]}: ${avisos.filter((a) => a.tipo === tipo).map((a) => a.id).join(', ') || 'nenhuma'}.`)
    .join(' ');
}

function responder(comando: string, avisos: readonly Aviso[], origem: string): Mensagem[] {
  const c = comando.trim().toLowerCase();
  if (c.startsWith('prazos')) {
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
  if (c.startsWith('ajuda')) {
    return [{ autor: 'assistente', natureza: 'fato', fonte: 'lista de comandos do MVP', texto: 'Comandos disponíveis: "prazos" (lista as demandas vencidas, com prazo próximo e paradas) e "ajuda". Os atalhos abaixo enviam esses comandos.' }];
  }
  return [{
    autor: 'assistente',
    natureza: 'sugestão',
    fonte: 'regra de comando não reconhecido',
    texto: 'Ainda não entendo linguagem livre (o MVP não usa IA). Experimente "prazos" ou "ajuda".',
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
  { rotulo: 'O que você faz?', comando: 'ajuda' },
];

// Primeira fala, sempre no topo da conversa (não é gravada).
const SAUDACAO: Mensagem = {
  autor: 'assistente', natureza: 'fato', fonte: 'sistema',
  texto: 'Olá! Trabalho só com dados fictícios. Escolha um atalho abaixo ou digite um comando.',
};

// Avisos mostrados de uma vez; os demais ficam no Dashboard e em Alertas.
const MAXIMO_DE_AVISOS = 5;

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

const TEXTO_DO_HUMOR: Record<HumorMascote, (avisos: readonly Aviso[]) => string> = {
  tranquilo: () => 'Tranquilo: nenhuma demanda vencida, com prazo próximo ou parada.',
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
    acrescentarFalas([{ autor: 'usuario', texto: comando }, ...responder(comando, avisos, `demandas deste navegador · ${instante.toLocaleDateString('pt-BR')}`)]);
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    enviarComando(texto);
    setTexto('');
  };

  const instante = agora();
  const avisos = useAvisosDoDia(instante);
  const origem = `fato · fonte: demandas deste navegador · ${instante.toLocaleDateString('pt-BR')}`;
  const humor = humorDoPainel(mensagens, avisos);

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
          <p className="texto-pequeno" data-testid="humor-do-mascote">{TEXTO_DO_HUMOR[humor](avisos)}</p>
        </div>
      </div>

      <section aria-label="Notificações" className="assistente-secao">
        <h2><strong>Notificações</strong></h2>
        {avisos.length === 0 && <p className="texto-suave">Nenhum aviso.</p>}
        {avisos.length > 0 && (
          <ul className="lista-limpa avisos-assistente">
            {avisos.slice(0, MAXIMO_DE_AVISOS).map((aviso, i) => (
              // Cada aviso é uma fala curta do mascote, com a origem e a data do cálculo.
              <li key={aviso.id} ref={i === 0 ? setPrimeiroAviso : undefined} className="fala" data-testid={`aviso-${aviso.id}`} data-tipo={aviso.tipo}>
                <Mascote especie={especie} humor="atento" tamanho={28} decorativo />
                <div className="mensagem">
                  <span className="sr-only">{nome}: </span>
                  {aviso.texto}
                  <span className="mensagem-meta">{origem}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {avisos.length > MAXIMO_DE_AVISOS && (
          <p className="texto-pequeno texto-suave">E mais {avisos.length - MAXIMO_DE_AVISOS}: veja o Dashboard e a tela Alertas.</p>
        )}
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
                {m.texto}
                {m.natureza && (
                  <span className="mensagem-meta">
                    {m.natureza} · fonte: {m.fonte}
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
            <button key={comando} type="button" className="botao" onClick={() => enviarComando(comando)}>{rotulo}</button>
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
