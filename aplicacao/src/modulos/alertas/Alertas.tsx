// Alertas LOCAIS de inatividade e dados portáveis (P06). Avaliados no navegador,
// com o app aberto; sem e-mail, sem scheduler, sem execução com o navegador fechado.

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useArmazem, useEstadoDemandas } from '../demandas/armazem.ts';
import { diasParado, listarInativas } from './inatividade.ts';
import { exportarDados, NOME_ARQUIVO, validarImportacao } from './dados-portaveis.ts';

type Aviso = { tipo: 'sucesso' | 'erro'; texto: string } | null;

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

export function Alertas({ agora = () => new Date() }: { agora?: () => Date }) {
  const armazem = useArmazem();
  const { demandas, diasInatividade, temBackup, erroArmazenamento } = useEstadoDemandas();
  const [dias, setDias] = useState(String(diasInatividade));
  const [aviso, setAviso] = useState<Aviso>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const instante = agora();
  const inativas = listarInativas(demandas, diasInatividade, instante);

  const salvarDias = (e: FormEvent) => {
    e.preventDefault();
    const r = armazem.definirDiasInatividade(Number(dias));
    setAviso(r.ok ? { tipo: 'sucesso', texto: `Limiar de inatividade gravado: ${dias} dia(s) corridos.` } : { tipo: 'erro', texto: r.mensagem });
  };

  const exportar = () => {
    baixar(NOME_ARQUIVO, exportarDados(demandas, diasInatividade, instante));
    setAviso({ tipo: 'sucesso', texto: `Arquivo ${NOME_ARQUIVO} gerado com ${demandas.length} demanda(s).` });
  };

  const importar = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    const r = validarImportacao(await arquivo.text());
    if (!r.ok) {
      setAviso({ tipo: 'erro', texto: `Importação recusada: ${r.erro} Nenhum dado foi alterado.` });
      return;
    }
    const ok = window.confirm(
      `Importar ${r.dados.demandas.length} demanda(s) e SUBSTITUIR as ${demandas.length} atuais?\n` +
        'Um backup dos dados atuais será gravado antes e poderá ser restaurado.',
    );
    if (!ok) {
      setAviso({ tipo: 'sucesso', texto: 'Importação cancelada. Nenhum dado foi alterado.' });
      return;
    }
    const g = armazem.importar(r.dados);
    setAviso(g.ok
      ? { tipo: 'sucesso', texto: `Importadas ${r.dados.demandas.length} demanda(s). Backup anterior gravado.` }
      : { tipo: 'erro', texto: g.mensagem });
    if (g.ok) setDias(String(r.dados.configuracao.diasInatividade));
  };

  const restaurarBackup = () => {
    if (!window.confirm('Desfazer a última importação e voltar aos dados anteriores?')) return;
    const r = armazem.restaurarBackup();
    setAviso(r.ok ? { tipo: 'sucesso', texto: 'Dados anteriores à importação restaurados.' } : { tipo: 'erro', texto: r.mensagem });
    if (r.ok) setDias(String(armazem.obter().diasInatividade));
  };

  const restaurarExemplos = () => {
    if (!window.confirm('Substituir TODOS os dados deste navegador pelos exemplos fictícios?')) return;
    const r = armazem.restaurarExemplos();
    setAviso(r.ok ? { tipo: 'sucesso', texto: 'Exemplos fictícios restaurados.' } : { tipo: 'erro', texto: r.mensagem });
  };

  return (
    <section aria-labelledby="titulo-alertas" className="pagina">
      <div>
        <h1 id="titulo-alertas" className="titulo-pagina">Alertas</h1>
        <p className="texto-suave texto-medio">
          Alertas locais, avaliados neste navegador enquanto o app está aberto. Não há envio de e-mail nem execução com o navegador fechado.
        </p>
      </div>

      {aviso && <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={`feedback feedback--${aviso.tipo}`}>{aviso.texto}</p>}

      <form className="cartao filtros" onSubmit={salvarDias} aria-label="Configurar inatividade">
        <label className="campo-grupo">
          <span>Inatividade após quantos dias corridos sem ação relevante?</span>
          <input className="campo" type="number" min={1} max={365} step={1} value={dias} onChange={(e) => setDias(e.target.value)} />
        </label>
        <div className="acoes"><button type="submit" className="botao botao--primario">Salvar limiar</button></div>
      </form>

      <div className="cartao">
        <h2 className="titulo-secao">Demandas inativas ({inativas.length})</h2>
        {inativas.length === 0 ? (
          <p className="texto-suave texto-medio">Nenhuma demanda inativa com o limiar de {diasInatividade} dia(s).</p>
        ) : (
          <ul className="lista-limpa lista-divisoria texto-medio" aria-label="Demandas inativas">
            {inativas.map((d) => (
              <li key={d.id} data-testid={`inativa-${d.id}`}>
                <strong>{d.titulo}</strong>{' '}
                <span className="texto-pequeno texto--atencao">
                  · {d.status} · sem ação relevante há {diasParado(d, instante)} dia(s)
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="texto-pequeno texto-suave">Uma edição real ou mudança de status registra ação relevante e remove o alerta. Concluídas não geram alerta.</p>
      </div>

      <div className="cartao">
        <h2 className="titulo-secao">Dados portáveis</h2>
        <p className="texto-pequeno texto-suave">
          O JSON exportado serve de backup e é a fonte do MCP local. Atualizar a página não atualiza um arquivo já exportado.
        </p>
        <div className="acoes">
          <button type="button" className="botao" onClick={exportar} disabled={!!erroArmazenamento}>Exportar {NOME_ARQUIVO}</button>
          <button type="button" className="botao" onClick={() => arquivoRef.current?.click()}>Importar JSON…</button>
          <input ref={arquivoRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Arquivo JSON para importar" onChange={importar} />
          <button type="button" className="botao" onClick={restaurarBackup} disabled={!temBackup}>Desfazer última importação</button>
          <button type="button" className="botao botao--perigo" onClick={restaurarExemplos}>Restaurar exemplos</button>
        </div>
      </div>
    </section>
  );
}
