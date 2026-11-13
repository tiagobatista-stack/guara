// Painel do assistente: mascote principal, notificações e campo de conversa.
// MVP: comandos determinísticos, sem modelo de IA. Toda resposta indica a natureza
// (fato extraído, inferência ou sugestão) e a fonte.

import { useState, type FormEvent } from 'react';
import { Mascote, MASCOTES, type EspecieMascote } from '../../compartilhado/Mascote.tsx';
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

export function PainelAssistente() {
  const [especie, setEspecie] = useState<EspecieMascote>('capivara');
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

  return (
    <div className="assistente">
      <div className="assistente-topo">
        <Mascote especie={especie} humor="tranquilo" />
        <div>
          <p><strong>{MASCOTES[especie].nome}</strong></p>
          <label className="texto-pequeno texto-suave">
            Mascote principal{' '}
            <select value={especie} onChange={(e) => setEspecie(e.target.value as EspecieMascote)} className="seletor">
              {Object.entries(MASCOTES).map(([id, m]) => (
                <option key={id} value={id}>{m.nome} ({m.bioma})</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section aria-label="Notificações" className="assistente-secao">
        <h2><strong>Notificações</strong></h2>
        <p className="texto-suave">DEM-FIC-0002: prazo em 1 dia (fictício).</p>
      </section>

      <ol className="conversa" aria-live="polite">
        {mensagens.map((m, i) => (
          <li key={i} className={m.autor === 'usuario' ? 'mensagem mensagem--usuario' : 'mensagem'}>
            {m.texto}
            {m.natureza && (
              <span className="mensagem-meta">
                {m.natureza} · fonte: {m.fonte}
              </span>
            )}
          </li>
        ))}
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
