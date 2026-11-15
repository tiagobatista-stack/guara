import { EstadoVazio } from './EstadoVazio.tsx';

export function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <section aria-labelledby="titulo-modulo" className="pagina pagina--estreita">
      <h1 id="titulo-modulo" className="titulo-pagina">{titulo}</h1>
      <EstadoVazio cartao texto="Módulo previsto no planejamento e ainda não implementado." dica="A situação de cada módulo está em gestao/STATUS.md." />
    </section>
  );
}
