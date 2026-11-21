// Fila do dia (etapa 3 da lógica de apoio, 21/11/2026): as primeiras demandas de `priorizar.ts`,
// cada uma com "por que está aqui" (os motivos, com a marca fato ou inferência) e a próxima ação
// sugerida. Só mostra; não altera demanda. A decisão continua sendo do analista.

import { rotaParaAbrirDemanda } from '../../nucleo/registro-modulos.ts';
import { encurtarTitulo, type ItemDePrioridade } from './priorizar.ts';
import { codigoLegivel } from './rotuloDaDemanda.ts';

const NOTA_DO_METODO = 'Ordem por pesos fixos (inferência, método determinístico); confira antes de agir';

/** Itens mostrados de uma vez; o restante fica no comando "prioridades". */
export const MAXIMO_NA_FILA_DO_DIA = 3;

export function FilaDoDia({ itens, origem, aoVerLista }: { itens: readonly ItemDePrioridade[]; origem: string; aoVerLista?: () => void }) {
  if (itens.length === 0) return <p className="texto-suave" data-testid="fila-vazia">Nenhuma demanda na fila. Tudo em dia.</p>;
  const mostrados = itens.slice(0, MAXIMO_NA_FILA_DO_DIA);
  const resto = itens.length - mostrados.length;
  return (
    <>
      <ol className="lista-limpa fila-do-dia" data-testid="fila-do-dia">
        {mostrados.map((item, i) => (
          <li key={item.id} className="fila-item" data-testid={`fila-${item.id}`}>
            <details open={i === 0}>
              <summary>
                {codigoLegivel(item.id) && <><strong>{item.id}</strong> — </>}{encurtarTitulo(item.titulo)}
                <span className="fila-pontos"> · {item.pontos} pontos</span>
              </summary>
              <p className="texto-pequeno fila-subtitulo">Por que está aqui</p>
              <ul className="fila-motivos">
                {item.motivos.map((m) => (
                  <li key={m.sinal}>
                    {m.texto} <span className="texto-suave">({m.natureza}, {m.pontos} pontos)</span>
                  </li>
                ))}
              </ul>
              <p className="texto-pequeno fila-subtitulo">Sugestão (decisão sua)</p>
              <p>{item.proximaAcao.texto}</p>
              {item.proximaAcao.tipo === 'decidir' && (
                <a className="botao botao--pequeno" href={rotaParaAbrirDemanda(item.id)} aria-label={`Abrir a demanda ${encurtarTitulo(item.titulo)}, no campo Prazo`}>Abrir demanda</a>
              )}
              {item.proximaAcao.tipo === 'ver-bloqueio' && (
                <a className="botao botao--pequeno" href={rotaParaAbrirDemanda(item.id, 'bloqueio')} aria-label={`Ver o motivo do bloqueio da demanda ${encurtarTitulo(item.titulo)}`}>Ver o motivo do bloqueio</a>
              )}
            </details>
          </li>
        ))}
      </ol>
      {resto > 0 && (
        <p className="texto-pequeno texto-suave">
          E mais {resto}.{' '}
          {aoVerLista
            ? <button type="button" className="botao botao--pequeno" onClick={aoVerLista}>Ver a lista na conversa</button>
            : 'Digite "prioridades" para ver a lista.'}
        </p>
      )}
      <p className="texto-pequeno texto-suave">
        {NOTA_DO_METODO} · {origem}. <a href="#/demandas">Abrir Demandas</a>
      </p>
    </>
  );
}
