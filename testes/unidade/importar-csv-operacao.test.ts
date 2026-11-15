import { decodificarCsv, importarPontosCsv, lerCsv } from '../../aplicacao/src/modulos/operacoes/importar-csv.ts';

// Estrutura da planilha anônima de exemplo; os valores aqui são fictícios.
const CABECALHO = 'N_PONTO;EQUIPE;COORD_X;COORD_Y;MUNICIPIO;DAT_SAIDA;DAT_RETOR;NOT_PLANEJ';

describe('lerCsv', () => {
  it('separa por ; ou , e respeita aspas', () => {
    expect(lerCsv('a;b;c\n1;"x;y";3')).toEqual([['a', 'b', 'c'], ['1', 'x;y', '3']]);
    expect(lerCsv('a,b\r\n1,"dito ""oi"""\r\n\r\n')).toEqual([['a', 'b'], ['1', 'dito "oi"']]);
  });
});

describe('lerCsv: texto colado e aspas de segundos', () => {
  const GMS = `11° 28' 09,2" S`;
  it('separa por tabulação e mantém as aspas de segundos no meio da célula', () => {
    expect(lerCsv(`A\tB\n${GMS}\tX`)).toEqual([['A', 'B'], [GMS, 'X']]);
  });
  it('a forma do Excel (célula entre aspas, aspas dobradas) também funciona', () => {
    expect(lerCsv(`A;B\n"11° 28' 09,2"" S";X`)).toEqual([['A', 'B'], [GMS, 'X']]);
  });
});

describe('decodificarCsv', () => {
  it('UTF-8 e, se inválido, Windows-1252', () => {
    expect(decodificarCsv(new TextEncoder().encode('Juína'))).toBe('Juína');
    expect(decodificarCsv(new Uint8Array([0x4a, 0x75, 0xed, 0x6e, 0x61]))).toBe('Juína'); // 0xED é "í" em Windows-1252
  });
});

describe('importarPontosCsv', () => {
  const janela = { inicio: '2026-09-18', fim: '2026-09-25' };

  it('lê a linha no formato da planilha: coordenada em graus-minutos-segundos, vírgula decimal e datas DD/MM/AAAA', () => {
    // As notas têm ";" e por isso vêm entre aspas, como o Excel grava.
    const r = importarPontosCsv(`${CABECALHO}\n1;Equipe A;58° 37' 53,321" W;11° 28' 09,279" S;Município Fictício;18/09/2026;22/09/2026;"Hot spot; DLA suspeita"`, janela);
    expect(r.erro).toBeUndefined();
    expect(r.linhas).toHaveLength(1);
    expect(r.linhas[0].erros).toEqual([]);
    const p = r.linhas[0].ponto!;
    expect(p).toMatchObject({ numero: 1, equipe: 'Equipe A', municipio: 'Município Fictício', saida: '2026-09-18', retorno: '2026-09-22', notas: 'Hot spot; DLA suspeita', situacao: 'planejado', demandas: [] });
    expect(p.coordenada.lat).toBeCloseTo(-11.469244, 5);
    expect(p.coordenada.lon).toBeCloseTo(-58.631478, 5);
  });

  it('aceita cabeçalho sem acento e outros nomes, e coordenadas decimais em colunas separadas', () => {
    const r = importarPontosCsv('Ponto,Latitude,Longitude,Cidade\n7,-11.5,-58.5,Lugar Fictício', janela);
    expect(r.linhas[0].ponto).toMatchObject({ numero: 7, municipio: 'Lugar Fictício', coordenada: { lat: -11.5, lon: -58.5 } });
  });

  it('acusa retorno antes da saída (defeito da planilha de exemplo) sem corrigir', () => {
    const r = importarPontosCsv(`${CABECALHO}\n1;Equipe A;58.5 W;11.5 S;X;18/09/2026;22/09/2025;`);
    expect(r.linhas[0].ponto).toBeUndefined();
    expect(r.linhas[0].erros).toEqual(['O retorno é anterior à saída.']);
  });

  it('acusa coordenada ilegível, data inválida e data fora do período, com a linha do arquivo', () => {
    const r = importarPontosCsv(`${CABECALHO}\n1;A;abc;11.5 S;X;;;\n2;A;58.5 W;11.5 S;X;30/02/2026;;\n3;A;58.5 W;11.5 S;X;01/12/2026;;`, janela);
    expect(r.linhas.map((l) => l.linha)).toEqual([2, 3, 4]);
    expect(r.linhas[0].erros[0]).toMatch(/^Coordenada:/);
    expect(r.linhas[1].erros).toEqual(['A data de saída não é uma data válida (use DD/MM/AAAA ou AAAA-MM-DD).']);
    expect(r.linhas[2].erros).toEqual(['A data de saída fica fora do período da operação.']);
    expect(r.linhas.every((l) => !l.ponto)).toBe(true);
  });

  it('coordenada fora do Brasil vira erro de conferência, não entra calada', () => {
    const r = importarPontosCsv('LAT;LON\n40.7;-74.0');
    expect(r.linhas[0].ponto).toBeUndefined();
    expect(r.linhas[0].erros[0]).toMatch(/fora do Brasil/);
  });

  it('sem colunas de coordenada ou vazio: erro geral', () => {
    expect(importarPontosCsv('A;B\n1;2').erro).toMatch(/colunas de coordenada/);
    expect(importarPontosCsv('').erro).toBe('O arquivo está vazio.');
  });

  it('ponto sem equipe e sem datas é aceito (será encaixado depois)', () => {
    const r = importarPontosCsv('LAT;LON\n-11.5;-58.5', janela);
    expect(r.linhas[0].ponto).toMatchObject({ coordenada: { lat: -11.5, lon: -58.5 }, municipio: '', notas: '' });
    expect(r.linhas[0].ponto).not.toHaveProperty('equipe');
    expect(r.linhas[0].ponto).not.toHaveProperty('saida');
  });
});
