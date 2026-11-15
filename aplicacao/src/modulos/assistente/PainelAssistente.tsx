// Painel do assistente: mascote principal, notificações e campo de conversa.
// MVP: comandos determinísticos, sem modelo de IA. Toda resposta indica a natureza
// (fato extraído, inferência ou sugestão) e a fonte.

import { useState, type FormEvent } from 'react';
import { Mascote, MASCOTES, type HumorMascote } from '../../compartilhado/Mascote.tsx';
import { nomeDoMascote, usePreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';
import { Icone } from '../../compartilhado/Icone.tsx';
import { useAjusteFeriados, useEstadoDemandas } from '../demandas/armazem.ts';
import { avisosDoDia, resumoDosAvisos, type Aviso, type TipoAviso } from './avisos.ts';

interface Mensagem {
  autor: 'usuario' | 'assistente';
  texto: string;
  natureza?: 'fato' | 'inferência' | 'sugestão';
  fonte?: string;
}

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
    return [{ autor: 'assistente', natureza: 'fato', fonte: 'lista de comandos do MVP', texto: 'Comandos disponíveis: "prazos", "ajuda".' }];
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

export function PainelAssistente({ agora = () => new Date() }: { agora?: () => Date }) {
  // Mascote principal e nome vêm das Configurações.
  const preferencias = usePreferenciasMascote();
  const especie = preferencias.principal;
  const nome = nomeDoMascote(preferencias, especie);
  const temNomeProprio = nome !== MASCOTES[especie].nome;
  const [texto, setTexto] = useState('');
  // O mascote olha para o primeiro aviso (o mais urgente) quando o ponteiro está parado.
  const [primeiroAviso, setPrimeiroAviso] = useState<HTMLLIElement | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { autor: 'assistente', natureza: 'fato', fonte: 'sistema', texto: 'Olá! Trabalho só com dados fictícios. Digite "ajuda".' },
  ]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setMensagens((m) => [...m, { autor: 'usuario', texto }, ...responder(texto, avisos, `demandas deste navegador · ${instante.toLocaleDateString('pt-BR')}`)]);
    setTexto('');
  };

  const { demandas, diasInatividade } = useEstadoDemandas();
  const instante = agora();
  const ajuste = useAjusteFeriados(instante);
  const avisos = avisosDoDia(demandas, instante, diasInatividade, ajuste);
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

      <ol className="conversa" aria-live="polite">
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

      <form onSubmit={enviar} className="formulario-conversa">
        <label>
          <span className="sr-only">Mensagem ao assistente</span>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder='Ex.: "prazos"'
            className="campo"
          />
        </label>
        <button type="submit" className="botao botao--primario" aria-label="Enviar">
          <Icone nome="enviar" />
        </button>
      </form>
    </div>
  );
}
