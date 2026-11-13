import { demandasFicticias } from '@dados/demandas.ts';

export function Demandas() {
  return (
    <section aria-labelledby="titulo-demandas" className="pagina">
      <div>
        <h1 id="titulo-demandas" className="titulo-pagina">Demandas</h1>
        <p className="texto-suave texto-medio">
          Lista somente leitura de demandas fictícias. O CRUD com localStorage chega no incremento 1 (fase 3).
        </p>
      </div>
      <ul className="lista-limpa grade grade--2">
        {demandasFicticias.map((d) => (
          <li key={d.id} className="cartao">
            <p><strong>{d.titulo}</strong></p>
            <dl className="dados-definicao">
              <dt>Processo</dt><dd className="mono">{d.processo}</dd>
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
