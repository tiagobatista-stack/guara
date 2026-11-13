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
    <section aria-labelledby="titulo-painel" className="pagina">
      <div>
        <h1 id="titulo-painel" className="titulo-pagina">Hoje</h1>
        <p className="texto-suave texto-medio">Data de referência fictícia: {DATA_REFERENCIA}</p>
      </div>

      <div className="grade grade--4">
        {cartoes.map((c) => (
          <div key={c.rotulo} className="cartao">
            <p className="cartao-rotulo">{c.rotulo}</p>
            <p className="numero-grande">{c.valor}</p>
          </div>
        ))}
      </div>

      <div className="grade grade--2">
        <div className="cartao">
          <h2 className="titulo-secao">Demandas por prioridade de prazo</h2>
          <ul className="lista-limpa lista-divisoria">
            {doDia.map((d) => (
              <li key={d.id}>
                <p className="texto-medio"><strong>{d.titulo}</strong></p>
                <p className="texto-pequeno texto-suave">
                  {d.processo} · {ROTULO_SITUACAO[d.situacao]} · prazo {d.prazo}
                  {prazos.paradas.includes(d.id) && <strong className="texto--atencao"> · parada há 5+ dias</strong>}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <div className="cartao">
          <h2 className="titulo-secao">Linha do tempo de prazos</h2>
          <ol className="linha-tempo">
            {[...demandasFicticias].sort((a, b) => a.prazo.localeCompare(b.prazo)).map((d) => (
              <li key={d.id}>
                <span className="mono texto-pequeno">{d.prazo}</span> — {d.processo}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
