// Tela dos feriados locais (cartão da página Alertas): acrescentar feriados estaduais, municipais
// e recessos, marcar datas nacionais que não valem e ligar os facultativos. Grava pelo armazém.

import { useState, type FormEvent } from 'react';
import { useArmazem, useEstadoDemandas } from '../demandas/armazem.ts';
import { lerNovoFeriado, nacionaisComNome, type ConfiguracaoFeriados } from './feriados-locais.ts';

const dataBr = (aaaammdd: string) => new Date(`${aaaammdd}T00:00:00`).toLocaleDateString('pt-BR');
const diaMes = (aaaammdd: string) => `${aaaammdd.slice(8, 10)}/${aaaammdd.slice(5, 7)}`;

export function FeriadosLocais({ agora = () => new Date() }: { agora?: () => Date }) {
  const armazem = useArmazem();
  const { feriados, feriadosIlegiveis } = useEstadoDemandas();
  const [data, setData] = useState('');
  const [nome, setNome] = useState('');
  const [anual, setAnual] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const ano = agora().getFullYear();

  const gravar = (c: ConfiguracaoFeriados, sucesso: string) => {
    const r = armazem.definirFeriados(c);
    setAviso(r.ok ? { tipo: 'sucesso', texto: sucesso } : { tipo: 'erro', texto: r.mensagem });
    return r.ok;
  };

  const acrescentar = (e: FormEvent) => {
    e.preventDefault();
    const r = lerNovoFeriado(feriados, data, nome, anual);
    if (!r.ok) {
      setAviso({ tipo: 'erro', texto: r.erro });
      return;
    }
    const quando = r.feriado.anual ? `${diaMes(r.feriado.data)}, todo ano` : dataBr(r.feriado.data);
    if (gravar({ ...feriados, extras: [...feriados.extras, r.feriado] }, `Feriado local gravado: ${r.feriado.nome} (${quando}).`)) {
      setData('');
      setNome('');
      setAnual(false);
    }
  };

  const remover = (i: number) => {
    const f = feriados.extras[i];
    if (!window.confirm(`Remover o feriado local "${f.nome}"?`)) return;
    gravar({ ...feriados, extras: feriados.extras.filter((_, j) => j !== i) }, `Feriado local removido: ${f.nome}.`);
  };

  const alternarNacional = (dataNacional: string, nomeNacional: string, vale: boolean) => {
    const removidas = vale ? feriados.remover.filter((d) => d !== dataNacional) : [...feriados.remover, dataNacional];
    gravar({ ...feriados, remover: removidas }, vale ? `${nomeNacional} volta a contar como feriado.` : `${nomeNacional} (${dataBr(dataNacional)}) não conta mais como feriado.`);
  };

  const ordenados = feriados.extras
    .map((f, i) => ({ f, i }))
    .sort((a, b) => (a.f.anual ? a.f.data.slice(5) : a.f.data).localeCompare(b.f.anual ? b.f.data.slice(5) : b.f.data));

  return (
    <div className="cartao" aria-labelledby="titulo-feriados">
      <h2 id="titulo-feriados" className="titulo-secao">Feriados locais</h2>
      <p className="texto-pequeno texto-suave">
        Valem para as contas em dias úteis (prazos, demanda travada e prazo sugerido na triagem). Ficam gravados só neste navegador.
      </p>
      {aviso && <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`feedback feedback--${aviso.tipo}`}>{aviso.texto}</p>}
      {feriadosIlegiveis && (
        <p role="alert" className="aviso">Os feriados locais gravados estavam ilegíveis. As contas usam só os nacionais até você gravar de novo.</p>
      )}

      <form className="filtros" onSubmit={acrescentar} aria-label="Acrescentar feriado local">
        <label className="campo-grupo">
          <span>Data</span>
          <input className="campo" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>
        <label className="campo-grupo">
          <span>Nome</span>
          <input className="campo" value={nome} placeholder="Ex.: aniversário do município" onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="campo-grupo campo-grupo--linha">
          <input type="checkbox" checked={anual} onChange={(e) => setAnual(e.target.checked)} />
          <span>Repete todo ano</span>
        </label>
        <div className="acoes"><button type="submit" className="botao botao--primario">Acrescentar</button></div>
      </form>

      {ordenados.length === 0 ? (
        <p className="texto-suave texto-medio">Nenhum feriado local.</p>
      ) : (
        <ul className="lista-limpa lista-divisoria texto-medio" aria-label="Feriados locais">
          {ordenados.map(({ f, i }) => (
            <li key={`${f.data}-${i}`} className="linha-entre" data-testid={`feriado-local-${i}`}>
              <span><strong>{f.anual ? diaMes(f.data) : dataBr(f.data)}</strong> · {f.nome}{f.anual && ' · todo ano'}</span>
              <button type="button" className="botao botao--pequeno botao--perigo" aria-label={`Remover o feriado local ${f.nome}`} onClick={() => remover(i)}>Remover</button>
            </li>
          ))}
        </ul>
      )}

      <label className="campo-grupo campo-grupo--linha">
        <input type="checkbox" checked={feriados.facultativos}
          onChange={(e) => gravar({ ...feriados, facultativos: e.target.checked }, e.target.checked ? 'Carnaval e Corpus Christi passam a contar como feriado.' : 'Carnaval e Corpus Christi deixam de contar como feriado.')} />
        <span>Contar Carnaval (segunda e terça) e Corpus Christi como feriado</span>
      </label>

      <details>
        <summary className="texto-medio">Feriados nacionais de {ano} que valem aqui</summary>
        <ul className="lista-limpa lista-divisoria texto-medio" aria-label={`Feriados nacionais de ${ano}`}>
          {nacionaisComNome(ano, feriados.facultativos).map((n) => {
            const vale = !feriados.remover.includes(n.data);
            return (
              <li key={n.data}>
                <label className="campo-grupo--linha">
                  <input type="checkbox" checked={vale} onChange={(e) => alternarNacional(n.data, n.nome, e.target.checked)} />
                  <span>{dataBr(n.data)} · {n.nome}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}
