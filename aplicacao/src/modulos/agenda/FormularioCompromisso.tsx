// Formulário simples de compromisso ou lembrete próprio (item 14): tipo, data, hora opcional, assunto e demanda opcional.
// Serve para criar, editar e (na edição) excluir, uma por vez, com confirmação.

import { useState, type FormEvent } from 'react';
import {
  criarCompromisso, editarCompromisso, excluirCompromisso, LIMITES_COMPROMISSO, problemaDoCompromisso, rotuloDoTipo, TIPOS_DE_COMPROMISSO,
  type DadosCompromisso, type TipoDeCompromisso,
} from './compromissos.ts';

export interface InicialDoFormulario { id?: string; tipo?: TipoDeCompromisso; data?: string; hora?: string; assunto?: string; demanda?: string }

export function FormularioCompromisso({ inicial, hoje, agora, aoFechar }: { inicial: InicialDoFormulario; hoje: string; agora: () => Date; aoFechar: (mensagem?: string) => void }) {
  const [tipo, setTipo] = useState<string>(inicial.tipo ?? 'reunião');
  const [data, setData] = useState(inicial.data ?? hoje);
  const [hora, setHora] = useState(inicial.hora ?? '');
  const [assunto, setAssunto] = useState(inicial.assunto ?? '');
  const [demanda, setDemanda] = useState(inicial.demanda ?? '');
  const [erro, setErro] = useState('');
  const editando = Boolean(inicial.id);

  function salvar(e: FormEvent) {
    e.preventDefault();
    const dados = { tipo, data, hora: hora || undefined, assunto, demanda: demanda.trim().toUpperCase() || undefined };
    const problema = problemaDoCompromisso(dados);
    if (problema) { setErro(problema); return; }
    const validos = dados as DadosCompromisso;
    const r = inicial.id ? editarCompromisso(inicial.id, validos) : criarCompromisso(validos, agora().toISOString());
    if (!r.ok) { setErro(r.erro); return; }
    aoFechar(editando ? 'Compromisso atualizado.' : 'Compromisso anotado.');
  }

  function excluir() {
    if (!inicial.id) return;
    if (!window.confirm('Excluir este compromisso? Isso não pode ser desfeito.')) return;
    excluirCompromisso(inicial.id);
    aoFechar('Compromisso excluído.');
  }

  return (
    <form className="formulario" onSubmit={salvar} aria-labelledby="titulo-form-compromisso" data-testid="formulario-compromisso" noValidate>
      <h2 id="titulo-form-compromisso" className="titulo-secao">{editando ? 'Editar compromisso' : 'Novo compromisso ou lembrete'}</h2>
      <label className="campo-grupo">Tipo
        <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_DE_COMPROMISSO.map((t) => <option key={t} value={t}>{rotuloDoTipo(t)}</option>)}
        </select>
      </label>
      <label className="campo-grupo">Data
        <input className="campo" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
      </label>
      <label className="campo-grupo">Hora (opcional; em branco é dia todo)
        <input className="campo" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
      </label>
      <label className="campo-grupo">Assunto
        <input className="campo" value={assunto} maxLength={LIMITES_COMPROMISSO.assunto + 40} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: licenciamento" autoComplete="off" />
      </label>
      <label className="campo-grupo">Demanda (opcional)
        <input className="campo" value={demanda} onChange={(e) => setDemanda(e.target.value)} placeholder="DEM-FIC-0003" autoComplete="off" />
      </label>
      {erro && <p role="alert" className="texto--falha texto-medio">{erro}</p>}
      <div className="acoes-aviso">
        <button type="submit" className="botao botao--primario">Salvar</button>
        <button type="button" className="botao" onClick={() => aoFechar()}>Cancelar</button>
        {editando && <button type="button" className="botao" onClick={excluir}>Excluir</button>}
      </div>
    </form>
  );
}
