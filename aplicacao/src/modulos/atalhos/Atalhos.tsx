// Atalhos: links para os sistemas externos do dia a dia, que o analista inclui, edita e exclui.
// O GUARÁ só abre o sistema numa aba nova; o login e o trabalho acontecem lá (princípio 1).

import { useState, type FormEvent } from 'react';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import {
  editarAtalho,
  excluirAtalho,
  incluirAtalho,
  MAXIMO_ATALHOS,
  restaurarAtalhosIniciais,
  TAMANHO_MAXIMO_NOME_ATALHO,
  TAMANHO_MAXIMO_URL,
  useAtalhos,
  useAtalhosSoNaMemoria,
  type Atalho,
} from './atalhos.ts';

/** Formulário de nome e endereço, usado para incluir e para editar. */
function FormularioAtalho({
  inicial,
  rotuloEnviar,
  aoEnviar,
  aoCancelar,
  prefixo,
}: {
  inicial: { nome: string; url: string };
  rotuloEnviar: string;
  /** Devolve a mensagem do problema, ou null quando deu certo. */
  aoEnviar: (nome: string, url: string) => string | null;
  aoCancelar?: () => void;
  prefixo: string;
}) {
  const [nome, setNome] = useState(inicial.nome);
  const [url, setUrl] = useState(inicial.url);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const problema = aoEnviar(nome, url);
    setErro(problema);
    if (!problema && !aoCancelar) {
      setNome('');
      setUrl('');
    }
  };

  return (
    <form onSubmit={enviar} className="formulario-atalho" noValidate>
      <label className="campo-grupo">
        <span>Nome</span>
        <input id={`${prefixo}-nome`} className="campo" value={nome} onChange={(e) => setNome(e.target.value)}
          maxLength={TAMANHO_MAXIMO_NOME_ATALHO} placeholder="Ex.: SIGADOC" autoComplete="off" />
      </label>
      <label className="campo-grupo">
        <span>Endereço</span>
        <input id={`${prefixo}-url`} className="campo" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)}
          maxLength={TAMANHO_MAXIMO_URL} placeholder="https://" autoComplete="off" />
      </label>
      {erro && <p role="alert" className="erro-campo">{erro}</p>}
      <div className="acoes">
        <button type="submit" className="botao botao--primario">{rotuloEnviar}</button>
        {aoCancelar && <button type="button" className="botao" onClick={aoCancelar}>Cancelar</button>}
      </div>
    </form>
  );
}

function ItemAtalho({ atalho }: { atalho: Atalho }) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <li className="cartao item-atalho" data-testid={`atalho-${atalho.id}`}>
        <FormularioAtalho
          prefixo={`editar-${atalho.id}`}
          inicial={atalho}
          rotuloEnviar="Salvar"
          aoEnviar={(nome, url) => {
            const problema = editarAtalho(atalho.id, nome, url);
            if (!problema) setEditando(false);
            return problema;
          }}
          aoCancelar={() => setEditando(false)}
        />
      </li>
    );
  }

  return (
    <li className="cartao item-atalho" data-testid={`atalho-${atalho.id}`}>
      <a href={atalho.url} target="_blank" rel="noopener noreferrer" className="link-atalho" aria-label={`${atalho.nome} (abre em nova aba)`}>
        <strong>{atalho.nome}</strong>
        <span className="texto-pequeno texto-suave endereco-atalho" aria-hidden="true">{atalho.url}</span>
      </a>
      <div className="acoes acoes--sem-margem">
        <button type="button" className="botao botao--pequeno" onClick={() => setEditando(true)} aria-label={`Editar o atalho ${atalho.nome}`}>
          Editar
        </button>
        <button
          type="button"
          className="botao botao--pequeno"
          onClick={() => {
            if (window.confirm(`Excluir o atalho ${atalho.nome}?`)) excluirAtalho(atalho.id);
          }}
          aria-label={`Excluir o atalho ${atalho.nome}`}
        >
          Excluir
        </button>
      </div>
    </li>
  );
}

export function Atalhos() {
  const atalhos = useAtalhos();
  const soNaMemoria = useAtalhosSoNaMemoria();
  const cheio = atalhos.length >= MAXIMO_ATALHOS;

  return (
    <section aria-labelledby="titulo-atalhos" className="pagina pagina--media">
      <h1 id="titulo-atalhos" className="titulo-pagina">Atalhos</h1>
      <p className="texto-suave texto-medio">
        Sistemas externos que você usa no dia a dia. O GUARÁ só abre o sistema numa aba nova: o login e o trabalho
        acontecem lá. Não salve senhas aqui.
      </p>

      {soNaMemoria && (
        <p role="alert" className="aviso" data-testid="aviso-atalhos-sem-gravacao">
          Este navegador não deixou gravar os atalhos (armazenamento bloqueado, cheio ou em modo privado). As mudanças
          valem só até fechar ou recarregar a página.
        </p>
      )}

      {atalhos.length === 0 ? (
        <div className="cartao">
          <EstadoVazio texto="Nenhum atalho por aqui." dica="Inclua um abaixo ou volte aos atalhos iniciais." />
          <div className="acoes">
            <button type="button" className="botao" onClick={restaurarAtalhosIniciais}>Restaurar os atalhos iniciais</button>
          </div>
        </div>
      ) : (
        <ul className="lista-limpa lista-atalhos" aria-label="Atalhos para sistemas externos">
          {atalhos.map((a) => <ItemAtalho key={a.id} atalho={a} />)}
        </ul>
      )}

      <section aria-labelledby="titulo-incluir-atalho" className="cartao">
        <h2 id="titulo-incluir-atalho"><strong>Incluir atalho</strong></h2>
        {cheio ? (
          <p className="texto-suave">O limite é de {MAXIMO_ATALHOS} atalhos. Exclua um antes de incluir outro.</p>
        ) : (
          <FormularioAtalho prefixo="incluir" inicial={{ nome: '', url: '' }} rotuloEnviar="Incluir atalho" aoEnviar={incluirAtalho} />
        )}
      </section>
    </section>
  );
}
