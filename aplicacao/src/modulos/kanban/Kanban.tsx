// Kanban (P05): quatro colunas ligadas ao MESMO armazém da lista e do dashboard.
// Movimentação pelo menu acessível "Mover para"; arrastar e soltar é opcional e
// não foi implementado para não comprometer a entrega.

import { useState } from 'react';
import { STATUS, type Demanda, type Status } from '../demandas/modelo.ts';
import { useAjusteFeriados, useArmazem, useEstadoDemandas } from '../demandas/armazem.ts';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { situacaoDaDemanda } from '../alertas/dias-uteis.ts';
import { textoEmAndamento } from '../alertas/inatividade.ts';
import { textoBloqueio } from '../alertas/bloqueio.ts';
import { ROTULOS_TIPO } from '../demandas/classificacao.ts';
import { comemorarMascotes } from '../../compartilhado/Mascote.tsx';
import { ConfirmaConclusao, SeloAnotacoes } from '../../compartilhado/AnotacoesDoItem.tsx';
import { contarAbertas } from '../../compartilhado/anotacoes.ts';
import { plural } from '../../compartilhado/plural.ts';

const data = (aaaammdd?: string) => (aaaammdd ? new Date(`${aaaammdd}T00:00:00`).toLocaleDateString('pt-BR') : 'sem prazo');

export function Kanban({ agora = () => new Date() }: { agora?: () => Date }) {
  const instante = agora();
  const armazem = useArmazem();
  const { demandas, erroArmazenamento } = useEstadoDemandas();
  const ajuste = useAjusteFeriados(instante);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [confirma, setConfirma] = useState<{ d: Demanda; destino: Status } | null>(null);

  const mover = (d: Demanda, destino: Status, confirmado = false) => {
    if (destino === d.status) return;
    // Concluir com anotações abertas pergunta antes (não bloqueia).
    if (destino === 'Concluída' && !confirmado && contarAbertas(d.anotacoes) > 0) return setConfirma({ d, destino });
    setConfirma(null);
    const r = armazem.mudarStatus(d.id, destino);
    // Concluir uma demanda faz os mascotes comemorarem; se era a última em aberto, a festa é maior.
    if (r.ok && destino === 'Concluída') {
      const restam = demandas.filter((outra) => outra.id !== d.id && outra.status !== 'Concluída').length;
      comemorarMascotes(restam === 0 ? 'grande' : 'pequena');
    }
    setAviso(r.ok ? { tipo: 'sucesso', texto: `"${d.titulo}" movida para ${destino}.` } : { tipo: 'erro', texto: r.mensagem });
  };

  return (
    <section aria-labelledby="titulo-kanban" className="pagina pagina--larga">
      <div>
        <h1 id="titulo-kanban" className="titulo-pagina">Kanban</h1>
        <p className="texto-suave texto-medio">Use “Mover para” em cada cartão. A mudança é gravada no localStorage antes de aparecer.</p>
      </div>

      {confirma && (
        <div data-testid="confirma-conclusao-kanban">
          <p className="texto-pequeno"><strong>{confirma.d.titulo}</strong></p>
          <ConfirmaConclusao anotacoes={confirma.d.anotacoes} aoConcluir={() => mover(confirma.d, confirma.destino, true)} aoVoltar={() => setConfirma(null)} />
        </div>
      )}
      {aviso && <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`feedback feedback--${aviso.tipo}`}>{aviso.texto}</p>}
      {erroArmazenamento && <p role="alert" className="aviso">Armazenamento corrompido: resolva na tela Demandas.</p>}

      <div className="kanban">
        {STATUS.map((status) => {
          const cartoes = demandas.filter((d) => d.status === status);
          return (
            <section key={status} className="kanban-coluna" aria-labelledby={`coluna-${status}`} data-testid={`coluna-${status}`}>
              <h2 id={`coluna-${status}`} className="kanban-titulo">
                {status} <span className="kanban-contagem" aria-label={plural(cartoes.length, 'demanda', 'demandas')}>{cartoes.length}</span>
              </h2>
              {cartoes.length === 0 ? (
                <EstadoVazio compacto texto="Nenhuma demanda." />
              ) : (
                <ul className="lista-limpa kanban-lista">
                  {cartoes.map((d) => {
                    const prazo = situacaoDaDemanda(d, instante, ajuste);
                    const andamento = textoEmAndamento(d, instante);
                    const bloqueio = textoBloqueio(d, instante, ajuste);
                    return (
                      <li key={d.id} className="cartao kanban-cartao">
                        <p className="texto-medio"><strong>{d.titulo}</strong> <SeloAnotacoes anotacoes={d.anotacoes} testid={`anotacoes-${d.id}`} /></p>
                        <p className="texto-pequeno texto-suave">{d.prioridade} · {d.responsavel || 'sem responsável'} · {data(d.prazo)}{d.tipo && ` · ${ROTULOS_TIPO[d.tipo]}`}{d.natureza === 'comum' && ' · tarefa comum'}</p>
                        {prazo && <p className={`texto-pequeno ${prazo.vencido ? 'texto--falha' : 'texto-suave'}`} data-testid={`prazo-${d.id}`}>{prazo.texto}</p>}
                        {bloqueio && <p className="texto-pequeno texto--atencao" data-testid={`bloqueio-${d.id}`}>{bloqueio}</p>}
                        {andamento && <p className="texto-pequeno texto-suave" data-testid={`andamento-${d.id}`}>{andamento}</p>}
                        <label className="campo-grupo texto-pequeno">
                          <span>Mover para</span>
                          <select
                            className="campo"
                            value={d.status}
                            aria-label={`Mover "${d.titulo}" para`}
                            disabled={!!erroArmazenamento}
                            onChange={(e) => mover(d, e.target.value as Status)}
                          >
                            {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
