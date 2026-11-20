// Desenho do mapa com Leaflet. Fundo: limites municipais locais (IBGE); satélite da SEMA só se a pessoa ligar. Sem fundo de terceiros.
// Balões montados com nós de texto (nunca innerHTML com dado do usuário).

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import municipios from './municipios-mt.json';
import { formatarDecimal, formatarGms } from '../demandas/coordenadas.ts';
import { FONTES_WMS, imagensOrdenadas } from './fontes-wms.ts';
import { textoAnotacoesAbertas } from '../../compartilhado/anotacoes.ts';
import { CENTRO_MT, COR_VENCIDO, corDaSituacao, estadoDaFonte, limitesDosItens, rotuloDaSituacao, type ItemMapa } from './regras.ts';

const PNG_TRANSPARENTE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // 1x1: bloco que falhou fica transparente, não cinza
const ESTILO_SEM_IMAGEM = { halo: { weight: 0, opacity: 0, fill: false }, traco: { color: '#64748b', weight: 1, opacity: 1, fill: false } };
const ESTILO_COM_IMAGEM = { halo: { color: '#0f172a', weight: 3, opacity: 0.8, fill: false }, traco: { color: '#fff', weight: 1.5, opacity: 0.8, fill: false } };

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
  linha(`${i.tipo === 'demanda' ? 'Demanda' : 'Ponto de operação'} · ${rotuloDaSituacao(i)}`);
  if (i.travado) linha(`⛔ Travado: ${i.travado.motivo}${i.travado.detalhe ? ` — ${i.travado.detalhe}` : ''}`);
  if (i.motivoCancelamento) linha(`Cancelado: ${i.motivoCancelamento}`);
  if (i.anotacoesAbertas) linha(textoAnotacoesAbertas(i.anotacoesAbertas));
  linha(i.municipio ?? '');
  linha([i.imovel, i.areaHa !== undefined ? `${String(i.areaHa).replace('.', ',')} ha` : ''].filter(Boolean).join(' · '));
  linha(i.etiquetas?.length ? `Etiquetas: ${i.etiquetas.join(', ')}` : '');
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
  const demandas = useRef<L.LayerGroup | null>(null);
  const pontos = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    const m = L.map(alvo.current!, { attributionControl: false }).setView([CENTRO_MT.lat, CENTRO_MT.lon], CENTRO_MT.zoom);
    // Limites no painel de vetores (acima das imagens). Sobre satélite: linha clara com halo escuro; sem imagem: o traço cinza de sempre.
    const halo = L.geoJSON(municipios as never, { style: ESTILO_SEM_IMAGEM.halo, interactive: false });
    const traco = L.geoJSON(municipios as never, {
      style: ESTILO_SEM_IMAGEM.traco,
      onEachFeature: (f, l) => l.bindTooltip(String(f.properties?.nome ?? ''), { sticky: true }),
    });
    const limites = L.layerGroup([halo, traco]).addTo(m);
    const estiloDosLimites = (comImagem: boolean) => {
      const e = comImagem ? ESTILO_COM_IMAGEM : ESTILO_SEM_IMAGEM;
      halo.setStyle(e.halo);
      traco.setStyle(e.traco);
    };
    m.on('baselayerchange', (e) => estiloDosLimites(e.layer !== semImagem));
    L.control.scale({ imperial: false }).addTo(m);
    L.control.attribution({ prefix: false }).addAttribution('Limites: IBGE · Imagens: SEMA-MT').addTo(m);
    // Imagens: uma só por vez (botões de opção); "Sem imagem" é a inicial. Se a fonte não responder, volta para ela e a tela avisa.
    const semImagem = L.layerGroup().addTo(m);
    const bases: Record<string, L.Layer> = { 'Sem imagem': semImagem };
    for (const { fonte, camada: c } of imagensOrdenadas(FONTES_WMS)) {
      // Tiles grandes e carga só ao parar: o servidor da SEMA atrasa quem passa de 15 pedidos por janela.
      const t = L.tileLayer.wms(fonte.url, { layers: c.nome, format: 'image/png', transparent: true, errorTileUrl: PNG_TRANSPARENTE, tileSize: 512, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 2 });
      let erros = 0;
      let cargas = 0;
      t.on('add', () => { erros = 0; cargas = 0; aoEstado(c.titulo, 'normal'); });
      t.on('tileload', () => { cargas++; });
      t.on('tileerror', () => {
        erros++;
        const estado = estadoDaFonte(erros, cargas);
        if (estado === 'indisponivel') { m.removeLayer(t); semImagem.addTo(m); estiloDosLimites(false); }
        if (estado !== 'normal') aoEstado(c.titulo, estado);
      });
      bases[c.titulo] = t;
    }
    demandas.current = L.layerGroup().addTo(m);
    pontos.current = L.layerGroup().addTo(m);
    L.control.layers(bases, { 'Limites municipais': limites, 'Demandas': demandas.current, 'Operações': pontos.current }, { collapsed: false }).addTo(m);
    mapa.current = m;
    // Painéis laterais abrindo e fechando, janela mudando ou tela cheia: o mapa recalcula o tamanho.
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => m.invalidateSize());
    observador?.observe(alvo.current!);
    return () => { observador?.disconnect(); m.remove(); mapa.current = null; };
  }, []);

  useEffect(() => {
    demandas.current!.clearLayers();
    pontos.current!.clearLayers();
    for (const i of itens) {
      const pos: L.LatLngTuple = [i.coordenada.lat, i.coordenada.lon];
      const cor = corDaSituacao(i.situacao);
      const marcador = i.tipo === 'demanda'
        ? L.circleMarker(pos, { radius: 7, color: '#fff', weight: 2.5, fillColor: cor, fillOpacity: 1 })
        : L.marker(pos, { icon: L.divIcon({ className: '', html: `<span class="mapa-quadrado" style="background:${cor}${i.travado ? `;outline:3px dashed ${i.vencido ? COR_VENCIDO : '#0f172a'};outline-offset:1px` : i.vencido ? `;outline:3px solid ${COR_VENCIDO}` : ''}"></span>`, iconSize: [14, 14] }) });
      marcador.bindPopup(balao(i)).addTo(i.tipo === 'demanda' ? demandas.current! : pontos.current!);
    }
    const lim = limitesDosItens(itens);
    if (lim) mapa.current!.fitBounds(lim, { padding: [30, 30], maxZoom: 12 });
  }, [itens]);

  return <div ref={alvo} className="mapa-area" role="application" aria-label="Mapa das demandas e operações" />;
}
