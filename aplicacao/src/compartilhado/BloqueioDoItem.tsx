// Bloco "Bloqueio" (demanda e ponto de operação): motivo, detalhe, marcar como travado, atualizar e destravar.
// A validação do detalhe mora em ./bloqueio.ts. Quem usa grava (armazém da demanda ou da operação) e mostra a resposta.

import { useId, useState, type ReactNode } from 'react';
import { LIMITES, MOTIVOS_BLOQUEIO, type Bloqueio, type MotivoBloqueio } from '../modulos/demandas/modelo.ts';
import { conferirDetalheBloqueio } from './bloqueio.ts';

export function BloqueioDoItem({ item, bloqueio, aoTravar, aoDestravar, aoConfirmar, ajudaExtra }: {
  item: 'demanda' | 'ponto';
  bloqueio?: Bloqueio;
  /** `detalhe` já limpo e dentro do limite. 'apagar-detalhe' mantém o motivo e limpa o detalhe. */
  aoTravar: (motivo: MotivoBloqueio, detalhe: string, acao: 'marcar' | 'apagar-detalhe') => void;
  aoDestravar: () => void;
  /** "Ainda travada": só onde existe a reavaliação (demandas). */
  aoConfirmar?: () => void;
  ajudaExtra?: ReactNode;
}) {
  const id = useId();
  const travada = item === 'demanda' ? 'travada' : 'travado';
  const [motivo, setMotivo] = useState<MotivoBloqueio>(bloqueio?.motivo ?? 'documento');
  const [detalhe, setDetalhe] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  return (
    <section className="bloco-detalhe" aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`} className="titulo-secao titulo-secao--bloco">Bloqueio</h3>
      {bloqueio && (
        <div className="acoes acoes--sem-margem">
          <button type="button" className="botao botao--primario" onClick={aoDestravar}>Destravou</button>
          {aoConfirmar && <button type="button" className="botao" onClick={aoConfirmar}>Ainda travada</button>}
        </div>
      )}
      <form className="formulario" aria-label={`Bloqueio ${item === 'demanda' ? 'da demanda' : 'do ponto'}`} onSubmit={(e) => {
        e.preventDefault();
        // Campo em branco num item já travado mantém o detalhe gravado; apagar é ação explícita.
        const r = conferirDetalheBloqueio(detalhe.trim() ? detalhe : (bloqueio?.detalhe ?? ''));
        if (!r.ok) return setErro(r.mensagem);
        setErro(null);
        aoTravar(motivo, r.detalhe, 'marcar');
        setDetalhe('');
      }}>
        <label className="campo-grupo campo-grupo--curto">
          <span>Motivo do bloqueio</span>
          <select className="campo" value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoBloqueio)}>
            {Object.entries(MOTIVOS_BLOQUEIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <div className="campo-grupo">
          <label htmlFor={`${id}-detalhe`}>Detalhe do bloqueio (opcional)</label>
          <textarea id={`${id}-detalhe`} className="campo campo--area" rows={2} maxLength={LIMITES.detalheBloqueioMax} value={detalhe}
            onChange={(e) => setDetalhe(e.target.value)} aria-describedby={`${id}-dica`} />
          <span id={`${id}-dica`} className="texto-pequeno texto-suave">
            {bloqueio?.detalhe && 'Em branco, mantém o detalhe atual. '}
            Ex.: aguardando resposta do ofício enviado ao setor de cadastro. Até {LIMITES.detalheBloqueioMax} caracteres. Não registre CPF, endereço ou nome do autuado aqui. {ajudaExtra}
          </span>
        </div>
        {erro && <p role="alert" className="erro-campo">{erro}</p>}
        <div className="acoes acoes--sem-margem">
          <button type="submit" className={bloqueio ? 'botao' : 'botao botao--primario'}>{bloqueio ? 'Atualizar bloqueio' : `Marcar como ${travada}`}</button>
          {bloqueio?.detalhe && (
            <button type="button" className="botao botao--perigo" onClick={() => aoTravar(bloqueio.motivo, '', 'apagar-detalhe')}>Apagar detalhe</button>
          )}
        </div>
      </form>
    </section>
  );
}
