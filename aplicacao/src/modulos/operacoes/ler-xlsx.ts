// Leitor mínimo de .xlsx (pedido do responsável, 18/11/2026), sem biblioteca: o .xlsx é um zip de XML.
// Devolve a primeira planilha como texto CSV (`;`), que o importador de pontos já entende.
// shortcut: lê só a primeira aba, sem fórmulas calculadas nem células mescladas; zip só com deflate ou sem compressão.

const LIMITE_BYTES = 20 * 1024 * 1024; // tamanho descompactado máximo de cada parte (proteção contra zip bomba)
const FORMATOS_DATA = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

export const ehXlsx = (bytes: Uint8Array) => bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"

async function lerZip(bytes: Uint8Array): Promise<Map<string, () => Promise<Uint8Array>>> {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let fim = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new Error('O arquivo não parece uma planilha .xlsx.');
  const total = v.getUint16(fim + 10, true);
  let p = v.getUint32(fim + 16, true);
  const partes = new Map<string, () => Promise<Uint8Array>>();
  for (let n = 0; n < total; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('O arquivo .xlsx está danificado.');
    const flags = v.getUint16(p + 8, true);
    const metodo = v.getUint16(p + 10, true);
    const comprimido = v.getUint32(p + 20, true);
    const original = v.getUint32(p + 24, true);
    const nome = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + v.getUint16(p + 28, true)));
    const local = v.getUint32(p + 42, true);
    p += 46 + v.getUint16(p + 28, true) + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    partes.set(nome, async () => {
      if (flags & 1) throw new Error('A planilha tem senha; salve uma cópia sem senha.');
      if (original > LIMITE_BYTES) throw new Error('A planilha é grande demais.');
      const ini = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      const dados = bytes.subarray(ini, ini + comprimido);
      if (metodo === 0) return dados;
      if (metodo !== 8) throw new Error('O arquivo .xlsx usa uma compressão não aceita.');
      const fluxo = new Response(dados as BodyInit).body!.pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(fluxo).arrayBuffer());
    });
  }
  return partes;
}

function xml(bytes: Uint8Array): Document {
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('O arquivo .xlsx está danificado.');
  return doc;
}

const textoDe = (el: Element) => Array.from(el.getElementsByTagName('t')).map((t) => t.textContent ?? '').join('');
const coluna = (ref: string) => [...(/^[A-Z]+/.exec(ref)?.[0] ?? 'A')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
const dataBr = (serial: number) => {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86400000);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
};
const csv = (t: string) => (/[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);

export async function xlsxParaCsv(bytes: Uint8Array): Promise<string> {
  const partes = await lerZip(bytes);
  const obter = async (nome: string) => { const p = partes.get(nome); return p ? xml(await p()) : null; };

  const textos = Array.from((await obter('xl/sharedStrings.xml'))?.getElementsByTagName('si') ?? []).map(textoDe);

  // Quais estilos de célula são data: formato embutido ou personalizado com d/m/a.
  const estilos = await obter('xl/styles.xml');
  const personalizados = new Map(Array.from(estilos?.getElementsByTagName('numFmt') ?? []).map((f) => [Number(f.getAttribute('numFmtId')), f.getAttribute('formatCode') ?? '']));
  const ehData = Array.from(estilos?.getElementsByTagName('cellXfs')[0]?.getElementsByTagName('xf') ?? []).map((xf) => {
    const id = Number(xf.getAttribute('numFmtId'));
    return FORMATOS_DATA.has(id) || /[dy]/i.test((personalizados.get(id) ?? '').replace(/"[^"]*"|\[[^\]]*\]/g, ''));
  });

  const aba = [...partes.keys()].filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10))[0];
  if (!aba) throw new Error('Não achei nenhuma planilha dentro do arquivo.');
  const linhas = Array.from((await obter(aba))!.getElementsByTagName('row')).map((row) => {
    const celulas: string[] = [];
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const v = c.getElementsByTagName('v')[0]?.textContent ?? '';
      const tipo = c.getAttribute('t');
      let valor = '';
      if (tipo === 's') valor = textos[Number(v)] ?? '';
      else if (tipo === 'inlineStr') valor = textoDe(c);
      else if (tipo === 'str') valor = v;
      else if (v !== '' && tipo !== 'e' && tipo !== 'b') valor = ehData[Number(c.getAttribute('s') ?? 0)] && Number.isFinite(Number(v)) ? dataBr(Number(v)) : v;
      celulas[coluna(c.getAttribute('r') ?? '')] = valor.replace(/\s+/g, ' ').trim();
    }
    return Array.from(celulas, (x) => csv(x ?? '')).join(';');
  });
  return linhas.join('\n');
}
