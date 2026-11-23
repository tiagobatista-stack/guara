// Seção "Bloqueio" (demanda e ponto de operação): em leitura mostra o motivo, o detalhe e há quantos dias; [Travar] / [Editar bloqueio]
// abrem a caixa com motivo + detalhe e [Salvar] [Cancelar]. A validação do detalhe mora em ./bloqueio.ts.
// Quem usa grava (armazém da demanda ou da operação) e mostra a resposta.

import { useId, useState, type ReactNode } from 'react';
import { LIMITES, MOTIVOS_BLOQUEIO, type Bloqueio, type MotivoBloqueio } from '../modulos/demandas/modelo.ts';
import { usePendente } from './alteracoes-pendentes.ts';
import { conferirDetalheBloqueio } from './bloqueio.ts';
import { plural } from './plural.ts';

const MS_DIA = 86_400_000;

export function BloqueioDoItem({ item, bloqueio, aoTravar, aoDestravar, aoConfirmar, aoCancelar, abrirEditor = false, agora = () => new Date(), ajudaExtra }: {
  item: 'demanda' | 'ponto';
  bloqueio?: Bloqueio;
  /** `detalhe` já limpo e dentro do limite. 'apagar-detalhe' vale quando o detalhe foi esvaziado e o motivo não mudou. */
  aoTravar: (motivo: MotivoBloqueio, detalhe: string, acao: 'marcar' | 'apagar-detalhe') => void;
  aoDestravar: () => void;
  /** "Ainda travada": só onde existe a reavaliação (demandas). */
  aoConfirmar?: () => void;
  /** Chamado ao cancelar a caixa (o ponto fecha o próprio modo). */
  aoCancelar?: () => void;
  /** A caixa já nasce aberta (o ponto abre pelo botão Travar do cartão). */
  abrirEditor?: boolean;
  agora?: () => Date;
  ajudaExtra?: ReactNode;
}) {
  const id = useId();
  const travada = item === 'demanda' ? 'travada' : 'travado';
  const [editando, setEditando] = useState(abrirEditor);
  const [motivo, setMotivo] = useState<MotivoBloqueio>(bloqueio?.motivo ?? 'documento');
  const [detalhe, setDetalhe] = useState(bloqueio?.detalhe ?? '');
  const [erro, setErro] = useState<string | null>(null);
  usePendente(editando && (detalhe !== (bloqueio?.detalhe ?? '') || motivo !== (bloqueio?.motivo ?? 'documento')));

  const abrir = () => { setMotivo(bloqueio?.motivo ?? 'documento'); setDetalhe(bloqueio?.detalhe ?? ''); setErro(null); setEditando(true); };
  const cancelar = () => { setEditando(false); setErro(null); aoCancelar?.(); };
  const desde = bloqueio ? new Date(bloqueio.desde) : undefined;
  const dias = desde ? Math.max(0, Math.floor((agora().getTime() - desde.getTime()) / MS_DIA)) : 0;

  return (
    <section className="bloco-detalhe" aria-labelledby={`${id}-titulo`}>
      <div className="bloco-cabecalho">
        <h3 id={`${id}-titulo`} className="titulo-secao titulo-secao--bloco">Bloqueio</h3>
        {!editando && !bloqueio && <button type="button" className="botao botao--pequeno" onClick={abrir}>Travar</button>}
      </div>
      {!editando && !bloqueio && <p className="texto-pequeno texto-suave">{item === 'demanda' ? 'Não está travada.' : 'Não está travado.'}</p>}
      {!editando && bloqueio && desde && (
        <>
          <p data-testid="bloqueio-resumo">
            <strong>{MOTIVOS_BLOQUEIO[bloqueio.motivo]}</strong> · desde {desde.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}, {dias === 0 ? 'hoje' : `há ${plural(dias, 'dia', 'dias')}`}
          </p>
          {bloqueio.detalhe && <p className="texto-medio">{bloqueio.detalhe}</p>}
          <div className="acoes acoes--sem-margem">
            <button type="button" className="botao botao--primario" onClick={aoDestravar}>Destravar</button>
            {aoConfirmar && <button type="button" className="botao" onClick={aoConfirmar}>Ainda {travada}</button>}
            <button type="button" className="botao" onClick={abrir}>Editar bloqueio</button>
          </div>
        </>
      )}
      {editando && (
        <form className="formulario" aria-label={`Bloqueio ${item === 'demanda' ? 'da demanda' : 'do ponto'}`} onSubmit={(e) => {
          e.preventDefault();
          const r = conferirDetalheBloqueio(detalhe);
          if (!r.ok) return setErro(r.mensagem);
          setErro(null);
          aoTravar(motivo, r.detalhe, bloqueio?.detalhe && !r.detalhe && motivo === bloqueio.motivo ? 'apagar-detalhe' : 'marcar');
          setEditando(false);
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
              Ex.: aguardando resposta do ofício enviado ao setor de cadastro. Até {LIMITES.detalheBloqueioMax} caracteres. Não registre CPF, endereço ou nome do autuado aqui. O bloqueio não suspende o prazo. {ajudaExtra}
            </span>
          </div>
          {erro && <p role="alert" className="erro-campo">{erro}</p>}
          <div className="acoes acoes--sem-margem acoes--fim">
            <button type="button" className="botao" onClick={cancelar}>Cancelar</button>
            <button type="submit" className="botao botao--primario">Salvar</button>
          </div>
        </form>
      )}
    </section>
  );
}
