// Contatos de trabalho, na mesma página dos atalhos. Dados pessoais: ficam só neste navegador.

import { useState, type FormEvent } from 'react';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import {
  CONTATO_VAZIO,
  editarContato,
  excluirContato,
  filtrarContatos,
  formatarCelular,
  incluirContato,
  LIMITES_CONTATO,
  MAXIMO_CONTATOS,
  ordenarContatos,
  useContatos,
  useContatosSoNaMemoria,
  type Contato,
  type DadosContato,
} from './contatos.ts';

function FormularioContato({
  inicial,
  rotuloEnviar,
  aoEnviar,
  aoCancelar,
}: {
  inicial: DadosContato;
  rotuloEnviar: string;
  /** Devolve a mensagem do problema, ou null quando deu certo. */
  aoEnviar: (d: DadosContato) => string | null;
  aoCancelar?: () => void;
}) {
  const [dados, setDados] = useState<DadosContato>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const mudar = (campo: keyof DadosContato) => (e: { target: { value: string } }) => setDados((d) => ({ ...d, [campo]: e.target.value }));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const problema = aoEnviar(dados);
    setErro(problema);
    if (!problema && !aoCancelar) setDados(CONTATO_VAZIO);
  };

  return (
    <form onSubmit={enviar} className="formulario-contato" noValidate>
      <label className="campo-grupo">
        <span>Nome</span>
        <input className="campo" value={dados.nome} onChange={mudar('nome')} maxLength={LIMITES_CONTATO.nome} autoComplete="off" />
      </label>
      <label className="campo-grupo">
        <span>Instituição/empresa</span>
        <input className="campo" value={dados.instituicao} onChange={mudar('instituicao')} maxLength={LIMITES_CONTATO.instituicao} autoComplete="off" />
      </label>
      <label className="campo-grupo">
        <span>Setor/função</span>
        <input className="campo" value={dados.setor} onChange={mudar('setor')} maxLength={LIMITES_CONTATO.setor} autoComplete="off" />
      </label>
      <label className="campo-grupo">
        <span>E-mail</span>
        <input className="campo" type="email" inputMode="email" value={dados.email} onChange={mudar('email')} maxLength={LIMITES_CONTATO.email} autoComplete="off" />
      </label>
      <label className="campo-grupo">
        <span>Celular</span>
        <input className="campo" type="tel" inputMode="tel" value={dados.celular} onChange={mudar('celular')} maxLength={LIMITES_CONTATO.celular}
          placeholder="(65) 99999-1234" autoComplete="off" />
      </label>
      <label className="campo-grupo campo-grupo--largo">
        <span>Observações</span>
        <textarea className="campo campo--texto" value={dados.observacoes} onChange={mudar('observacoes')} maxLength={LIMITES_CONTATO.observacoes} rows={3} />
      </label>
      {erro && <p role="alert" className="erro-campo campo-grupo--largo">{erro}</p>}
      <div className="acoes campo-grupo--largo">
        <button type="submit" className="botao botao--primario">{rotuloEnviar}</button>
        {aoCancelar && <button type="button" className="botao" onClick={aoCancelar}>Cancelar</button>}
      </div>
    </form>
  );
}

function ItemContato({ contato }: { contato: Contato }) {
  const [editando, setEditando] = useState(false);
  const { id, nome, instituicao, setor, email, celular, observacoes } = contato;

  if (editando) {
    return (
      <li className="cartao" data-testid={`contato-${id}`}>
        <FormularioContato
          inicial={{ nome, instituicao, setor, email, celular: celular ? formatarCelular(celular) : '', observacoes }}
          rotuloEnviar="Salvar"
          aoEnviar={(d) => {
            const problema = editarContato(id, d);
            if (!problema) setEditando(false);
            return problema;
          }}
          aoCancelar={() => setEditando(false)}
        />
      </li>
    );
  }

  const vinculo = [instituicao, setor].filter(Boolean).join(' · ');
  return (
    <li className="cartao item-contato" data-testid={`contato-${id}`}>
      <div className="item-contato-dados">
        <p><strong>{nome}</strong></p>
        {vinculo && <p className="texto-pequeno texto-suave">{vinculo}</p>}
        {email && <p className="texto-pequeno"><a href={`mailto:${email}`} aria-label={`Enviar e-mail para ${nome}: ${email}`}>{email}</a></p>}
        {celular && <p className="texto-pequeno"><a href={`tel:+55${celular}`} aria-label={`Ligar para ${nome}: ${formatarCelular(celular)}`}>{formatarCelular(celular)}</a></p>}
        {observacoes && <p className="texto-pequeno texto-suave observacoes-contato">{observacoes}</p>}
      </div>
      <div className="acoes acoes--sem-margem">
        <button type="button" className="botao botao--pequeno" onClick={() => setEditando(true)} aria-label={`Editar o contato ${nome}`}>
          Editar
        </button>
        <button
          type="button"
          className="botao botao--pequeno"
          onClick={() => {
            if (window.confirm(`Excluir o contato ${nome}?`)) excluirContato(id);
          }}
          aria-label={`Excluir o contato ${nome}`}
        >
          Excluir
        </button>
      </div>
    </li>
  );
}

export function Contatos() {
  const contatos = useContatos();
  const soNaMemoria = useContatosSoNaMemoria();
  const [busca, setBusca] = useState('');
  const visiveis = ordenarContatos(filtrarContatos(contatos, busca));
  const cheio = contatos.length >= MAXIMO_CONTATOS;

  return (
    <section aria-labelledby="titulo-contatos" className="secao-contatos">
      <h2 id="titulo-contatos" className="titulo-secao">Contatos</h2>
      <p className="texto-suave texto-medio">
        Pessoas com quem você trata das demandas. São dados pessoais: ficam só neste navegador e não entram no backup.
        Guarde apenas o necessário para o trabalho.
      </p>

      {soNaMemoria && (
        <p role="alert" className="aviso" data-testid="aviso-contatos-sem-gravacao">
          Este navegador não deixou gravar os contatos (armazenamento bloqueado, cheio ou em modo privado). As mudanças
          valem só até fechar ou recarregar a página.
        </p>
      )}

      {contatos.length === 0 ? (
        <div className="cartao">
          <EstadoVazio texto="Nenhum contato por aqui." dica="Inclua o primeiro no formulário abaixo." />
        </div>
      ) : (
        <>
          <label className="campo-grupo campo-grupo--curto">
            <span>Buscar contato</span>
            <input className="campo" type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome, instituição, setor, e-mail ou celular" autoComplete="off" />
          </label>
          {visiveis.length === 0 ? (
            <p className="texto-suave" role="status">Nenhum contato encontrado para "{busca}".</p>
          ) : (
            <ul className="lista-limpa lista-atalhos" aria-label="Contatos">
              {visiveis.map((c) => <ItemContato key={c.id} contato={c} />)}
            </ul>
          )}
        </>
      )}

      <section aria-labelledby="titulo-incluir-contato" className="cartao">
        <h3 id="titulo-incluir-contato"><strong>Incluir contato</strong></h3>
        {cheio ? (
          <p className="texto-suave">O limite é de {MAXIMO_CONTATOS} contatos. Exclua um antes de incluir outro.</p>
        ) : (
          <FormularioContato inicial={CONTATO_VAZIO} rotuloEnviar="Incluir contato" aoEnviar={incluirContato} />
        )}
      </section>
    </section>
  );
}
