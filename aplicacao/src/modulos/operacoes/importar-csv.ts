// Importação da lista de pontos de uma operação a partir de CSV (sem biblioteca de planilha).
// Aceita a planilha de exemplo (N_PONTO, EQUIPE, COORD_X, COORD_Y, MUNICIPIO, DAT_SAIDA, DAT_RETOR, NOT_PLANEJ) e a de
// controle da SEMA (MES_PPROG, CODIGO_PONTO, NUMERO_DO_PONTO, …, FISCALIZADO_AUTUADO, …, LONGITUDE, LATITUDE, AG_FISCALIZACAO, TIPO_DANO).
// COORD_X é a longitude e COORD_Y a latitude. Linha com problema não entra em silêncio: volta com a mensagem.

import { lerCoordenada } from '../demandas/coordenadas.ts';
import { LIMITES_OPERACAO, RESULTADOS, RESULTADOS_COM_MOTIVO, type PontoNovo } from './modelo.ts';
import { distanciaMetros, lerData, limparNomes, periodoDosPontos, problemasDeDatas, resultadoDaPlanilha, type Periodo } from './regras.ts';

/** Remove acento, espaços e maiúsculas do nome de coluna. */
const chave = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

// Aceita a planilha de exemplo (N_PONTO, NOT_PLANEJ…) e a de controle da SEMA (NUMERO_DO_PONTO, NOTA_PLANEJAMENTO, CODIGO_PONTO…).
const COLUNAS = {
  numero: ['NPONTO', 'NUMERODOPONTO', 'NUMERO', 'PONTO', 'N'],
  codigo: ['CODIGOPONTO', 'CODIGO'],
  tipoDano: ['TIPODANO', 'TIPODEDANO'],
  etiquetas: ['ETIQUETAS'], // só lê desta coluna; nunca das notas

  equipe: ['EQUIPE'],
  x: ['COORDX', 'X'],
  y: ['COORDY', 'Y'],
  // Na planilha da SEMA, a mesma coordenada em graus decimais com vírgula (-58,64058972).
  lonDecimal: ['LONGITUDE', 'LON'],
  latDecimal: ['LATITUDE', 'LAT'],
  municipio: ['MUNICIPIO', 'CIDADE'],
  saida: ['DATSAIDA', 'SAIDA', 'DATASAIDA'],
  retorno: ['DATRETOR', 'RETORNO', 'DATARETORNO', 'DATRETORNO'],
  notas: ['NOTPLANEJ', 'NOTAPLANEJAMENTO', 'NOTAS', 'OBSERVACOES', 'OBS'],
  integrantes: ['SERVIDOREQUIPE', 'SERVIDORES', 'INTEGRANTES'],
  mes: ['MESPPROG'], // só serve para sugerir o nome da operação
  resultado: ['FISCALIZADOAUTUADO', 'RESULTADO'],
  motivo: ['MOTIVODENAOFISCALIZARAUTUAR', 'MOTIVO'],
  protocolo: ['NUMPROTOCOLO', 'PROTOCOLO'],
  observacao: ['OBSERVACAO'],
  setor: ['AGFISCALIZACAO', 'SETOR'],
} as const;
type Coluna = keyof typeof COLUNAS;

/**
 * Divide o texto em linhas e células, com aspas e `;`, `,` ou tabulação (o que aparecer mais no cabeçalho;
 * a tabulação é o que sai de copiar e colar da planilha). A aspa só abre célula no começo dela: as aspas de
 * segundos (11° 28' 09,2" S) no meio do texto são do dado.
 */
export function lerCsv(conteudo: string): string[][] {
  return lerRegistros(conteudo).map((r) => r.celulas);
}

/**
 * Como `lerCsv`, mas cada registro traz `linha`: a linha física do arquivo em que ele começa (a primeira = 1),
 * contando as linhas vazias descartadas e as quebras dentro de aspas — é o número que a pessoa vê no editor.
 */
function lerRegistros(conteudo: string): { linha: number; celulas: string[] }[] {
  const texto = conteudo.replace(/^﻿/, '');
  // O separador sai da primeira linha com conteúdo (o cabeçalho), mesmo com linhas em branco antes ou \r sozinho como quebra.
  const primeira = texto.split(/\r\n|\r|\n/).find((l) => l.trim() !== '') ?? '';
  const conta = (c: string) => primeira.split(c).length - 1;
  const sep = [';', '	', ','].reduce((melhor, c) => (conta(c) > conta(melhor) ? c : melhor));
  const registros: { linha: number; celulas: string[] }[] = [];
  let linha: string[] = [];
  let celula = '';
  let aspas = false;
  let fisica = 1;
  let inicio = 1;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { celula += '"'; i++; }
      else if (c === '"') aspas = false;
      else {
        celula += c;
        if (c === '\n' || (c === '\r' && texto[i + 1] !== '\n')) fisica++;
      }
    } else if (c === '"' && celula === '') aspas = true;
    else if (c === sep) { linha.push(celula); celula = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(celula); celula = '';
      if (linha.some((x) => x.trim() !== '')) registros.push({ linha: inicio, celulas: linha });
      linha = [];
      fisica++;
      inicio = fisica;
    } else celula += c;
  }
  linha.push(celula);
  if (linha.some((x) => x.trim() !== '')) registros.push({ linha: inicio, celulas: linha });
  return registros;
}

/** Bytes do arquivo para texto: UTF-8 e, se houver byte inválido, Windows-1252 (o que o Excel costuma gravar). */
export function decodificarCsv(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export interface LinhaImportada {
  /** Linha física no arquivo em que o registro começa (a primeira = 1; é o cabeçalho, se nada vier antes dele). */
  linha: number;
  /** Ponto com equipe e datas da linha: ao importar, elas viram (ou encontram) a viagem. */
  ponto?: PontoNovo;
  erros: string[];
  /** FISCALIZADO_AUTUADO e MES_PPROG como vieram, para sugerir o nome da operação. */
  resultado: string;
  mes: string;
  /** Não impedem a importação, mas pedem conferência (coordenadas divergentes, resultado sem motivo). */
  avisos: string[];
}

export interface ResultadoCsv {
  /** Erro que impede a leitura inteira (sem cabeçalho reconhecido). */
  erro?: string;
  linhas: LinhaImportada[];
  /** Menor e maior data das linhas válidas, para a prévia ("período tirado do arquivo"). */
  periodoDoArquivo?: Periodo;
  /** AG_FISCALIZACAO: o primeiro setor informado no arquivo. */
  setor?: string;
}

/** Graus decimais com ponto ou vírgula ("-58,64058972"); null se não for número. */
const numeroDecimal = (t: string | undefined) => {
  const v = (t ?? '').trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : null;
};

/** Distância a partir da qual COORD_X/COORD_Y e LONGITUDE/LATITUDE contam como lugares diferentes. */
export const DIVERGENCIA_COORDENADAS_M = 50;

// O apóstrofo que a exportação põe antes de = + - @ (proteção contra fórmula) não faz parte do dado.
const limpar = (t: string | undefined, max: number) => (t ?? '').replace(/\s+/g, ' ').trim().replace(/^'(?=[=+\-@])/, '').slice(0, max);

/** Lê o CSV e confere cada linha; `janela` (opcional) é o período da operação. */
export function importarPontosCsv(conteudo: string, janela?: Periodo): ResultadoCsv {
  const registros = lerRegistros(conteudo);
  const tabela = registros.map((r) => r.celulas);
  if (tabela.length === 0) return { erro: 'O arquivo está vazio.', linhas: [] };
  const cabecalho = tabela[0].map(chave);
  const indice = {} as Record<Coluna, number>;
  for (const c of Object.keys(COLUNAS) as Coluna[]) indice[c] = cabecalho.findIndex((h) => (COLUNAS[c] as readonly string[]).includes(h));
  const temGms = indice.x >= 0 && indice.y >= 0;
  const temDecimal = indice.lonDecimal >= 0 && indice.latDecimal >= 0;
  if (!temGms && !temDecimal) return { erro: 'Não achei as colunas de coordenada (COORD_X e COORD_Y, ou LONGITUDE e LATITUDE).', linhas: [] };
  if (tabela.length - 1 > LIMITES_OPERACAO.pontos) return { erro: `O limite é de ${LIMITES_OPERACAO.pontos} pontos por operação.`, linhas: [] };

  const linhas = tabela.slice(1).map((celulas, i): LinhaImportada => {
    const campo = (c: Coluna) => (indice[c] >= 0 ? celulas[indice[c]] : undefined);
    const erros: string[] = [];
    const avisos: string[] = [];

    // COORD_X/COORD_Y valem; LONGITUDE/LATITUDE só conferem (ou substituem, se a planilha não tiver as outras).
    const lonDec = numeroDecimal(campo('lonDecimal'));
    const latDec = numeroDecimal(campo('latDecimal'));
    const usarDecimal = (!temGms || !(campo('x') ?? '').trim()) && lonDec !== null && latDec !== null;
    const coord = lerCoordenada(usarDecimal ? `${latDec} ${lonDec}` : `${(campo('y') ?? '').trim()} ${(campo('x') ?? '').trim()}`);
    if (!coord.ok) erros.push(`Coordenada: ${coord.erro}`);
    else if (coord.avisos.length) erros.push(`Coordenada: ${coord.avisos.join(' ')}`);
    else if (!usarDecimal && lonDec !== null && latDec !== null) {
      const d = distanciaMetros(coord.valor, { lat: latDec, lon: lonDec });
      if (d > DIVERGENCIA_COORDENADAS_M) {
        avisos.push(`COORD_X/COORD_Y e LONGITUDE/LATITUDE apontam lugares a ${Math.round(d)} m um do outro; vale COORD_X/COORD_Y. Confira a planilha.`);
      }
    }

    const lerCampoData = (c: 'saida' | 'retorno', rotulo: string) => {
      const bruto = (campo(c) ?? '').trim();
      if (!bruto) return undefined;
      const iso = lerData(bruto);
      if (!iso) erros.push(`${rotulo} não é uma data válida (use DD/MM/AAAA ou AAAA-MM-DD).`);
      return iso ?? undefined;
    };
    const saida = lerCampoData('saida', 'A data de saída');
    const retorno = lerCampoData('retorno', 'A data de retorno');
    erros.push(...problemasDeDatas({ saida, retorno }, janela));

    const numeroBruto = (campo('numero') ?? '').trim();
    const numero = /^\d+$/.test(numeroBruto) ? Number(numeroBruto) : undefined;
    const equipe = limpar(campo('equipe'), LIMITES_OPERACAO.equipe);
    const codigo = limpar(campo('codigo'), LIMITES_OPERACAO.codigo);
    const tipoDano = limpar(campo('tipoDano'), LIMITES_OPERACAO.tipoDano);
    const etiquetas = limparNomes((campo('etiquetas') ?? '').split(/\s*[;,|]\s*/), LIMITES_OPERACAO.etiqueta).slice(0, LIMITES_OPERACAO.etiquetas);
    const integrantes = limparNomes((campo('integrantes') ?? '').split(/\s*[,;/|]\s*|\s+e\s+/), LIMITES_OPERACAO.integrante);
    const resultadoBruto = limpar(campo('resultado'), 60);
    const resultado = resultadoBruto ? resultadoDaPlanilha(resultadoBruto) : null;
    if (resultadoBruto && !resultado) avisos.push(`Resultado não reconhecido: '${resultadoBruto}'. Corrija na planilha ou registre no ponto.`);
    const motivo = limpar(campo('motivo'), LIMITES_OPERACAO.motivo);
    const protocolo = limpar(campo('protocolo'), LIMITES_OPERACAO.protocolo);
    const observacao = limpar(campo('observacao'), LIMITES_OPERACAO.observacao);
    if (resultado && RESULTADOS_COM_MOTIVO.includes(resultado) && !motivo) avisos.push(`Resultado "${RESULTADOS[resultado]}" sem o motivo.`);

    const ponto: PontoNovo | undefined = coord.ok && !erros.length
      ? {
          ...(numero !== undefined ? { numero } : {}),
          ...(codigo ? { codigo } : {}),
          ...(tipoDano ? { tipoDano } : {}),
          ...(etiquetas.length ? { etiquetas } : {}),
          coordenada: coord.valor,
          municipio: limpar(campo('municipio'), LIMITES_OPERACAO.municipio),
          ...(equipe ? { equipe } : {}),
          ...(saida ? { saida } : {}),
          ...(retorno ? { retorno } : {}),
          notas: limpar(campo('notas'), LIMITES_OPERACAO.notas),
          ...(integrantes.length ? { integrantes } : {}),
          ...(resultado ? { resultado } : {}),
          ...(motivo ? { motivo } : {}),
          ...(protocolo ? { protocolo } : {}),
          ...(observacao ? { observacao } : {}),
          demandas: [],
          // Com resultado, o ponto já foi a campo ("Não" = não fiscalizado: continua planejado e fica a reprogramar).
          situacao: resultado && resultado !== 'nao' ? 'vistoriado' : 'planejado',
        }
      : undefined;
    return { linha: registros[i + 1].linha, ...(ponto ? { ponto } : {}), erros, avisos, resultado: limpar(campo('resultado'), 80), mes: limpar(campo('mes'), 10) };
  });
  const periodo = periodoDosPontos(linhas.flatMap((l) => (l.ponto ? [l.ponto] : [])));
  const setor = tabela.slice(1).map((c) => limpar(indice.setor >= 0 ? c[indice.setor] : '', LIMITES_OPERACAO.setor)).find(Boolean);
  return { linhas, ...(periodo.inicio ? { periodoDoArquivo: periodo } : {}), ...(setor ? { setor } : {}) };
}
