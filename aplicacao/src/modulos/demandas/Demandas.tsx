import { demandasFicticias } from '@dados/demandas.ts';

export function Demandas() {
  return (
    <section aria-labelledby="titulo-demandas" className="mx-auto max-w-5xl">
      <h1 id="titulo-demandas" className="text-2xl font-bold">Demandas</h1>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Lista somente leitura de demandas fictícias. O cadastro e o acompanhamento (MVP-0) dependem do banco.
      </p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {demandasFicticias.map((d) => (
          <li key={d.id} className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="font-medium">{d.titulo}</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 text-xs text-stone-600 dark:text-stone-400">
              <dt>Processo</dt><dd className="font-mono">{d.processo}</dd>
              <dt>Setor</dt><dd>{d.setor}</dd>
              <dt>Prioridade</dt><dd>{d.prioridade}</dd>
              <dt>Prazo</dt><dd>{d.prazo}</dd>
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}
