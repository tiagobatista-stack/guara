// Leitor de .xlsx: monta uma planilha fictícia mínima (zip com deflate e sem compressão) e confere a conversão e a importação.
import { importarPontosCsv } from './importar-csv.ts';
import { ehXlsx, xlsxParaCsv } from './ler-xlsx.ts';

const enc = new TextEncoder();
const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
const u16 = (n: number) => [n & 255, (n >> 8) & 255];

async function deflate(dados: Uint8Array) {
  const fluxo = new Response(dados as BodyInit).body!.pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}

async function zip(partes: Record<string, string>, comprimir: boolean) {
  const locais: number[] = [];
  const central: number[] = [];
  let n = 0;
  for (const [nome, texto] of Object.entries(partes)) {
    const original = enc.encode(texto);
    const dados = comprimir ? await deflate(original) : original;
    const nomeB = enc.encode(nome);
    const metodo = comprimir ? 8 : 0;
    const deslocamento = locais.length;
    locais.push(...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(metodo), ...u16(0), ...u16(0), ...u32(0), ...u32(dados.length), ...u32(original.length), ...u16(nomeB.length), ...u16(0), ...nomeB, ...dados);
    central.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(metodo), ...u16(0), ...u16(0), ...u32(0), ...u32(dados.length), ...u32(original.length), ...u16(nomeB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(deslocamento), ...nomeB);
    n++;
  }
  const fim = [...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(n), ...u16(n), ...u32(central.length), ...u32(locais.length), ...u16(0)];
  return new Uint8Array([...locais, ...central, ...fim]);
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const PARTES = {
  'xl/sharedStrings.xml': `<sst ${NS}><si><t>N_PONTO</t></si><si><t>COORD_X</t></si><si><t>COORD_Y</t></si><si><t>MUNICIPIO</t></si><si><t>DAT_SAIDA</t></si><si><t>DAT_RETOR</t></si><si><t>58° 48' 29,922" W</t></si><si><t>11° 35' 34,931" S</t></si><si><t>CIDADE FICTÍCIA</t></si></sst>`,
  'xl/styles.xml': `<styleSheet ${NS}><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>`,
  'xl/worksheets/sheet1.xml': `<worksheet ${NS}><sheetData>
    <row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c><c r="F1" t="s"><v>5</v></c></row>
    <row r="2"><c r="A2"><v>1</v></c><c r="B2" t="s"><v>6</v></c><c r="C2" t="s"><v>7</v></c><c r="D2" t="s"><v>8</v></c><c r="E2" s="1"><v>46314</v></c><c r="F2" s="1"><v>46318</v></c></row>
    <row r="3"/>
  </sheetData></worksheet>`,
};

describe('leitor de .xlsx', () => {
  for (const comprimir of [true, false]) {
    it(`converte a primeira aba em CSV (${comprimir ? 'deflate' : 'sem compressão'}), com data e coordenada em graus`, async () => {
      const bytes = await zip(PARTES, comprimir);
      expect(ehXlsx(bytes)).toBe(true);
      const csv = await xlsxParaCsv(bytes);
      expect(csv).toContain('19/10/2026;23/10/2026');
      const r = importarPontosCsv(csv);
      expect(r.erro).toBeUndefined();
      expect(r.linhas).toHaveLength(1);
      expect(r.linhas[0].erros).toEqual([]);
      expect(r.linhas[0].ponto).toMatchObject({ municipio: 'CIDADE FICTÍCIA', saida: '2026-10-19', retorno: '2026-10-23' });
      expect(r.linhas[0].ponto!.coordenada.lat).toBeCloseTo(-11.593036, 5);
    });
  }

  it('recusa arquivo que não é zip e zip sem planilha', async () => {
    expect(ehXlsx(enc.encode('N_PONTO;X'))).toBe(false);
    await expect(xlsxParaCsv(enc.encode('lixo qualquer sem estrutura de zip'))).rejects.toThrow(/xlsx/);
    await expect(xlsxParaCsv(await zip({ 'a.txt': 'x' }, false))).rejects.toThrow(/planilha/);
  });
});
