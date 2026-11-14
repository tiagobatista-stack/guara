import { useState, type FormEvent } from 'react';
import { LIMITES, PRIORIDADES, STATUS, type EntradaDemanda } from './modelo.ts';
import { validarEntrada, type ErrosValidacao } from './regras.ts';
import { textoMotivo, type Parecida } from './parecida.ts';

export const ENTRADA_VAZIA: EntradaDemanda = {
  titulo: '',
  descricao: '',
  responsavel: '',
  prioridade: 'Média',
  status: 'A Fazer',
  prazo: '',
};

interface Props {
  titulo: string;
  inicial: EntradaDemanda;
  /** Devolve os erros de validação ou null quando gravou com sucesso. */
  aoSalvar: (entrada: EntradaDemanda) => ErrosValidacao | null;
  aoCancelar: () => void;
  /** Só no cadastro: procura demanda em aberto parecida antes de gravar. */
  verificarParecida?: (entrada: EntradaDemanda) => Parecida | null;
  /** Abre a demanda parecida (descarta o cadastro em andamento). */
  aoVerExistente?: (id: string) => void;
}

export function FormularioDemanda({ titulo, inicial, aoSalvar, aoCancelar, verificarParecida, aoVerExistente }: Props) {
  const [entrada, setEntrada] = useState<EntradaDemanda>(inicial);
  const [erros, setErros] = useState<ErrosValidacao>({});
  const [parecida, setParecida] = useState<Parecida | null>(null);

  // Mexer em qualquer campo retira o aviso: a próxima tentativa compara de novo.
  const campo = <K extends keyof EntradaDemanda>(k: K, v: EntradaDemanda[K]) => {
    setParecida(null);
    setEntrada((e) => ({ ...e, [k]: v }));
  };

  const salvar = () => {
    setParecida(null);
    const r = aoSalvar(entrada);
    setErros(r ?? {});
  };

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    // Entrada inválida mostra os erros primeiro; o aviso só vale para o que poderia ser gravado.
    if (verificarParecida && Object.keys(validarEntrada(entrada)).length === 0) {
      const p = verificarParecida(entrada);
      if (p) {
        setErros({});
        setParecida(p);
        return;
      }
    }
    salvar();
  };

  const ajuda = (k: keyof EntradaDemanda) =>
    erros[k] ? { 'aria-invalid': true, 'aria-describedby': `erro-${k}` } : {};
  const mensagem = (k: keyof EntradaDemanda) =>
    erros[k] ? <span id={`erro-${k}`} className="erro-campo">{erros[k]}</span> : null;

  return (
    <form className="cartao formulario" onSubmit={enviar} noValidate aria-labelledby="titulo-formulario">
      <h2 id="titulo-formulario" className="titulo-secao">{titulo}</h2>

      <label className="campo-grupo">
        <span>Título *</span>
        <input className="campo" value={entrada.titulo} maxLength={LIMITES.tituloMax + 10}
          onChange={(e) => campo('titulo', e.target.value)} {...ajuda('titulo')} />
        {mensagem('titulo')}
      </label>

      <label className="campo-grupo">
        <span>Descrição</span>
        <textarea className="campo campo--area" value={entrada.descricao} rows={3}
          onChange={(e) => campo('descricao', e.target.value)} {...ajuda('descricao')} />
        {mensagem('descricao')}
      </label>

      <div className="grade grade--2">
        <label className="campo-grupo">
          <span>Responsável</span>
          <input className="campo" value={entrada.responsavel}
            onChange={(e) => campo('responsavel', e.target.value)} {...ajuda('responsavel')} />
          {mensagem('responsavel')}
        </label>
        <label className="campo-grupo">
          <span>Prazo (opcional)</span>
          <input className="campo" type="date" value={entrada.prazo}
            onChange={(e) => campo('prazo', e.target.value)} {...ajuda('prazo')} />
          {mensagem('prazo')}
        </label>
        <label className="campo-grupo">
          <span>Prioridade</span>
          <select className="campo" value={entrada.prioridade}
            onChange={(e) => campo('prioridade', e.target.value as EntradaDemanda['prioridade'])}>
            {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="campo-grupo">
          <span>Status</span>
          <select className="campo" value={entrada.status}
            onChange={(e) => campo('status', e.target.value as EntradaDemanda['status'])}>
            {STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      {parecida && (
        <div role="alert" className="aviso" data-testid="aviso-parecida">
          <p>
            <strong>Já existe uma demanda em aberto parecida:</strong> “{parecida.demanda.titulo}” ({parecida.demanda.status}; {textoMotivo(parecida)}).
            Criar outra mesmo assim?
          </p>
          <div className="acoes">
            <button type="button" className="botao" onClick={salvar}>Criar mesmo assim</button>
            {aoVerExistente && (
              <button type="button" className="botao" onClick={() => aoVerExistente(parecida.demanda.id)}>Ver a existente (descarta este cadastro)</button>
            )}
            <button type="button" className="botao" onClick={() => setParecida(null)}>Continuar editando</button>
          </div>
        </div>
      )}

      <div className="acoes">
        <button type="submit" className="botao botao--primario">Salvar</button>
        <button type="button" className="botao" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
