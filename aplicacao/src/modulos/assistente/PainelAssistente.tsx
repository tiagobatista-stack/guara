// Painel do assistente: mascote principal, notificações e campo de conversa.
// MVP: comandos determinísticos, sem modelo de IA. Toda resposta indica a natureza
// (fato extraído, inferência ou sugestão) e a fonte.

import { useState, type FormEvent } from 'react';
import { Mascote, MASCOTES, type HumorMascote } from '../../compartilhado/Mascote.tsx';
import { nomeDoMascote, usePreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';
import { Icone } from '../../compartilhado/Icone.tsx';
import { DATA_REFERENCIA, demandasFicticias } from '@dados/demandas.ts';
import { avaliarPrazos } from '@catalogo/habilidades/avaliar-prazos/implementacao.ts';

interface Mensagem {
  autor: 'usuario' | 'assistente';
  texto: string;
  natureza?: 'fato' | 'inferência' | 'sugestão';
  fonte?: string;
}

function responder(comando: string): Mensagem {
  const c = comando.trim().toLowerCase();
  if (c.startsWith('prazos')) {
    const r = avaliarPrazos({ dataReferencia: DATA_REFERENCIA, diasInatividade: 5, diasPrazoProximo: 3, demandas: demandasFicticias });
    return {
      autor: 'assistente',
      natureza: 'fato',
      fonte: 'habilidade avaliar-prazos sobre dados fictícios',
      texto: `Prazo próximo: ${r.prazoProximo.join(', ') || 'nenhuma'}. Paradas há 5+ dias: ${r.paradas.join(', ') || 'nenhuma'}.`,
    };
  }
  if (c.startsWith('ajuda')) {
    return { autor: 'assistente', natureza: 'fato', fonte: 'lista de comandos do MVP', texto: 'Comandos disponíveis: "prazos", "ajuda".' };
  }
  return {
    autor: 'assistente',
    natureza: 'sugestão',
    fonte: 'regra de comando não reconhecido',
    texto: 'Ainda não entendo linguagem livre (o MVP não usa IA). Experimente "prazos" ou "ajuda".',
  };
}

// Avisos mostrados no painel (texto fixo e fictício no MVP).
const NOTIFICACOES = ['DEM-FIC-0002: prazo em 1 dia (fictício).'];

// O humor só reflete o estado da tela: resposta de "não entendi" deixa o mascote curioso,
// aviso pendente deixa atento. Ele não avalia o conteúdo das demandas.
function humorDoPainel(mensagens: Mensagem[], avisos: number): HumorMascote {
  const ultima = mensagens[mensagens.length - 1];
  if (ultima?.autor === 'assistente' && ultima.natureza === 'sugestão') return 'curioso';
  return avisos > 0 ? 'atento' : 'tranquilo';
}

const TEXTO_DO_HUMOR: Record<HumorMascote, (avisos: number) => string> = {
  tranquilo: () => 'Tranquilo: nenhum aviso.',
  atento: (avisos) => (avisos === 1 ? 'Atento: 1 aviso abaixo.' : `Atento: ${avisos} avisos abaixo.`),
  curioso: () => 'Curioso: não entendi o último comando.',
};

export function PainelAssistente() {
  // Mascote principal e nome vêm das Configurações.
  const preferencias = usePreferenciasMascote();
  const especie = preferencias.principal;
  const nome = nomeDoMascote(preferencias, especie);
  const temNomeProprio = nome !== MASCOTES[especie].nome;
  const [texto, setTexto] = useState('');
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { autor: 'assistente', natureza: 'fato', fonte: 'sistema', texto: 'Olá! Trabalho só com dados fictícios. Digite "ajuda".' },
  ]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setMensagens((m) => [...m, { autor: 'usuario', texto }, responder(texto)]);
    setTexto('');
  };

  const humor = humorDoPainel(mensagens, NOTIFICACOES.length);

  return (
    <div className="assistente">
      <div className="assistente-topo">
        <div className="mascote-palco">
          <Mascote especie={especie} humor={humor} tamanho={88} nome={nome} />
        </div>
        <div>
          <p>
            <strong data-testid="nome-do-mascote">{nome}</strong>
            {temNomeProprio && <span className="texto-pequeno texto-suave"> · {MASCOTES[especie].nome}</span>}
          </p>
          <p className="texto-pequeno" data-testid="humor-do-mascote">{TEXTO_DO_HUMOR[humor](NOTIFICACOES.length)}</p>
        </div>
      </div>

      <section aria-label="Notificações" className="assistente-secao">
        <h2><strong>Notificações</strong></h2>
        {NOTIFICACOES.length === 0 && <p className="texto-suave">Nenhum aviso.</p>}
        {NOTIFICACOES.map((aviso) => (
          <p key={aviso} className="texto-suave">{aviso}</p>
        ))}
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
              <Mascote especie={especie} humor={m.natureza === 'sugestão' ? 'curioso' : 'tranquilo'} tamanho={28} decorativo />
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
