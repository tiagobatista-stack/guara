// Fontes WMS do mapa. Só camadas públicas, sem chave: tudo o que está no build vai para o navegador de quem abrir o site.
// Um servidor interno da SEMA entra no futuro como mais uma entrada desta lista.

export interface CamadaWms {
  /** Name real no GetCapabilities. */
  nome: string;
  titulo: string;
  ligadaPorPadrao?: boolean;
}
export interface FonteWms {
  id: string;
  nome: string;
  url: string;
  camadas: CamadaWms[];
}

// Conferido em 18/11/2026 no GetCapabilities público: o mosaico mais recente de cada satélite; o título é o Title dele (com o ano) mais "(SEMA)".
export const FONTES_WMS: FonteWms[] = [
  {
    id: 'sema-publico',
    nome: 'SEMA-MT',
    url: import.meta.env.VITE_WMS_SEMA ?? 'https://geo.sema.mt.gov.br/geoserver/wms',
    camadas: [
      { nome: 'Mosaicos:SENTINEL_2_2025', titulo: 'Sentinel-2 2025 (SEMA)' },
      { nome: 'Mosaicos:LANDSAT_8_2018', titulo: 'Landsat-8 2018 (SEMA)' },
      { nome: 'Mosaicos:LANDSAT_5_2008', titulo: 'Landsat-5 2008 (SEMA)' },
    ],
  },
];

/** Imagens de todas as fontes, da mais recente à mais antiga (ano do título; sem ano vai para o fim). */
export function imagensOrdenadas(fontes: readonly FonteWms[]): { fonte: FonteWms; camada: CamadaWms }[] {
  const ano = (t: string) => Number(/(?:19|20)\d{2}/.exec(t)?.[0] ?? 0);
  return fontes.flatMap((fonte) => fonte.camadas.map((camada) => ({ fonte, camada }))).sort((a, b) => ano(b.camada.titulo) - ano(a.camada.titulo));
}
