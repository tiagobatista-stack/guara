import { describe, expect, it } from 'vitest';
import { extrairIds } from './extrair.ts';

describe('extrairIds', () => {
  it.each([
    ['DEM-FIC-0001', ['DEM-FIC-0001']],
    ['dem-fic-0001', ['DEM-FIC-0001']],
    ['Prorrogar DEM-FIC-0001, por favor', ['DEM-FIC-0001']],
    ['DEM-FIC-0003 lembrar segunda feira', ['DEM-FIC-0003']],
    ['lembrar (DEM-FIC-0099) amanhã', ['DEM-FIC-0099']],
    ['dem fic 3', ['DEM-FIC-0003']],
    ['demfic12', ['DEM-FIC-0012']],
    ['DEM_FIC_7', ['DEM-FIC-0007']],
    ['DEM-FIC-0001 e DEM-FIC-0002', ['DEM-FIC-0001', 'DEM-FIC-0002']],
    ['DEM-FIC-0001 de novo DEM-FIC-1', ['DEM-FIC-0001']],
  ])('"%s" → %j', (frase, esperado) => {
    expect(extrairIds(frase)).toEqual(esperado);
  });

  it.each(['prazos', '', 'DEM-1', 'DEM-FIC-', 'DEM-FIC-12345', 'XDEM-FIC-0001', 'DEM-FIC-0001x', 'dem fic três'])('"%s" não tem ID', (frase) => {
    expect(extrairIds(frase)).toEqual([]);
  });
});
