import type { Operacao, Ponto, Viagem } from '../../aplicacao/src/modulos/operacoes/modelo.ts';
import { COLUNAS_EXPORTACAO, celulaTexto, exportarCsv, exportarGeoJson, nomeDoArquivo } from '../../aplicacao/src/modulos/operacoes/exportar.ts';
import { importarPontosCsv } from '../../aplicacao/src/modulos/operacoes/importar-csv.ts';

const ponto = (id: string, extra: Partial<Ponto> = {}): Ponto => ({
  id, coordenada: { lat: -11.469244, lon: -58.631478 }, municipio: 'Juína Fictícia', notas: '', demandas: [], situacao: 'planejado', ...extra,
});
const operacao = (pontos: Ponto[], extra: Partial<Operacao> = {}): Operacao => ({
  id: 'op1', nome: 'Operação Fictícia 2026', inicio: '2026-09-18', fim: '2026-09-25', viagens: [], pontos, criadaEm: '2026-09-01T12:00:00.000Z', ...extra,
});
// Equipe e datas são da viagem; o arquivo as repete em cada ponto dela.
const viagem = (id: string, extra: Partial<Viagem> = {}): Viagem => ({ id, equipe: 'Equipe A', integrantes: ['Fulano Fictício', 'Beltrana Fictícia'], veiculos: ['Hilux FIC-0001'], notas: '', ...extra });
const vA = viagem('v1', { saida: '2026-09-18', retorno: '2026-09-22' });

describe('exportarCsv', () => {
  it('UTF-8 com BOM, cabeçalho da planilha e COORD_X = longitude, COORD_Y = latitude', () => {
    const csv = exportarCsv(operacao([ponto('a', { numero: 1, viagem: 'v1', notas: 'Hot spot', grupo: 'Fazenda X', demandas: ['d1', 'd2'] })], { viagens: [vA] }));
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const [cabecalho, linha] = csv.slice(1).split('\r\n');
    expect(cabecalho).toBe(COLUNAS_EXPORTACAO.join(','));
    expect(linha).toBe('1,Equipe A,-58.631478,-11.469244,Juína Fictícia,2026-09-18,2026-09-22,Hot spot,planejado,Fazenda X,Operação Fictícia 2026,2');
    expect(csv.endsWith('\r\n')).toBe(true);
    // Nomes de integrantes e veículos não saem no arquivo.
    expect(csv).not.toContain('Fulano');
    expect(csv).not.toContain('Hilux');
  });

  it('escapa aspas e vírgulas e neutraliza fórmula de planilha', () => {
    expect(celulaTexto('Equipe "A", norte')).toBe('"Equipe ""A"", norte"');
    expect(celulaTexto('=SOMA(1;2)')).toBe("'=SOMA(1;2)");
    expect(celulaTexto('+55 65')).toBe("'+55 65");
    expect(celulaTexto('-x')).toBe("'-x");
    expect(celulaTexto('@cmd')).toBe("'@cmd");
    expect(celulaTexto('linha 1\nlinha 2')).toBe('linha 1 linha 2');
    expect(celulaTexto(undefined)).toBe('');
  });

  it('não leva título nem id de demanda, só a contagem', () => {
    const csv = exportarCsv(operacao([ponto('a', { demandas: ['demanda-secreta-1'] })]));
    expect(csv).not.toContain('demanda-secreta-1');
    expect(csv).toContain(',1\r\n');
  });

  it('operação sem pontos: só o cabeçalho', () => {
    expect(exportarCsv(operacao([])).slice(1)).toBe(COLUNAS_EXPORTACAO.join(',') + '\r\n');
  });

  it('ida e volta: o CSV exportado é importado de volta com os mesmos pontos', () => {
    const origem = operacao([
      ponto('a', { numero: 1, viagem: 'v1', notas: 'Hot spot, DLA "suspeita"' }),
      ponto('b', { numero: 2, coordenada: { lat: -12.5, lon: -57.25 }, municipio: 'Outro' }),
    ], { viagens: [vA] });
    const esperado = [{ equipe: 'Equipe A', saida: '2026-09-18', retorno: '2026-09-22' }, { equipe: undefined, saida: undefined, retorno: undefined }];
    const volta = importarPontosCsv(exportarCsv(origem));
    expect(volta.erro).toBeUndefined();
    expect(volta.linhas.every((l) => l.erros.length === 0)).toBe(true);
    const lidos = volta.linhas.map((l) => l.ponto!);
    expect(lidos).toHaveLength(2);
    for (const [i, p] of origem.pontos.entries()) {
      expect(lidos[i]).toMatchObject({ numero: p.numero, coordenada: p.coordenada, municipio: p.municipio, notas: p.notas });
      expect(lidos[i].equipe).toBe(esperado[i].equipe);
      expect(lidos[i].saida).toBe(esperado[i].saida);
      expect(lidos[i].retorno).toBe(esperado[i].retorno);
    }
  });
});

describe('exportarGeoJson', () => {
  const geo = JSON.parse(exportarGeoJson(operacao([
    ponto('a', { numero: 1, viagem: 'v2', demandas: ['d1'], situacao: 'vistoriado' }),
    ponto('b', { municipio: '' }),
  ], { viagens: [viagem('v2', { saida: '2026-09-18' })] })));

  it('FeatureCollection com o SRC SIRGAS 2000 (EPSG:4674) declarado', () => {
    expect(geo.type).toBe('FeatureCollection');
    expect(geo.crs).toEqual({ type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::4674' } });
    expect(geo.features).toHaveLength(2);
  });
  it('pontos na ordem [longitude, latitude] e propriedades com os mesmos nomes do CSV', () => {
    expect(geo.features[0].geometry).toEqual({ type: 'Point', coordinates: [-58.631478, -11.469244] });
    expect(geo.features[0].properties).toEqual({
      N_PONTO: 1, EQUIPE: 'Equipe A', MUNICIPIO: 'Juína Fictícia', DAT_SAIDA: '2026-09-18', DAT_RETOR: null, NOT_PLANEJ: null,
      SITUACAO: 'vistoriado', GRUPO: null, OPERACAO: 'Operação Fictícia 2026', N_DEMANDAS: 1,
    });
    expect(geo.features[1].properties.MUNICIPIO).toBeNull();
    expect(geo.features[1].properties.EQUIPE).toBeNull();
  });
  it('acentos ficam como texto UTF-8, sem escape \\u', () => {
    expect(exportarGeoJson(operacao([ponto('a')]))).toContain('Juína Fictícia');
  });
  it('operação sem pontos: coleção vazia válida', () => {
    expect(JSON.parse(exportarGeoJson(operacao([]))).features).toEqual([]);
  });
});

describe('nomeDoArquivo', () => {
  it('sem acento nem caracteres inválidos, com a data e a extensão', () => {
    expect(nomeDoArquivo({ nome: 'Operação Fictícia / 2026 (Norte)' }, 'csv', '2026-09-18')).toBe('operacao-ficticia-2026-norte-pontos-2026-09-18.csv');
    expect(nomeDoArquivo({ nome: '???' }, 'geojson', '2026-09-18')).toBe('operacao-pontos-2026-09-18.geojson');
    expect(nomeDoArquivo({ nome: 'a'.repeat(120) }, 'csv', '2026-09-18').length).toBeLessThan(80);
  });
});
