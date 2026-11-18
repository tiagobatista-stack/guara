import { render } from '@testing-library/react';
import L from 'leaflet';
import { MapaLeaflet } from './MapaLeaflet.tsx';
import { imagensOrdenadas, FONTES_WMS } from './fontes-wms.ts';

const rotulos = (c: HTMLElement) => [...c.querySelectorAll('.leaflet-control-layers-selector')].map((i) => ({
  tipo: (i as HTMLInputElement).type, ligado: (i as HTMLInputElement).checked, nome: i.nextElementSibling?.textContent?.trim(),
}));

describe('imagens de satélite', () => {
  it('ordem: da mais recente à mais antiga, pelo ano do título', () => {
    expect(imagensOrdenadas(FONTES_WMS).map((i) => i.camada.titulo)).toEqual(['Sentinel-2 2025 (SEMA)', 'Landsat-8 2018 (SEMA)', 'Landsat-5 2008 (SEMA)']);
  });

  it('uma base ativa por vez, "Sem imagem" inicial; trocar a base não mexe nos overlays', () => {
    const { container } = render(<MapaLeaflet itens={[]} aoEstado={() => {}} />);
    const radios = () => rotulos(container).filter((r) => r.tipo === 'radio');
    const caixas = () => rotulos(container).filter((r) => r.tipo === 'checkbox');
    expect(radios().map((r) => r.nome)).toEqual(['Sem imagem', 'Sentinel-2 2025 (SEMA)', 'Landsat-8 2018 (SEMA)', 'Landsat-5 2008 (SEMA)']);
    expect(radios().filter((r) => r.ligado).map((r) => r.nome)).toEqual(['Sem imagem']);
    const antes = caixas();
    expect(antes.map((c) => c.nome)).toEqual(['Limites municipais', 'Demandas', 'Operações']);
    (container.querySelectorAll('input[type=radio]')[2] as HTMLInputElement).click();
    expect(radios().filter((r) => r.ligado).map((r) => r.nome)).toEqual(['Landsat-8 2018 (SEMA)']);
    expect(caixas()).toEqual(antes);
  });
});

describe('tamanho do mapa', () => {
  it('chama invalidateSize quando o contêiner muda de tamanho e para de observar ao sair', () => {
    const chamadas: (() => void)[] = [];
    const desconectar = vi.fn();
    vi.stubGlobal('ResizeObserver', class { constructor(c: () => void) { chamadas.push(c); } observe() {} disconnect = desconectar; });
    const invalidar = vi.spyOn(L.Map.prototype, 'invalidateSize');
    const { unmount } = render(<MapaLeaflet itens={[]} aoEstado={() => {}} />);
    invalidar.mockClear();
    chamadas[0]();
    expect(invalidar).toHaveBeenCalledTimes(1);
    unmount();
    expect(desconectar).toHaveBeenCalled();
    vi.unstubAllGlobals();
    invalidar.mockRestore();
  });
});
