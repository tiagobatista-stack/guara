import { useState, type FormEvent } from 'react';
import { LIMITES, PRIORIDADES, STATUS, type EntradaDemanda } from './modelo.ts';
import type { ErrosValidacao } from './regras.ts';

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
}

export function FormularioDemanda({ titulo, inicial, aoSalvar, aoCancelar }: Props) {
  const [entrada, setEntrada] = useState<EntradaDemanda>(inicial);
  const [erros, setErros] = useState<ErrosValidacao>({});

  const campo = <K extends keyof EntradaDemanda>(k: K, v: EntradaDemanda[K]) => setEntrada((e) => ({ ...e, [k]: v }));

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    const r = aoSalvar(entrada);
    setErros(r ?? {});
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

      <div className="acoes">
        <button type="submit" className="botao botao--primario">Salvar</button>
        <button type="button" className="botao" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
