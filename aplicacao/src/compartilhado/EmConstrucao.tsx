export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <section aria-labelledby="titulo-modulo" className="pagina pagina--estreita">
      <h1 id="titulo-modulo" className="titulo-pagina">{titulo}</h1>
      <p className="texto-suave">
        Módulo previsto no planejamento e ainda não implementado. Ver <code>gestao/STATUS.md</code>.
      </p>
    </section>
  );
}
