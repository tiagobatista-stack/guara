// Operações: fiscalizações encaminhadas por terceiros, com lista de pontos, equipes e datas (planejamento de viagens).
// Coordenadas podem identificar imóvel: os dados ficam só neste navegador.

import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { useArmazem, useEstadoDemandas } from '../demandas/armazem.ts';
import { formatarDecimal, formatarGms } from '../demandas/coordenadas.ts';
import { decodificarCsv, importarPontosCsv, type LinhaImportada, type ResultadoCsv } from './importar-csv.ts';
import { ehXlsx, xlsxParaCsv } from './ler-xlsx.ts';
import { LIMITES_OPERACAO, ROTULOS_SITUACAO, SITUACOES_PONTO, type Operacao, type Ponto, type SituacaoPonto } from './modelo.ts';
import {
  alterarPeriodo, alterarPonto, criarOperacao, criarOperacaoComPontos, definirGrupo, excluirOperacao, excluirPonto, incluirPontos, useOperacoes, useOperacoesSoNaMemoria,
} from './armazem.ts';
import { sugerirNomeOperacao } from './regras.ts';
import { exportarCsv, exportarGeoJson, nomeDoArquivo, SRC_EXPORTACAO } from './exportar.ts';
import { agruparPontos, nomesDeGrupos, pontosProximos, pontosSemData, pontosSemEquipe, textoLocalProximo } from './regras.ts';

const dataBr = (d?: string) => (d ? d.split('-').reverse().join('/') : '—');
const textoPeriodo = (p: { inicio?: string; fim?: string }) =>
  p.inicio || p.fim ? `${p.inicio ? dataBr(p.inicio) : '…'} a ${p.fim ? dataBr(p.fim) : '…'}` : 'sem período definido';

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Exportação para o QGIS ----------

function ExportarPontos({ operacao, agora }: { operacao: Operacao; agora: () => Date }) {
  const vazia = operacao.pontos.length === 0;
  const hoje = () => agora().toISOString().slice(0, 10);
  return (
    <section className="cartao" aria-labelledby="titulo-exportar">
      <h3 id="titulo-exportar" className="titulo-secao">Exportar pontos</h3>
      <p className="texto-pequeno texto-suave">
        Arquivos em UTF-8 com coordenadas em SIRGAS 2000 ({SRC_EXPORTACAO}), para abrir no QGIS. No CSV, use Camada → Adicionar camada → Texto
        delimitado, com X = COORD_X (longitude), Y = COORD_Y (latitude) e SRC {SRC_EXPORTACAO}. O GeoJSON já informa o SRC. Exporta todos os pontos da operação.
      </p>
      <p className="texto-pequeno texto--atencao">
        O arquivo contém coordenadas e notas: guarde e compartilhe conforme a classificação dos dados.
      </p>
      <div className="acoes">
        <button type="button" className="botao" disabled={vazia} onClick={() => baixar(nomeDoArquivo(operacao, 'csv', hoje()), exportarCsv(operacao), 'text/csv;charset=utf-8')}>
          Exportar CSV
        </button>
        <button type="button" className="botao" disabled={vazia} onClick={() => baixar(nomeDoArquivo(operacao, 'geojson', hoje()), exportarGeoJson(operacao), 'application/geo+json;charset=utf-8')}>
          Exportar GeoJSON (QGIS)
        </button>
      </div>
    </section>
  );
}

// ---------- Importação por CSV ----------

/** Texto CSV do arquivo escolhido (CSV ou .xlsx); lança com a mensagem para a pessoa se não der. */
async function textoDoArquivo(arquivo: File): Promise<string> {
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  try {
    return ehXlsx(bytes) ? await xlsxParaCsv(bytes) : decodificarCsv(bytes);
  } catch (erro) {
    throw new Error(erro instanceof Error ? erro.message : 'Não consegui ler o arquivo.');
  }
}

/** O que a conferência achou: pontos prontos, linhas com problema e o período tirado do arquivo. */
function ResumoDaPrevia({ validos, comErro, periodo }: { validos: number; comErro: LinhaImportada[]; periodo: { inicio?: string; fim?: string } | null }) {
  return (
    <>
      <p>
        <strong>{validos}</strong> ponto(s) pronto(s) para importar
        {comErro.length > 0 && <> e <strong className="texto--atencao">{comErro.length}</strong> linha(s) com problema (não entram; corrija o arquivo e confira de novo)</>}.
      </p>
      {periodo && <p data-testid="periodo-do-arquivo">Período tirado do arquivo: {textoPeriodo(periodo)}. Ele será gravado na operação ao importar.</p>}
      {comErro.length > 0 && (
        <ul className="lista-limpa" aria-label="Linhas com problema">
          {comErro.map((l) => <li key={l.linha} className="texto--atencao texto-pequeno">Linha {l.linha}: {l.erros.join(' ')}</li>)}
        </ul>
      )}
    </>
  );
}

function ImportarCsv({ operacao }: { operacao: Operacao }) {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoCsv | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const conferir = (conteudo: string) => {
    setMensagem(null);
    setResultado(importarPontosCsv(conteudo, { inicio: operacao.inicio, fim: operacao.fim }));
  };
  const lerArquivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    let conteudo: string;
    try {
      conteudo = await textoDoArquivo(arquivo);
    } catch (erro) {
      setResultado(null);
      return setMensagem((erro as Error).message);
    }
    setTexto(conteudo);
    conferir(conteudo);
  };

  const validos = resultado?.linhas.filter((l) => l.ponto) ?? [];
  // Só o lado que a operação ainda não tem vem do arquivo.
  const doArquivo = resultado?.periodoDoArquivo;
  const vaiPreencher = doArquivo && (!operacao.inicio || !operacao.fim)
    ? { inicio: operacao.inicio ?? doArquivo.inicio, fim: operacao.fim ?? doArquivo.fim }
    : null;
  const comErro = resultado?.linhas.filter((l) => l.erros.length) ?? [];

  const importar = () => {
    const problema = incluirPontos(operacao.id, validos.map((l) => l.ponto!));
    if (problema) return setMensagem(problema);
    setMensagem(`${validos.length} ponto(s) importado(s). A operação mudou: exporte a lista atualizada abaixo, se precisar.`);
    setResultado(null);
    setTexto('');
  };

  return (
    <section className="cartao" aria-labelledby="titulo-importar">
      <h3 id="titulo-importar" className="titulo-secao">Importar pontos (CSV ou .xlsx)</h3>
      <p className="texto-pequeno texto-suave">
        Envie o CSV ou a planilha .xlsx (só a primeira aba é lida), ou copie as células e cole aqui. Colunas: N_PONTO, EQUIPE, COORD_X (longitude), COORD_Y (latitude),
        MUNICIPIO, DAT_SAIDA, DAT_RETOR, NOT_PLANEJ. Só a coordenada é obrigatória. Nada é gravado antes da conferência.
      </p>
      <label className="campo-grupo">
        <span>Arquivo CSV ou planilha .xlsx</span>
        <input className="campo" type="file" accept=".csv,.xlsx,text/csv,text/plain" onChange={lerArquivo} />
      </label>
      <label className="campo-grupo">
        <span>Ou cole o conteúdo</span>
        <textarea className="campo campo--area" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </label>
      <div className="acoes">
        <button type="button" className="botao" disabled={!texto.trim()} onClick={() => conferir(texto)}>Conferir</button>
      </div>
      {mensagem && <p role="status" data-testid="mensagem-importacao">{mensagem}</p>}
      {resultado?.erro && <p role="alert" className="erro-campo">{resultado.erro}</p>}
      {resultado && !resultado.erro && (
        <div data-testid="previa-importacao">
          <ResumoDaPrevia validos={validos.length} comErro={comErro} periodo={vaiPreencher} />
          <div className="acoes">
            <button type="button" className="botao botao--primario" disabled={validos.length === 0} onClick={importar}>
              Importar {validos.length} ponto(s)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- Um ponto ----------

function CartaoPonto({ operacao, ponto, todas, selecionado, aoSelecionar }: { operacao: Operacao; ponto: Ponto; todas: readonly Operacao[]; selecionado: boolean; aoSelecionar: (marcado: boolean) => void }) {
  const armazem = useArmazem();
  const { demandas } = useEstadoDemandas();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ equipe: ponto.equipe ?? '', saida: ponto.saida ?? '', retorno: ponto.retorno ?? '', grupo: ponto.grupo ?? '', notas: ponto.notas });
  const [erro, setErro] = useState<string | null>(null);
  const [ligar, setLigar] = useState('');

  const rotulo = ponto.numero !== undefined ? `Ponto ${ponto.numero}` : 'Ponto';
  const proximos = useMemo(
    () => pontosProximos(ponto, todas, demandas.filter((d) => !ponto.demandas.includes(d.id)).map((d) => ({ id: d.id, titulo: d.titulo, coordenada: d.coordenada }))),
    [ponto, todas, demandas],
  );
  const ligadas = ponto.demandas.map((id) => demandas.find((d) => d.id === id)).filter((d) => d !== undefined);

  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const problema = alterarPonto(operacao.id, ponto.id, { equipe: form.equipe.trim(), saida: form.saida, retorno: form.retorno, grupo: form.grupo.trim(), notas: form.notas.trim() });
    setErro(problema);
    if (!problema) setEditando(false);
  };
  const mudarSituacao = (s: SituacaoPonto) => setErro(alterarPonto(operacao.id, ponto.id, { situacao: s }));
  const ligarDemanda = () => {
    if (!ligar) return;
    setErro(alterarPonto(operacao.id, ponto.id, { demandas: [...ponto.demandas, ligar] }));
    setLigar('');
  };
  const desligar = (id: string) => setErro(alterarPonto(operacao.id, ponto.id, { demandas: ponto.demandas.filter((x) => x !== id) }));

  const criarDemanda = () => {
    const base = ponto.numero !== undefined ? `ponto ${ponto.numero} de ${operacao.nome}` : operacao.nome;
    const r = armazem.criar({
      titulo: `Vistoria${ponto.municipio ? ` em ${ponto.municipio}` : ''} (${base})`.slice(0, 120),
      descricao: ponto.notas,
      responsavel: '',
      prioridade: 'Média',
      status: 'A Fazer',
      prazo: '',
      tipo: 'campo',
      natureza: 'demanda',
      coordenada: formatarDecimal(ponto.coordenada),
      ...(ponto.saida ? { vistoria: 'data' as const, vistoriaData: ponto.saida } : { vistoria: 'aberta' as const }),
    });
    if (!r.ok || !r.demanda) return setErro(r.ok ? 'Não foi possível criar a demanda.' : r.mensagem);
    setErro(alterarPonto(operacao.id, ponto.id, { demandas: [...ponto.demandas, r.demanda.id] }));
  };

  const livres = demandas.filter((d) => !ponto.demandas.includes(d.id));

  return (
    <li className="cartao" data-testid={`ponto-${ponto.id}`}>
      <label className="texto-pequeno"><input type="checkbox" checked={selecionado} onChange={(e) => aoSelecionar(e.target.checked)} /> <span>Selecionar {rotulo}</span></label>
      <p><strong>{rotulo}</strong>{ponto.municipio && <> · {ponto.municipio}</>} <span className="texto-pequeno texto-suave">({ROTULOS_SITUACAO[ponto.situacao]})</span></p>
      <dl className="dados-definicao">
        <dt>Coordenada</dt><dd className="mono">{formatarGms(ponto.coordenada)}</dd>
        <dt>Equipe</dt><dd data-testid={`equipe-${ponto.id}`}>{ponto.equipe ?? <span className="texto--atencao">sem equipe</span>}</dd>
        <dt>Saída</dt><dd>{ponto.saida ? dataBr(ponto.saida) : <span className="texto--atencao">sem data</span>}</dd>
        <dt>Retorno</dt><dd>{dataBr(ponto.retorno)}</dd>
        {ponto.grupo && <><dt>Grupo</dt><dd data-testid={`grupo-${ponto.id}`}>{ponto.grupo}</dd></>}
        {ponto.notas && <><dt>Notas</dt><dd>{ponto.notas}</dd></>}
        {ligadas.length > 0 && (
          <><dt>Demandas</dt><dd>{ligadas.map((d) => (
            <span key={d.id} className="texto-pequeno" data-testid={`ligada-${ponto.id}`}>
              {d.titulo}{' '}
              <button type="button" className="botao botao--pequeno" aria-label={`Desligar ${d.titulo}`} onClick={() => desligar(d.id)}>Desligar</button>{' '}
            </span>
          ))}</dd></>
        )}
      </dl>

      {proximos.length > 0 && (
        <div className="aviso" data-testid={`proximos-${ponto.id}`}>
          <p><strong>Local já aparece em outro registro</strong> (até 200 m; confira, a decisão é sua):</p>
          <ul className="lista-limpa">{proximos.map((l) => <li key={`${l.origem}-${l.id}`} className="texto-pequeno">{textoLocalProximo(l)}</li>)}</ul>
        </div>
      )}

      {erro && <p role="alert" className="erro-campo">{erro}</p>}

      {editando ? (
        <form onSubmit={salvar} className="formulario" noValidate aria-label={`Editar ${rotulo}`}>
          <div className="grade grade--2">
            <label className="campo-grupo"><span>Equipe</span>
              <input className="campo" value={form.equipe} maxLength={LIMITES_OPERACAO.equipe} onChange={(e) => setForm({ ...form, equipe: e.target.value })} /></label>
            <label className="campo-grupo"><span>Grupo</span>
              <input className="campo" value={form.grupo} maxLength={LIMITES_OPERACAO.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} /></label>
            <label className="campo-grupo"><span>Saída</span>
              <input className="campo" type="date" value={form.saida} onChange={(e) => setForm({ ...form, saida: e.target.value })} /></label>
            <label className="campo-grupo"><span>Retorno</span>
              <input className="campo" type="date" value={form.retorno} onChange={(e) => setForm({ ...form, retorno: e.target.value })} /></label>
          </div>
          <label className="campo-grupo"><span>Notas</span>
            <textarea className="campo campo--area" rows={2} value={form.notas} maxLength={LIMITES_OPERACAO.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label>
          <div className="acoes">
            <button type="submit" className="botao botao--primario">Salvar ponto</button>
            <button type="button" className="botao" onClick={() => setEditando(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <div className="acoes">
          <button type="button" className="botao botao--pequeno" aria-label={`Editar ${rotulo}`} onClick={() => setEditando(true)}>Editar</button>
          <label className="campo-grupo">
            <span className="texto-pequeno">Situação de {rotulo}</span>
            <select className="campo" value={ponto.situacao} onChange={(e) => mudarSituacao(e.target.value as SituacaoPonto)}>
              {SITUACOES_PONTO.map((s) => <option key={s} value={s}>{ROTULOS_SITUACAO[s]}</option>)}
            </select>
          </label>
          <button type="button" className="botao botao--pequeno" aria-label={`Criar demanda a partir do ${rotulo}`} onClick={criarDemanda}>Criar demanda a partir do ponto</button>
          <button
            type="button" className="botao botao--pequeno botao--perigo" aria-label={`Excluir ${rotulo}`}
            onClick={() => { if (window.confirm(`Excluir o ${rotulo}? Esta ação não pode ser desfeita.`)) excluirPonto(operacao.id, ponto.id); }}
          >Excluir</button>
        </div>
      )}

      {livres.length > 0 && !editando && (
        <div className="acoes">
          <label className="campo-grupo">
            <span className="texto-pequeno">Ligar a uma demanda existente ({rotulo})</span>
            <select className="campo" value={ligar} onChange={(e) => setLigar(e.target.value)}>
              <option value="">Escolha…</option>
              {livres.map((d) => <option key={d.id} value={d.id}>{d.titulo}</option>)}
            </select>
          </label>
          <button type="button" className="botao botao--pequeno" disabled={!ligar} aria-label={`Ligar demanda ao ${rotulo}`} onClick={ligarDemanda}>Ligar</button>
        </div>
      )}
    </li>
  );
}

// ---------- Período da operação ----------

function PeriodoOperacao({ operacao }: { operacao: Operacao }) {
  const [inicio, setInicio] = useState(operacao.inicio ?? '');
  const [fim, setFim] = useState(operacao.fim ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    setErro(alterarPeriodo(operacao.id, inicio, fim));
  };
  return (
    <form onSubmit={salvar} className="grade grade--2" noValidate aria-label="Período da operação">
      <label className="campo-grupo"><span>Início do período</span>
        <input className="campo" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
      <label className="campo-grupo"><span>Fim do período</span>
        <input className="campo" type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></label>
      {erro && <span role="alert" className="erro-campo">{erro}</span>}
      <div className="acoes"><button type="submit" className="botao botao--pequeno">Salvar período</button></div>
    </form>
  );
}

// ---------- Uma operação ----------

function DetalheOperacao({ operacao, todas, aoVoltar, agora }: { operacao: Operacao; todas: readonly Operacao[]; aoVoltar: () => void; agora: () => Date }) {
  const [equipe, setEquipe] = useState('');
  const [situacao, setSituacao] = useState<'' | SituacaoPonto>('');
  const [soPendentes, setSoPendentes] = useState(false);
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [selecionados, setSelecionados] = useState<ReadonlySet<string>>(new Set());
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [erroGrupo, setErroGrupo] = useState<string | null>(null);
  const [avisoGrupo, setAvisoGrupo] = useState<string | null>(null);
  const equipes = useMemo(() => [...new Set(operacao.pontos.map((p) => p.equipe).filter((e): e is string => !!e))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [operacao.pontos]);
  const semEquipe = pontosSemEquipe(operacao.pontos).length;
  const semData = pontosSemData(operacao.pontos).length;
  const pendentes = new Set([...pontosSemEquipe(operacao.pontos), ...pontosSemData(operacao.pontos)].map((p) => p.id));
  const visiveis = operacao.pontos.filter(
    (p) => (!equipe || (equipe === 'sem' ? !p.equipe : p.equipe === equipe)) && (!situacao || p.situacao === situacao) && (!soPendentes || pendentes.has(p.id)) &&
      (!grupoFiltro || (grupoFiltro === 'sem' ? !p.grupo : p.grupo === grupoFiltro)),
  );
  const grupos = nomesDeGrupos(operacao.pontos);
  const porGrupo = agruparPontos(visiveis);
  // Só o que ainda existe e está visível continua selecionado.
  const marcados = visiveis.filter((p) => selecionados.has(p.id)).map((p) => p.id);
  const marcar = (id: string, marcado: boolean) =>
    setSelecionados((s) => { const n = new Set(s); if (marcado) n.add(id); else n.delete(id); return n; });
  const aplicarGrupo = (nome: string, feito: string) => {
    const erro = definirGrupo(operacao.id, marcados, nome);
    setErroGrupo(erro);
    if (!erro) { setSelecionados(new Set()); setNomeGrupo(''); setAvisoGrupo(feito); }
  };

  return (
    <article aria-labelledby="titulo-operacao">
      <div className="acoes"><button type="button" className="botao" onClick={aoVoltar}>Voltar às operações</button></div>
      <h2 id="titulo-operacao" className="titulo-secao">{operacao.nome}</h2>
      <p className="texto-suave texto-medio">
        <span data-testid="periodo-operacao">{textoPeriodo(operacao)}</span>{operacao.origem && <> · encaminhada por {operacao.origem}</>}
      </p>
      <PeriodoOperacao operacao={operacao} />
      <p data-testid="resumo-operacao">
        {operacao.pontos.length} ponto(s) · <span className={semEquipe ? 'texto--atencao' : ''}>{semEquipe} sem equipe</span> ·{' '}
        <span className={semData ? 'texto--atencao' : ''}>{semData} sem data</span>
      </p>

      <ImportarCsv operacao={operacao} />
      <ExportarPontos operacao={operacao} agora={agora} />

      <form className="filtros grade grade--2" aria-label="Filtros dos pontos" onSubmit={(e) => e.preventDefault()}>
        <label className="campo-grupo"><span>Equipe</span>
          <select className="campo" value={equipe} onChange={(e) => setEquipe(e.target.value)}>
            <option value="">Todas</option>
            {equipes.map((x) => <option key={x}>{x}</option>)}
            <option value="sem">Sem equipe</option>
          </select></label>
        <label className="campo-grupo"><span>Situação</span>
          <select className="campo" value={situacao} onChange={(e) => setSituacao(e.target.value as '' | SituacaoPonto)}>
            <option value="">Todas</option>
            {SITUACOES_PONTO.map((s) => <option key={s} value={s}>{ROTULOS_SITUACAO[s]}</option>)}
          </select></label>
        <label className="campo-grupo"><span>Grupo</span>
          <select className="campo" value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)}>
            <option value="">Todos</option>
            {grupos.map((g) => <option key={g}>{g}</option>)}
            <option value="sem">Sem grupo</option>
          </select></label>
        <label><input type="checkbox" checked={soPendentes} onChange={(e) => setSoPendentes(e.target.checked)} /> Só os sem equipe ou sem data</label>
      </form>

      {operacao.pontos.length > 0 && (
        <section className="cartao" aria-labelledby="titulo-agrupar" data-testid="barra-agrupar">
          <h3 id="titulo-agrupar" className="titulo-secao">Agrupar pontos</h3>
          <p className="texto-pequeno texto-suave">
            Grupo é um conjunto de pontos do mesmo assunto (por exemplo, vários pontos da mesma fazenda). Marque os pontos
            abaixo, escreva o nome do grupo (ou escolha um que já existe) e clique em Agrupar. Equipe e grupo são independentes.
          </p>
          <div className="acoes">
            <span data-testid="contagem-selecionados">{marcados.length} ponto(s) selecionado(s)</span>
            <button type="button" className="botao botao--pequeno" disabled={visiveis.length === 0} onClick={() => setSelecionados(new Set(visiveis.map((p) => p.id)))}>Selecionar todos os visíveis</button>
            <button type="button" className="botao botao--pequeno" disabled={marcados.length === 0} onClick={() => setSelecionados(new Set())}>Limpar seleção</button>
          </div>
          <div className="grade grade--2">
            <label className="campo-grupo"><span>Nome do grupo</span>
              <input className="campo" list="grupos-existentes" value={nomeGrupo} maxLength={LIMITES_OPERACAO.grupo} autoComplete="off" onChange={(e) => setNomeGrupo(e.target.value)} />
              <datalist id="grupos-existentes">{grupos.map((g) => <option key={g} value={g} />)}</datalist></label>
          </div>
          <div className="acoes">
            <button type="button" className="botao botao--primario" disabled={marcados.length === 0 || !nomeGrupo.trim()} onClick={() => aplicarGrupo(nomeGrupo, `Pontos agrupados em "${nomeGrupo.trim()}".`)}>Agrupar selecionados</button>
            <button type="button" className="botao" disabled={marcados.length === 0} onClick={() => aplicarGrupo('', 'Pontos tirados do grupo.')}>Tirar do grupo</button>
          </div>
          {erroGrupo && <p role="alert" className="erro-campo">{erroGrupo}</p>}
          {avisoGrupo && !erroGrupo && <p role="status" data-testid="aviso-grupo">{avisoGrupo}</p>}
        </section>
      )}

      {operacao.pontos.length === 0 ? (
        <EstadoVazio cartao texto="Nenhum ponto nesta operação." dica="Importe um CSV acima para trazer a lista de pontos." />
      ) : visiveis.length === 0 ? (
        <EstadoVazio cartao texto="Nenhum ponto corresponde aos filtros." dica="Mude ou limpe os filtros." />
      ) : (
        porGrupo.length === 0 ? (
          <ul className="lista-limpa grade grade--2" aria-label="Pontos da operação">
            {visiveis.map((p) => <CartaoPonto key={p.id} operacao={operacao} ponto={p} todas={todas} selecionado={selecionados.has(p.id)} aoSelecionar={(m) => marcar(p.id, m)} />)}
          </ul>
        ) : (
          porGrupo.map((g) => (
            <section key={g.nome || 'sem-grupo'} aria-label={g.nome ? `Grupo ${g.nome}` : 'Pontos sem grupo'} data-testid={`secao-grupo-${g.nome || 'sem'}`}>
              <h3 className="titulo-secao">
                {g.nome || 'Sem grupo'} <span className="texto-pequeno texto-suave">· {g.pontos.length} ponto(s){g.equipes.length > 0 && <> · {g.equipes.join(', ')}</>}</span>
              </h3>
              <ul className="lista-limpa grade grade--2" aria-label={g.nome ? `Pontos do grupo ${g.nome}` : 'Pontos sem grupo'}>
                {g.pontos.map((p) => <CartaoPonto key={p.id} operacao={operacao} ponto={p} todas={todas} selecionado={selecionados.has(p.id)} aoSelecionar={(m) => marcar(p.id, m)} />)}
              </ul>
            </section>
          ))
        )
      )}
    </article>
  );
}

// ---------- Nova operação: importar primeiro, nomear depois ----------

function NovaOperacao({ operacoes, agora, aoCriar }: { operacoes: readonly Operacao[]; agora: () => Date; aoCriar: (id: string) => void }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [manual, setManual] = useState(false);
  const [form, setForm] = useState({ nome: '', inicio: '', fim: '', origem: '' });
  const [previa, setPrevia] = useState<ResultadoCsv | null>(null);
  const [importada, setImportada] = useState({ nome: '', origem: '' });
  const [erro, setErro] = useState<string | null>(null);
  const validos = previa?.linhas.filter((l) => l.ponto) ?? [];
  const comErro = previa?.linhas.filter((l) => l.erros.length) ?? [];

  const criarManual = (e: FormEvent) => {
    e.preventDefault();
    const r = criarOperacao(form, agora().toISOString());
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    setForm({ nome: '', inicio: '', fim: '', origem: '' });
    aoCriar(r.id);
  };

  const escolher = async (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    try {
      const resultado = importarPontosCsv(await textoDoArquivo(arquivo));
      const ok = resultado.linhas.filter((l) => l.ponto);
      setPrevia(resultado);
      setImportada({
        nome: sugerirNomeOperacao(ok.map((l) => ({ municipio: l.ponto!.municipio, resultado: l.resultado, mes: l.mes, saida: l.ponto!.saida })), operacoes),
        origem: '',
      });
    } catch (falha) {
      setPrevia(null);
      setErro((falha as Error).message);
    }
  };

  const criarImportada = (e: FormEvent) => {
    e.preventDefault();
    const r = criarOperacaoComPontos({ nome: importada.nome, inicio: '', fim: '', origem: importada.origem }, agora().toISOString(), validos.map((l) => l.ponto!));
    if (!r.ok) return setErro(r.erro);
    setPrevia(null);
    setErro(null);
    aoCriar(r.id);
  };

  return (
    <section className="cartao formulario" aria-labelledby="titulo-nova-operacao">
      <h2 id="titulo-nova-operacao" className="titulo-secao">Nova operação</h2>
      <input ref={entrada} type="file" hidden accept=".csv,.xlsx,text/csv,text/plain" data-testid="arquivo-nova-operacao" onChange={escolher} onClick={(e) => { e.currentTarget.value = ''; }} />
      {previa === null && (
        <div className="acoes">
          <button type="button" className="botao botao--primario" onClick={() => entrada.current?.click()}>Importar planilha</button>
          <button type="button" className="botao botao--pequeno" aria-expanded={manual} onClick={() => setManual(!manual)}>ou criar sem planilha</button>
        </div>
      )}
      {erro && previa === null && !manual && <span role="alert" className="erro-campo">{erro}</span>}

      {previa?.erro && (
        <>
          <p role="alert" className="erro-campo">{previa.erro}</p>
          <div className="acoes"><button type="button" className="botao" onClick={() => setPrevia(null)}>Cancelar</button></div>
        </>
      )}

      {previa && !previa.erro && (
        <form onSubmit={criarImportada} noValidate data-testid="previa-nova-operacao">
          <ResumoDaPrevia validos={validos.length} comErro={comErro} periodo={previa.periodoDoArquivo ?? null} />
          {validos.length > 0 && (
            <>
              <label className="campo-grupo"><span>Nome *</span>
                <input className="campo" value={importada.nome} maxLength={LIMITES_OPERACAO.nome} onChange={(e) => setImportada({ ...importada, nome: e.target.value })} /></label>
              <label className="campo-grupo"><span>Quem encaminhou (opcional)</span>
                <input className="campo" value={importada.origem} maxLength={LIMITES_OPERACAO.origem} onChange={(e) => setImportada({ ...importada, origem: e.target.value })} /></label>
            </>
          )}
          {erro && <span role="alert" className="erro-campo">{erro}</span>}
          <div className="acoes">
            {validos.length > 0 && <button type="submit" className="botao botao--primario">Criar operação com {validos.length} ponto(s)</button>}
            <button type="button" className="botao" onClick={() => { setPrevia(null); setErro(null); }}>Cancelar</button>
          </div>
        </form>
      )}

      {manual && previa === null && (
        <form onSubmit={criarManual} noValidate aria-label="Criar operação sem planilha">
          <label className="campo-grupo"><span>Nome *</span>
            <input className="campo" value={form.nome} maxLength={LIMITES_OPERACAO.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></label>
          <div className="grade grade--2">
            <label className="campo-grupo"><span>Início (opcional)</span>
              <input className="campo" type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></label>
            <label className="campo-grupo"><span>Fim (opcional)</span>
              <input className="campo" type="date" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} /></label>
          </div>
          <label className="campo-grupo"><span>Quem encaminhou (opcional)</span>
            <input className="campo" value={form.origem} maxLength={LIMITES_OPERACAO.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} /></label>
          {erro && <span role="alert" className="erro-campo">{erro}</span>}
          <div className="acoes"><button type="submit" className="botao botao--primario">Criar operação</button></div>
        </form>
      )}
    </section>
  );
}

// ---------- Lista ----------

export function Operacoes({ agora = () => new Date() }: { agora?: () => Date }) {
  const operacoes = useOperacoes();
  const soNaMemoria = useOperacoesSoNaMemoria();
  const [aberta, setAberta] = useState<string | null>(null);
  const emDetalhe = operacoes.find((o) => o.id === aberta);

  return (
    <section aria-labelledby="titulo-operacoes" className="pagina">
      <h1 id="titulo-operacoes" className="titulo-pagina">Operações</h1>
      {soNaMemoria && (
        <p role="alert" className="aviso" data-testid="aviso-operacoes-sem-gravacao">
          Este navegador não deixou gravar as operações (armazenamento bloqueado, cheio ou em modo privado). As mudanças valem só até fechar a página.
        </p>
      )}
      {emDetalhe ? (
        <DetalheOperacao operacao={emDetalhe} todas={operacoes} aoVoltar={() => setAberta(null)} agora={agora} />
      ) : (
        <>
          <p className="texto-suave texto-medio">
            Fiscalizações encaminhadas por terceiros, com lista de pontos para vistoria. Os dados ficam só neste navegador:
            use dados reais apenas depois de classificação e autorização institucional.
          </p>
          <NovaOperacao operacoes={operacoes} agora={agora} aoCriar={setAberta} />

          {operacoes.length === 0 ? (
            <EstadoVazio cartao texto="Nenhuma operação cadastrada." dica="Importe a planilha de pontos ou crie a operação sem planilha." />
          ) : (
            <ul className="lista-limpa grade grade--2" aria-label="Lista de operações">
              {operacoes.map((o) => (
                <li key={o.id} className="cartao" data-testid={`operacao-${o.id}`}>
                  <p><strong>{o.nome}</strong></p>
                  <p className="texto-pequeno texto-suave">{textoPeriodo(o)}</p>
                  <p className="texto-pequeno">
                    {o.pontos.length} ponto(s) · {pontosSemEquipe(o.pontos).length} sem equipe · {pontosSemData(o.pontos).length} sem data
                  </p>
                  <div className="acoes">
                    <button type="button" className="botao botao--pequeno" aria-label={`Abrir ${o.nome}`} onClick={() => setAberta(o.id)}>Abrir</button>
                    <button
                      type="button" className="botao botao--pequeno botao--perigo" aria-label={`Excluir ${o.nome}`}
                      onClick={() => { if (window.confirm(`Excluir a operação "${o.nome}" e seus pontos? Esta ação não pode ser desfeita.`)) excluirOperacao(o.id); }}
                    >Excluir</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
