// Dashboard (P05): métricas reais sobre o mesmo armazém da lista e do Kanban.

import { STATUS } from '../demandas/modelo.ts';
import { useEstadoDemandas } from '../demandas/armazem.ts';
import { DIAS_INATIVIDADE_PADRAO, diasParado } from '../alertas/inatividade.ts';
import { calcularMetricas } from './metricas.ts';

const data = (aaaammdd?: string) => (aaaammdd ? new Date(`${aaaammdd}T00:00:00`).toLocaleDateString('pt-BR') : '—');

export function Painel({ agora = () => new Date(), limiarDias = DIAS_INATIVIDADE_PADRAO }: { agora?: () => Date; limiarDias?: number }) {
  const { demandas } = useEstadoDemandas();
  const instante = agora();
  const m = calcularMetricas(demandas, instante, limiarDias);
  const comPrazo = demandas.filter((d) => d.prazo && d.status !== 'Concluída').sort((a, b) => a.prazo!.localeCompare(b.prazo!));

  return (
    <section aria-labelledby="titulo-painel" className="pagina">
      <div>
        <h1 id="titulo-painel" className="titulo-pagina">Dashboard</h1>
        <p className="texto-suave texto-medio">
          Calculado agora ({instante.toLocaleString('pt-BR')}) sobre os dados deste navegador. Inatividade: mais de {limiarDias} dia(s) sem ação relevante.
        </p>
      </div>

      <div className="grade grade--4" data-testid="indicadores">
        <div className="cartao"><p className="cartao-rotulo">Total</p><p className="numero-grande" data-testid="metrica-total">{m.total}</p></div>
        <div className="cartao"><p className="cartao-rotulo">Vencidas</p><p className="numero-grande" data-testid="metrica-vencidas">{m.vencidas.length}</p></div>
        <div className="cartao"><p className="cartao-rotulo">Inativas</p><p className="numero-grande" data-testid="metrica-inativas">{m.inativas.length}</p></div>
        <div className="cartao"><p className="cartao-rotulo">Concluídas</p><p className="numero-grande">{m.porStatus['Concluída']}</p></div>
      </div>

      <div className="cartao">
        <h2 className="titulo-secao">Por status</h2>
        <ul className="lista-limpa grade grade--4">
          {STATUS.map((s) => (
            <li key={s} data-testid={`metrica-status-${s}`}>
              <span className="texto-suave texto-medio">{s}</span> <strong>{m.porStatus[s]}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className="grade grade--2">
        <div className="cartao">
          <h2 className="titulo-secao">Vencidas e inativas</h2>
          {m.vencidas.length + m.inativas.length === 0 ? (
            <p className="texto-suave texto-medio">Nenhuma demanda vencida ou inativa.</p>
          ) : (
            <ul className="lista-limpa lista-divisoria texto-medio">
              {m.vencidas.map((d) => <li key={`v-${d.id}`}><strong>{d.titulo}</strong> <span className="texto-pequeno texto--falha">· vencida em {data(d.prazo)}</span></li>)}
              {m.inativas.map((d) => <li key={`i-${d.id}`}><strong>{d.titulo}</strong> <span className="texto-pequeno texto--atencao">· parada há {diasParado(d, instante)} dia(s)</span></li>)}
            </ul>
          )}
        </div>
        <div className="cartao">
          <h2 className="titulo-secao">Linha do tempo de prazos</h2>
          {comPrazo.length === 0 ? (
            <p className="texto-suave texto-medio">Nenhum prazo em aberto.</p>
          ) : (
            <ol className="linha-tempo">
              {comPrazo.map((d) => <li key={d.id}><span className="mono texto-pequeno">{data(d.prazo)}</span> — {d.titulo}</li>)}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
