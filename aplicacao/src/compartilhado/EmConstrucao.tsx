export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <section aria-labelledby="titulo-modulo" className="mx-auto max-w-2xl py-10 text-center">
      <h1 id="titulo-modulo" className="text-xl font-bold">{titulo}</h1>
      <p className="mt-2 text-stone-600 dark:text-stone-400">
        Módulo previsto no planejamento e ainda não implementado. Ver <code>gestao/STATUS.md</code>.
      </p>
    </section>
  );
}
