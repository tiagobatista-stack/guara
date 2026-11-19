// Alertas LOCAIS de inatividade e dados portáveis (P06). Avaliados no navegador,
// com o app aberto; sem e-mail, sem scheduler, sem execução com o navegador fechado.

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAjusteFeriados, useArmazem, useEstadoDemandas } from '../demandas/armazem.ts';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { diasParado, listarInativas } from './inatividade.ts';
import { textoBloqueio } from './bloqueio.ts';
import { FeriadosLocais } from './FeriadosLocais.tsx';
import { listarSemPrazo, PRAZO_SUGERIDO_DIAS_UTEIS, sugerirPrazo } from './triagem.ts';
import { dataValida, paraEntrada } from '../demandas/regras.ts';
import type { Demanda } from '../demandas/modelo.ts';
import { exportarDados, NOME_ARQUIVO, validarImportacao } from './dados-portaveis.ts';
import { definirDiasPadraoElaboracao, lerDiasPadraoElaboracao } from '../operacoes/armazem.ts';
import { definirPreferencias, usePreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';
import { plural } from '../../compartilhado/plural.ts';

type Aviso = { tipo: 'sucesso' | 'erro'; texto: string } | null;

const dataBr = (aaaammdd: string) => new Date(`${aaaammdd}T00:00:00`).toLocaleDateString('pt-BR');

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
  const { demandas, diasInatividade, temBackup, erroArmazenamento, conteudoIlegivelDoBackup } = useEstadoDemandas();
  const preferenciasMascote = usePreferenciasMascote();
  const [dias, setDias] = useState(String(diasInatividade));
  const [aviso, setAviso] = useState<Aviso>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const instante = agora();
  const ajuste = useAjusteFeriados(instante);
  const inativas = listarInativas(demandas, diasInatividade, instante);
  const semPrazo = listarSemPrazo(demandas);
  const sugestao = sugerirPrazo(instante, ajuste);
  // Data escolhida por demanda na triagem; sem escolha, vale a sugestão.
  const [prazos, setPrazos] = useState<Record<string, string>>({});

  const salvarDias = (e: FormEvent) => {
    e.preventDefault();
    const r = armazem.definirDiasInatividade(Number(dias));
    setAviso(r.ok ? { tipo: 'sucesso', texto: `Limiar de inatividade gravado: ${plural(Number(dias), 'dia corrido', 'dias corridos')}.` } : { tipo: 'erro', texto: r.mensagem });
  };

  const gravarPrazo = (d: Demanda, prazo: string) => {
    if (!dataValida(prazo)) {
      setAviso({ tipo: 'erro', texto: `Informe uma data válida para "${d.titulo}".` });
      return;
    }
    const r = armazem.editar(d.id, { ...paraEntrada(d), prazo });
    setAviso(r.ok
      ? { tipo: 'sucesso', texto: `Prazo de "${d.titulo}" gravado: ${dataBr(prazo)}.` }
      : { tipo: 'erro', texto: r.erros?.prazo ?? r.mensagem });
  };

  const exportar = () => {
    baixar(NOME_ARQUIVO, exportarDados(demandas, diasInatividade, instante, preferenciasMascote, lerDiasPadraoElaboracao()));
    setAviso({ tipo: 'sucesso', texto: `Arquivo ${NOME_ARQUIVO} gerado com ${plural(demandas.length, 'demanda', 'demandas')}.` });
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
    // O texto depende do estado: só promete o desfazer quando ele de fato vai funcionar.
    const avisoBackupIlegivel = conteudoIlegivelDoBackup !== null
      ? '\nATENÇÃO: o backup atual contém demandas ilegíveis e esta importação vai SOBRESCREVER esse backup. Use "Baixar conteúdo do backup" antes, se quiser guardá-lo.'
      : '';
    const ok = window.confirm(erroArmazenamento
      ? `Importar ${plural(r.dados.demandas.length, 'demanda', 'demandas')} no lugar dos dados atuais, que estão corrompidos?\n` +
          'O conteúdo corrompido será guardado no backup, mas NÃO poderá ser restaurado por "Desfazer última importação". ' +
          'Se quiser guardá-lo, cancele e use antes "Baixar conteúdo bruto" na tela Demandas.' + avisoBackupIlegivel
      : `Importar ${plural(r.dados.demandas.length, 'demanda', 'demandas')} e SUBSTITUIR ${demandas.length === 1 ? 'a atual' : `as ${demandas.length} atuais`}?\n` +
          'Um backup dos dados atuais será gravado antes e poderá ser restaurado.' + avisoBackupIlegivel,
    );
    if (!ok) {
      setAviso({ tipo: 'sucesso', texto: 'Importação cancelada. Nenhum dado foi alterado.' });
      return;
    }
    const g = armazem.importar(r.dados);
    setAviso(g.ok
      ? { tipo: 'sucesso', texto: `${plural(r.dados.demandas.length, 'demanda importada', 'demandas importadas')}. Backup anterior gravado.` }
      : { tipo: 'erro', texto: g.mensagem });
    if (g.ok) {
      setDias(String(r.dados.configuracao.diasInatividade));
      // Preferência visual, fora do armazém das demandas: o desfazer da importação não a restaura.
      if (r.dados.mascote) definirPreferencias(r.dados.mascote);
      // Idem o prazo padrão do relatório (Operações); o arquivo sem ele não apaga o que já está configurado.
      if (r.dados.configuracao.diasPadraoElaboracao !== undefined) definirDiasPadraoElaboracao(r.dados.configuracao.diasPadraoElaboracao);
    }
  };

  const restaurarBackup = () => {
    if (!window.confirm('Desfazer a última importação e voltar aos dados anteriores?')) return;
    const r = armazem.restaurarBackup();
    setAviso(r.ok ? { tipo: 'sucesso', texto: 'Dados anteriores à importação restaurados.' } : { tipo: 'erro', texto: r.mensagem });
    // Sempre: após falha com reversão parcial, o limiar gravado pode ter mudado.
    setDias(String(armazem.obter().diasInatividade));
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

      <FeriadosLocais agora={agora} />

      <div className="cartao">
        <h2 className="titulo-secao">Demandas inativas ({inativas.length})</h2>
        {inativas.length === 0 ? (
          <EstadoVazio texto={`Nenhuma demanda inativa com o limiar de ${plural(diasInatividade, 'dia', 'dias')}.`} />
        ) : (
          <ul className="lista-limpa lista-divisoria texto-medio" aria-label="Demandas inativas">
            {inativas.map((d) => (
              <li key={d.id} data-testid={`inativa-${d.id}`}>
                <strong>{d.titulo}</strong>{' '}
                <span className="texto-pequeno texto--atencao">
                  · {d.status} · sem ação relevante há {plural(diasParado(d, instante), 'dia', 'dias')}
                </span>
                {d.bloqueio && (
                  <>
                    <p className="texto-pequeno">{textoBloqueio(d, instante, ajuste)}. Ela continua travada?</p>
                    <div className="acoes">
                      <button type="button" className="botao botao--pequeno" aria-label={`"${d.titulo}" continua travada`}
                        onClick={() => { const r = armazem.confirmarBloqueio(d.id); setAviso(r.ok ? { tipo: 'sucesso', texto: `Reavaliação registrada: "${d.titulo}" continua travada.` } : { tipo: 'erro', texto: r.mensagem }); }}>
                        Ainda travada
                      </button>
                      <button type="button" className="botao botao--pequeno" aria-label={`"${d.titulo}" destravou`}
                        onClick={() => { const r = armazem.destravar(d.id); setAviso(r.ok ? { tipo: 'sucesso', texto: `"${d.titulo}" destravada.` } : { tipo: 'erro', texto: r.mensagem }); }}>
                        Destravou
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="texto-pequeno texto-suave">Uma edição real, uma mudança de status ou a reavaliação de uma demanda travada registra ação relevante e remove o alerta. Concluídas não geram alerta.</p>
      </div>

      <div className="cartao">
        <h2 className="titulo-secao">Triagem: demandas sem prazo ({semPrazo.length})</h2>
        {semPrazo.length === 0 ? (
          <EstadoVazio texto="Toda demanda em aberto tem prazo." />
        ) : (
          <>
            <p className="texto-pequeno texto-suave">
              Sugestão: {PRAZO_SUGERIDO_DIAS_UTEIS} dias úteis a partir de hoje, {dataBr(sugestao.data)}
              {sugestao.feriadosPulados.length > 0 && ` (pulando o feriado de ${sugestao.feriadosPulados.map(dataBr).join(', ')})`}.
              Confira a data, troque se precisar e grave. Nada é gravado sem o clique.
            </p>
            <ul className="lista-limpa lista-divisoria texto-medio" aria-label="Demandas sem prazo">
              {semPrazo.map((d) => {
                const prazo = prazos[d.id] ?? sugestao.data;
                return (
                  <li key={d.id} data-testid={`sem-prazo-${d.id}`}>
                    <p><strong>{d.titulo}</strong> <span className="texto-pequeno texto-suave">· {d.status} · criada em {new Date(d.criadaEm).toLocaleDateString('pt-BR')}</span></p>
                    <form className="filtros" aria-label={`Prazo de "${d.titulo}"`} onSubmit={(e) => { e.preventDefault(); gravarPrazo(d, prazo); }}>
                      <label className="campo-grupo">
                        <span>Prazo</span>
                        <input className="campo" type="date" value={prazo} onChange={(e) => setPrazos({ ...prazos, [d.id]: e.target.value })} />
                      </label>
                      <div className="acoes">
                        <button type="submit" className="botao botao--pequeno" aria-label={`Gravar prazo de "${d.titulo}"`}>Gravar prazo</button>
                      </div>
                    </form>
                  </li>
                );
              })}
            </ul>
          </>
        )}
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
          <button type="button" className="botao" onClick={restaurarBackup} disabled={!temBackup || conteudoIlegivelDoBackup !== null}>Desfazer última importação</button>
          {conteudoIlegivelDoBackup !== null && (
            <button type="button" className="botao" onClick={() => baixar('guara-conteudo-do-backup.json', conteudoIlegivelDoBackup)}>
              Baixar conteúdo do backup
            </button>
          )}
          <button type="button" className="botao botao--perigo" onClick={restaurarExemplos}>Restaurar exemplos</button>
        </div>
        {conteudoIlegivelDoBackup !== null && (
          <p className="texto-pequeno texto--atencao">
            O backup contém demandas ilegíveis e não pode ser restaurado por "Desfazer última importação". Baixe o conteúdo do backup para não perdê-lo: a próxima importação vai sobrescrevê-lo.
          </p>
        )}
      </div>
    </section>
  );
}
