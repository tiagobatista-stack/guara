// Formulário de compromisso ou lembrete próprio (item 14): assunto, tipo, demanda, data de início e de fim,
// dia inteiro ou hora, repetição e término. Serve para criar, editar e (na edição) excluir, com confirmação.

import { useState, type FormEvent } from 'react';
import {
  criarCompromisso, editarCompromisso, encerrarSerieAntesDe, excluirCompromisso, LIMITES_COMPROMISSO, problemaDoCompromisso, rotuloDoTipo, TIPOS_DE_COMPROMISSO,
  type DadosCompromisso, type Repeticao, type TipoDeCompromisso,
} from './compromissos.ts';
import { descreverOrdemDoDia, descreverSemanaDoMes, ROTULOS_DA_REPETICAO, todoDiaDaSemana, diaDaSemana } from './recorrencia.ts';

export interface InicialDoFormulario {
  id?: string; tipo?: TipoDeCompromisso; data?: string; hora?: string; assunto?: string; demanda?: string;
  dataFim?: string; repeticao?: Exclude<Repeticao, 'nenhuma'>; repetirAte?: string;
  /** Dia (início da ocorrência) em que a pessoa abriu o compromisso: base de "Encerrar a série antes de…". */
  ocorrencia?: string;
}

const dataBr = (iso: string) => iso.split('-').reverse().join('/');

export function FormularioCompromisso({ inicial, hoje, agora, aoFechar }: { inicial: InicialDoFormulario; hoje: string; agora: () => Date; aoFechar: (mensagem?: string) => void }) {
  const [tipo, setTipo] = useState<string>(inicial.tipo ?? 'reunião');
  const [data, setData] = useState(inicial.data ?? hoje);
  const [dataFim, setDataFim] = useState(inicial.dataFim ?? inicial.data ?? hoje);
  // Enquanto a pessoa não mexe na data de fim, ela acompanha a de início.
  const [fimManual, setFimManual] = useState(Boolean(inicial.dataFim && inicial.dataFim !== inicial.data));
  const [diaInteiro, setDiaInteiro] = useState(!inicial.hora);
  const [hora, setHora] = useState(inicial.hora ?? '');
  const [repeticao, setRepeticao] = useState<string>(inicial.repeticao ?? 'nenhuma');
  const [repetirAte, setRepetirAte] = useState(inicial.repetirAte ?? '');
  const [assunto, setAssunto] = useState(inicial.assunto ?? '');
  const [demanda, setDemanda] = useState(inicial.demanda ?? '');
  const [erro, setErro] = useState('');
  const editando = Boolean(inicial.id);
  const emSerie = editando && Boolean(inicial.repeticao);
  const seRepete = repeticao !== 'nenhuma';

  function mudarInicio(valor: string) {
    setData(valor);
    if (!fimManual || dataFim < valor) setDataFim(valor);
  }

  function dadosDoFormulario() {
    return {
      tipo, data, assunto,
      hora: !diaInteiro && hora ? hora : undefined,
      dataFim: dataFim && dataFim > data ? dataFim : undefined,
      repeticao: seRepete ? repeticao : undefined,
      repetirAte: seRepete && repetirAte ? repetirAte : undefined,
      demanda: demanda.trim().toUpperCase() || undefined,
    };
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    const dados = dadosDoFormulario();
    const problema = problemaDoCompromisso(dados);
    if (problema) { setErro(problema); return; }
    const validos = dados as DadosCompromisso;
    const r = inicial.id ? editarCompromisso(inicial.id, validos) : criarCompromisso(validos, agora().toISOString());
    if (!r.ok) { setErro(r.erro); return; }
    aoFechar(editando ? 'Compromisso atualizado.' : 'Compromisso anotado.');
  }

  function excluir() {
    if (!inicial.id) return;
    const pergunta = emSerie ? 'Excluir a série inteira, com todas as ocorrências? Isso não pode ser desfeito.' : 'Excluir este compromisso? Isso não pode ser desfeito.';
    if (!window.confirm(pergunta)) return;
    excluirCompromisso(inicial.id);
    aoFechar(emSerie ? 'Série excluída.' : 'Compromisso excluído.');
  }

  function encerrar() {
    if (!inicial.id || !inicial.ocorrencia) return;
    if (!window.confirm(`Encerrar a série antes de ${dataBr(inicial.ocorrencia)}? As ocorrências a partir desse dia deixam de existir.`)) return;
    const r = encerrarSerieAntesDe(inicial.id, inicial.ocorrencia);
    aoFechar(r === 'excluido' ? 'Série excluída (não restou nenhuma ocorrência).' : r === 'encerrado' ? `Série encerrada antes de ${dataBr(inicial.ocorrencia)}.` : 'Nada a encerrar.');
  }

  const dow = data ? diaDaSemana(data) : 0;
  const opcoesDeRepeticao: Array<[string, string]> = [
    ['nenhuma', ROTULOS_DA_REPETICAO.nenhuma],
    ['diaria', ROTULOS_DA_REPETICAO.diaria],
    ['semanal', `Toda semana (${todoDiaDaSemana(dow)})`],
    ['mensal', ROTULOS_DA_REPETICAO.mensal],
    ['mensal_semana', `Todo mês, na ${data ? descreverOrdemDoDia(data) : '1ª segunda'}`],
    ['anual', ROTULOS_DA_REPETICAO.anual],
    ['dias_uteis', ROTULOS_DA_REPETICAO.dias_uteis],
  ];

  return (
    <form className="formulario formulario--compromisso" onSubmit={salvar} aria-labelledby="titulo-form-compromisso" data-testid="formulario-compromisso" noValidate>
      <h2 id="titulo-form-compromisso" className="titulo-secao">{editando ? 'Editar compromisso' : 'Novo compromisso ou lembrete'}</h2>
      <label className="campo-grupo campo-grupo--largo">Assunto
        <input className="campo" value={assunto} maxLength={LIMITES_COMPROMISSO.assunto + 40} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: licenciamento" autoComplete="off" />
      </label>
      <label className="campo-grupo">Tipo
        <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_DE_COMPROMISSO.map((t) => <option key={t} value={t}>{rotuloDoTipo(t)}</option>)}
        </select>
      </label>
      <label className="campo-grupo">Demanda (opcional)
        <input className="campo" value={demanda} onChange={(e) => setDemanda(e.target.value)} placeholder="DEM-FIC-0003" autoComplete="off" />
      </label>
      <fieldset className="campo-grupo campo-grupo--largo conjunto-campos">
        <legend>Data e horário</legend>
        <label className="campo-grupo">Data de início
          <input className="campo" type="date" value={data} onChange={(e) => mudarInicio(e.target.value)} required />
        </label>
        <label className="campo-grupo">Data de fim
          <input className="campo" type="date" value={dataFim} min={data} onChange={(e) => { setFimManual(true); setDataFim(e.target.value); }} />
        </label>
        <label className="campo-grupo--linha">
          <input type="checkbox" checked={diaInteiro} onChange={(e) => setDiaInteiro(e.target.checked)} /> Dia inteiro
        </label>
        {!diaInteiro && (
          <label className="campo-grupo">Hora
            <input className="campo" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </label>
        )}
        {data && <p className="texto-medio texto--suave" data-testid="formulario-semana-do-mes">{descreverSemanaDoMes(data)}</p>}
      </fieldset>
      <label className="campo-grupo">Repetição
        <select className="campo" value={repeticao} onChange={(e) => setRepeticao(e.target.value)}>
          {opcoesDeRepeticao.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </select>
      </label>
      {seRepete && (
        <label className="campo-grupo">Repetir até (opcional)
          <input className="campo" type="date" value={repetirAte} min={data} onChange={(e) => setRepetirAte(e.target.value)} />
        </label>
      )}
      {erro && <p role="alert" className="texto--falha texto-medio campo-grupo--largo">{erro}</p>}
      <div className="acoes-aviso campo-grupo--largo">
        <button type="submit" className="botao botao--primario">Salvar</button>
        <button type="button" className="botao" onClick={() => aoFechar()}>Cancelar</button>
        {editando && <button type="button" className="botao" onClick={excluir}>{emSerie ? 'Excluir a série' : 'Excluir'}</button>}
        {emSerie && inicial.ocorrencia && inicial.ocorrencia > (inicial.data ?? '') && (
          <button type="button" className="botao" onClick={encerrar}>Encerrar a série antes de {dataBr(inicial.ocorrencia)}</button>
        )}
      </div>
    </form>
  );
}
