import { FONTES_WMS } from './fontes-wms.ts';

describe('fontes WMS', () => {
  it('nenhuma URL nem parâmetro de fonte contém authkey (o build é público)', () => {
    expect(JSON.stringify(FONTES_WMS).toLowerCase()).not.toContain('authkey');
  });

  it('todas as camadas começam desligadas e têm nome e título', () => {
    const camadas = FONTES_WMS.flatMap((f) => f.camadas);
    expect(camadas.length).toBeGreaterThan(0);
    for (const c of camadas) {
      expect(c.nome).toBeTruthy();
      expect(c.titulo).toBeTruthy();
      expect(c.ligadaPorPadrao).toBeFalsy();
    }
  });
});
