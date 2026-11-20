// Mapa das demandas e dos pontos de operação, com filtros e lista do que não tem localização.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useEstadoDemandas } from '../demandas/armazem.ts';
import { prazosDeElaboracao } from '../operacoes/armazem.ts';
import { useOperacoes } from '../operacoes/armazem.ts';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { MapaLeaflet } from './MapaLeaflet.tsx';
import { dataLocal } from '../operacoes/regras.ts';
import { COR_VENCIDO, corDaSituacao, itensDoMapa, legenda, rotuloDaSituacao } from './regras.ts';

export function Mapa() {
  const { demandas } = useEstadoDemandas();
  const operacoes = useOperacoes();
  const [avisos, setAvisos] = useState<Record<string, 'normal' | 'devagar' | 'indisponivel'>>({});
  const cartao = useRef<HTMLDivElement>(null);
  const [telaCheia, setTelaCheia] = useState(false);
  useEffect(() => {
    const aoMudar = () => setTelaCheia(document.fullscreenElement === cartao.current);
    document.addEventListener('fullscreenchange', aoMudar);
    return () => document.removeEventListener('fullscreenchange', aoMudar);
  }, []);
  const alternarTelaCheia = () => { void (telaCheia ? document.exitFullscreen() : cartao.current?.requestFullscreen()); };
  const [ver, setVer] = useState({ demanda: true, ponto: true });
  const { noMapa, semLocal } = useMemo(() => itensDoMapa(demandas, operacoes, dataLocal(new Date()), prazosDeElaboracao(demandas)), [demandas, operacoes]);
  const [etiqueta, setEtiqueta] = useState('');
  const etiquetas = useMemo(() => [...new Set(noMapa.flatMap((i) => i.etiquetas ?? []))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [noMapa]);
  // Filtro por etiqueta vale para os pontos; demandas não têm etiqueta e saem enquanto o filtro estiver ligado.
  const visiveis = useMemo(() => noMapa.filter((i) => ver[i.tipo] && (!etiqueta || i.etiquetas?.includes(etiqueta))), [noMapa, ver, etiqueta]);

  return (
    <section aria-labelledby="titulo-mapa-pagina" className="pagina">
      <div>
        <h1 id="titulo-mapa-pagina" className="titulo-pagina">Mapa</h1>
        <p className="texto-suave texto-medio">Demandas com coordenada (círculos) e pontos de operação (quadrados), dos dados deste navegador. O fundo é só o limite dos municípios, que fica no próprio app. Ligar o satélite faz o navegador pedir as imagens à SEMA, que então vê a área mostrada.</p>
      </div>

      <div className="cartao mapa-cartao" ref={cartao}>
        <div className="agenda-barra">
          <label><input type="checkbox" checked={ver.demanda} onChange={(e) => setVer({ ...ver, demanda: e.target.checked })} /> Demandas</label>
          <label><input type="checkbox" checked={ver.ponto} onChange={(e) => setVer({ ...ver, ponto: e.target.checked })} /> Operações</label>
          {etiquetas.length > 0 && (
            <label>Etiqueta{' '}
              <select value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
                <option value="">Todas</option>
                {etiquetas.map((e) => <option key={e} value={e}>{e}</option>)}
              </select></label>
          )}
          {document.fullscreenEnabled && <button type="button" className="botao botao--pequeno" aria-pressed={telaCheia} onClick={alternarTelaCheia}>{telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}</button>}
        </div>
        {Object.entries(avisos).map(([n, e]) => e === 'indisponivel'
          ? <p key={n} role="alert" className="texto-pequeno texto--atencao">Fonte indisponível: {n}</p>
          : e === 'devagar' ? <p key={n} role="status" className="texto-pequeno texto--atencao">Imagens carregando devagar (limite do servidor da SEMA): {n}</p> : null)}
        <MapaLeaflet itens={visiveis} aoEstado={(n, e) => setAvisos((a) => (a[n] === e ? a : { ...a, [n]: e }))} />
        <ul className="lista-limpa texto-pequeno" data-testid="legenda">
          {legenda(visiveis).map((l) => (
            <li key={`${l.tipo}${l.situacao}${l.vencido}`}>
              <span aria-hidden style={{ color: corDaSituacao(l.situacao), ...(l.vencido ? { outline: `2px solid ${COR_VENCIDO}` } : {}) }}>{l.tipo === 'demanda' ? '●' : '■'}</span> {l.tipo === 'demanda' ? 'Demanda' : 'Ponto'} · {rotuloDaSituacao(l)}: {l.n}
            </li>
          ))}
        </ul>
        <p className="texto-pequeno texto-suave">Limites: IBGE. Imagens: SEMA-MT (satélite opcional, no controle de camadas do mapa). Camadas temáticas da SEMA (CAR, embargos, autos) não incluídas: exigem chave de acesso.</p>
      </div>

      <div className="cartao">
        <h2 className="titulo-secao" data-testid="titulo-sem-local">Sem localização ({semLocal.length})</h2>
        {semLocal.length === 0 ? (
          <EstadoVazio texto="Toda demanda tem coordenada." />
        ) : (
          <ul className="lista-limpa lista-divisoria texto-medio" data-testid="sem-local">
            {semLocal.map((d) => <li key={d.id}>{d.titulo} <a href="#/demandas" className="texto-pequeno">Abrir</a></li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
