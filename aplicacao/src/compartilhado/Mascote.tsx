// Mascotes Fofofauna em SVG próprio, estilo ilustrado (redesenho, etapa 1).
// Os mascotes apresentam resultados: não são agentes e não alteram capacidades.
// Os olhos acompanham o ponteiro (ou o último toque) e voltam ao centro depois de um tempo parado.
// O mascote pisca de tempos em tempos e dá um pulinho quando recebe um clique ou toque.
// Com "reduzir movimento" ativado no sistema, os olhos ficam parados e as animações não rodam.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type EspecieMascote = 'ariranha' | 'lobo-guara' | 'capivara';
export type HumorMascote = 'tranquilo' | 'atento' | 'curioso';

export const MASCOTES: Record<EspecieMascote, { nome: string; bioma: string; pelagem: string; detalhe: string }> = {
  ariranha: { nome: 'Ariranha', bioma: 'Amazônia', pelagem: '#7a5535', detalhe: '#f6e8cc' },
  'lobo-guara': { nome: 'Lobo-guará', bioma: 'Cerrado', pelagem: '#d17a30', detalhe: '#2a2018' },
  capivara: { nome: 'Capivara', bioma: 'Pantanal', pelagem: '#a37d58', detalhe: '#c29d7a' },
};

const TRACO = '#3a2a1c';
const ESCURO = '#1c1917';
const CREME = '#fbf0dc';

// Posição dos olhos, das sobrancelhas e da boca de cada espécie, no sistema de coordenadas do desenho.
const ROSTOS: Record<EspecieMascote, { olhoX: number; olhoY: number; sobrancelhaY: number; bocaY: number }> = {
  ariranha: { olhoX: 27, olhoY: -15, sobrancelhaY: -30, bocaY: 17 },
  'lobo-guara': { olhoX: 22, olhoY: -6, sobrancelhaY: -21, bocaY: 47 },
  capivara: { olhoX: 28, olhoY: -26, sobrancelhaY: -41, bocaY: 38 },
};

// ---------- Olhar: um único ouvinte de ponteiro para todos os mascotes da página ----------

type Ponto = { x: number; y: number };
type Ouvinte = (ponto: Ponto | null) => void;

const ALCANCE_DO_OLHAR = 2.6; // deslocamento máximo da pupila, em unidades do desenho
const DESCANSO_MS = 4000; // sem movimento por esse tempo, o olhar volta ao centro
const REACAO_MS = 600; // duração do pulinho ao clique ou toque (igual à animação em estilos.css)

// Intervalo entre piscadas, diferente por espécie para não piscarem juntas.
const PISCADA: Record<EspecieMascote, string> = { ariranha: '4.3s', 'lobo-guara': '5.6s', capivara: '6.7s' };

const ouvintes = new Set<Ouvinte>();
let ultimoPonto: Ponto | null = null;
let quadroPendente = false;
let temporizadorDescanso: ReturnType<typeof setTimeout> | undefined;

function avisarOuvintes() {
  quadroPendente = false;
  ouvintes.forEach((ouvinte) => ouvinte(ultimoPonto));
}

function agendarAviso() {
  if (quadroPendente) return;
  quadroPendente = true;
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(avisarOuvintes);
  else setTimeout(avisarOuvintes, 16);
}

function aoMoverPonteiro(evento: PointerEvent) {
  ultimoPonto = { x: evento.clientX, y: evento.clientY };
  agendarAviso();
  clearTimeout(temporizadorDescanso);
  temporizadorDescanso = setTimeout(() => {
    ultimoPonto = null;
    agendarAviso();
  }, DESCANSO_MS);
}

function acompanharPonteiro(ouvinte: Ouvinte): () => void {
  if (ouvintes.size === 0) {
    window.addEventListener('pointermove', aoMoverPonteiro, { passive: true });
    window.addEventListener('pointerdown', aoMoverPonteiro, { passive: true });
  }
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0) {
      window.removeEventListener('pointermove', aoMoverPonteiro);
      window.removeEventListener('pointerdown', aoMoverPonteiro);
      clearTimeout(temporizadorDescanso);
      ultimoPonto = null;
    }
  };
}

function prefereMenosMovimento(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ---------- Cabeças ----------

function CabecaLoboGuara({ detalhado }: { detalhado: boolean }) {
  return (
    <>
      <path d="M-50,-20 Q-54,-68 -38,-90 Q-18,-66 -10,-38 Z" fill="#d17a30" />
      <path d="M50,-20 Q54,-68 38,-90 Q18,-66 10,-38 Z" fill="#d17a30" />
      <path d="M-43,-34 Q-44,-60 -37,-72 Q-28,-56 -24,-42 Z" fill="#2a2018" stroke="none" />
      <path d="M43,-34 Q44,-60 37,-72 Q28,-56 24,-42 Z" fill="#2a2018" stroke="none" />
      <path d="M-52,-26 Q-58,12 -22,46 Q0,68 22,46 Q58,12 52,-26 Q0,-52 -52,-26 Z" fill="#d17a30" />
      <path d="M-10,-42 Q0,-58 10,-42 Q0,-34 -10,-42 Z" fill="#2a2018" stroke="none" />
      <path d="M-50,-8 Q-46,24 -21,44 Q-27,20 -25,4 Z" fill={CREME} stroke="none" />
      <path d="M50,-8 Q46,24 21,44 Q27,20 25,4 Z" fill={CREME} stroke="none" />
      <path d="M-15,22 Q0,12 15,22 Q14,46 0,55 Q-14,46 -15,22 Z" fill={CREME} stroke="none" />
      <path d="M-9,17 Q0,11 9,17 L6,34 Q0,39 -6,34 Z" fill="#2a2018" stroke="none" />
      <ellipse cx="0" cy="37" rx="7.5" ry="5" fill="#0f0c0a" stroke="none" />
      {detalhado && <ellipse cx="-2.5" cy="35.5" rx="2.2" ry="1.1" fill="#6b5a4c" stroke="none" />}
    </>
  );
}

function CabecaAriranha({ detalhado }: { detalhado: boolean }) {
  return (
    <>
      <path d="M-36,24 Q-40,70 0,72 Q40,70 36,24 Z" fill="#7a5535" />
      <path d="M-24,44 Q-10,34 2,42 Q14,34 26,44 Q24,60 8,64 Q-4,58 -14,66 Q-26,58 -24,44 Z" fill="#f6e8cc" stroke="none" />
      <path d="M-58,-26 Q-62,-44 -48,-42 Z" fill="#5f4129" />
      <path d="M58,-26 Q62,-44 48,-42 Z" fill="#5f4129" />
      <path d="M-60,0 Q-60,-46 0,-46 Q60,-46 60,0 Q60,38 0,40 Q-60,38 -60,0 Z" fill="#7a5535" />
      <ellipse cx="0" cy="12" rx="29" ry="18" fill="#9c7551" stroke="none" />
      <path d="M-12,-2 Q0,-8 12,-2 Q10,10 0,10 Q-10,10 -12,-2 Z" fill="#0f0c0a" stroke="none" />
      {detalhado && (
        <>
          <ellipse cx="-3" cy="0" rx="3" ry="1.5" fill="#6b5a4c" stroke="none" />
          <path
            d="M-25,8 Q-40,2 -54,4 M-25,14 Q-40,16 -53,22 M25,8 Q40,2 54,4 M25,14 Q40,16 53,22"
            fill="none"
            stroke="#f6e8cc"
            strokeWidth="1.5"
          />
        </>
      )}
    </>
  );
}

function CabecaCapivara({ detalhado }: { detalhado: boolean }) {
  return (
    <>
      <path d="M-46,-50 Q-52,-68 -34,-64 Z" fill="#7d5c3e" />
      <path d="M46,-50 Q52,-68 34,-64 Z" fill="#7d5c3e" />
      <path d="M-44,-40 Q-46,-64 0,-64 Q46,-64 44,-40 L48,32 Q48,64 0,64 Q-48,64 -48,32 Z" fill="#a37d58" />
      {detalhado && <path d="M-8,-62 Q-6,-54 -2,-58 M2,-63 Q3,-54 7,-59" fill="none" strokeWidth="1.5" />}
      <path d="M-34,24 Q-36,4 0,4 Q36,4 34,24 Q36,56 0,56 Q-36,56 -34,24 Z" fill="#c29d7a" stroke="none" />
      <ellipse cx="-12" cy="20" rx="4.5" ry="5.5" fill="#3d2c1e" stroke="none" />
      <ellipse cx="12" cy="20" rx="4.5" ry="5.5" fill="#3d2c1e" stroke="none" />
      <path d="M0,29 V38" fill="none" strokeWidth="2" />
      {detalhado && (
        <>
          <ellipse cx="-39" cy="-6" rx="6" ry="3.5" fill="#d98f6e" stroke="none" opacity="0.6" />
          <ellipse cx="39" cy="-6" rx="6" ry="3.5" fill="#d98f6e" stroke="none" opacity="0.6" />
        </>
      )}
    </>
  );
}

const CABECAS: Record<EspecieMascote, (props: { detalhado: boolean }) => ReactNode> = {
  ariranha: CabecaAriranha,
  'lobo-guara': CabecaLoboGuara,
  capivara: CabecaCapivara,
};

// ---------- Olhos, sobrancelhas e boca (mudam com o humor) ----------

function Olho({ x, y, humor, detalhado, pisca }: { x: number; y: number; humor: HumorMascote; detalhado: boolean; pisca: boolean }) {
  const alturaOlho = humor === 'atento' ? 10.5 : 9.5;
  return (
    // O olho fecha em torno do próprio centro quando pisca (animação em estilos.css).
    <g className={pisca ? 'mascote-olho' : undefined} style={{ transformOrigin: `${x}px ${y}px` }}>
      <ellipse cx={x} cy={y} rx="8.5" ry={alturaOlho} fill="#fbf5e6" strokeWidth="2" />
      <g className="mascote-pupila" stroke="none">
        <circle cx={x} cy={y} r="5.2" fill={ESCURO} />
        {detalhado && <circle cx={x + 1.8} cy={y - 2.2} r="1.8" fill="#ffffff" />}
      </g>
    </g>
  );
}

function Sobrancelhas({ x, y, humor }: { x: number; y: number; humor: HumorMascote }) {
  let d: string;
  if (humor === 'atento') {
    d = `M${-x - 9},${y - 2} L${-x + 8},${y + 3} M${x + 9},${y - 2} L${x - 8},${y + 3}`;
  } else if (humor === 'curioso') {
    d = `M${-x - 9},${y - 3} Q${-x},${y - 10} ${-x + 9},${y - 4} M${x - 9},${y + 2} Q${x},${y - 2} ${x + 9},${y + 2}`;
  } else {
    d = `M${-x - 9},${y + 2} Q${-x},${y - 3} ${-x + 9},${y + 2} M${x - 9},${y + 2} Q${x},${y - 3} ${x + 9},${y + 2}`;
  }
  return <path d={d} fill="none" strokeWidth="2.2" />;
}

function Boca({ y, humor }: { y: number; humor: HumorMascote }) {
  if (humor === 'curioso') return <ellipse cx="0" cy={y + 3} rx="3.2" ry="3.8" fill="#7a2f2a" strokeWidth="1.8" />;
  const d = humor === 'tranquilo' ? `M-8,${y} Q0,${y + 7} 8,${y}` : `M-6,${y + 2} H6`;
  return <path d={d} fill="none" strokeWidth="2.2" />;
}

// ---------- Componente ----------

export function Mascote({
  especie,
  humor,
  tamanho = 56,
  decorativo = false,
}: {
  especie: EspecieMascote;
  humor: HumorMascote;
  tamanho?: number;
  /** Rosto pequeno de apoio (ao lado de uma fala, por exemplo): escondido do leitor de tela e com os olhos parados. */
  decorativo?: boolean;
}) {
  const m = MASCOTES[especie];
  const rosto = ROSTOS[especie];
  const Cabeca = CABECAS[especie];
  // Em tamanhos pequenos, o traço engrossa e os detalhes finos (bigodes, brilhos) somem.
  const detalhado = tamanho >= 40;
  const referencia = useRef<SVGSVGElement>(null);
  const [reagindo, setReagindo] = useState(false);
  const fimDaReacao = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(fimDaReacao.current), []);

  // Clique ou toque: só um gesto de simpatia, sem função nem informação.
  const reagir = () => {
    if (decorativo) return;
    clearTimeout(fimDaReacao.current);
    setReagindo(true);
    fimDaReacao.current = setTimeout(() => setReagindo(false), REACAO_MS);
  };

  useEffect(() => {
    const svg = referencia.current;
    if (!svg || decorativo || prefereMenosMovimento()) return undefined;
    return acompanharPonteiro((ponto) => {
      // O deslocamento vai em variáveis CSS do próprio SVG; estilos.css aplica nas pupilas.
      if (!ponto) {
        svg.style.removeProperty('--olhar-x');
        svg.style.removeProperty('--olhar-y');
        return;
      }
      const caixa = svg.getBoundingClientRect();
      if (caixa.width === 0) return;
      const dx = ponto.x - (caixa.left + caixa.width / 2);
      const dy = ponto.y - (caixa.top + caixa.height / 2);
      const distancia = Math.hypot(dx, dy) || 1;
      const forca = Math.min(distancia / (caixa.width * 1.5), 1) * ALCANCE_DO_OLHAR;
      svg.style.setProperty('--olhar-x', `${((dx / distancia) * forca).toFixed(2)}px`);
      svg.style.setProperty('--olhar-y', `${((dy / distancia) * forca).toFixed(2)}px`);
    });
  }, [decorativo]);

  return (
    <svg
      ref={referencia}
      className={`mascote${decorativo ? '' : ' mascote--vivo'}${reagindo ? ' mascote--reagindo' : ''}`}
      style={{ '--piscada': PISCADA[especie] } as CSSProperties}
      onClick={reagir}
      width={tamanho}
      height={tamanho}
      viewBox="-86 -98 172 172"
      role={decorativo ? undefined : 'img'}
      aria-label={decorativo ? undefined : `${m.nome} (${m.bioma}), ${humor}`}
      aria-hidden={decorativo ? true : undefined}
      data-especie={especie}
      data-humor={humor}
    >
      <g className="mascote-corpo">
        <g
          stroke={TRACO}
          strokeWidth={detalhado ? 2.5 : 4}
          strokeLinejoin="round"
          strokeLinecap="round"
          transform={humor === 'curioso' ? 'rotate(-5)' : undefined}
        >
          <Cabeca detalhado={detalhado} />
          <Olho x={-rosto.olhoX} y={rosto.olhoY} humor={humor} detalhado={detalhado} pisca={!decorativo} />
          <Olho x={rosto.olhoX} y={rosto.olhoY} humor={humor} detalhado={detalhado} pisca={!decorativo} />
          <Sobrancelhas x={rosto.olhoX} y={rosto.sobrancelhaY} humor={humor} />
          <Boca y={rosto.bocaY} humor={humor} />
        </g>
      </g>
    </svg>
  );
}
