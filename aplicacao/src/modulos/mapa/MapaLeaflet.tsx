// Desenho do mapa com Leaflet. Fundo: limites municipais locais (IBGE); satélite da SEMA só se a pessoa ligar. Sem fundo de terceiros.
// Balões montados com nós de texto (nunca innerHTML com dado do usuário).

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import municipios from './municipios-mt.json';
import { formatarDecimal, formatarGms } from '../demandas/coordenadas.ts';
import { FONTES_WMS } from './fontes-wms.ts';
import { CENTRO_MT, corDaSituacao, estadoDaFonte, limitesDosItens, type ItemMapa } from './regras.ts';

function balao(i: ItemMapa): HTMLElement {
  const div = document.createElement('div');
  const linha = (texto: string, forte = false) => {
    if (!texto) return;
    const p = document.createElement(forte ? 'strong' : 'p');
    p.textContent = texto;
    p.style.margin = '2px 0';
    div.append(p);
  };
  linha(i.rotulo, true);
  linha(`${i.tipo === 'demanda' ? 'Demanda' : 'Ponto de operação'} · ${i.situacao}`);
  linha(i.municipio ?? '');
  linha(i.quando);
  linha(formatarDecimal(i.coordenada));
  linha(formatarGms(i.coordenada));
  const a = document.createElement('a');
  a.href = i.tipo === 'demanda' ? '#/demandas' : '#/operacoes';
  a.textContent = 'Abrir';
  div.append(a);
  return div;
}

export function MapaLeaflet({ itens, aoEstado }: { itens: ItemMapa[]; aoEstado: (titulo: string, estado: 'normal' | 'devagar' | 'indisponivel') => void }) {
  const alvo = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camada = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const m = L.map(alvo.current!, { attributionControl: false }).setView([CENTRO_MT.lat, CENTRO_MT.lon], CENTRO_MT.zoom);
    L.geoJSON(municipios as never, {
      style: { color: '#64748b', weight: 1, fill: false },
      onEachFeature: (f, l) => l.bindTooltip(String(f.properties?.nome ?? ''), { sticky: true }),
    }).addTo(m);
    L.control.scale({ imperial: false }).addTo(m);
    L.control.attribution({ prefix: false }).addAttribution('Limites: IBGE · Imagens: SEMA-MT').addTo(m);
    // Satélite opcional (desligado): se a fonte não responder, a camada sai e a tela avisa.
    const opcionais: Record<string, L.Layer> = {};
    for (const f of FONTES_WMS) {
      for (const c of f.camadas) {
        // Tiles grandes e carga só ao parar: o servidor da SEMA atrasa quem passa de 15 pedidos por janela.
        const t = L.tileLayer.wms(f.url, { layers: c.nome, format: 'image/png', transparent: true, tileSize: 512, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 2 });
        let erros = 0;
        let cargas = 0;
        t.on('add', () => { erros = 0; cargas = 0; aoEstado(c.titulo, 'normal'); });
        t.on('tileload', () => { cargas++; });
        t.on('tileerror', () => {
          erros++;
          const estado = estadoDaFonte(erros, cargas);
          if (estado === 'indisponivel') m.removeLayer(t);
          if (estado !== 'normal') aoEstado(c.titulo, estado);
        });
        opcionais[c.titulo] = t;
        if (c.ligadaPorPadrao) t.addTo(m);
      }
    }
    L.control.layers(undefined, opcionais, { collapsed: false }).addTo(m);
    camada.current = L.layerGroup().addTo(m);
    mapa.current = m;
    return () => { m.remove(); mapa.current = null; };
  }, []);

  useEffect(() => {
    const g = camada.current!;
    g.clearLayers();
    for (const i of itens) {
      const pos: L.LatLngTuple = [i.coordenada.lat, i.coordenada.lon];
      const cor = corDaSituacao(i.situacao);
      const marcador = i.tipo === 'demanda'
        ? L.circleMarker(pos, { radius: 7, color: '#fff', weight: 1.5, fillColor: cor, fillOpacity: 1 })
        : L.marker(pos, { icon: L.divIcon({ className: '', html: `<span class="mapa-quadrado" style="background:${cor}"></span>`, iconSize: [14, 14] }) });
      marcador.bindPopup(balao(i)).addTo(g);
    }
    const lim = limitesDosItens(itens);
    if (lim) mapa.current!.fitBounds(lim, { padding: [30, 30], maxZoom: 12 });
  }, [itens]);

  return <div ref={alvo} className="mapa-area" role="application" aria-label="Mapa das demandas e operações" />;
}
