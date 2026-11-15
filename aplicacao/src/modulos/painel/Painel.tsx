// Dashboard (P05): métricas reais sobre o mesmo armazém da lista e do Kanban.

import { STATUS } from '../demandas/modelo.ts';
import { useAjusteFeriados, useEstadoDemandas } from '../demandas/armazem.ts';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { DIAS_INATIVIDADE_PADRAO, diasParado } from '../alertas/inatividade.ts';
import { situacaoDaDemanda } from '../alertas/dias-uteis.ts';
import { calcularMetricas } from './metricas.ts';
import { listarSemPrazo } from '../alertas/triagem.ts';
import { useOperacoes } from '../operacoes/armazem.ts';
import { contarPontosPendentes, dataLocal, demandasEncaixadas, pendenciasDeCampo } from '../operacoes/regras.ts';
import { listarSemVistoria } from '../demandas/vistoria.ts';

const data = (aaaammdd?: string) => (aaaammdd ? new Date(`${aaaammdd}T00:00:00`).toLocaleDateString('pt-BR') : '—');

export function Painel({ agora = () => new Date(), limiarDias: limiarFixo }: { agora?: () => Date; limiarDias?: number }) {
  const { demandas, diasInatividade } = useEstadoDemandas();
  const limiarDias = limiarFixo ?? diasInatividade ?? DIAS_INATIVIDADE_PADRAO;
  const instante = agora();
  const ajuste = useAjusteFeriados(instante);
  const m = calcularMetricas(demandas, instante, limiarDias);
  const semPrazo = listarSemPrazo(demandas).length;
  const operacoes = useOperacoes();
  const pontosPendentes = contarPontosPendentes(operacoes);
  const campo = pendenciasDeCampo(operacoes, dataLocal(instante));
  const semVistoria = listarSemVistoria(demandas, demandasEncaixadas(operacoes)).length;
  const comPrazo =demandas.filter((d) => d.prazo && d.status !== 'Concluída').sort((a, b) => a.prazo!.localeCompare(b.prazo!));

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
            <EstadoVazio texto="Nenhuma demanda vencida ou inativa." />
          ) : (
            <ul className="lista-limpa lista-divisoria texto-medio">
              {m.vencidas.map((d) => <li key={`v-${d.id}`}><strong>{d.titulo}</strong> <span className="texto-pequeno texto--falha">· vencida em {data(d.prazo)} ({situacaoDaDemanda(d, instante, ajuste)?.texto})</span></li>)}
              {m.inativas.map((d) => <li key={`i-${d.id}`}><strong>{d.titulo}</strong> <span className="texto-pequeno texto--atencao">· parada há {diasParado(d, instante)} dia(s)</span></li>)}
            </ul>
          )}
        </div>
        <div className="cartao">
          <h2 className="titulo-secao">Linha do tempo de prazos</h2>
          {semPrazo > 0 && (
            <p className="texto-pequeno texto--atencao" data-testid="sem-prazo">
              {semPrazo === 1 ? '1 demanda em aberto está' : `${semPrazo} demandas em aberto estão`} sem prazo. Faça a triagem na tela Alertas.
            </p>
          )}
          {semVistoria > 0 && (
            <p className="texto-pequeno texto--atencao" data-testid="sem-vistoria">
              {semVistoria === 1 ? '1 demanda de campo ainda não foi encaixada' : `${semVistoria} demandas de campo ainda não foram encaixadas`} em uma vistoria.
            </p>
          )}
          {pontosPendentes > 0 && (
            <p className="texto-pequeno texto--atencao" data-testid="pontos-pendentes">
              {pontosPendentes === 1 ? '1 ponto de operação está' : `${pontosPendentes} pontos de operação estão`} sem viagem ou com viagem sem data de saída. Veja em Operações.
            </p>
          )}
          {campo.semResultado.length > 0 && (
            <p className="texto-pequeno texto--atencao" data-testid="pontos-sem-resultado">
              {campo.semResultado.length === 1 ? '1 ponto de operação está' : `${campo.semResultado.length} pontos de operação estão`} sem resultado depois do retorno da viagem.
            </p>
          )}
          {campo.aReprogramar.length > 0 && (
            <p className="texto-pequeno texto--atencao" data-testid="pontos-a-reprogramar">
              {campo.aReprogramar.length === 1 ? '1 ponto não fiscalizado precisa ser reprogramado' : `${campo.aReprogramar.length} pontos não fiscalizados precisam ser reprogramados`} em outra operação.
            </p>
          )}
          {comPrazo.length === 0 ? (
            <EstadoVazio texto="Nenhum prazo em aberto." />
          ) : (
            <ol className="linha-tempo">
              {comPrazo.map((d) => {
                const s = situacaoDaDemanda(d, instante, ajuste);
                return (
                  <li key={d.id} data-testid={`prazo-${d.id}`}>
                    <span className="mono texto-pequeno">{data(d.prazo)}</span> — {d.titulo}
                    {s && <span className={`texto-pequeno ${s.vencido ? 'texto--falha' : 'texto-suave'}`}> · {s.texto}</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}
