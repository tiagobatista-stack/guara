// Mascotes Fofofauna em SVG próprio, estilo ilustrado (redesenho, etapa 1).
// Os mascotes apresentam resultados: não são agentes e não alteram capacidades.
// Os olhos acompanham o ponteiro (ou o último toque) e, depois de um tempo parado, voltam ao centro
// ou, se houver um alvo (o aviso que pede atenção), olham para ele.
// O mascote pisca de tempos em tempos e dá um pulinho quando recebe um clique ou toque.
// Sem atividade na página, fica entediado, depois sonolento e por fim dorme; qualquer atividade
// ou mudança de humor o acorda. Comemora quando o aplicativo chama comemorarMascotes().
// Com "reduzir movimento" ativado no sistema, os olhos ficam parados e as animações não rodam.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export type EspecieMascote = 'ariranha' | 'lobo-guara' | 'capivara';
// pensativo: inferência; cauteloso: algo não testado ou não demonstrado (etapa 5). Reforçam o selo de texto, não o substituem.
export type HumorMascote = 'tranquilo' | 'atento' | 'curioso' | 'pensativo' | 'cauteloso';

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

// ---------- Repouso: tédio, sono e dormir quando a página fica sem atividade ----------

export type RepousoMascote = 'acordado' | 'entediado' | 'sonolento' | 'dormindo';

// Tempo sem atividade para cada estado. Só o mascote muda: nada é registrado, medido ou avisado.
const LIMITES_MS = { entediado: 60_000, sonolento: 180_000, dormindo: 360_000 };
// Jeito de cada espécie: a capivara adormece mais cedo, o lobo-guará resiste mais.
const RITMO: Record<EspecieMascote, number> = { capivara: 0.75, ariranha: 1, 'lobo-guara': 1.25 };
const MENOR_LIMITE_MS = LIMITES_MS.entediado * Math.min(...Object.values(RITMO));
const VIGIA_MS = 5000;
const EVENTOS_DE_ATIVIDADE = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;

const ouvintesAtividade = new Set<() => void>();
let ultimaAtividade = Date.now();
let vigia: ReturnType<typeof setInterval> | undefined;

function avisarAtividade() {
  ouvintesAtividade.forEach((ouvinte) => ouvinte());
}

function registrarAtividade() {
  const parado = Date.now() - ultimaAtividade;
  ultimaAtividade = Date.now();
  // Só há mascote fora do estado acordado depois do menor limite; antes disso não há o que avisar.
  if (parado >= MENOR_LIMITE_MS) avisarAtividade();
}

/** Acorda todos os mascotes da página (um alerta novo, por exemplo). */
export function acordarMascotes() {
  ultimaAtividade = Date.now();
  avisarAtividade();
}

function acompanharAtividade(ouvinte: () => void): () => void {
  if (ouvintesAtividade.size === 0) {
    ultimaAtividade = Date.now();
    EVENTOS_DE_ATIVIDADE.forEach((evento) => window.addEventListener(evento, registrarAtividade, { passive: true }));
    vigia = setInterval(avisarAtividade, VIGIA_MS);
  }
  ouvintesAtividade.add(ouvinte);
  return () => {
    ouvintesAtividade.delete(ouvinte);
    if (ouvintesAtividade.size === 0) {
      EVENTOS_DE_ATIVIDADE.forEach((evento) => window.removeEventListener(evento, registrarAtividade));
      clearInterval(vigia);
    }
  };
}

function repousoAgora(especie: EspecieMascote): RepousoMascote {
  const parado = (Date.now() - ultimaAtividade) / RITMO[especie];
  if (parado >= LIMITES_MS.dormindo) return 'dormindo';
  if (parado >= LIMITES_MS.sonolento) return 'sonolento';
  if (parado >= LIMITES_MS.entediado) return 'entediado';
  return 'acordado';
}

// ---------- Comemoração ----------

export type FestaMascote = 'pequena' | 'grande';
const DURACAO_FESTA_MS: Record<FestaMascote, number> = { pequena: 1200, grande: 2400 };
const ouvintesFesta = new Set<(festa: FestaMascote) => void>();

/** Faz os mascotes da página comemorarem: 'pequena' ao concluir uma etapa, 'grande' ao zerar as pendências. */
export function comemorarMascotes(festa: FestaMascote = 'pequena') {
  acordarMascotes();
  ouvintesFesta.forEach((ouvinte) => ouvinte(festa));
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

type EstadoOlho = 'normal' | 'feliz' | 'fechado';

function Olho({
  x,
  y,
  humor,
  detalhado,
  pisca,
  estado = 'normal',
  palpebra = null,
  pelagem,
}: {
  x: number;
  y: number;
  humor: HumorMascote;
  detalhado: boolean;
  pisca: boolean;
  estado?: EstadoOlho;
  /** Altura da pálpebra em relação ao centro do olho (negativo = mais aberta); null = sem pálpebra. */
  palpebra?: number | null;
  pelagem: string;
}) {
  if (estado === 'feliz') return <path d={`M${x - 8},${y + 3} Q${x},${y - 8} ${x + 8},${y + 3}`} fill="none" strokeWidth="2.6" />;
  if (estado === 'fechado') return <path d={`M${x - 8},${y} Q${x},${y + 7} ${x + 8},${y}`} fill="none" strokeWidth="2.6" />;
  const alturaOlho = humor === 'atento' ? 10.5 : 9.5;
  const meiaLargura = palpebra === null ? 0 : 8.5 * Math.sqrt(Math.max(0, 1 - (palpebra / alturaOlho) ** 2));
  return (
    // O olho fecha em torno do próprio centro quando pisca (animação em estilos.css).
    <g className={pisca && palpebra === null ? 'mascote-olho' : undefined} style={{ transformOrigin: `${x}px ${y}px` }}>
      <ellipse cx={x} cy={y} rx="8.5" ry={alturaOlho} fill="#fbf5e6" strokeWidth="2" />
      <g className="mascote-pupila" stroke="none">
        <circle cx={x} cy={y} r="5.2" fill={ESCURO} />
        {detalhado && <circle cx={x + 1.8} cy={y - 2.2} r="1.8" fill="#ffffff" />}
      </g>
      {palpebra !== null && (
        <path
          d={`M${(x - meiaLargura).toFixed(1)},${y + palpebra} A8.5 ${alturaOlho} 0 0 1 ${(x + meiaLargura).toFixed(1)},${y + palpebra} Z`}
          fill={pelagem}
          strokeWidth="2"
        />
      )}
    </g>
  );
}

function Sobrancelhas({ x, y, humor }: { x: number; y: number; humor: HumorMascote }) {
  let d: string;
  if (humor === 'atento') {
    d = `M${-x - 9},${y - 2} L${-x + 8},${y + 3} M${x + 9},${y - 2} L${x - 8},${y + 3}`;
  } else if (humor === 'curioso') {
    d = `M${-x - 9},${y - 3} Q${-x},${y - 10} ${-x + 9},${y - 4} M${x - 9},${y + 2} Q${x},${y - 2} ${x + 9},${y + 2}`;
  } else if (humor === 'pensativo') {
    // Uma sobrancelha erguida, a outra reta.
    d = `M${-x - 9},${y - 4} Q${-x},${y - 12} ${-x + 9},${y - 5} M${x - 9},${y + 1} L${x + 9},${y + 1}`;
  } else if (humor === 'cauteloso') {
    // Pontas de dentro erguidas: preocupação.
    d = `M${-x - 9},${y + 2} L${-x + 8},${y - 4} M${x + 9},${y + 2} L${x - 8},${y - 4}`;
  } else {
    d = `M${-x - 9},${y + 2} Q${-x},${y - 3} ${-x + 9},${y + 2} M${x - 9},${y + 2} Q${x},${y - 3} ${x + 9},${y + 2}`;
  }
  return <path d={d} fill="none" strokeWidth="2.2" />;
}

type FormaBoca = 'humor' | 'reta' | 'sono' | 'festa';

function Boca({ y, humor, forma = 'humor' }: { y: number; humor: HumorMascote; forma?: FormaBoca }) {
  if (forma === 'festa') return <path d={`M-9,${y} Q0,${y + 12} 9,${y} Z`} fill="#7a2f2a" strokeWidth="2" />;
  if (forma === 'sono') return <path d={`M-4,${y + 2} H4`} fill="none" strokeWidth="2.2" />;
  if (forma === 'reta') return <path d={`M-6,${y + 2} H6`} fill="none" strokeWidth="2.2" />;
  if (humor === 'curioso') return <ellipse cx="0" cy={y + 3} rx="3.2" ry="3.8" fill="#7a2f2a" strokeWidth="1.8" />;
  // "Hum": boca de lado.
  if (humor === 'pensativo') return <path d={`M-2,${y + 3} Q3,${y + 1} 8,${y + 4}`} fill="none" strokeWidth="2.2" />;
  // Boca ondulada: incerteza.
  if (humor === 'cauteloso') return <path d={`M-8,${y + 3} Q-4,${y} 0,${y + 3} Q4,${y + 6} 8,${y + 3}`} fill="none" strokeWidth="2.2" />;
  const d = humor === 'tranquilo' ? `M-8,${y} Q0,${y + 7} 8,${y}` : `M-6,${y + 2} H6`;
  return <path d={d} fill="none" strokeWidth="2.2" />;
}

// ---------- Componente ----------

export function Mascote({
  especie,
  humor,
  tamanho = 56,
  decorativo = false,
  nome,
  alvo = null,
}: {
  especie: EspecieMascote;
  humor: HumorMascote;
  tamanho?: number;
  /** Nome dado pelo analista; quando existe, o leitor de tela anuncia o nome antes da espécie. */
  nome?: string;
  /** Rosto pequeno de apoio (ao lado de uma fala, por exemplo): escondido do leitor de tela e com os olhos parados. */
  decorativo?: boolean;
  /** Elemento para onde o mascote olha quando o ponteiro está parado (o aviso que pede atenção, por exemplo). */
  alvo?: Element | null;
}) {
  const m = MASCOTES[especie];
  const rosto = ROSTOS[especie];
  const Cabeca = CABECAS[especie];
  // Em tamanhos pequenos, o traço engrossa e os detalhes finos (bigodes, brilhos) somem.
  const detalhado = tamanho >= 40;
  const referencia = useRef<SVGSVGElement>(null);
  const [reagindo, setReagindo] = useState(false);
  const fimDaReacao = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [repouso, setRepouso] = useState<RepousoMascote>('acordado');
  const repousoAnterior = useRef<RepousoMascote>('acordado');
  const [festa, setFesta] = useState<FestaMascote | null>(null);
  const fimDaFesta = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const humorAnterior = useRef(humor);

  useEffect(
    () => () => {
      clearTimeout(fimDaReacao.current);
      clearTimeout(fimDaFesta.current);
    },
    [],
  );

  // Repouso: acompanha a atividade da página. Rostos decorativos ficam sempre acordados.
  useEffect(() => {
    if (decorativo) return undefined;
    return acompanharAtividade(() => setRepouso(repousoAgora(especie)));
  }, [decorativo, especie]);

  // Mudança de humor (um aviso que chega, por exemplo) acorda o mascote.
  useEffect(() => {
    if (humorAnterior.current === humor) return;
    humorAnterior.current = humor;
    acordarMascotes();
  }, [humor]);

  // Comemoração pedida pelo aplicativo.
  useEffect(() => {
    if (decorativo) return undefined;
    const ouvinte = (pedida: FestaMascote) => {
      clearTimeout(fimDaFesta.current);
      setFesta(pedida);
      fimDaFesta.current = setTimeout(() => setFesta(null), DURACAO_FESTA_MS[pedida]);
    };
    ouvintesFesta.add(ouvinte);
    return () => {
      ouvintesFesta.delete(ouvinte);
    };
  }, [decorativo]);

  // Clique ou toque: só um gesto de simpatia, sem função nem informação.
  const reagir = () => {
    if (decorativo) return;
    clearTimeout(fimDaReacao.current);
    setReagindo(true);
    fimDaReacao.current = setTimeout(() => setReagindo(false), REACAO_MS);
  };

  // Ao acordar, um pequeno susto (o mesmo pulinho do clique).
  useEffect(() => {
    const acordou = repousoAnterior.current !== 'acordado' && repouso === 'acordado';
    repousoAnterior.current = repouso;
    if (acordou) reagir();
    // reagir só usa refs e setState, por isso não entra nas dependências.
  }, [repouso]);

  // O que aparece no rosto: a festa vem primeiro, depois o repouso, depois o humor.
  const desperto = repouso === 'acordado' && !festa;
  const humorVisivel: HumorMascote = desperto ? humor : 'tranquilo';
  const estadoOlho: EstadoOlho = festa ? 'feliz' : repouso === 'dormindo' ? 'fechado' : 'normal';
  const palpebra = festa ? null : repouso === 'entediado' ? -3 : repouso === 'sonolento' ? 2 : null;
  // O lobo-guará dorme de olho meio aberto: o olho direito fica só com a pálpebra baixa.
  const vigiaDormindo = !festa && repouso === 'dormindo' && especie === 'lobo-guara';
  const formaBoca: FormaBoca = festa ? 'festa' : repouso === 'dormindo' ? 'sono' : repouso === 'acordado' ? 'humor' : 'reta';
  const classes = [
    'mascote',
    decorativo ? '' : 'mascote--vivo',
    reagindo ? 'mascote--reagindo' : '',
    !festa && repouso !== 'acordado' ? `mascote--${repouso}` : '',
    festa ? 'mascote--comemorando' : '',
    festa === 'grande' ? 'mascote--festa-grande' : '',
  ].filter(Boolean).join(' ');

  useEffect(() => {
    const svg = referencia.current;
    if (!svg || decorativo || prefereMenosMovimento()) return undefined;
    const centroDoAlvo = (): Ponto | null => {
      if (!alvo) return null;
      const caixa = alvo.getBoundingClientRect();
      return caixa.width === 0 && caixa.height === 0 ? null : { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 };
    };
    const mirar = (ponto: Ponto | null) => {
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
    };
    // Sem ponteiro recente, olha para o alvo (ou volta ao centro, se não houver).
    mirar(ultimoPonto ?? centroDoAlvo());
    return acompanharPonteiro((ponto) => mirar(ponto ?? centroDoAlvo()));
  }, [decorativo, alvo]);

  return (
    <svg
      ref={referencia}
      className={classes}
      style={{ '--piscada': PISCADA[especie], '--vagar': especie === 'ariranha' ? '4s' : '7s' } as CSSProperties}
      onClick={reagir}
      width={tamanho}
      height={tamanho}
      viewBox="-86 -98 172 172"
      role={decorativo ? undefined : 'img'}
      aria-label={decorativo ? undefined : `${nome && nome !== m.nome ? `${nome}, ` : ''}${m.nome} (${m.bioma}), ${humor}`}
      aria-hidden={decorativo ? true : undefined}
      data-especie={especie}
      data-humor={humor}
      data-repouso={repouso}
    >
      <g className="mascote-corpo">
        <g
          stroke={TRACO}
          strokeWidth={detalhado ? 2.5 : 4}
          strokeLinejoin="round"
          strokeLinecap="round"
          transform={humorVisivel === 'curioso' ? 'rotate(-5)' : humorVisivel === 'pensativo' ? 'rotate(4)' : undefined}
        >
          <Cabeca detalhado={detalhado} />
          <Olho x={-rosto.olhoX} y={rosto.olhoY} humor={humorVisivel} detalhado={detalhado} pisca={!decorativo} estado={estadoOlho} palpebra={palpebra} pelagem={m.pelagem} />
          <Olho
            x={rosto.olhoX}
            y={rosto.olhoY}
            humor={humorVisivel}
            detalhado={detalhado}
            pisca={!decorativo}
            estado={vigiaDormindo ? 'normal' : estadoOlho}
            palpebra={vigiaDormindo ? 4 : palpebra}
            pelagem={m.pelagem}
          />
          <Sobrancelhas x={rosto.olhoX} y={rosto.sobrancelhaY} humor={humorVisivel} />
          <Boca y={rosto.bocaY} humor={humorVisivel} forma={formaBoca} />
        </g>
      </g>
      {!festa && repouso === 'dormindo' && detalhado && (
        <text className="mascote-z" x="50" y="-62" fontSize="26" fontWeight="700" fill={TRACO} style={{ transformOrigin: '50px -62px' }}>
          z
        </text>
      )}
    </svg>
  );
}
