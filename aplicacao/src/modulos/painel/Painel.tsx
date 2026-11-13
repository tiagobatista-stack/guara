import { DATA_REFERENCIA, demandasFicticias } from '@dados/demandas.ts';
import { avaliarPrazos } from '@catalogo/habilidades/avaliar-prazos/implementacao.ts';

const ROTULO_SITUACAO: Record<string, string> = {
  aberta: 'Aberta',
  'em-analise': 'Em análise',
  'aguardando-revisao': 'Aguardando revisão',
  concluida: 'Concluída',
};

export function Painel() {
  const prazos = avaliarPrazos({
    dataReferencia: DATA_REFERENCIA,
    diasInatividade: 5,
    diasPrazoProximo: 3,
    demandas: demandasFicticias,
  });
  const cartoes = [
    { rotulo: 'Demandas abertas', valor: demandasFicticias.filter((d) => d.situacao !== 'concluida').length },
    { rotulo: 'Pendências de revisão', valor: demandasFicticias.filter((d) => d.situacao === 'aguardando-revisao').length },
    { rotulo: 'Prazos próximos (≤ 3 dias)', valor: prazos.prazoProximo.length + prazos.vencidas.length },
    { rotulo: 'Concluídas', valor: demandasFicticias.filter((d) => d.situacao === 'concluida').length },
  ];
  const doDia = [...demandasFicticias].filter((d) => d.situacao !== 'concluida').sort((a, b) => a.prazo.localeCompare(b.prazo));

  return (
    <section aria-labelledby="titulo-painel" className="mx-auto max-w-5xl">
      <h1 id="titulo-painel" className="text-2xl font-bold">Hoje</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">Data de referência fictícia: {DATA_REFERENCIA}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-sm text-stone-600 dark:text-stone-400">{c.rotulo}</p>
            <p className="mt-1 text-3xl font-bold">{c.valor}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold">Demandas por prioridade de prazo</h2>
          <ul className="mt-3 divide-y divide-stone-100 dark:divide-stone-800">
            {doDia.map((d) => (
              <li key={d.id} className="py-2">
                <p className="text-sm font-medium">{d.titulo}</p>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {d.processo} · {ROTULO_SITUACAO[d.situacao]} · prazo {d.prazo}
                  {prazos.paradas.includes(d.id) && <span className="ml-1 font-semibold text-amber-700 dark:text-amber-300">· parada há 5+ dias</span>}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="font-semibold">Linha do tempo de prazos</h2>
          <ol className="mt-3 space-y-2 border-l-2 border-guara-500 pl-4">
            {[...demandasFicticias].sort((a, b) => a.prazo.localeCompare(b.prazo)).map((d) => (
              <li key={d.id} className="text-sm">
                <span className="font-mono text-xs">{d.prazo}</span> — {d.processo}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
