import { exportarDados, validarImportacao } from './dados-portaveis.ts';

const AGORA = new Date('2026-11-18T12:00:00.000Z');

describe('prazo padrão do relatório no backup', () => {
  it('vai no arquivo e volta na importação; sem ele, o arquivo antigo continua valendo', () => {
    const r = validarImportacao(exportarDados([], 3, AGORA, undefined, 15));
    expect(r.ok && r.dados.configuracao).toEqual({ diasInatividade: 3, diasPadraoElaboracao: 15 });
    const antigo = validarImportacao(exportarDados([], 3, AGORA));
    expect(antigo.ok && antigo.dados.configuracao.diasPadraoElaboracao).toBeUndefined();
  });

  it('valor inválido recusa o arquivo sem alterar nada', () => {
    const json = JSON.parse(exportarDados([], 3, AGORA, undefined, 15));
    for (const ruim of [-1, 400, 1.5, '15']) {
      json.configuracao.diasPadraoElaboracao = ruim;
      expect(validarImportacao(JSON.stringify(json))).toMatchObject({ ok: false });
    }
  });
});
