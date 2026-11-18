// Anotações em checklist da demanda e do ponto de operação (regra em ./anotacoes.ts), mesmo padrão do BloqueioDoItem:
// quem usa grava a lista nova (armazém da demanda ou da operação) e mostra a resposta.

import { useId, useState, type FormEvent } from 'react';
import { novoId } from '../modulos/atalhos/lista-local.ts';
import {
  adicionarAnotacao, alternarAnotacao, anotacoesAbertas, contarAbertas, editarAnotacao, excluirAnotacao, LIMITES_ANOTACAO, ordenarAnotacoes,
  textoAnotacoesAbertas, type Anotacao,
} from './anotacoes.ts';

/** Selo "N anotação(ões) aberta(s)"; nada quando não há aberta. */
export function SeloAnotacoes({ anotacoes, testid }: { anotacoes?: readonly Anotacao[]; testid?: string }) {
  const n = contarAbertas(anotacoes);
  return n > 0 ? <span className="selo-situacao selo-situacao--atencao" data-testid={testid}>{textoAnotacoesAbertas(n)}</span> : null;
}

/** Aviso ao concluir com anotações abertas: não bloqueia, só pergunta. */
export function ConfirmaConclusao({ anotacoes, aoConcluir, aoVoltar }: { anotacoes?: readonly Anotacao[]; aoConcluir: () => void; aoVoltar: () => void }) {
  return (
    <div role="alert" className="aviso" data-testid="confirma-conclusao">
      <p>Há {textoAnotacoesAbertas(contarAbertas(anotacoes))}. Concluir mesmo assim?</p>
      <div className="acoes">
        <button type="button" className="botao botao--primario" onClick={aoConcluir}>Concluir</button>
        <button type="button" className="botao" onClick={aoVoltar}>Voltar</button>
      </div>
    </div>
  );
}

export function AnotacoesDoItem({ item, anotacoes, aoMudar, agora = () => new Date() }: {
  item: 'demanda' | 'ponto';
  anotacoes?: readonly Anotacao[];
  /** Recebe a lista inteira já conferida. */
  aoMudar: (lista: Anotacao[]) => void;
  agora?: () => Date;
}) {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const [ocultarFeitas, setOcultarFeitas] = useState(false);
  const lista = ordenarAnotacoes(anotacoes);
  const feitas = lista.length - anotacoesAbertas(lista).length;
  const visiveis = ocultarFeitas ? lista.filter((a) => !a.feita) : lista;

  const anotar = (e: FormEvent) => {
    e.preventDefault();
    const r = adicionarAnotacao(anotacoes, texto, agora().toISOString(), novoId('an', lista));
    if (!r.ok) return setErro(r.mensagem);
    setErro(null);
    setTexto('');
    aoMudar(r.lista);
  };
  const salvarEdicao = (e: FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    const r = editarAnotacao(anotacoes, editando.id, editando.texto);
    if (!r.ok) return setErro(r.mensagem);
    setErro(null);
    setEditando(null);
    aoMudar(r.lista);
  };
  const excluir = (a: Anotacao) => {
    // Feita pode sair sem perguntar; aberta ainda era algo a resolver.
    if (!a.feita && !window.confirm(`Excluir a anotação "${a.texto}"? Ela ainda não foi feita.`)) return;
    aoMudar(excluirAnotacao(anotacoes, a.id));
  };

  return (
    <section className="bloco-detalhe" aria-labelledby={`${id}-titulo`}>
      <h3 id={`${id}-titulo`} className="titulo-secao titulo-secao--bloco">Anotações <SeloAnotacoes anotacoes={anotacoes} /></h3>
      <form className="formulario" aria-label={`Nova anotação ${item === 'demanda' ? 'da demanda' : 'do ponto'}`} onSubmit={anotar}>
        <div className="campo-grupo">
          <label htmlFor={`${id}-nova`}>Nova anotação</label>
          <div className="acoes acoes--sem-margem">
            <input id={`${id}-nova`} className="campo" value={texto} maxLength={LIMITES_ANOTACAO.texto} autoComplete="off" aria-describedby={`${id}-dica`} onChange={(e) => setTexto(e.target.value)} />
            <button type="submit" className="botao botao--primario">Anotar</button>
          </div>
          <span id={`${id}-dica`} className="texto-pequeno texto-suave">
            Para lembrar e resolver ao longo da análise. Até {LIMITES_ANOTACAO.texto} caracteres. Não registre CPF, endereço ou nome do autuado aqui.
          </span>
        </div>
      </form>
      {erro && <p role="alert" className="erro-campo">{erro}</p>}
      {feitas > 0 && (
        <button type="button" className="botao botao--pequeno" aria-pressed={ocultarFeitas} onClick={() => setOcultarFeitas(!ocultarFeitas)}>
          {ocultarFeitas ? `Mostrar feitas (${feitas})` : `Ocultar feitas (${feitas})`}
        </button>
      )}
      {visiveis.length > 0 && (
        <ul className="lista-limpa" aria-label="Anotações">
          {visiveis.map((a) => (
            <li key={a.id} className="linha-entre" data-testid={`anotacao-${a.id}`}>
              {editando?.id === a.id ? (
                <form className="acoes acoes--sem-margem" onSubmit={salvarEdicao} aria-label="Editar anotação">
                  <input className="campo" aria-label="Texto da anotação" value={editando.texto} maxLength={LIMITES_ANOTACAO.texto} autoComplete="off" onChange={(e) => setEditando({ id: a.id, texto: e.target.value })} />
                  <button type="submit" className="botao botao--pequeno botao--primario">Salvar</button>
                  <button type="button" className="botao botao--pequeno" onClick={() => { setEditando(null); setErro(null); }}>Cancelar</button>
                </form>
              ) : (
                <>
                  <label className={a.feita ? 'anotacao--feita' : ''}>
                    <input type="checkbox" checked={a.feita} onChange={() => aoMudar(alternarAnotacao(anotacoes, a.id, agora().toISOString()))} /> <span>{a.texto}</span>
                  </label>
                  <span className="acoes acoes--sem-margem">
                    <button type="button" className="botao botao--pequeno" aria-label={`Editar anotação: ${a.texto}`} onClick={() => { setErro(null); setEditando({ id: a.id, texto: a.texto }); }}>Editar</button>
                    <button type="button" className="botao botao--pequeno botao--perigo" aria-label={`Excluir anotação: ${a.texto}`} onClick={() => excluir(a)}>Excluir</button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
