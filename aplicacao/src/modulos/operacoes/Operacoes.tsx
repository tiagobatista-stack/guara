// Operações: fiscalizações encaminhadas por terceiros, com lista de pontos e o cronograma de viagens
// (cada viagem com equipe, integrantes, veículos, saída e retorno).
// Coordenadas podem identificar imóvel: os dados ficam só neste navegador.

import { createPortal } from 'react-dom';
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { confirmarSaida, usePendente } from '../../compartilhado/alteracoes-pendentes.ts';
import { plural } from '../../compartilhado/plural.ts';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { Mascote } from '../../compartilhado/Mascote.tsx';
import { BloqueioDoItem } from '../../compartilhado/BloqueioDoItem.tsx';
import { AnotacoesDoItem, ConfirmaConclusao, SeloAnotacoes } from '../../compartilhado/AnotacoesDoItem.tsx';
import { contarAbertas } from '../../compartilhado/anotacoes.ts';
import { CaracterizacaoDoPonto } from './CaracterizacaoDoPonto.tsx';
import { InspecaoDoPonto } from './InspecaoDoPonto.tsx';
import { inspecaoAtiva, TIPOS_DANO_AGROTOXICO } from './inspecao-agrotoxicos.ts';
import { RelatorioDoPonto } from './RelatorioDoPonto.tsx';
import { DOCUMENTOS_LAVRADOS, numerosDoTexto, type DocumentoLavrado } from './providencias.ts';
import { QuarentenaDoPonto } from './QuarentenaDoPonto.tsx';
import { useQuarentena } from './quarentena.ts';
import { blocoPopAtivo, itensDeCampoSemResposta } from './pop-supressao.ts';
import { htmlDoRoteiro, type DemandaDoRoteiro } from './roteiro.ts';
import { Gaveta } from '../../compartilhado/Gaveta.tsx';
import { textoBloqueio } from '../alertas/bloqueio.ts';
import { usePreferenciasMascote } from '../../compartilhado/preferencias-mascote.ts';
import { useArmazem, useEstadoDemandas } from '../demandas/armazem.ts';
import { MOTIVOS_BLOQUEIO } from '../demandas/modelo.ts';
import { formatarDecimal, formatarGms } from '../demandas/coordenadas.ts';
import { decodificarCsv, importarPontosCsv, type LinhaImportada, type ResultadoCsv } from './importar-csv.ts';
import { ehXlsx, xlsxParaCsv } from './ler-xlsx.ts';
import {
  ETIQUETAS_SUGERIDAS, LIMITES_OPERACAO, MOTIVOS_PERIODO, SITUACOES_CAR, type SituacaoCar, MOTIVOS_SUGERIDOS, RESULTADOS, RESULTADOS_COM_MOTIVO, SITUACOES_ACOMPANHAMENTO,
  ORIGENS_ALERTA, type MotivoPeriodo, type Operacao, type Ponto, type TipoOrigemAlerta, type PontoNovo, type ResultadoPonto, type SituacaoAcompanhamento, type Viagem,
} from './modelo.ts';
import {
  alterarPeriodo, alterarPonto, alterarViagem, aplicarAtualizacoes, conflitoDeCodigo, consultarBasesDoPonto, definirOrigemEApoio, definirSetor, criarOperacao, criarOperacaoComPontos, criarViagem, definirGrupo, definirViagem, excluirOperacao, excluirPonto,
  conferirCronograma, consultarPontos, excluirViagem, definirDiasPadraoElaboracao, destravarPonto, gerarCodigos, incluirPontos, lerDiasPadraoElaboracao, prazosDeElaboracao, registrarRelatorio, registrarResultado, salvarAnotacoesPonto, travarPonto, reprogramarPonto, useOperacoes, useOperacoesSoNaMemoria, type DadosResultado, type DadosViagem,
} from './armazem.ts';
import { exportarCsv, exportarGeoJson, exportarPlanilhaSema, nomeDoArquivo, SRC_EXPORTACAO } from './exportar.ts';
import { planejarImportacao, rotuloAtualizacao } from './reimportar.ts';
import {
  cronogramaDesatualizado, faseDaOperacao, progressoDeCampo, podeGerarRoteiro, type FaseDaOperacao, agruparPontos, chaveAgenda, conflitosDeAgenda, dataLocal, dentroDoPeriodo, limparNomes, pendenciasDeCampo, rotuloDoPonto, situacaoDoPonto, faltasDaViagem, periodoDosPontos, textoDoPeriodo, unirPeriodos, type Periodo, nomesDeGrupos, ordenarViagens, pontoPendente, pontosPorViagem, pontosProximos, pontosSemViagem,
  campoEncerrado, diasParado, faseDoPonto, pontoTravado, ROTULO_FASE, planejarCodigos, prazoDaElaboracao, pontoVencido, progressoDaOperacao, textoParado, type PendenciaDeCampo, type PrazosDeElaboracao, type ProgressoDaOperacao, diasDaViagem, dataForaDaViagem, textoPeriodoViagem, sugerirNomeOperacao, sugestoesDeViagem, textoLocalProximo, textoViagem, viagemDoPonto, type ConflitoAgenda,
} from './regras.ts';

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

// ---------- Fala do mascote: o período da operação mudou? ----------

/** Pergunta do mascote. A decisão é do analista: o sistema não troca o período sozinho. */
function FalaMascote({ id, children }: { id: string; children: ReactNode }) {
  const { principal } = usePreferenciasMascote();
  return (
    <div className="aviso fala-mascote" role="group" aria-labelledby={`${id}-titulo`} data-testid={id}>
      <Mascote especie={principal} humor="cauteloso" tamanho={40} decorativo />
      <div className="fala-mascote-texto">{children}</div>
    </div>
  );
}

function CampoMotivo({ valor, aoMudar }: { valor: '' | MotivoPeriodo; aoMudar: (m: '' | MotivoPeriodo) => void }) {
  return (
    <label className="campo-grupo campo-grupo--curto"><span>Motivo da mudança (opcional)</span>
      <select className="campo" value={valor} onChange={(e) => aoMudar(e.target.value as '' | MotivoPeriodo)}>
        <option value="">Não informar</option>
        {(Object.keys(MOTIVOS_PERIODO) as MotivoPeriodo[]).map((m) => <option key={m} value={m}>{MOTIVOS_PERIODO[m]}</option>)}
      </select></label>
  );
}

/**
 * Opções para mudar o período: usar o outro período (adiada ou adiantada) ou ampliar para caber os dois (prorrogada).
 * Grava com o motivo no histórico do pedido.
 */
function MudarPeriodo({ operacao, outro, padrao = 'usar', aoMudar }: { operacao: Operacao; outro: Periodo; padrao?: 'usar' | 'ampliar'; aoMudar: () => void }) {
  const atual: Periodo = { inicio: operacao.inicio, fim: operacao.fim };
  const ampliado = unirPeriodos(atual, outro);
  const opcoes = [
    { chave: 'usar', rotulo: `Usar o período novo: ${textoDoPeriodo(outro)}`, periodo: outro },
    { chave: 'ampliar', rotulo: `Ampliar para incluir os dois: ${textoDoPeriodo(ampliado)}`, periodo: ampliado },
  ].filter((o, i, todas) => i === 0 || textoDoPeriodo(o.periodo) !== textoDoPeriodo(todas[0].periodo));
  const [escolha, setEscolha] = useState(opcoes.some((o) => o.chave === padrao) ? padrao : opcoes[0].chave);
  const [motivo, setMotivo] = useState<'' | MotivoPeriodo>('');
  const [erro, setErro] = useState<string | null>(null);
  const aplicar = () => {
    const p = opcoes.find((o) => o.chave === escolha)!.periodo;
    const problema = alterarPeriodo(operacao.id, p.inicio ?? '', p.fim ?? '', motivo ? { motivo } : {});
    setErro(problema);
    if (!problema) aoMudar();
  };
  return (
    <div className="formulario">
      <fieldset className="campo-lista">
        <legend>Novo período da operação</legend>
        {opcoes.map((o) => (
          <label key={o.chave} className="campo-grupo--linha">
            <input type="radio" name={`novo-periodo-${operacao.id}`} checked={escolha === o.chave} onChange={() => setEscolha(o.chave)} /> {o.rotulo}
          </label>
        ))}
      </fieldset>
      <CampoMotivo valor={motivo} aoMudar={setMotivo} />
      {erro && <p role="alert" className="erro-campo">{erro}</p>}
      <div className="acoes"><button type="button" className="botao botao--primario" onClick={aplicar}>Atualizar o período</button></div>
    </div>
  );
}

// ---------- Exportação para o QGIS ----------

function ExportarPontos({ operacao, agora }: { operacao: Operacao; agora: () => Date }) {
  const vazia = operacao.pontos.length === 0;
  const hoje = () => agora().toISOString().slice(0, 10);
  return (
    <section className="cartao" aria-labelledby="titulo-exportar">
      <h3 id="titulo-exportar" className="titulo-secao">Exportar pontos</h3>
      <p className="texto-pequeno texto-suave">
        <strong>Planilha da SEMA:</strong> as colunas da planilha de controle (MES_PPROG a AG_FISCALIZACAO, e TIPO_DANO no fim), separadas por
        ponto e vírgula e com vírgula decimal, para abrir direto no Excel. Depois do campo, ela pode voltar preenchida pela importação acima.
      </p>
      <p className="texto-pequeno texto-suave">
        <strong>QGIS:</strong> UTF-8, SIRGAS 2000 ({SRC_EXPORTACAO}). No CSV, use Camada → Adicionar camada → Texto delimitado, com X = COORD_X (longitude),
        Y = COORD_Y (latitude) e SRC {SRC_EXPORTACAO}. O GeoJSON já informa o SRC. Exporta todos os pontos da operação.
      </p>
      <p className="texto-pequeno texto--atencao">
        Os arquivos contêm coordenadas e notas, e a planilha da SEMA também os nomes da equipe: guarde e compartilhe conforme a classificação dos dados.
      </p>
      <div className="acoes">
        <button type="button" className="botao botao--primario" disabled={vazia} onClick={() => baixar(nomeDoArquivo(operacao, 'csv', hoje(), 'planilha-sema'), exportarPlanilhaSema(operacao), 'text/csv;charset=utf-8')}>
          Exportar planilha da SEMA
        </button>
        <button type="button" className="botao" disabled={vazia} onClick={() => baixar(nomeDoArquivo(operacao, 'csv', hoje()), exportarCsv(operacao), 'text/csv;charset=utf-8')}>
          Exportar CSV (QGIS)
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
function ResumoDaPrevia({ validos, comErro, comAviso = [], periodo, setor }: { validos: number; comErro: LinhaImportada[]; comAviso?: LinhaImportada[]; periodo: { inicio?: string; fim?: string } | null; setor?: string }) {
  return (
    <>
      <p>
        <strong>{plural(validos, 'ponto pronto', 'pontos prontos')}</strong> para importar
        {comErro.length > 0 && <> e <strong className="texto--atencao">{plural(comErro.length, 'linha com problema', 'linhas com problema')}</strong> ({comErro.length === 1 ? 'não entra' : 'não entram'}; corrija o arquivo e confira de novo)</>}.
      </p>
      {setor && <p className="texto-pequeno" data-testid="setor-do-arquivo">Setor tirado do arquivo: {setor}.</p>}
      {periodo && <p data-testid="periodo-do-arquivo">Período tirado do arquivo: {textoPeriodo(periodo)}. Ele será gravado na operação ao importar.</p>}
      {comAviso.length > 0 && (
        <ul className="lista-limpa" aria-label="Linhas para conferir">
          {comAviso.map((l) => <li key={l.linha} className="texto-pequeno">Linha {l.linha} (entra, mas confira): {l.avisos.join(' ')}</li>)}
        </ul>
      )}
      {comErro.length > 0 && (
        <ul className="lista-limpa" aria-label="Linhas com problema">
          {comErro.map((l) => <li key={l.linha} className="texto--atencao texto-pequeno">Linha {l.linha}: {l.erros.join(' ')}</li>)}
        </ul>
      )}
    </>
  );
}

function ImportarCsv({ operacao, todas }: { operacao: Operacao; todas: readonly Operacao[] }) {
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState<ResultadoCsv | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  /** Resposta à pergunta do mascote quando as datas do arquivo não cabem no período: null = ainda não respondeu. */
  const [resposta, setResposta] = useState<'atualizar' | 'manter' | null>(null);

  // A conferência não usa o período: datas fora dele viram a pergunta do mascote, não erro por linha.
  const conferir = (conteudo: string) => {
    setMensagem(null);
    setResposta(null);
    setResultado(importarPontosCsv(conteudo));
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

  const janela: Periodo = { inicio: operacao.inicio, fim: operacao.fim };
  // Linhas de pontos que já estão na operação (mesmo código ou número) atualizam, não duplicam.
  const plano = resultado && !resultado.erro ? planejarImportacao(operacao, todas, resultado.linhas) : null;
  const validos = plano?.novas ?? [];
  const atualizacoes = plano?.atualizacoes ?? [];
  const comAviso = resultado?.linhas.filter((l) => l.ponto && l.avisos.length) ?? [];
  const foraDoPeriodo = (p: PontoNovo) => [p.saida, p.retorno].some((d) => d && !dentroDoPeriodo(d, janela));
  const fora = validos.filter((l) => foraDoPeriodo(l.ponto!));
  const doArquivo = periodoDosPontos(validos.map((l) => l.ponto!));
  // Sem conflito, só o lado que a operação ainda não tem vem do arquivo.
  const vaiPreencher = !fora.length && doArquivo.inicio && (!operacao.inicio || !operacao.fim)
    ? { inicio: operacao.inicio ?? doArquivo.inicio, fim: operacao.fim ?? doArquivo.fim }
    : null;
  const comErro = [
    ...(resultado?.linhas.filter((l) => l.erros.length).map((l) => ({ linha: l.linha, texto: l.erros.join(' ') })) ?? []),
    ...(plano?.recusadas.map((r) => ({ linha: r.linha, texto: r.erro })) ?? []),
  ].sort((a, b) => a.linha - b.linha);
  const pendente = fora.length > 0 && resposta !== 'manter';

  const importar = () => {
    // "Manter o período": as linhas fora dele entram sem as datas (a viagem fica sem datas até o cronograma certo).
    const pontos = validos.map((l) => {
      const p = l.ponto!;
      if (!foraDoPeriodo(p)) return p;
      const { saida: _s, retorno: _r, ...semDatas } = p;
      void [_s, _r];
      return semDatas;
    });
    if (pontos.length) {
      const problema = incluirPontos(operacao.id, pontos);
      if (problema) return setMensagem(problema);
    }
    const aPreencher = atualizacoes.filter((a) => Object.keys(a.preencher).length > 0);
    if (aPreencher.length) {
      const problema = aplicarAtualizacoes(operacao.id, aPreencher.map((a) => ({ pontoId: a.ponto.id, preencher: a.preencher })));
      if (problema) return setMensagem(problema);
    }
    if (!operacao.setor && resultado?.setor) definirSetor(operacao.id, resultado.setor);
    setMensagem(`${plural(pontos.length, 'ponto importado', 'pontos importados')}${atualizacoes.length ? ` e ${plural(aPreencher.length, 'atualizado', 'atualizados')}` : ''}. A operação mudou: exporte a lista atualizada abaixo, se precisar.`);
    setResultado(null);
    setResposta(null);
    setTexto('');
  };

  return (
    <section className="cartao" aria-labelledby="titulo-importar">
      <h3 id="titulo-importar" className="titulo-secao">Importar pontos (CSV ou .xlsx)</h3>
      <p className="texto-pequeno texto-suave">
        Envie o CSV ou a planilha .xlsx (só a primeira aba é lida), ou copie as células e cole aqui. Colunas: N_PONTO, EQUIPE, COORD_X (longitude), COORD_Y (latitude),
        MUNICIPIO, DAT_SAIDA, DAT_RETOR, NOT_PLANEJ. Só a coordenada é obrigatória. Linhas com a mesma equipe, saída e retorno
        formam uma viagem. Nada é gravado antes da conferência.
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
          <p>
            <strong>{plural(validos.length, 'ponto pronto', 'pontos prontos')}</strong> para importar
            {atualizacoes.length > 0 && <>, <strong>{atualizacoes.length}</strong> já na operação (atualização)</>}
            {comErro.length > 0 && <> e <strong className="texto--atencao">{plural(comErro.length, 'linha com problema', 'linhas com problema')}</strong> ({comErro.length === 1 ? 'não entra' : 'não entram'}; corrija o arquivo e confira de novo)</>}.
          </p>
          {atualizacoes.length > 0 && (
            <div data-testid="previa-atualizacoes">
              <p className="texto-pequeno">
                Pontos que já estão na operação: a planilha preenche só o que está vazio (resultado, motivo, protocolo, observação, tipo de dano).
                O planejamento do sistema prevalece.
              </p>
              <ul className="lista-limpa" aria-label="Atualizações">
                {atualizacoes.map((a) => (
                  <li key={a.ponto.id} className="texto-pequeno" data-testid={`atualizacao-${a.ponto.id}`}>
                    <strong>{rotuloAtualizacao(operacao, a)}</strong>: {a.mudancas.length ? a.mudancas.join('; ') : 'nada a preencher'}.
                    {a.diferencas.length > 0 && <span className="texto--atencao"> Diferente na planilha (mantido o do sistema): {a.diferencas.join('; ')}.</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!operacao.setor && resultado.setor && <p className="texto-pequeno" data-testid="setor-do-arquivo">Setor tirado do arquivo: {resultado.setor}.</p>}
          {comAviso.length > 0 && (
            <ul className="lista-limpa" aria-label="Linhas para conferir">
              {comAviso.map((l) => <li key={l.linha} className="texto-pequeno">Linha {l.linha} (entra, mas confira): {l.avisos.join(' ')}</li>)}
            </ul>
          )}
          {fora.length > 0 && (
            <FalaMascote id="pergunta-periodo-importacao">
              <p id="pergunta-periodo-importacao-titulo">
                As datas da planilha (<strong>{textoDoPeriodo(doArquivo)}</strong>) são diferentes do período cadastrado na operação
                (<strong>{textoDoPeriodo(janela)}</strong>). A operação mudou de data?
              </p>
              <p className="texto-pequeno">{fora.length} de {plural(validos.length, 'linha', 'linhas')} {fora.length === 1 ? 'fica' : 'ficam'} fora do período cadastrado.</p>
              <div className="acoes">
                <button type="button" className={`botao botao--pequeno${resposta === 'atualizar' ? ' botao--primario' : ''}`} aria-pressed={resposta === 'atualizar'} onClick={() => setResposta('atualizar')}>Sim, atualizar o período</button>
                <button type="button" className={`botao botao--pequeno${resposta === 'manter' ? ' botao--primario' : ''}`} aria-pressed={resposta === 'manter'} onClick={() => setResposta('manter')}>Não, manter {textoDoPeriodo(janela)}</button>
              </div>
              {resposta === 'atualizar' && <MudarPeriodo operacao={operacao} outro={doArquivo} aoMudar={() => setResposta(null)} />}
              {resposta === 'manter' && (
                <p className="texto-pequeno" data-testid="aviso-manter-periodo">
                  O período não muda. {fora.length === 1 ? 'A linha fora dele entra' : `As ${fora.length} linhas fora dele entram`} <strong>sem as datas</strong>: a viagem fica sem datas até você lançar o cronograma certo.
                </p>
              )}
            </FalaMascote>
          )}
          {vaiPreencher && (
            <p data-testid="periodo-do-arquivo">Período tirado do arquivo: {textoPeriodo(vaiPreencher)}. Ele será gravado na operação ao importar.</p>
          )}
          {comErro.length > 0 && (
            <ul className="lista-limpa" aria-label="Linhas com problema">
              {comErro.map((l) => <li key={l.linha} className="texto--atencao texto-pequeno">Linha {l.linha}: {l.texto}</li>)}
            </ul>
          )}
          <div className="acoes">
            <button type="button" className="botao botao--primario" disabled={(validos.length === 0 && atualizacoes.length === 0) || pendente} onClick={importar}>
              Importar {plural(validos.length, 'ponto', 'pontos')}{atualizacoes.length > 0 && ` e atualizar ${atualizacoes.length}`}
            </button>
            {pendente && <span className="texto-pequeno texto-suave">Responda à pergunta sobre o período para importar.</span>}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------- Lista de nomes (integrantes, veículos) ----------

function CampoLista({ rotulo, itens, sugestoes, max, aoMudar }: { rotulo: string; itens: string[]; sugestoes: string[]; max: number; aoMudar: (itens: string[]) => void }) {
  const id = useId();
  const [novo, setNovo] = useState('');
  const adicionar = () => {
    const nome = novo.replace(/\s+/g, ' ').trim();
    if (!nome) return;
    if (!itens.some((x) => x.toLowerCase() === nome.toLowerCase())) aoMudar([...itens, nome]);
    setNovo('');
  };
  const teclar = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); adicionar(); }
  };
  return (
    <fieldset className="campo-lista">
      <legend>{rotulo}</legend>
      {itens.length > 0 && (
        <ul className="lista-limpa campo-lista-itens" aria-label={rotulo}>
          {itens.map((x) => (
            <li key={x}>
              <span>{x}</span>{' '}
              <button type="button" className="botao botao--pequeno" aria-label={`Remover ${x}`} onClick={() => aoMudar(itens.filter((y) => y !== x))}>Remover</button>
            </li>
          ))}
        </ul>
      )}
      <div className="acoes acoes--base">
        <label className="campo-grupo">
          <span className="texto-pequeno">Incluir em {rotulo.toLowerCase()}</span>
          <input className="campo" list={`${id}-sugestoes`} value={novo} maxLength={max} autoComplete="off" onChange={(e) => setNovo(e.target.value)} onKeyDown={teclar} />
          <datalist id={`${id}-sugestoes`}>{sugestoes.filter((x) => !itens.includes(x)).map((x) => <option key={x} value={x} />)}</datalist>
        </label>
        <button type="button" className="botao botao--pequeno" disabled={!novo.trim()} aria-label={`Confirmar inclusão em ${rotulo.toLowerCase()}`} onClick={adicionar}>Incluir</button>
      </div>
    </fieldset>
  );
}

// ---------- Viagens (cronograma) ----------

type Sugestoes = ReturnType<typeof sugestoesDeViagem>;

/** Quem entrou na lista leva cargo e lotação do último uso; sem histórico, a lotação padrão é a unidade (setor) da operação. */
function pessoasDaLista(nomes: readonly string[], atuais: NonNullable<Viagem['pessoas']>, historico: Sugestoes['pessoas'], unidade?: string): NonNullable<Viagem['pessoas']> {
  return Object.fromEntries(nomes.map((n) => [n, atuais[n] ?? { ...historico[n], ...(historico[n]?.lotacao || !unidade ? {} : { lotacao: unidade }) }]));
}

/** Ficha do integrante: clicar abre cargo e lotação. O motorista não entra na equipe técnica do relatório. */
function FichaIntegrante({ nome, dados, motorista, aoMudar }: { nome: string; dados: { cargo?: string; lotacao?: string }; motorista: boolean; aoMudar: (d: { cargo?: string; lotacao?: string }) => void }) {
  const [aberta, setAberta] = useState(false);
  const id = useId();
  return (
    <li>
      <button type="button" className="botao botao--pequeno botao--sutil" aria-expanded={aberta} aria-controls={`${id}-ficha`} aria-label={`Cargo e lotação de ${nome}`} onClick={() => setAberta(!aberta)}>
        {nome}: {dados.cargo || <span className="texto--atencao">cargo?</span>} · {dados.lotacao || <span className="texto--atencao">lotação?</span>}
      </button>
      {aberta && (
        <div id={`${id}-ficha`} className="grade grade--2">
          <label className="campo-grupo"><span>Cargo de {nome}</span>
            <input className="campo" value={dados.cargo ?? ''} maxLength={LIMITES_OPERACAO.cargo} autoComplete="off" onChange={(e) => aoMudar({ ...dados, cargo: e.target.value })} /></label>
          <label className="campo-grupo"><span>Lotação de {nome}</span>
            <input className="campo" value={dados.lotacao ?? ''} maxLength={LIMITES_OPERACAO.lotacao} autoComplete="off" onChange={(e) => aoMudar({ ...dados, lotacao: e.target.value })} /></label>
          {motorista && <p className="texto-pequeno texto-suave grade-linha-inteira">Motorista: não entra na equipe técnica do relatório.</p>}
        </div>
      )}
    </li>
  );
}

const dadosDaViagem = (v?: Viagem): DadosViagem => ({
  equipe: v?.equipe ?? '', integrantes: v?.integrantes ?? [], pessoas: v?.pessoas ?? {}, veiculos: v?.veiculos ?? [], motorista: v?.motorista ?? '', saida: v?.saida ?? '', retorno: v?.retorno ?? '', notas: v?.notas ?? '',
});

function FormularioViagem({ operacao, viagem, sugestoes, aoTerminar }: { operacao: Operacao; viagem?: Viagem; sugestoes: Sugestoes; aoTerminar: () => void }) {
  const [form, setForm] = useState<DadosViagem>(() => dadosDaViagem(viagem));
  const [erro, setErro] = useState<string | null>(null);
  const titulo = viagem ? `Editar viagem ${textoViagem(viagem)}` : 'Nova viagem';
  const janela: Periodo = { inicio: operacao.inicio, fim: operacao.fim };
  const datasDaViagem = periodoDosPontos([{ saida: form.saida || undefined, retorno: form.retorno || undefined }]);
  const foraDoPeriodo = !!erro?.includes('fora do período') && !!datasDaViagem.inicio;
  const salvar = (e?: FormEvent) => {
    e?.preventDefault();
    if (viagem) {
      const problema = alterarViagem(operacao.id, viagem.id, form);
      setErro(problema);
      if (!problema) aoTerminar();
    } else {
      const r = criarViagem(operacao.id, form);
      if (!r.ok) return setErro(r.erro);
      aoTerminar();
    }
  };
  return (
    <form onSubmit={salvar} className="cartao formulario" noValidate aria-label={titulo}>
      <h4 className="texto-medio">{titulo}</h4>
      <div className="grade grade--2">
        <label className="campo-grupo"><span>Equipe</span>
          <input className="campo" list="equipes-existentes" value={form.equipe} maxLength={LIMITES_OPERACAO.equipe} autoComplete="off"
            onChange={(e) => setForm({ ...form, equipe: e.target.value })} />
          <datalist id="equipes-existentes">{sugestoes.equipes.map((x) => <option key={x} value={x} />)}</datalist></label>
        <span />
        <label className="campo-grupo"><span>Saída</span>
          <input className="campo" type="date" value={form.saida} onChange={(e) => setForm({ ...form, saida: e.target.value })} /></label>
        <label className="campo-grupo"><span>Retorno</span>
          <input className="campo" type="date" value={form.retorno} onChange={(e) => setForm({ ...form, retorno: e.target.value })} /></label>
      </div>
      <CampoLista rotulo="Integrantes" itens={[...form.integrantes]} sugestoes={sugestoes.integrantes} max={LIMITES_OPERACAO.integrante}
        aoMudar={(integrantes) => setForm({ ...form, integrantes, pessoas: pessoasDaLista(integrantes, form.pessoas ?? {}, sugestoes.pessoas, operacao.setor) })} />
      {form.integrantes.length > 0 && (
        <ul className="lista-limpa" aria-label="Cargo e lotação dos integrantes">
          {form.integrantes.map((n) => (
            <FichaIntegrante key={n} nome={n} dados={form.pessoas?.[n] ?? {}} motorista={n === form.motorista}
              aoMudar={(d) => setForm({ ...form, pessoas: { ...form.pessoas, [n]: d } })} />
          ))}
        </ul>
      )}
      {form.integrantes.length > 0 && (
        <label className="campo-grupo"><span>Motorista</span>
          <select className="campo" value={form.integrantes.includes(form.motorista ?? '') ? form.motorista : ''} onChange={(e) => setForm({ ...form, motorista: e.target.value })}>
            <option value="">Não definido</option>
            {form.integrantes.map((n) => <option key={n} value={n}>{n}</option>)}
          </select></label>
      )}
      <CampoLista rotulo="Veículos" itens={[...form.veiculos]} sugestoes={sugestoes.veiculos} max={LIMITES_OPERACAO.veiculo}
        aoMudar={(veiculos) => setForm({ ...form, veiculos })} />
      <label className="campo-grupo"><span>Notas da viagem</span>
        <textarea className="campo campo--area" rows={2} value={form.notas} maxLength={LIMITES_OPERACAO.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label>
      <p className="texto-pequeno texto-suave">
        A viagem fica completa com nome da equipe, duas ou mais pessoas, um ou mais veículos e as datas. Os nomes ficam só neste navegador.
      </p>
      {erro && !foraDoPeriodo && <p role="alert" className="erro-campo">{erro}</p>}
      {foraDoPeriodo && (
        <FalaMascote id="pergunta-periodo-viagem">
          <p id="pergunta-periodo-viagem-titulo" role="alert">
            A viagem (<strong>{textoDoPeriodo(datasDaViagem)}</strong>) fica fora do período cadastrado na operação
            (<strong>{textoDoPeriodo(janela)}</strong>). A operação foi adiada, adiantada ou prorrogada?
          </p>
          <MudarPeriodo operacao={operacao} outro={datasDaViagem} padrao="ampliar" aoMudar={() => salvar()} />
          <p className="texto-pequeno">Se não mudou, corrija a data da viagem e salve de novo.</p>
        </FalaMascote>
      )}
      <div className="acoes">
        <button type="submit" className="botao botao--primario">Salvar viagem</button>
        <button type="button" className="botao" onClick={aoTerminar}>Cancelar</button>
      </div>
    </form>
  );
}

const textoConflito = (c: ConflitoAgenda) =>
  `${[...c.pessoas, ...c.veiculos].join(', ')} também ${c.pessoas.length + c.veiculos.length > 1 ? 'estão' : 'está'} em ${textoViagem(c.viagem)} (operação ${c.operacao})`;

// O roteiro abre numa aba nova (endereço blob:); lá o navegador imprime ou salva em PDF.
async function abrirRoteiroDaViagem(operacao: Operacao, v: Viagem, demandas: readonly DemandaDoRoteiro[]) {
  const { qrSvg } = await import('./qr.ts'); // fora do pacote principal: só carrega ao gerar o roteiro
  const html = htmlDoRoteiro({ operacao, viagem: v, pontos: operacao.pontos.filter((p) => p.viagem === v.id), demandas, geradoEm: dataLocal(new Date()), qrSvg });
  window.open(URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' })), '_blank');
}

function Viagens({ operacao, conflitos, sugestoes }: { operacao: Operacao; conflitos: Map<string, ConflitoAgenda[]>; sugestoes: Sugestoes }) {
  const [editando, setEditando] = useState<string | 'nova' | null>(null);
  const { demandas } = useEstadoDemandas();
  const viagens = ordenarViagens(operacao.viagens);
  // O roteiro abre numa aba nova (endereço blob:); lá o navegador imprime ou salva em PDF.
  const abrirRoteiro = (v: Viagem) => abrirRoteiroDaViagem(operacao, v, demandas);
  return (
    <section className="cartao" aria-labelledby="titulo-viagens" data-testid="viagens">
      <h3 id="titulo-viagens" className="titulo-secao">Viagens (cronograma)</h3>
      <p className="texto-pequeno texto-suave">
        Cada viagem tem uma equipe, com integrantes e veículos, e as datas de saída e retorno. Os pontos são encaixados nas viagens:
        mudar a data da viagem muda a de todos os pontos dela.
      </p>
      {viagens.length === 0 && editando !== 'nova' && <p className="texto-suave">Nenhuma viagem ainda. Crie uma ou importe o CSV com equipe e datas.</p>}
      <ul className="lista-limpa grade grade--2" aria-label="Viagens da operação">
        {viagens.map((v) => {
          if (editando === v.id) return <li key={v.id} className="grade-linha-inteira"><FormularioViagem operacao={operacao} viagem={v} sugestoes={sugestoes} aoTerminar={() => setEditando(null)} /></li>;
          const faltas = faltasDaViagem(v);
          const meus = conflitos.get(chaveAgenda(operacao.id, v.id)) ?? [];
          const qtd = operacao.pontos.filter((p) => p.viagem === v.id).length;
          return (
            <li key={v.id} className="cartao" data-testid={`viagem-${v.id}`}>
              <p><strong>{textoViagem(v)}</strong> <span className="texto-pequeno texto-suave sem-quebra">· {plural(qtd, 'ponto', 'pontos')}</span></p>
              <dl className="dados-definicao">
                <dt>Integrantes</dt><dd>{v.integrantes.length ? v.integrantes.join(', ') : <span className="texto--atencao">nenhum</span>}</dd>
                <dt>Veículos</dt><dd>{v.veiculos.length ? v.veiculos.join(', ') : <span className="texto--atencao">nenhum</span>}</dd>
                {v.motorista && <><dt>Motorista</dt><dd>{v.motorista}</dd></>}
                {v.notas && <><dt>Notas</dt><dd>{v.notas}</dd></>}
              </dl>
              {faltas.length > 0 && <p className="texto-pequeno texto--atencao" data-testid={`incompleta-${v.id}`}>Incompleta: falta {faltas.join(', ')}.</p>}
              {meus.length > 0 && (
                <div className="aviso" data-testid={`conflito-${v.id}`}>
                  <p><strong>Conflito de agenda</strong> (datas sobrepostas; confira, a decisão é sua):</p>
                  <ul className="lista-limpa">{meus.map((c, i) => <li key={i} className="texto-pequeno">{textoConflito(c)}</li>)}</ul>
                </div>
              )}
              <div className="acoes">
                <button type="button" className="botao botao--pequeno" aria-label={`Roteiro de vistoria da viagem ${textoViagem(v)}`} disabled={qtd === 0} onClick={() => abrirRoteiro(v)}>Roteiro de vistoria</button>
                <button type="button" className="botao botao--pequeno" aria-label={`Editar viagem ${textoViagem(v)}`} onClick={() => setEditando(v.id)}>Editar</button>
                <button
                  type="button" className="botao botao--pequeno botao--discreto" aria-label={`Excluir viagem ${textoViagem(v)}`}
                  onClick={() => { if (window.confirm(`Excluir a viagem ${textoViagem(v)}? ${plural(qtd, 'ponto fica', 'pontos ficam')} sem viagem; os pontos não são apagados.`)) excluirViagem(operacao.id, v.id); }}
                >Excluir</button>
              </div>
            </li>
          );
        })}
      </ul>
      {editando === 'nova' ? (
        <FormularioViagem operacao={operacao} sugestoes={sugestoes} aoTerminar={() => setEditando(null)} />
      ) : (
        <div className="acoes"><button type="button" className="botao" onClick={() => setEditando('nova')}>Nova viagem</button></div>
      )}
    </section>
  );
}

// ---------- Um ponto ----------

const ROTULOS_LAVRADOS = [['auto', 'Auto(s) de infração: n.º'], ['notificacao', 'Notificação(ões): n.º'], ['embargo', 'Termo(s) de embargo: n.º']] as const;

const rotuloDoDia = (iso: string) => `${['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(`${iso}T00:00:00Z`).getUTCDay()]} ${iso.slice(8)}/${iso.slice(5, 7)}`;

/** Resultado e pós-campo do ponto (FISCALIZADO_AUTUADO, motivo, protocolo, data da vistoria, observação). */
function FormularioResultado({ operacao, ponto, rotulo, hoje, protocolosSugeridos, aoTerminar }: {
  operacao: Operacao; ponto: Ponto; rotulo: string; hoje: string; protocolosSugeridos: string[]; aoTerminar: () => void;
}) {
  const [form, setForm] = useState<DadosResultado>({
    resultado: ponto.resultado ?? '', motivo: ponto.motivo ?? '', protocolo: ponto.protocolo ?? '', observacao: ponto.observacao ?? '', dataVistoria: ponto.dataVistoria ?? '',
  });
  const [lav, setLav] = useState<Record<DocumentoLavrado, string>>({
    auto: (ponto.lavrados?.auto ?? []).join('; '), notificacao: (ponto.lavrados?.notificacao ?? []).join('; '), embargo: (ponto.lavrados?.embargo ?? []).join('; '),
  });
  const original = useRef(JSON.stringify([form, lav]));
  usePendente(JSON.stringify([form, lav]) !== original.current);
  const [erro, setErro] = useState<string | null>(null);
  const id = useId();
  const viagem = viagemDoPonto(operacao, ponto);
  const dias = diasDaViagem(viagem);
  const exigeMotivo = !!form.resultado && RESULTADOS_COM_MOTIVO.includes(form.resultado);
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const problema = registrarResultado(operacao.id, ponto.id, { ...form, lavrados: Object.fromEntries(DOCUMENTOS_LAVRADOS.map((k) => [k, numerosDoTexto(lav[k])]).filter(([, v]) => v.length > 0)) }, hoje);
    setErro(problema);
    if (!problema) aoTerminar();
  };
  return (
    <form onSubmit={salvar} className="formulario" noValidate aria-label={`Resultado do ${rotulo}`}>
      <div className="grade grade--2 grade--topo">
        <label className="campo-grupo"><span>Resultado (fiscalizado/autuado)</span>
          <select className="campo" value={form.resultado} onChange={(e) => setForm({ ...form, resultado: e.target.value as '' | ResultadoPonto })}>
            <option value="">Sem resultado</option>
            {(Object.keys(RESULTADOS) as ResultadoPonto[]).map((r) => <option key={r} value={r}>{RESULTADOS[r]}</option>)}
          </select></label>
        <div>
          <label className="campo-grupo"><span>Data da vistoria</span>
            <input className="campo" type="date" max={hoje} value={form.dataVistoria} onChange={(e) => setForm({ ...form, dataVistoria: e.target.value })} /></label>
          {dias.length > 0 && dias.length <= 10 && (
            <span className="acoes" role="group" aria-label="Dias da viagem">
              <span className="texto-pequeno texto-suave">Dias da viagem:</span>
              {dias.map((dia) => (
                <button key={dia} type="button" className={`botao botao--pequeno${form.dataVistoria === dia ? ' botao--primario' : ''}`} aria-pressed={form.dataVistoria === dia}
                  onClick={() => setForm({ ...form, dataVistoria: dia })}>{rotuloDoDia(dia)}</button>
              ))}
            </span>
          )}
          {dias.length > 10 && <span className="texto-pequeno texto-suave">Viagem de {textoPeriodoViagem(viagem!)}.</span>}
          {viagem && dataForaDaViagem(viagem, form.dataVistoria) && <span className="texto-pequeno texto--atencao">Fora do período da viagem ({textoPeriodoViagem(viagem)}) — confira.</span>}
        </div>
        <label className="campo-grupo"><span>Motivo de não fiscalizar/autuar{exigeMotivo ? ' *' : ''}</span>
          <input className="campo" list={`${id}-motivos`} value={form.motivo} maxLength={LIMITES_OPERACAO.motivo} autoComplete="off" onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
          <datalist id={`${id}-motivos`}>{MOTIVOS_SUGERIDOS.map((m) => <option key={m} value={m} />)}</datalist></label>
        <label className="campo-grupo"><span>Protocolo (demanda e/ou auto)</span>
          <input className="campo" list={`${id}-protocolos`} value={form.protocolo} maxLength={LIMITES_OPERACAO.protocolo} autoComplete="off" onChange={(e) => setForm({ ...form, protocolo: e.target.value })} />
          <datalist id={`${id}-protocolos`}>{protocolosSugeridos.map((x) => <option key={x} value={x} />)}</datalist></label>
      </div>
      <fieldset className="grade grade--2">
        <legend className="texto-pequeno texto-suave">Documentos lavrados no ponto (só o n.º; vários separados por ponto e vírgula)</legend>
        {ROTULOS_LAVRADOS.map(([k, rotuloDoc]) => (
          <label key={k} className="campo-grupo"><span>{rotuloDoc}</span>
            <input className="campo" value={lav[k]} autoComplete="off" onChange={(e) => setLav({ ...lav, [k]: e.target.value })} /></label>
        ))}
      </fieldset>
      <label className="campo-grupo"><span>Observação</span>
        <textarea className="campo campo--area" rows={2} value={form.observacao} maxLength={LIMITES_OPERACAO.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></label>
      {form.resultado === 'nao' && <p className="texto-pequeno texto-suave">"Não" = não fiscalizado: o ponto fica a reprogramar até entrar em outra operação.</p>}
      {erro && <p role="alert" className="erro-campo">{erro}</p>}
      <div className="acoes">
        <button type="submit" className="botao botao--primario">Salvar resultado</button>
        <button type="button" className="botao" onClick={aoTerminar}>Cancelar</button>
      </div>
    </form>
  );
}

const CLASSE_SITUACAO: Partial<Record<SituacaoAcompanhamento, string>> = {
  finalizado: 'selo-situacao selo-situacao--ok', 'a-reprogramar': 'selo-situacao selo-situacao--atencao', 'resultado-pendente': 'selo-situacao selo-situacao--atencao',
};

function CartaoPonto({ operacao, ponto, todas, hoje, tiposDeDano, selecionado, aoSelecionar, aberto, aoDefinirAberto }: {
  operacao: Operacao; ponto: Ponto; todas: readonly Operacao[]; hoje: string; tiposDeDano: string[]; selecionado: boolean; aoSelecionar: (marcado: boolean) => void;
  /** Recolhido por padrão; quem manda é a lista (Expandir todos / Recolher todos). */
  aberto: boolean; aoDefinirAberto: (aberto: boolean) => void;
}) {
  const armazem = useArmazem();
  const { demandas } = useEstadoDemandas();
  const [modo, setModo] = useState<'ver' | 'editar' | 'resultado' | 'bloqueio' | 'relatorio' | 'cancelar' | 'reprogramar'>('ver');
  const [destinoReprog, setDestinoReprog] = useState('');
  const [relatorio, setRelatorio] = useState({ enviadoEm: '', protocoloSiga: '', notas: '' });
  const [form, setForm] = useState({ viagem: '', grupo: '', notas: '', numero: '', municipio: '', tipoDano: '', imovel: '', areaHa: '', car: '', situacaoCar: '' as SituacaoCar | '', etiquetas: [] as string[] });
  const [erro, setErro] = useState<string | null>(null);
  const [avisoTipo, setAvisoTipo] = useState<string | null>(null);
  const inicialPlanejamento = useRef('');
  usePendente(modo === 'editar' && JSON.stringify(form) !== inicialPlanejamento.current);
  const [ligar, setLigar] = useState('');
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const idCampos = useId();
  // Formulário aberto (resultado, relatório, bloqueio, planejamento, cancelamento) abre o cartão sozinho.
  useEffect(() => { if (modo !== 'ver') aoDefinirAberto(true); }, [modo]); // eslint-disable-line react-hooks/exhaustive-deps

  const rotulo = ponto.numero !== undefined ? `Ponto ${ponto.numero}` : 'Ponto';
  const viagem = viagemDoPonto(operacao, ponto);
  const situacao = situacaoDoPonto(ponto);
  const conflito = conflitoDeCodigo(operacao, ponto);
  const destinoReprogramado = ponto.reprogramado ? todas.find((o) => o.id === ponto.reprogramado!.operacao) : undefined;
  const proximos = useMemo(
    () => pontosProximos(ponto, todas, demandas.filter((d) => !ponto.demandas.includes(d.id)).map((d) => ({ id: d.id, titulo: d.titulo, coordenada: d.coordenada }))),
    [ponto, todas, demandas],
  );
  const ligadas = ponto.demandas.map((id) => demandas.find((d) => d.id === id)).filter((d) => d !== undefined);

  // O formulário parte do ponto como está agora (agrupar em lote ou mudar de viagem não pode ser desfeito por um "Salvar" antigo).
  const abrirEdicao = () => {
    const novo = { viagem: ponto.viagem ?? '', grupo: ponto.grupo ?? '', notas: ponto.notas, numero: ponto.numero !== undefined ? String(ponto.numero) : '', municipio: ponto.municipio, tipoDano: ponto.tipoDano ?? '', imovel: ponto.imovel ?? '', areaHa: ponto.areaHa !== undefined ? String(ponto.areaHa).replace('.', ',') : '', car: ponto.car ?? '', situacaoCar: (ponto.situacaoCar ?? '') as SituacaoCar | '', etiquetas: ponto.etiquetas ?? [] };
    setErro(null);
    inicialPlanejamento.current = JSON.stringify(novo);
    setForm(novo);
    setModo('editar');
  };
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const numero = form.numero.trim();
    if (numero && !/^\d+$/.test(numero)) return setErro('O número do ponto deve ser um inteiro.');
    const areaTexto = form.areaHa.trim().replace(',', '.');
    const areaHa = areaTexto ? Number(areaTexto) : undefined;
    if (areaHa !== undefined && !(areaHa > 0)) return setErro('A área deve ser um número maior que zero.');
    const problema = alterarPonto(operacao.id, ponto.id, {
      imovel: form.imovel.trim(), car: form.car.trim(), areaHa, situacaoCar: form.situacaoCar || undefined, etiquetas: form.etiquetas,
      viagem: form.viagem, grupo: form.grupo.trim(), notas: form.notas.trim(), municipio: form.municipio.replace(/\s+/g, ' ').trim(), tipoDano: form.tipoDano.trim(),
      ...(numero ? { numero: Number(numero) } : {}),
    });
    setErro(problema);
    if (!problema) {
      setModo('ver');
      setAvisoTipo(!inspecaoAtiva(ponto) && inspecaoAtiva({ tipoDano: form.tipoDano.trim() }) ? 'Este tipo de dano acrescenta ao ponto o POP e a Inspeção de agrotóxicos.' : null);
    }
  };
  const reativar = () => setErro(alterarPonto(operacao.id, ponto.id, { situacao: 'planejado', motivoCancelamento: '' }));
  // Cancelar a vistoria pede o motivo (campo próprio do ponto).
  const confirmarCancelamento = (e: FormEvent) => {
    e.preventDefault();
    const motivo = motivoCancelamento.replace(/\s+/g, ' ').trim();
    if (!motivo) return setErro('Informe o motivo do cancelamento.');
    const problema = alterarPonto(operacao.id, ponto.id, { situacao: 'cancelado', motivoCancelamento: motivo });
    setErro(problema);
    if (!problema) { setModo('ver'); setMotivoCancelamento(''); }
  };
  const ligarDemanda = () => {
    if (!ligar) return;
    setErro(alterarPonto(operacao.id, ponto.id, { demandas: [...ponto.demandas, ligar] }));
    setLigar('');
  };
  const desligar = (id: string) => setErro(alterarPonto(operacao.id, ponto.id, { demandas: ponto.demandas.filter((x) => x !== id) }));

  const base = ponto.numero !== undefined ? `ponto ${ponto.numero} de ${operacao.nome}` : operacao.nome;
  const tituloNova = `Vistoria${ponto.municipio ? ` em ${ponto.municipio}` : ''} (${base})`.slice(0, 120);
  const jaCriada = ligadas.some((d) => d.titulo === tituloNova);
  const criarDemanda = () => {
    if (jaCriada) return setErro('A demanda deste ponto já foi criada e está ligada a ele.');
    const r = armazem.criar({
      titulo: tituloNova,
      descricao: [ponto.codigo ? `Ponto ${ponto.codigo}.` : '', ponto.tipoDano ? `Tipo de dano: ${ponto.tipoDano}.` : '', ponto.notas].filter(Boolean).join(' '),
      responsavel: '',
      prioridade: 'Média',
      status: 'A Fazer',
      prazo: '',
      tipo: 'campo',
      natureza: 'demanda',
      coordenada: formatarDecimal(ponto.coordenada),
      ...(viagem?.saida ? { vistoria: 'data' as const, vistoriaData: viagem.saida } : { vistoria: 'aberta' as const }),
    });
    if (!r.ok || !r.demanda) return setErro(r.ok ? 'Não foi possível criar a demanda.' : r.mensagem);
    setErro(alterarPonto(operacao.id, ponto.id, { demandas: [...ponto.demandas, r.demanda.id] }));
  };
  const livres = demandas.filter((d) => !ponto.demandas.includes(d.id));
  const cancelado = ponto.situacao === 'cancelado';
  const fase = faseDoPonto(ponto);
  const vencido = pontoVencido(operacao, ponto, hoje, prazosDeElaboracao(demandas));
  const prazoRelatorio = fase === 'elaboracao' ? prazoDaElaboracao(operacao, ponto, prazosDeElaboracao(demandas)) : null;
  const abrirRelatorio = () => {
    setRelatorio({ enviadoEm: ponto.relatorio?.enviadoEm ?? hoje, protocoloSiga: ponto.relatorio?.protocoloSiga ?? '', notas: ponto.relatorio?.notas ?? '' });
    setErro(null);
    setModo('relatorio');
  };
  // Registrar o envio com anotações abertas pergunta antes (não bloqueia).
  const [confirmaEnvio, setConfirmaEnvio] = useState(false);
  // Bloco do POP IBAMA ativo (tipo de dano de supressão ou ativado pelo botão): quantos itens de campo faltam entra no aviso do envio.
  const supressao = blocoPopAtivo(ponto);
  const faltamPop = supressao ? itensDeCampoSemResposta(ponto.caracterizacao).length : 0;
  const gravarRelatorio = () => {
    const problema = registrarRelatorio(operacao.id, ponto.id, relatorio, hoje);
    setErro(problema);
    setConfirmaEnvio(false);
    if (!problema) setModo('ver');
  };
  const salvarRelatorio = (e: FormEvent) => {
    e.preventDefault();
    if (relatorio.enviadoEm && fase !== 'concluido' && (contarAbertas(ponto.anotacoes) > 0 || faltamPop > 0)) return setConfirmaEnvio(true);
    gravarRelatorio();
  };

  return (
    <li id={`ponto-${ponto.id}`} className={`cartao ponto-cartao${aberto ? ' grade-linha-inteira' : ''}`} data-testid={`ponto-${ponto.id}`}>
      <div className="ponto-linha">
        <input type="checkbox" checked={selecionado} aria-label={`Selecionar ${rotulo}`} onChange={(e) => aoSelecionar(e.target.checked)} />
        <button type="button" className="ponto-gatilho" aria-expanded={aberto} aria-controls={`${idCampos}-corpo`} onClick={() => aoDefinirAberto(!aberto)}>
          <span aria-hidden="true" className="ponto-seta">{aberto ? '▾' : '▸'}</span>
          <span className="ponto-titulo"><strong>{rotulo}</strong>{ponto.municipio && <> · {ponto.municipio}</>}</span>
          {ponto.codigo && <span className="ponto-codigo mono texto-pequeno" title={ponto.codigo}>{ponto.codigo}</span>}
        </button>
      </div>
      <div className="ponto-selos">
          <span className={fase === 'concluido' ? 'selo-situacao selo-situacao--ok' : fase === 'elaboracao' ? 'selo-situacao' : CLASSE_SITUACAO[situacao] ?? 'texto-pequeno texto-suave'} data-testid={`situacao-${ponto.id}`}>
            {fase === 'elaboracao' || fase === 'concluido' ? ROTULO_FASE[fase] : SITUACOES_ACOMPANHAMENTO[situacao]}
          </span>
          {vencido && <span className="selo-situacao selo-situacao--atencao" data-testid={`selo-vencido-${ponto.id}`}>vencido</span>}
          {pontoTravado(ponto) && <span className="selo-situacao selo-situacao--atencao" data-testid={`selo-travado-${ponto.id}`}>travado</span>}
          <SeloAnotacoes anotacoes={ponto.anotacoes} testid={`anotacoes-${ponto.id}`} />
          {cancelado && ponto.motivoCancelamento && <span className="texto-pequeno texto-suave" data-testid={`motivo-cancelamento-${ponto.id}`}>· {ponto.motivoCancelamento}</span>}
      </div>
      <QuarentenaDoPonto operacao={operacao} ponto={ponto} rotulo={rotulo} />
      <div id={`${idCampos}-corpo`} hidden={!aberto} className="ponto-corpo">
      <dl className="dados-definicao">
        <dt>Código</dt><dd className="mono" data-testid={`codigo-${ponto.id}`}>{ponto.codigo ?? <span className="texto--atencao">sem código</span>}</dd>
        <dt>Coordenada</dt><dd className="mono">{formatarGms(ponto.coordenada)}</dd>
        {ponto.tipoDano && <><dt>Tipo de dano</dt><dd data-testid={`tipo-dano-${ponto.id}`}>{ponto.tipoDano}</dd></>}
        {ponto.imovel && <><dt>Imóvel / local</dt><dd data-testid={`imovel-${ponto.id}`}>{ponto.imovel}</dd></>}
        {ponto.areaHa !== undefined && <><dt>Desmate (ha)</dt><dd data-testid={`area-${ponto.id}`}>{String(ponto.areaHa).replace('.', ',')}</dd></>}
        {(ponto.car || ponto.situacaoCar) && <><dt>CAR</dt><dd data-testid={`car-${ponto.id}`}>{[ponto.car, ponto.situacaoCar && SITUACOES_CAR[ponto.situacaoCar]].filter(Boolean).join(' · ')}</dd></>}
        {ponto.etiquetas && <><dt>Etiquetas</dt><dd data-testid={`etiquetas-${ponto.id}`}>{ponto.etiquetas.map((e) => <span key={e} className="selo-situacao texto-pequeno">{e}</span>)}</dd></>}
        <dt>Viagem</dt><dd data-testid={`viagem-ponto-${ponto.id}`}>{viagem ? textoViagem(viagem) : <span className="texto--atencao">sem viagem</span>}</dd>
        {ponto.grupo && <><dt>Grupo</dt><dd data-testid={`grupo-${ponto.id}`}>{ponto.grupo}</dd></>}
        {ponto.notas && <><dt>Notas</dt><dd>{ponto.notas}</dd></>}
        {ponto.resultado && (
          <><dt>Resultado</dt><dd data-testid={`resultado-${ponto.id}`}>{RESULTADOS[ponto.resultado]}{ponto.motivo && <> · {ponto.motivo}</>}</dd></>
        )}
        {ponto.lavrados && (
          <><dt>Documentos lavrados</dt><dd data-testid={`lavrados-${ponto.id}`}>{ROTULOS_LAVRADOS.filter(([k]) => ponto.lavrados?.[k]).map(([k, r]) => `${r.replace(/\(.*?\)/, '').replace(': n.º', '')}: ${ponto.lavrados![k]!.join(', ')}`).join(' · ')}</dd></>
        )}
        {ponto.bloqueio && (
          <><dt>Bloqueio</dt><dd data-testid={`bloqueio-${ponto.id}`}>
            {(textoBloqueio(ponto, new Date(`${hoje}T12:00:00`), {}, 'travado') ?? '').replace('⛔ ', '')}
            {ponto.bloqueio.detalhe && <> — {ponto.bloqueio.detalhe}</>}
          </dd></>
        )}
        {ponto.dataVistoria && <><dt>Vistoria</dt><dd>{dataBr(ponto.dataVistoria)}</dd></>}
        {ponto.protocolo && <><dt>Protocolo</dt><dd className="mono">{ponto.protocolo}</dd></>}
        {ponto.observacao && <><dt>Observação</dt><dd>{ponto.observacao}</dd></>}
        {ponto.reprogramado && <><dt>Reprogramado</dt><dd>para {destinoReprogramado?.nome ?? 'outra operação'}</dd></>}
        {ligadas.length > 0 && (
          <><dt>Demandas</dt><dd>{ligadas.map((d) => (
            <span key={d.id} className="texto-pequeno" data-testid={`ligada-${ponto.id}`}>
              {d.titulo}{' '}
              <button type="button" className="botao botao--pequeno" aria-label={`Desligar ${d.titulo}`} onClick={() => desligar(d.id)}>Desligar</button>{' '}
            </span>
          ))}</dd></>
        )}
      </dl>

      {(fase === 'elaboracao' || fase === 'concluido') && (
        <section aria-label={`Relatório (SIGA-MT) do ${rotulo}`} data-testid={`relatorio-${ponto.id}`}>
          <h4 className="titulo-secao titulo-secao--bloco">Relatório (SIGA-MT)</h4>
          <p className="texto-pequeno" data-testid={`fase-${ponto.id}`}>
            {fase === 'concluido' ? `Concluído em ${dataBr(ponto.relatorio!.enviadoEm)}` : 'Em elaboração'}
            {ponto.relatorio?.protocoloSiga && <> · SIGA nº {ponto.relatorio.protocoloSiga}</>}
            {prazoRelatorio && <> · prazo {dataBr(prazoRelatorio)}</>}
            {vencido && <span className="texto--atencao"> · vencido</span>}
          </p>
          {ponto.relatorio?.notas && <p className="texto-pequeno texto-suave">{ponto.relatorio.notas}</p>}
        </section>
      )}

      {proximos.length > 0 && (
        <div className="aviso" data-testid={`proximos-${ponto.id}`}>
          <p><strong>Local já aparece em outro registro</strong> (até 200 m; confira, a decisão é sua):</p>
          <ul className="lista-limpa">{proximos.map((l) => <li key={`${l.origem}-${l.id}`} className="texto-pequeno">{textoLocalProximo(l)}</li>)}</ul>
        </div>
      )}

      {conflito && <p className="texto-pequeno texto--atencao" data-testid={`conflito-codigo-${ponto.id}`}>{conflito}</p>}
      {erro && <p role="alert" className="erro-campo">{erro}</p>}
      {avisoTipo && modo === 'ver' && <p role="status" className="texto-pequeno" data-testid={`aviso-tipo-${ponto.id}`}>{avisoTipo}</p>}

      {modo === 'ver' && (
        <AnotacoesDoItem item="ponto" anotacoes={ponto.anotacoes} aoMudar={(lista) => setErro(salvarAnotacoesPonto(operacao.id, ponto.id, lista))} />
      )}
      {modo === 'ver' && supressao && (
        <CaracterizacaoDoPonto ponto={ponto} rotulo={rotulo} aoMudar={(m) => setErro(alterarPonto(operacao.id, ponto.id, m))} aoReconsultar={() => consultarPontos(operacao.id, [ponto.id])} />
      )}
      {modo === 'ver' && inspecaoAtiva(ponto) && (
        <InspecaoDoPonto ponto={ponto} rotulo={rotulo} aoMudar={(m) => setErro(alterarPonto(operacao.id, ponto.id, m))} />
      )}
      {modo === 'ver' && supressao && (
        <RelatorioDoPonto operacao={operacao} ponto={ponto} rotulo={rotulo} aoMudar={(m) => setErro(alterarPonto(operacao.id, ponto.id, m))} aoBaixar={baixar} aoConsultar={() => consultarBasesDoPonto(operacao.id, ponto.id)} />
      )}

      {modo === 'resultado' ? (
        <FormularioResultado operacao={operacao} ponto={ponto} rotulo={rotulo} hoje={hoje}
          protocolosSugeridos={ligadas.map((d) => d.processo).filter((x): x is string => !!x)} aoTerminar={() => setModo('ver')} />
      ) : modo === 'relatorio' ? (
        <form onSubmit={salvarRelatorio} className="formulario" noValidate aria-label={`Envio do relatório do ${rotulo}`}>
          <div className="grade grade--2 grade--topo">
            <label className="campo-grupo"><span>Data de envio no SIGA-MT</span>
              <input className="campo" type="date" max={hoje} value={relatorio.enviadoEm} onChange={(e) => setRelatorio({ ...relatorio, enviadoEm: e.target.value })} /></label>
            <label className="campo-grupo"><span>Número no SIGA-MT (opcional)</span>
              <input className="campo" value={relatorio.protocoloSiga} maxLength={LIMITES_OPERACAO.protocolo} autoComplete="off" onChange={(e) => setRelatorio({ ...relatorio, protocoloSiga: e.target.value })} /></label>
          </div>
          <label className="campo-grupo"><span>Notas (opcional)</span>
            <textarea className="campo campo--area" rows={2} value={relatorio.notas} maxLength={LIMITES_OPERACAO.observacao} onChange={(e) => setRelatorio({ ...relatorio, notas: e.target.value })} /></label>
          <p className="texto-pequeno texto-suave">Data em branco desfaz o envio e o ponto volta para "em elaboração".</p>
          {confirmaEnvio && <ConfirmaConclusao anotacoes={ponto.anotacoes} itensPopSemResposta={faltamPop} aoConcluir={gravarRelatorio} aoVoltar={() => setConfirmaEnvio(false)} />}
          {erro && <p role="alert" className="erro-campo">{erro}</p>}
          <div className="acoes">
            <button type="submit" className="botao botao--primario">Salvar envio</button>
            <button type="button" className="botao" onClick={() => { setModo('ver'); setErro(null); }}>Cancelar</button>
          </div>
        </form>
      ) : modo === 'bloqueio' ? (
        <>
          <BloqueioDoItem item="ponto" bloqueio={ponto.bloqueio} abrirEditor aoCancelar={() => setModo('ver')}
            aoDestravar={() => { const p = destravarPonto(operacao.id, ponto.id); setErro(p); if (!p) setModo('ver'); }}
            aoTravar={(motivo, detalhe) => { const p = travarPonto(operacao.id, ponto.id, motivo, detalhe, new Date().toISOString()); setErro(p); if (!p) setModo('ver'); }} />
          <div className="acoes"><button type="button" className="botao" onClick={() => setModo('ver')}>Fechar</button></div>
        </>
      ) : modo === 'editar' ? (
        <form onSubmit={salvar} className="formulario" noValidate aria-label={`Editar planejamento do ${rotulo}`}>
          <div className="grade grade--2">
            <label className="campo-grupo"><span>Número do ponto</span>
              <input className="campo" inputMode="numeric" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></label>
            <label className="campo-grupo"><span>Município</span>
              <input className="campo" value={form.municipio} maxLength={LIMITES_OPERACAO.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></label>
            <label className="campo-grupo"><span>Tipo de dano</span>
              <input className="campo" list={`${idCampos}-danos`} value={form.tipoDano} maxLength={LIMITES_OPERACAO.tipoDano} autoComplete="off" onChange={(e) => setForm({ ...form, tipoDano: e.target.value })} />
              <datalist id={`${idCampos}-danos`}>{tiposDeDano.map((x) => <option key={x} value={x} />)}</datalist></label>
            <label className="campo-grupo"><span>Viagem</span>
              <select className="campo" value={form.viagem} onChange={(e) => setForm({ ...form, viagem: e.target.value })}>
                <option value="">Sem viagem</option>
                {ordenarViagens(operacao.viagens).map((v) => <option key={v.id} value={v.id}>{textoViagem(v)}</option>)}
              </select></label>
            <label className="campo-grupo"><span>Grupo</span>
              <input className="campo" value={form.grupo} maxLength={LIMITES_OPERACAO.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} /></label>
            <label className="campo-grupo"><span>Imóvel / local</span>
              <input className="campo" value={form.imovel} maxLength={LIMITES_OPERACAO.imovel} autoComplete="off" onChange={(e) => setForm({ ...form, imovel: e.target.value })} /></label>
            <label className="campo-grupo"><span>Desmate (ha)</span>
              <input className="campo" inputMode="decimal" value={form.areaHa} autoComplete="off" onChange={(e) => setForm({ ...form, areaHa: e.target.value })} /></label>
            <label className="campo-grupo"><span>CAR estadual</span>
              <input className="campo" value={form.car} maxLength={LIMITES_OPERACAO.car} autoComplete="off" onChange={(e) => setForm({ ...form, car: e.target.value })} /></label>
            <label className="campo-grupo"><span>Situação do CAR</span>
              <select className="campo" value={form.situacaoCar} onChange={(e) => setForm({ ...form, situacaoCar: e.target.value as SituacaoCar | '' })}>
                <option value="">Não informada</option>
                {(Object.keys(SITUACOES_CAR) as SituacaoCar[]).map((k) => <option key={k} value={k}>{SITUACOES_CAR[k]}</option>)}
              </select></label>
          </div>
          <CampoLista rotulo="Etiquetas" itens={form.etiquetas} sugestoes={[...ETIQUETAS_SUGERIDAS]} max={LIMITES_OPERACAO.etiqueta} aoMudar={(etiquetas) => setForm({ ...form, etiquetas })} />
          <label className="campo-grupo"><span>Notas</span>
            <textarea className="campo campo--area" rows={2} value={form.notas} maxLength={LIMITES_OPERACAO.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></label>
          <div className="acoes">
            <button type="submit" className="botao botao--primario">Salvar ponto</button>
            <button type="button" className="botao" onClick={() => { setModo('ver'); setErro(null); }}>Cancelar</button>
          </div>
        </form>
      ) : modo === 'reprogramar' ? (
        <form className="formulario" noValidate aria-label={`Reprogramar ${rotulo}`} onSubmit={(e) => {
          e.preventDefault();
          const problema = reprogramarPonto(operacao.id, ponto.id, destinoReprog);
          setErro(problema);
          if (!problema) setModo('ver');
        }}>
          <label className="campo-grupo"><span>Levar para a operação</span>
            <select className="campo" aria-label={`Operação para reprogramar ${rotulo}`} value={destinoReprog} onChange={(e) => setDestinoReprog(e.target.value)}>
              <option value="">Escolha…</option>
              {todas.filter((o) => o.id !== operacao.id && !campoEncerrado(o)).map((o) => <option key={o.id} value={o.id}>{o.nome} ({textoPeriodo(o)})</option>)}
            </select></label>
          {todas.filter((o) => o.id !== operacao.id && !campoEncerrado(o)).length === 0 && <p className="texto-pequeno texto-suave">Crie a próxima operação para reprogramar.</p>}
          <div className="acoes">
            <button type="submit" className="botao botao--primario" disabled={!destinoReprog}>Confirmar reprogramação</button>
            <button type="button" className="botao" onClick={() => { setModo('ver'); setErro(null); }}>Voltar</button>
          </div>
        </form>
      ) : modo === 'cancelar' ? (
        <form onSubmit={confirmarCancelamento} className="formulario" noValidate aria-label={`Cancelar vistoria do ${rotulo}`}>
          <label className="campo-grupo"><span>Motivo do cancelamento</span>
            <input className="campo" value={motivoCancelamento} maxLength={100} autoComplete="off" onChange={(e) => setMotivoCancelamento(e.target.value)} /></label>
          <div className="acoes">
            <button type="submit" className="botao botao--perigo">Confirmar cancelamento</button>
            <button type="button" className="botao" onClick={() => { setModo('ver'); setErro(null); }}>Voltar</button>
          </div>
        </form>
      ) : (
        <>
          {!cancelado && (
            <div className="ponto-demanda bloco-detalhe" role="group" aria-label={`Demanda do ${rotulo}`}>
              <span className="ponto-demanda__rotulo">Demanda</span>
              {livres.length > 0 && (
                <>
                  <select className="campo ponto-demanda__select" aria-label={`Ligar a uma demanda existente (${rotulo})`} value={ligar} onChange={(e) => setLigar(e.target.value)}>
                    <option value="">Ligar a uma demanda existente…</option>
                    {livres.map((d) => <option key={d.id} value={d.id}>{d.titulo}</option>)}
                  </select>
                  <button type="button" className="botao botao--pequeno" disabled={!ligar} aria-label={`Ligar demanda ao ${rotulo}`} onClick={ligarDemanda}>Ligar</button>
                  <span className="texto-pequeno texto-suave">ou</span>
                </>
              )}
              <button type="button" className="botao botao--pequeno" disabled={jaCriada} aria-label={`Converter ${rotulo} em demanda`} onClick={criarDemanda}>
                {jaCriada ? 'Demanda já criada' : 'Converter em demanda'}
              </button>
            </div>
          )}
          <div className="ponto-barra bloco-detalhe">
            {!cancelado && (
              <div className="ponto-barra__grupo" role="group" aria-label={`Ações do ${rotulo}`}>
                {!supressao && (
                  <button type="button" className="botao botao--pequeno" onClick={() => setErro(alterarPonto(operacao.id, ponto.id, { popAtivo: true }))}>Caracterizar dano (POP)</button>
                )}
                {!inspecaoAtiva(ponto) && (
                  <button type="button" className="botao botao--pequeno" onClick={() => setErro(alterarPonto(operacao.id, ponto.id, { inspecaoAtiva: true }))}>Adicionar inspeção de agrotóxicos</button>
                )}
                {!ponto.reprogramado && ponto.resultado && (
                  <button type="button" className="botao botao--pequeno" aria-label={`Editar resultado do ${rotulo}`} onClick={() => { setErro(null); setModo('resultado'); }}>Editar resultado</button>
                )}
                {fase === 'concluido' && (
                  <button type="button" className="botao botao--pequeno" aria-label={`Editar relatório no SIGA do ${rotulo}`} onClick={abrirRelatorio}>Editar relatório no SIGA</button>
                )}
                <button type="button" className="botao botao--pequeno" aria-label={`Editar planejamento do ${rotulo}`} onClick={abrirEdicao}>Editar planejamento</button>
              </div>
            )}
            <div className="ponto-barra__grupo ponto-barra__fim">
              {!cancelado && !ponto.reprogramado && (
                <button type="button" className="botao botao--pequeno" aria-label={ponto.bloqueio ? `Editar bloqueio do ${rotulo}` : `Travar ${rotulo}`} onClick={() => { setErro(null); setModo('bloqueio'); }}>
                  {ponto.bloqueio ? 'Editar bloqueio' : 'Travar'}
                </button>
              )}
              <details className="mais-acoes">
                <summary aria-label={`Mais ações do ${rotulo}`} title="Mais ações">⋯</summary>
                <div className="acoes acoes--base">
                  {cancelado && <button type="button" className="botao botao--pequeno" aria-label={`Reativar ${rotulo}`} onClick={reativar}>Reativar</button>}
                  {!cancelado && !ponto.reprogramado && !ponto.resultado && (
                    <button type="button" className="botao botao--pequeno" aria-label={`Cancelar vistoria do ${rotulo}`} onClick={() => { setErro(null); setMotivoCancelamento(''); setModo('cancelar'); }}>Cancelar vistoria</button>
                  )}
                  <button
                    type="button" className="botao botao--pequeno botao--perigo" aria-label={`Excluir ${rotulo}`}
                    onClick={() => { if (window.confirm(`Excluir o ${rotulo}? Esta ação não pode ser desfeita. Para tirar o ponto da operação sem perder o histórico, prefira "Cancelar vistoria".`)) excluirPonto(operacao.id, ponto.id); }}
                  >Excluir ponto</button>
                </div>
              </details>
            </div>
          </div>
        </>
      )}

      </div>
      <div className="ponto-rodape">
          {pontoTravado(ponto) && (
            <button type="button" className="botao botao--pequeno" aria-label={`Destravar ${rotulo}`} onClick={() => setErro(destravarPonto(operacao.id, ponto.id))}>Destravar</button>
          )}
          {modo === 'ver' && fase === 'campo' && (
            <button type="button" className="botao botao--pequeno botao--primario" aria-label={`Registrar resultado do ${rotulo}`} onClick={() => { setErro(null); setModo('resultado'); }}>Registrar resultado</button>
          )}
          {modo === 'ver' && situacao === 'a-reprogramar' && (
            <button type="button" className="botao botao--pequeno botao--primario" aria-label={`Reprogramar ${rotulo}`} onClick={() => { setErro(null); setDestinoReprog(''); setModo('reprogramar'); }}>Reprogramar</button>
          )}
          {modo === 'ver' && fase === 'elaboracao' && (
            <button type="button" className="botao botao--pequeno botao--primario" aria-label={`Registrar relatório no SIGA do ${rotulo}`} onClick={abrirRelatorio}>Registrar relatório no SIGA</button>
          )}
      </div>
    </li>
  );
}

// ---------- Período da operação ----------

function PeriodoOperacao({ operacao }: { operacao: Operacao }) {
  const [inicio, setInicio] = useState(operacao.inicio ?? '');
  const [fim, setFim] = useState(operacao.fim ?? '');
  const [motivo, setMotivo] = useState<'' | MotivoPeriodo>('');
  const [erro, setErro] = useState<string | null>(null);
  const mudou = inicio !== (operacao.inicio ?? '') || fim !== (operacao.fim ?? '');
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    setErro(alterarPeriodo(operacao.id, inicio, fim, motivo ? { motivo } : {}));
    setMotivo('');
  };
  return (
    <form onSubmit={salvar} className="grade grade--2" noValidate aria-label="Período da operação">
      <label className="campo-grupo"><span>Início do período</span>
        <input className="campo" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
      <label className="campo-grupo"><span>Fim do período</span>
        <input className="campo" type="date" value={fim} onChange={(e) => setFim(e.target.value)} /></label>
      {mudou && (operacao.inicio || operacao.fim) && <CampoMotivo valor={motivo} aoMudar={setMotivo} />}
      {erro && <span role="alert" className="erro-campo">{erro}</span>}
      <div className="acoes"><button type="submit" className="botao botao--pequeno">Salvar período</button></div>
    </form>
  );
}

// ---------- Pendências de campo (não deixar acumular) ----------

// TODO: este aviso (dentro da operação aberta) ainda usa o texto longo antigo; alinhar ao formato da lista (título + linhas) quando for pedido.
function textoPendencias(semResultado: number, aReprogramar: number, relatorioAtrasado = 0, travados = 0): string {
  const partes = [
    semResultado ? `${plural(semResultado, 'ponto sem resultado', 'pontos sem resultado')} depois do retorno da viagem` : '',
    relatorioAtrasado ? `${plural(relatorioAtrasado, 'ponto com o relatório (SIGA-MT) atrasado', 'pontos com o relatório (SIGA-MT) atrasado')}` : '',
    aReprogramar ? `${plural(aReprogramar, 'ponto não fiscalizado a reprogramar', 'pontos não fiscalizados a reprogramar')}` : '',
    travados ? `${plural(travados, 'ponto travado', 'pontos travados')}` : '',
  ].filter(Boolean);
  return `Há ${partes.join(' e ')}. O bloqueio não suspende o prazo: resolva o motivo, registre o resultado, envie o relatório ou reprograme para não acumular.`;
}

const temPendencia = (p: { semResultado: unknown[]; relatorioAtrasado: unknown[]; aReprogramar: unknown[]; travados: unknown[] }) =>
  p.semResultado.length + p.relatorioAtrasado.length + p.aReprogramar.length + p.travados.length > 0;

/** Pontos travados da operação aberta, do bloqueio mais antigo ao mais recente, com o motivo e há quantos dias. */
function PontosTravados({ travados, hoje }: { travados: readonly PendenciaDeCampo[]; hoje: string }) {
  if (travados.length === 0) return null;
  return (
    <div data-testid="pontos-travados">
      <p className="texto-pequeno"><strong>Travados</strong> (parados desde a data do bloqueio):</p>
      <ul className="lista-limpa" aria-label="Pontos travados">
        {travados.map((x) => (
          <li key={x.ponto.id} className="texto-pequeno" data-testid={`travado-${x.ponto.id}`}>
            {rotuloDoPonto(x.ponto)} — {MOTIVOS_BLOQUEIO[x.ponto.bloqueio!.motivo]} · {textoParado(diasParado(x.ponto.bloqueio!, hoje))}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Aviso do mascote na lista: uma linha por operação (nome | contagens | Abrir), as 3 com mais pendências primeiro, e os travados com Abrir direto no ponto. */
function PendenciasDoMascote({ operacoes, pendencias, hoje, aoAbrir }: {
  operacoes: readonly Operacao[]; pendencias: ReturnType<typeof pendenciasDeCampo>; hoje: string; aoAbrir: (operacaoId: string, pontoId?: string) => void;
}) {
  const [todas, setTodas] = useState(false);
  const linhas = operacoes
    .map((o) => {
      const de = (l: readonly PendenciaDeCampo[]) => l.filter((x) => x.operacao.id === o.id).length;
      const partes = ([
        [de(pendencias.semResultado), 'sem resultado', 'sem resultado'], [de(pendencias.relatorioAtrasado), 'relatório atrasado', 'relatórios atrasados'], [de(pendencias.aReprogramar), 'a reprogramar', 'a reprogramar'],
      ] as const).filter(([n]) => n > 0);
      return { o, partes, n: partes.reduce((t, [n]) => t + n, 0) };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.o.nome.localeCompare(b.o.nome, 'pt-BR'));
  const visiveis = todas ? linhas : linhas.slice(0, 3);
  return (
    <FalaMascote id="pendencias-campo">
      <p id="pendencias-campo-titulo"><strong>Pendências pós-campo</strong> · O bloqueio não suspende o prazo. Resolva o motivo, registre o resultado ou reprograme.</p>
      {linhas.length > 0 && (
        <ul className="lista-limpa pendencias-lista" aria-label="Operações com pendências">
          {visiveis.map(({ o, partes }) => (
            <li key={o.id} className="pendencia-linha texto-pequeno" data-testid={`pendencia-${o.id}`}>
              <strong>{o.nome}</strong>
              <span>{partes.map(([n, um, varios], i) => <span key={um} className="sem-quebra">{i > 0 && ' · '}{plural(n, um, varios)}</span>)}</span>
              <button type="button" className="botao botao--pequeno" aria-label={`Abrir ${o.nome} (pendências)`} onClick={() => aoAbrir(o.id)}>Abrir</button>
            </li>
          ))}
        </ul>
      )}
      {linhas.length > 3 && <button type="button" className="botao botao--pequeno" onClick={() => setTodas(!todas)}>{todas ? 'Ver só as 3 primeiras' : `Ver todas (${linhas.length})`}</button>}
      {pendencias.travados.length > 0 && (
        <div data-testid="pontos-travados">
          <p className="texto-pequeno"><strong>Travados</strong></p>
          <ul className="lista-limpa pendencias-lista" aria-label="Pontos travados">
            {pendencias.travados.map((x) => {
              const dias = diasParado(x.ponto.bloqueio!, hoje);
              return (
                <li key={x.ponto.id} className="pendencia-linha texto-pequeno" data-testid={`travado-${x.ponto.id}`}>
                  <span>{rotuloDoPonto(x.ponto)} · {x.operacao.nome} · {MOTIVOS_BLOQUEIO[x.ponto.bloqueio!.motivo]}</span>
                  <span className="sem-quebra">{dias === 0 ? 'hoje' : `há ${plural(dias, 'dia', 'dias')}`}</span>
                  <button type="button" className="botao botao--pequeno" aria-label={`Abrir ${rotuloDoPonto(x.ponto)} em ${x.operacao.nome}`} onClick={() => aoAbrir(x.operacao.id, x.ponto.id)}>Abrir</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </FalaMascote>
  );
}

const textoSelo = (pr: ProgressoDaOperacao) =>
  pr.selo === 'campo-encerrado'
    ? `Campo encerrado${pr.emElaboracao ? ` · ${pr.emElaboracao} em elaboração` : ''}${pr.travados ? ` · ${plural(pr.travados, 'travado', 'travados')}` : ''}`
    : ROTULO_SELO[pr.selo];

function Reprogramar({ operacoes, item }: { operacoes: readonly Operacao[]; item: { operacao: Operacao; ponto: Ponto } }) {
  const [destino, setDestino] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const outras = operacoes.filter((o) => o.id !== item.operacao.id && !campoEncerrado(o));
  const rotulo = rotuloDoPonto(item.ponto);
  return (
    <li className="texto-pequeno" data-testid={`a-reprogramar-${item.ponto.id}`}>
      <strong>{rotulo}</strong> ({item.operacao.nome}{item.ponto.motivo ? `; ${item.ponto.motivo}` : ''})
      <div className="acoes acoes--base">
        <label className="campo-grupo"><span className="texto-pequeno">Levar para</span>
          <select className="campo" aria-label={`Operação para reprogramar ${rotulo}`} value={destino} onChange={(e) => setDestino(e.target.value)}>
            <option value="">Escolha…</option>
            {outras.map((o) => <option key={o.id} value={o.id}>{o.nome} ({textoPeriodo(o)})</option>)}
          </select></label>
        <button type="button" className="botao botao--pequeno" disabled={!destino} aria-label={`Reprogramar ${rotulo}`}
          onClick={() => setErro(reprogramarPonto(item.operacao.id, item.ponto.id, destino))}>Reprogramar</button>
      </div>
      {outras.length === 0 && <p className="texto-suave">Crie a próxima operação para reprogramar.</p>}
      {erro && <p role="alert" className="erro-campo">{erro}</p>}
    </li>
  );
}

// ---------- Setor (AG_FISCALIZACAO) ----------

function SetorOperacao({ operacao, todas }: { operacao: Operacao; todas: readonly Operacao[] }) {
  const [setor, setSetor] = useState(operacao.setor ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const usados = [...new Set(todas.map((o) => o.setor).filter((x): x is string => !!x))].sort();
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    setErro(definirSetor(operacao.id, setor));
  };
  return (
    <form onSubmit={salvar} className="acoes acoes--base" noValidate aria-label="Setor da operação">
      <label className="campo-grupo campo-grupo--curto"><span>Setor que fiscaliza (AG_FISCALIZACAO)</span>
        <input className="campo" list="setores-usados" value={setor} maxLength={LIMITES_OPERACAO.setor} autoComplete="off" placeholder="Ex.: DUDJUINA" onChange={(e) => setSetor(e.target.value)} />
        <datalist id="setores-usados">{usados.map((x) => <option key={x} value={x} />)}</datalist></label>
      <button type="submit" className="botao botao--pequeno" disabled={setor.trim().toUpperCase() === (operacao.setor ?? '')}>Salvar setor</button>
      {erro && <span role="alert" className="erro-campo">{erro}</span>}
    </form>
  );
}

// ---------- Origem do alerta e apoio (texto do relatório; a unidade é o setor) ----------

function OrigemEApoio({ operacao }: { operacao: Operacao }) {
  const [tipo, setTipo] = useState<TipoOrigemAlerta | ''>(operacao.origemAlerta?.tipo ?? '');
  const [detalhe, setDetalhe] = useState(operacao.origemAlerta?.detalhe ?? '');
  const [apoio, setApoio] = useState(operacao.apoio ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const alterado = tipo !== (operacao.origemAlerta?.tipo ?? '') || (tipo ? detalhe.trim() : '') !== (operacao.origemAlerta?.detalhe ?? '') || apoio.trim() !== (operacao.apoio ?? '');
  usePendente(alterado);
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    setErro(definirOrigemEApoio(operacao.id, tipo ? { tipo, ...(detalhe.trim() ? { detalhe } : {}) } : undefined, apoio));
  };
  return (
    <form onSubmit={salvar} className="acoes acoes--base" noValidate aria-label="Origem do alerta e apoio">
      <label className="campo-grupo campo-grupo--curto"><span>Origem do alerta</span>
        <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoOrigemAlerta | '')}>
          <option value="">Não informada</option>
          {(Object.keys(ORIGENS_ALERTA) as TipoOrigemAlerta[]).map((k) => <option key={k} value={k}>{ORIGENS_ALERTA[k]}</option>)}
        </select></label>
      {(tipo === 'requisicao' || tipo === 'outra') && (
        <label className="campo-grupo campo-grupo--curto"><span>{tipo === 'requisicao' ? 'Órgão que requisitou' : 'Especificar a origem'}</span>
          <input className="campo" value={detalhe} maxLength={LIMITES_OPERACAO.apoio} autoComplete="off" onChange={(e) => setDetalhe(e.target.value)} /></label>
      )}
      <label className="campo-grupo campo-grupo--curto"><span>Apoio (opcional)</span>
        <input className="campo" value={apoio} maxLength={LIMITES_OPERACAO.apoio} autoComplete="off" placeholder="Ex.: Polícia Militar" onChange={(e) => setApoio(e.target.value)} /></label>
      <button type="submit" className="botao botao--pequeno" disabled={!alterado}>Salvar origem e apoio</button>
      {erro && <span role="alert" className="erro-campo">{erro}</span>}
    </form>
  );
}

// ---------- Histórico do pedido ----------

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function HistoricoDoPedido({ operacao }: { operacao: Operacao }) {
  const eventos = operacao.historico ?? [];
  if (eventos.length === 0) return null;
  return (
    <details className="cartao" data-testid="historico-pedido">
      <summary className="titulo-secao">Histórico do pedido ({eventos.length})</summary>
      <ul className="lista-limpa" aria-label="Histórico do pedido">
        {[...eventos].reverse().map((e, i) => (
          <li key={i} className="texto-pequeno">
            <span className="texto-suave">{dataHora(e.quando)}</span> ·{' '}
            {e.acao === 'criada' ? 'operação cadastrada' : (
              <>período alterado: {textoDoPeriodo(e.de ?? {})} → <strong>{textoDoPeriodo(e.para ?? {})}</strong>{e.motivo && <> ({MOTIVOS_PERIODO[e.motivo]})</>}</>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

// ---------- Uma operação ----------

function DetalheOperacao({ operacao, todas, aoVoltar, agora, pontoAlvo }: { operacao: Operacao; todas: readonly Operacao[]; aoVoltar: () => void; agora: () => Date; pontoAlvo?: string }) {
  const [viagemFiltro, setViagemFiltro] = useState('');
  const [situacao, setSituacao] = useState<'' | SituacaoAcompanhamento>('');
  const [soPendentes, setSoPendentes] = useState(false);
  const [grupoFiltro, setGrupoFiltro] = useState('');
  const [organizar, setOrganizar] = useState<'viagem' | 'grupo'>('viagem');
  const [selecionados, setSelecionados] = useState<ReadonlySet<string>>(new Set());
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [viagemLote, setViagemLote] = useState('');
  const [erroLote, setErroLote] = useState<string | null>(null);
  const [avisoLote, setAvisoLote] = useState<string | null>(null);
  // Cartões dos pontos recolhidos por padrão.
  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(new Set(pontoAlvo ? [pontoAlvo] : []));
  useEffect(() => { if (pontoAlvo) document.getElementById(`ponto-${pontoAlvo}`)?.scrollIntoView?.(); }, [pontoAlvo]);
  const definirAbertos = (ids: readonly string[], aberto: boolean) =>
    setExpandidos((s) => { const n = new Set(s); for (const id of ids) { if (aberto) n.add(id); else n.delete(id); } return n; });

  // Sem pontos, a importação já vem aberta (valor fixo: o React não fecha o bloco depois de importar).
  const [importacaoAberta] = useState(operacao.pontos.length === 0);
  const hoje = dataLocal(agora());
  const tiposDeDano = useMemo(() => limparNomes([...TIPOS_DANO_AGROTOXICO, ...todas.flatMap((o) => o.pontos.map((p) => p.tipoDano ?? ''))], LIMITES_OPERACAO.tipoDano).sort((a, b) => a.localeCompare(b, 'pt-BR')), [todas]);
  const { demandas: todasDemandas } = useEstadoDemandas();
  const prazos = prazosDeElaboracao(todasDemandas);
  const pendencias = pendenciasDeCampo([operacao], hoje, prazos);
  const progresso = progressoDaOperacao(operacao, hoje, prazos);
  const finalizados = operacao.pontos.filter((p) => situacaoDoPonto(p) === 'finalizado').length;
  const planoCodigos = useMemo(() => planejarCodigos(operacao, todas), [operacao, todas]);
  const semCodigo = planoCodigos.gerar.length + planoCodigos.fora.length;
  const [previaCodigos, setPreviaCodigos] = useState(false);
  const conflitos = useMemo(() => conflitosDeAgenda(todas), [todas]);
  const sugestoes = useMemo(() => sugestoesDeViagem(todas), [todas]);
  const viagens = ordenarViagens(operacao.viagens);
  const semViagem = pontosSemViagem(operacao).length;
  const incompletas = operacao.viagens.filter((v) => faltasDaViagem(v).length > 0).length;
  const visiveis = operacao.pontos.filter(
    (p) => (!viagemFiltro || (viagemFiltro === 'sem' ? !viagemDoPonto(operacao, p) : p.viagem === viagemFiltro)) &&
      (!situacao || situacaoDoPonto(p) === situacao) && (!soPendentes || pontoPendente(operacao, p)) &&
      (!grupoFiltro || (grupoFiltro === 'sem' ? !p.grupo : p.grupo === grupoFiltro)),
  );
  const grupos = nomesDeGrupos(operacao.pontos);
  const secoes = organizar === 'grupo'
    ? agruparPontos(visiveis, (p) => viagemDoPonto(operacao, p)?.equipe).map((g) => ({
        chave: `grupo-${g.nome || 'sem'}`, titulo: g.nome || 'Sem grupo',
        detalhe: `${plural(g.pontos.length, 'ponto', 'pontos')}${g.equipes.length ? ` · ${g.equipes.join(', ')}` : ''}`, pontos: g.pontos,
        rotulo: g.nome ? `Grupo ${g.nome}` : 'Pontos sem grupo',
      }))
    : operacao.viagens.length === 0 ? [] : pontosPorViagem(operacao, visiveis).map((s) => ({
        chave: `viagem-${s.viagem?.id ?? 'sem'}`, titulo: s.viagem ? textoViagem(s.viagem) : 'Sem viagem',
        detalhe: `${plural(s.pontos.length, 'ponto', 'pontos')}${s.viagem ? ` · ${[...new Set(s.pontos.map((p) => p.municipio).filter(Boolean))].join(', ')}` : ''}`, pontos: s.pontos,
        rotulo: s.viagem ? `Viagem ${textoViagem(s.viagem)}` : 'Pontos sem viagem',
      }));
  // Só o que ainda existe e está visível continua selecionado.
  const marcados = visiveis.filter((p) => selecionados.has(p.id)).map((p) => p.id);
  const marcar = (id: string, marcado: boolean) =>
    setSelecionados((s) => { const n = new Set(s); if (marcado) n.add(id); else n.delete(id); return n; });
  const concluir = (erro: string | null, feito: string) => {
    setErroLote(erro);
    if (!erro) { setSelecionados(new Set()); setNomeGrupo(''); setViagemLote(''); setAvisoLote(feito); }
  };
  const cartao = (p: Ponto) => <CartaoPonto key={p.id} operacao={operacao} ponto={p} todas={todas} hoje={hoje} tiposDeDano={tiposDeDano} selecionado={selecionados.has(p.id)} aoSelecionar={(m) => marcar(p.id, m)} aberto={expandidos.has(p.id)} aoDefinirAberto={(a) => definirAbertos([p.id], a)} />;

  return (
    <article aria-labelledby="titulo-operacao">
      <div className="acoes"><button type="button" className="botao" onClick={() => { if (confirmarSaida()) aoVoltar(); }}>Voltar às operações</button></div>
      <h2 id="titulo-operacao" className="titulo-secao">{operacao.nome}</h2>
      <p className="texto-suave texto-medio">
        <span data-testid="periodo-operacao">{textoPeriodo(operacao)}</span>{operacao.origem && <> · encaminhada por {operacao.origem}</>}
      </p>
      <PeriodoOperacao key={`${operacao.inicio ?? ''}|${operacao.fim ?? ''}`} operacao={operacao} />
      <SetorOperacao key={operacao.setor ?? ''} operacao={operacao} todas={todas} />
      <OrigemEApoio key={`${operacao.origemAlerta?.tipo ?? ''}|${operacao.origemAlerta?.detalhe ?? ''}|${operacao.apoio ?? ''}`} operacao={operacao} />
      <HistoricoDoPedido operacao={operacao} />
      <p data-testid="resumo-operacao">
        {plural(operacao.pontos.length, 'ponto', 'pontos')} · {semViagem > 0 && <><span className="texto--atencao">{semViagem} sem viagem</span> · </>}
        {plural(operacao.viagens.length, 'viagem', 'viagens')}{incompletas > 0 && <> · <span className="texto--atencao">{plural(incompletas, 'incompleta', 'incompletas')}</span></>} ·{' '}
        {plural(finalizados, 'finalizado', 'finalizados')}
        {pendencias.aReprogramar.length > 0 && <> · <span className="texto--atencao">{pendencias.aReprogramar.length} a reprogramar</span></>}
        {progresso.selo === 'encerrada' && <> · <strong className="selo-situacao selo-situacao--ok" data-testid="operacao-encerrada">operação encerrada</strong></>}
        {progresso.selo === 'campo-encerrado' && <> · <strong className="selo-situacao selo-situacao--atencao" data-testid="campo-encerrado">{textoSelo(progresso)}</strong></>}
      </p>
      {semCodigo > 0 && (
        <div className="aviso" data-testid="sem-codigo">
          <p>{plural(semCodigo, 'ponto sem código', 'pontos sem código')} {!previaCodigos && <button type="button" className="botao botao--pequeno" onClick={() => setPreviaCodigos(true)}>Gerar códigos</button>}</p>
          {previaCodigos && (
            <>
              <ul className="lista-limpa" aria-label="Códigos a gerar">
                {planoCodigos.gerar.map((g) => <li key={g.pontoId} className="texto-pequeno mono">{g.rotulo} → {g.codigo}</li>)}
                {planoCodigos.fora.map((f) => <li key={f.pontoId} className="texto-pequeno texto--atencao">{f.rotulo}: não entra — {f.motivo}.</li>)}
              </ul>
              <div className="acoes">
                {planoCodigos.gerar.length > 0 && <button type="button" className="botao botao--primario botao--pequeno" onClick={() => { gerarCodigos(operacao.id); setPreviaCodigos(false); }}>Confirmar {plural(planoCodigos.gerar.length, 'código', 'códigos')}</button>}
                <button type="button" className="botao botao--pequeno" onClick={() => setPreviaCodigos(false)}>Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}
      {temPendencia(pendencias) && (
        <FalaMascote id="pendencias-operacao">
          <p id="pendencias-operacao-titulo">{textoPendencias(pendencias.semResultado.length, pendencias.aReprogramar.length, pendencias.relatorioAtrasado.length, pendencias.travados.length)}</p>
          {pendencias.semResultado.length > 0 && <p className="texto-pequeno">Sem resultado: {pendencias.semResultado.map((x) => rotuloDoPonto(x.ponto)).join(', ')}.</p>}
          {pendencias.relatorioAtrasado.length > 0 && <p className="texto-pequeno">Relatório atrasado: {pendencias.relatorioAtrasado.map((x) => rotuloDoPonto(x.ponto)).join(', ')}.</p>}
          <PontosTravados travados={pendencias.travados} hoje={hoje} />
          {pendencias.aReprogramar.length > 0 && (
            <ul className="lista-limpa" aria-label="Pontos a reprogramar">
              {pendencias.aReprogramar.map((x) => <Reprogramar key={x.ponto.id} operacoes={todas} item={x} />)}
            </ul>
          )}
        </FalaMascote>
      )}

      <Viagens operacao={operacao} conflitos={conflitos} sugestoes={sugestoes} />

      <details className="cartao" open={importacaoAberta}>
        <summary className="titulo-secao">Importar e exportar pontos</summary>
        <ImportarCsv operacao={operacao} todas={todas} />
        <ExportarPontos operacao={operacao} agora={agora} />
      </details>

      <form className="filtros grade grade--2" aria-label="Filtros dos pontos" onSubmit={(e) => e.preventDefault()}>
        <label className="campo-grupo"><span>Viagem</span>
          <select className="campo" value={viagemFiltro} onChange={(e) => setViagemFiltro(e.target.value)}>
            <option value="">Todas</option>
            {viagens.map((v) => <option key={v.id} value={v.id}>{textoViagem(v)}</option>)}
            <option value="sem">Sem viagem</option>
          </select></label>
        <label className="campo-grupo"><span>Situação</span>
          <select className="campo" value={situacao} onChange={(e) => setSituacao(e.target.value as '' | SituacaoAcompanhamento)}>
            <option value="">Todas</option>
            {(Object.keys(SITUACOES_ACOMPANHAMENTO) as SituacaoAcompanhamento[]).map((s) => <option key={s} value={s}>{SITUACOES_ACOMPANHAMENTO[s]}</option>)}
          </select></label>
        <label className="campo-grupo"><span>Grupo</span>
          <select className="campo" value={grupoFiltro} onChange={(e) => setGrupoFiltro(e.target.value)}>
            <option value="">Todos</option>
            {grupos.map((g) => <option key={g}>{g}</option>)}
            <option value="sem">Sem grupo</option>
          </select></label>
        <label className="campo-grupo"><span>Organizar a lista por</span>
          <select className="campo" value={organizar} onChange={(e) => setOrganizar(e.target.value as 'viagem' | 'grupo')}>
            <option value="viagem">viagem</option>
            <option value="grupo">grupo</option>
          </select></label>
        <label><input type="checkbox" checked={soPendentes} onChange={(e) => setSoPendentes(e.target.checked)} /> Só os sem viagem ou sem data</label>
      </form>

      {operacao.pontos.length > 0 && (
        <section className="cartao" aria-labelledby="titulo-agrupar" data-testid="barra-agrupar">
          <h3 id="titulo-agrupar" className="titulo-secao">Organizar os pontos selecionados</h3>
          <p className="texto-pequeno texto-suave">
            Marque os pontos abaixo e ponha todos de uma vez numa viagem ou num grupo. Grupo é um conjunto de pontos do mesmo assunto
            (por exemplo, vários pontos da mesma fazenda); viagem e grupo são independentes.
          </p>
          <div className="acoes">
            <span data-testid="contagem-selecionados">{plural(marcados.length, 'ponto selecionado', 'pontos selecionados')}</span>
            <button type="button" className="botao botao--pequeno" disabled={visiveis.length === 0} onClick={() => setSelecionados(new Set(visiveis.map((p) => p.id)))}>Selecionar todos os visíveis</button>
            <button type="button" className="botao botao--pequeno" disabled={marcados.length === 0} onClick={() => setSelecionados(new Set())}>Limpar seleção</button>
          </div>
          <div className="grade grade--2">
            <div>
              <label className="campo-grupo"><span>Viagem dos selecionados</span>
                <select className="campo" value={viagemLote} disabled={viagens.length === 0} onChange={(e) => setViagemLote(e.target.value)}>
                  <option value="">Escolha…</option>
                  {viagens.map((v) => <option key={v.id} value={v.id}>{textoViagem(v)}</option>)}
                </select></label>
              <div className="acoes">
                <button type="button" className="botao botao--primario" disabled={marcados.length === 0 || !viagemLote}
                  onClick={() => concluir(definirViagem(operacao.id, marcados, viagemLote), `Pontos encaixados em ${textoViagem(operacao.viagens.find((v) => v.id === viagemLote)!)}.`)}>Pôr na viagem</button>
                <button type="button" className="botao" disabled={marcados.length === 0}
                  onClick={() => concluir(definirViagem(operacao.id, marcados, ''), 'Pontos tirados da viagem.')}>Tirar da viagem</button>
              </div>
            </div>
            <div>
              <label className="campo-grupo"><span>Nome do grupo</span>
                <input className="campo" list="grupos-existentes" value={nomeGrupo} maxLength={LIMITES_OPERACAO.grupo} autoComplete="off" onChange={(e) => setNomeGrupo(e.target.value)} />
                <datalist id="grupos-existentes">{grupos.map((g) => <option key={g} value={g} />)}</datalist></label>
              <div className="acoes">
                <button type="button" className="botao botao--primario" disabled={marcados.length === 0 || !nomeGrupo.trim()}
                  onClick={() => concluir(definirGrupo(operacao.id, marcados, nomeGrupo), `Pontos agrupados em "${nomeGrupo.trim()}".`)}>Agrupar selecionados</button>
                <button type="button" className="botao" disabled={marcados.length === 0} onClick={() => concluir(definirGrupo(operacao.id, marcados, ''), 'Pontos tirados do grupo.')}>Tirar do grupo</button>
              </div>
            </div>
          </div>
          {erroLote && <p role="alert" className="erro-campo">{erroLote}</p>}
          {avisoLote && !erroLote && <p role="status" data-testid="aviso-grupo">{avisoLote}</p>}
        </section>
      )}

      {visiveis.length > 0 && (
        <div className="acoes">
          <button type="button" className="botao botao--pequeno" onClick={() => definirAbertos(visiveis.map((p) => p.id), true)}>Expandir todos</button>
          <button type="button" className="botao botao--pequeno" onClick={() => definirAbertos(visiveis.map((p) => p.id), false)}>Recolher todos</button>
        </div>
      )}

      {operacao.pontos.length === 0 ? (
        <EstadoVazio cartao texto="Nenhum ponto nesta operação." dica="Importe um CSV em “Importar e exportar pontos” para trazer a lista." />
      ) : visiveis.length === 0 ? (
        <EstadoVazio cartao texto="Nenhum ponto corresponde aos filtros." dica="Mude ou limpe os filtros." />
      ) : secoes.length === 0 ? (
        <ul className="lista-limpa grade grade--2 grade--pontos" aria-label="Pontos da operação">{visiveis.map(cartao)}</ul>
      ) : (
        secoes.map((s) => (
          <section key={s.chave} aria-label={s.rotulo} data-testid={`secao-${s.chave}`}>
            <h3 className="titulo-secao">{s.titulo} <span className="texto-pequeno texto-suave">· {s.detalhe}</span></h3>
            <div className="acoes acoes--sem-margem">
              {(() => {
                const tudo = s.pontos.every((p) => expandidos.has(p.id));
                return (
                  <button type="button" className="botao botao--pequeno" aria-expanded={tudo} aria-label={`${tudo ? 'Recolher' : 'Expandir'} pontos da ${s.rotulo}`} onClick={() => definirAbertos(s.pontos.map((p) => p.id), !tudo)}>
                    <span aria-hidden="true">{tudo ? '▾' : '▸'}</span> {tudo ? 'Recolher' : 'Expandir'} pontos
                  </button>
                );
              })()}
            </div>
            <ul className="lista-limpa grade grade--2 grade--pontos" aria-label={s.rotulo}>{s.pontos.map(cartao)}</ul>
          </section>
        ))
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
    const r = criarOperacaoComPontos({ nome: importada.nome, inicio: '', fim: '', origem: importada.origem, setor: previa?.setor }, agora().toISOString(), validos.map((l) => l.ponto!));
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
          <ResumoDaPrevia validos={validos.length} comErro={comErro} comAviso={validos.filter((l) => l.avisos.length)} periodo={previa.periodoDoArquivo ?? null} setor={previa.setor} />
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
            {validos.length > 0 && <button type="submit" className="botao botao--primario">Criar operação com {plural(validos.length, 'ponto', 'pontos')}</button>}
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

// ---------- Prazo padrão do relatório ----------

function PrazoDoRelatorio({ aoMudar }: { aoMudar: () => void }) {
  const [valor, setValor] = useState(() => String(lerDiasPadraoElaboracao() ?? ''));
  const [msg, setMsg] = useState<string | null>(null);
  const salvar = (e: FormEvent) => {
    e.preventDefault();
    const t = valor.trim();
    const erro = definirDiasPadraoElaboracao(t === '' ? null : /^\d+$/.test(t) ? Number(t) : -1);
    setMsg(erro ?? (t === '' ? 'Sem prazo padrão: relatório sem demanda com prazo não vence.' : 'Prazo padrão salvo.'));
    if (!erro) aoMudar();
  };
  return (
    <details className="cartao">
      <summary>Prazo do relatório (SIGA-MT)</summary>
      <form onSubmit={salvar} className="formulario" noValidate aria-label="Prazo padrão do relatório">
        <label className="campo-grupo"><span>Prazo padrão, em dias depois do retorno (vazio = sem prazo)</span>
          <input className="campo campo--curto" inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} /></label>
        <p className="texto-pequeno texto-suave">Vale só para ponto sem demanda ligada com prazo; havendo demandas, vale o prazo mais cedo entre elas.</p>
        {msg && <p role="status" className="texto-pequeno">{msg}</p>}
        <div className="acoes"><button type="submit" className="botao botao--pequeno">Salvar prazo</button></div>
      </form>
    </details>
  );
}

// ---------- Lista ----------

const ROTULO_FASE_OPERACAO: Record<FaseDaOperacao, string> = { planejada: 'Planejada', 'em-campo': 'Em campo', 'pos-campo': 'Pós-campo', concluida: 'Concluída' };
const CLASSE_FASE: Record<FaseDaOperacao, string> = { planejada: '', 'em-campo': '', 'pos-campo': ' selo-situacao--atencao', concluida: ' selo-situacao--ok' };

/** Duas linhas com barra: "Campo" (resolvidos em campo, vencidos, a reprogramar) e "Relatório" (encerrados, em elaboração, travados). Só contagens maiores que zero. */
function ProgressoDoCard({ operacao, pr, hoje }: { operacao: Operacao; pr: ProgressoDaOperacao; hoje: string }) {
  const c = progressoDeCampo(operacao, hoje);
  const linha = (rotulo: string, valor: number, alertas: [number, string, string, boolean][]) => (
    <div className="linha-progresso">
      <span className="rotulo-progresso">{rotulo}</span>
      <progress max={pr.total} value={valor} aria-label={`${rotulo} de ${operacao.nome}`} />
      <span className="sem-quebra">{valor} de {pr.total}</span>
      {alertas.filter(([n]) => n > 0).map(([n, um, varios, atencao]) => <span key={um} className={`sem-quebra${atencao ? ' texto--atencao' : ''}`}>· {plural(n, um, varios)}</span>)}
    </div>
  );
  return (
    <div className="texto-pequeno" data-testid={`progresso-${operacao.id}`}>
      {linha('Campo', c.feitos, [[c.vencidos, 'vencido', 'vencidos', true], [c.aReprogramar, 'a reprogramar', 'a reprogramar', true]])}
      {linha('Relatório', pr.encerrados, [[pr.emElaboracao, 'em elaboração', 'em elaboração', false], [pr.travados, 'travado', 'travados', true]])}
    </div>
  );
}

const ROTULO_SELO = { planejada: 'planejada', 'em-andamento': 'em andamento', pendente: 'pendente', 'campo-encerrado': 'campo encerrado', encerrada: 'encerrada' } as const;
const ORDEM_FASE: readonly FaseDaOperacao[] = ['pos-campo', 'em-campo', 'planejada', 'concluida'];

/** Pós-campo, em campo, planejada, concluída (a fase do selo do card); dentro de cada uma, pelo início (sem início por último). */
function ordenarOperacoes(operacoes: readonly Operacao[], hoje: string, prazos: PrazosDeElaboracao) {
  return operacoes
    .map((o) => ({ o, progresso: progressoDaOperacao(o, hoje, prazos) }))
    .sort((a, b) => ORDEM_FASE.indexOf(faseDaOperacao(a.o, hoje)) - ORDEM_FASE.indexOf(faseDaOperacao(b.o, hoje)) || (a.o.inicio ?? '9999').localeCompare(b.o.inicio ?? '9999'));
}

/** Botão "Gerar roteiro" do card: avisa de cronograma antigo e pendências, mas nunca bloqueia; várias viagens pedem a escolha de uma. */
function GerarRoteiroDoCard({ operacao, pr, demandas, hoje, aoAtualizarCronograma }: { operacao: Operacao; pr: ProgressoDaOperacao; demandas: readonly DemandaDoRoteiro[]; hoje: string; aoAtualizarCronograma: () => void }) {
  const viagens = ordenarViagens(operacao.viagens);
  const [aberto, setAberto] = useState(false);
  // Pré-seleciona a próxima viagem (saída mais próxima de hoje, daqui para a frente); sem nenhuma, a primeira.
  const [viagemId, setViagemId] = useState((viagens.find((v) => (v.saida ?? '') >= hoje) ?? viagens[0])?.id ?? '');
  const antigo = cronogramaDesatualizado(operacao);
  const desde = operacao.cronogramaAtualizadoEm ?? operacao.criadaEm;
  const dica = viagens.length === 0 ? 'Cronograma ainda não preenchido' : `Cronograma não atualizado desde ${dataLocal(new Date(desde)).split('-').reverse().join('/')}`;
  const pendencias = [
    pr.travados > 0 && plural(pr.travados, 'travado', 'travados'),
    pr.vencidos > 0 && plural(pr.vencidos, 'vencido', 'vencidos'),
    pr.porSituacao['a-reprogramar'] > 0 && `${pr.porSituacao['a-reprogramar']} a reprogramar`,
  ].filter(Boolean).join(' · ');
  const gerar = () => {
    setAberto(false);
    const v = viagens.find((x) => x.id === viagemId) ?? viagens[0];
    if (v) void abrirRoteiroDaViagem(operacao, v, demandas);
  };
  const aoClicar = () => { if (antigo || pendencias || viagens.length > 1) setAberto(true); else gerar(); };
  const idCampo = `viagem-roteiro-${operacao.id}`;
  const qtdPontos = (id: string) => operacao.pontos.filter((p) => p.viagem === id && p.situacao !== 'cancelado').length;
  return (
    <>
      <button type="button" className="botao botao--pequeno" aria-label={`Gerar roteiro de ${operacao.nome}`} title={antigo ? dica : undefined} onClick={aoClicar}>
        {antigo && <span aria-hidden="true">⚠ </span>}Gerar roteiro
      </button>
      {aberto && createPortal(
        <Gaveta rotulo="Gerar roteiro" rotuloFechar="Cancelar" aoFechar={() => setAberto(false)} dialogo topo={<strong>Gerar roteiro</strong>}>
          <form onSubmit={(e) => { e.preventDefault(); if (viagens.length > 0) gerar(); }}>
            <div className="gaveta-corpo">
            {antigo && (
              <p role="alert" className="aviso">
                {viagens.length === 0 ? 'O cronograma ainda não foi preenchido: não há viagem para o roteiro.' : 'O cronograma não foi atualizado após as últimas alterações nas viagens. O roteiro pode sair com informações antigas.'}
              </p>
            )}
            {pendencias && <p className="texto-pequeno texto--atencao">{pendencias}</p>}
            {viagens.length > 1 && (
              <>
                <p className="texto-pequeno">Esta operação tem {viagens.length} viagens. Escolha qual roteiro gerar.</p>
                <div className="campo-grupo">
                  <label htmlFor={idCampo}>Viagem</label>
                  <select id={idCampo} className="campo" value={viagemId} onChange={(e) => setViagemId(e.target.value)}>
                    {viagens.map((v) => <option key={v.id} value={v.id}>{textoViagem(v)} · {qtdPontos(v.id)} {qtdPontos(v.id) === 1 ? 'ponto' : 'pontos'}</option>)}
                  </select>
                </div>
              </>
            )}
            </div>
            <div className="gaveta-rodape"><div className="acoes acoes--rodape acoes--fim">
              {antigo ? (
                <>
                  <button type="button" className="botao" onClick={() => { setAberto(false); aoAtualizarCronograma(); }}>Atualizar cronograma</button>
                  {viagens.length > 0 && <button type="button" className="botao" onClick={() => { conferirCronograma(operacao.id); gerar(); }}>O cronograma está certo</button>}
                  {viagens.length > 0 && <button type="submit" className="botao botao--primario" data-foco>Gerar mesmo assim</button>}
                </>
              ) : (
                <>
                  <button type="button" className="botao" onClick={() => setAberto(false)}>Cancelar</button>
                  <button type="submit" className="botao botao--primario" data-foco>Gerar roteiro</button>
                </>
              )}
            </div></div>
          </form>
        </Gaveta>,
        document.body,
      )}
    </>
  );
}

export function Operacoes({ agora = () => new Date() }: { agora?: () => Date }) {
  const operacoes = useOperacoes();
  const soNaMemoria = useOperacoesSoNaMemoria();
  const naQuarentena = useQuarentena().length;
  const [aberta, setAberta] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null); // ponto a abrir direto (vindo dos Travados)
  const emDetalhe = operacoes.find((o) => o.id === aberta);
  const hoje = dataLocal(agora());
  const { demandas } = useEstadoDemandas();
  const [, setVersaoPrazo] = useState(0);
  const prazos = prazosDeElaboracao(demandas);
  const pendencias = pendenciasDeCampo(operacoes, hoje, prazos);
  const ordenadas = ordenarOperacoes(operacoes, hoje, prazos);

  return (
    <section aria-labelledby="titulo-operacoes" className="pagina">
      <h1 id="titulo-operacoes" className="titulo-pagina">Operações</h1>
      {soNaMemoria && (
        <p role="alert" className="aviso" data-testid="aviso-operacoes-sem-gravacao">
          Este navegador não deixou gravar as operações (armazenamento bloqueado, cheio ou em modo privado). As mudanças valem só até fechar a página.
        </p>
      )}
      {naQuarentena > 0 && (
        <p role="alert" className="aviso" data-testid="aviso-quarentena-global">
          {plural(naQuarentena, 'conteúdo de operação não pôde ser lido e está guardado', 'conteúdos de operações não puderam ser lidos e estão guardados')}, sem apagar.{' '}
          <a href="#/configuracoes">Ver em Configurações</a>
        </p>
      )}
      {emDetalhe ? (
        <DetalheOperacao operacao={emDetalhe} todas={operacoes} aoVoltar={() => { setAberta(null); setAlvo(null); }} agora={agora} pontoAlvo={alvo ?? undefined} />
      ) : (
        <>
          <p className="texto-suave texto-medio">
            Fiscalizações encaminhadas por terceiros, com lista de pontos para vistoria. Os dados ficam só neste navegador:
            use dados reais apenas depois de classificação e autorização institucional.
          </p>
          {temPendencia(pendencias) && <PendenciasDoMascote operacoes={operacoes} pendencias={pendencias} hoje={hoje} aoAbrir={(op, ponto) => { setAlvo(ponto ?? null); setAberta(op); }} />}
          <PrazoDoRelatorio aoMudar={() => setVersaoPrazo((v) => v + 1)} />
          <NovaOperacao operacoes={operacoes} agora={agora} aoCriar={setAberta} />

          {operacoes.length === 0 ? (
            <EstadoVazio cartao texto="Nenhuma operação cadastrada." dica="Importe a planilha de pontos ou crie a operação sem planilha." />
          ) : (
            <ul className="lista-limpa grade grade--2" aria-label="Lista de operações">
              {ordenadas.map(({ o, progresso: pr }) => (
                <li key={o.id} className="cartao cartao--operacao" data-testid={`operacao-${o.id}`}>
                  <p className="acoes acoes--entre">
                    <strong>{o.nome}</strong>
                    <span className={`selo-situacao${CLASSE_FASE[faseDaOperacao(o, hoje)]}`} data-testid={`selo-${o.id}`}>{ROTULO_FASE_OPERACAO[faseDaOperacao(o, hoje)]}</span>
                  </p>
                  <p className="texto-pequeno texto-suave">{textoPeriodo(o)}</p>
                  <p className="texto-pequeno">
                    {plural(o.viagens.length, 'viagem', 'viagens')}
                    {pontosSemViagem(o).length > 0 && <span className="texto--atencao"> · {pontosSemViagem(o).length} sem viagem</span>}
                  </p>
                  {pr.total > 0 && <ProgressoDoCard operacao={o} pr={pr} hoje={hoje} />}
                  <div className="acoes cartao-rodape">
                    <button type="button" className="botao botao--pequeno botao--primario" aria-label={`Abrir ${o.nome}`} onClick={() => setAberta(o.id)}>Abrir</button>
                    {podeGerarRoteiro(o, hoje) && (
                      <GerarRoteiroDoCard operacao={o} pr={pr} demandas={demandas} hoje={hoje} aoAtualizarCronograma={() => { setAberta(o.id); setTimeout(() => document.getElementById('titulo-viagens')?.scrollIntoView?.(), 0); }} />
                    )}
                    <button
                      type="button" className="botao botao--pequeno botao--perigo acoes__fim" aria-label={`Excluir ${o.nome}`}
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
