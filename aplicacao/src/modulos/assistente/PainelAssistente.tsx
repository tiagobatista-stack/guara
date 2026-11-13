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
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-3 border-b border-stone-200 p-4 dark:border-stone-800">
        <Mascote especie={especie} humor="tranquilo" />
        <div className="min-w-0">
          <p className="font-semibold">{MASCOTES[especie].nome}</p>
          <label className="text-xs text-stone-600 dark:text-stone-400">
            Mascote principal{' '}
            <select value={especie} onChange={(e) => setEspecie(e.target.value as EspecieMascote)} className="rounded border border-stone-300 bg-transparent text-xs dark:border-stone-700">
              {Object.entries(MASCOTES).map(([id, m]) => (
                <option key={id} value={id}>{m.nome} ({m.bioma})</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section aria-label="Notificações" className="border-b border-stone-200 p-4 text-sm dark:border-stone-800">
        <h2 className="font-semibold">Notificações</h2>
        <p className="mt-1 text-stone-600 dark:text-stone-400">DEM-FIC-0002: prazo em 1 dia (fictício).</p>
      </section>

      <ol className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
        {mensagens.map((m, i) => (
          <li key={i} className={`rounded-lg p-2 text-sm ${m.autor === 'usuario' ? 'ml-8 bg-guara-100 dark:bg-guara-700/30' : 'mr-8 bg-stone-100 dark:bg-stone-800'}`}>
            {m.texto}
            {m.natureza && (
              <span className="mt-1 block text-[11px] text-stone-600 dark:text-stone-400">
                {m.natureza} · fonte: {m.fonte}
              </span>
            )}
          </li>
        ))}
      </ol>

      <form onSubmit={enviar} className="flex gap-2 border-t border-stone-200 p-3 dark:border-stone-800">
        <label className="flex-1">
          <span className="sr-only">Mensagem ao assistente</span>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder='Ex.: "prazos"'
            className="min-h-11 w-full rounded-lg border border-stone-300 bg-transparent px-3 text-sm dark:border-stone-700"
          />
        </label>
        <button type="submit" className="grid h-11 w-11 place-items-center rounded-lg bg-guara-500 text-white" aria-label="Enviar">
          <Icone nome="enviar" />
        </button>
      </form>
    </div>
  );
}
