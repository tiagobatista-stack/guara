// Importação da lista de pontos de uma operação a partir de CSV (sem biblioteca de planilha).
// Colunas da planilha de exemplo: N_PONTO, EQUIPE, COORD_X, COORD_Y, MUNICIPIO, DAT_SAIDA, DAT_RETOR, NOT_PLANEJ.
// COORD_X é a longitude e COORD_Y a latitude. Linha com problema não entra em silêncio: volta com a mensagem.

import { lerCoordenada } from '../demandas/coordenadas.ts';
import { LIMITES_OPERACAO, type Ponto } from './modelo.ts';
import { lerData, periodoDosPontos, problemasDeDatas, type Periodo } from './regras.ts';

/** Remove acento, espaços e maiúsculas do nome de coluna. */
const chave = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

const COLUNAS = {
  numero: ['NPONTO', 'NUMERO', 'NUMERODOPONTO', 'PONTO', 'N'],
  equipe: ['EQUIPE'],
  x: ['COORDX', 'LONGITUDE', 'LON', 'X'],
  y: ['COORDY', 'LATITUDE', 'LAT', 'Y'],
  municipio: ['MUNICIPIO', 'CIDADE'],
  saida: ['DATSAIDA', 'SAIDA', 'DATASAIDA'],
  retorno: ['DATRETOR', 'RETORNO', 'DATARETORNO', 'DATRETORNO'],
  notas: ['NOTPLANEJ', 'NOTAPLANEJAMENTO', 'NOTAS', 'OBSERVACOES', 'OBS'],
  // Só servem para sugerir o nome da operação; não entram no ponto.
  resultado: ['FISCALIZADOAUTUADO'],
  mes: ['MESPPROG'],
} as const;
type Coluna = keyof typeof COLUNAS;

/**
 * Divide o texto em linhas e células, com aspas e `;`, `,` ou tabulação (o que aparecer mais no cabeçalho;
 * a tabulação é o que sai de copiar e colar da planilha). A aspa só abre célula no começo dela: as aspas de
 * segundos (11° 28' 09,2" S) no meio do texto são do dado.
 */
export function lerCsv(conteudo: string): string[][] {
  const texto = conteudo.replace(/^﻿/, '');
  const primeira = texto.split(/\r?\n/, 1)[0] ?? '';
  const conta = (c: string) => primeira.split(c).length - 1;
  const sep = [';', '	', ','].reduce((melhor, c) => (conta(c) > conta(melhor) ? c : melhor));
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = '';
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { celula += '"'; i++; }
      else if (c === '"') aspas = false;
      else celula += c;
    } else if (c === '"' && celula === '') aspas = true;
    else if (c === sep) { linha.push(celula); celula = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(celula); celula = '';
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
      linha = [];
    } else celula += c;
  }
  linha.push(celula);
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha);
  return linhas;
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
  /** Linha no arquivo (cabeçalho = 1). */
  linha: number;
  ponto?: Omit<Ponto, 'id'>;
  erros: string[];
  /** FISCALIZADO_AUTUADO e MES_PPROG da linha, se a planilha tiver essas colunas. */
  resultado: string;
  mes: string;
}

export interface ResultadoCsv {
  /** Erro que impede a leitura inteira (sem cabeçalho reconhecido). */
  erro?: string;
  linhas: LinhaImportada[];
  /** Menor e maior data das linhas válidas, para a prévia ("período tirado do arquivo"). */
  periodoDoArquivo?: Periodo;
}

const limpar = (t: string | undefined, max: number) => (t ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Lê o CSV e confere cada linha; `janela` (opcional) é o período da operação. */
export function importarPontosCsv(conteudo: string, janela?: Periodo): ResultadoCsv {
  const tabela = lerCsv(conteudo);
  if (tabela.length === 0) return { erro: 'O arquivo está vazio.', linhas: [] };
  const cabecalho = tabela[0].map(chave);
  const indice = {} as Record<Coluna, number>;
  for (const c of Object.keys(COLUNAS) as Coluna[]) indice[c] = cabecalho.findIndex((h) => (COLUNAS[c] as readonly string[]).includes(h));
  const faltam = (['x', 'y'] as const).filter((c) => indice[c] < 0);
  if (faltam.length) return { erro: 'Não achei as colunas de coordenada (COORD_X e COORD_Y, ou LONGITUDE e LATITUDE).', linhas: [] };
  if (tabela.length - 1 > LIMITES_OPERACAO.pontos) return { erro: `O limite é de ${LIMITES_OPERACAO.pontos} pontos por operação.`, linhas: [] };

  const linhas = tabela.slice(1).map((celulas, i): LinhaImportada => {
    const campo = (c: Coluna) => (indice[c] >= 0 ? celulas[indice[c]] : undefined);
    const erros: string[] = [];

    const coord = lerCoordenada(`${(campo('y') ?? '').trim()} ${(campo('x') ?? '').trim()}`);
    if (!coord.ok) erros.push(`Coordenada: ${coord.erro}`);
    else if (coord.avisos.length) erros.push(`Coordenada: ${coord.avisos.join(' ')}`);

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

    const ponto: Omit<Ponto, 'id'> | undefined = coord.ok && !erros.length
      ? {
          ...(numero !== undefined ? { numero } : {}),
          coordenada: coord.valor,
          municipio: limpar(campo('municipio'), LIMITES_OPERACAO.municipio),
          ...(equipe ? { equipe } : {}),
          ...(saida ? { saida } : {}),
          ...(retorno ? { retorno } : {}),
          notas: limpar(campo('notas'), LIMITES_OPERACAO.notas),
          demandas: [],
          situacao: 'planejado',
        }
      : undefined;
    return { linha: i + 2, ...(ponto ? { ponto } : {}), erros, resultado: limpar(campo('resultado'), 80), mes: limpar(campo('mes'), 10) };
  });
  const periodo = periodoDosPontos(linhas.flatMap((l) => (l.ponto ? [l.ponto] : [])));
  return { linhas, ...(periodo.inicio ? { periodoDoArquivo: periodo } : {}) };
}
