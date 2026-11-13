// Mascotes Fofofauna em SVG próprio e simplificado (arte provisória).
// Os mascotes apresentam resultados: não são agentes e não alteram capacidades.

export type EspecieMascote = 'ariranha' | 'lobo-guara' | 'capivara';
export type HumorMascote = 'tranquilo' | 'atento' | 'curioso';

export const MASCOTES: Record<EspecieMascote, { nome: string; bioma: string; pelagem: string; detalhe: string }> = {
  ariranha: { nome: 'Ariranha', bioma: 'Amazônia', pelagem: '#6b4a2f', detalhe: '#f1e3c6' },
  'lobo-guara': { nome: 'Lobo-guará', bioma: 'Cerrado', pelagem: '#c8702a', detalhe: '#2a2018' },
  capivara: { nome: 'Capivara', bioma: 'Pantanal', pelagem: '#9a7451', detalhe: '#5c4330' },
};

export function Mascote({
  especie,
  humor,
  tamanho = 56,
}: {
  especie: EspecieMascote;
  humor: HumorMascote;
  tamanho?: number;
}) {
  const m = MASCOTES[especie];
  const orelhasAltas = especie === 'lobo-guara';
  const boca = humor === 'tranquilo' ? 'M26 40 q6 5 12 0' : humor === 'atento' ? 'M27 42 h10' : 'M29 41 q3 3 6 0';
  const sobrancelha = humor === 'atento';
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 64 64" role="img" aria-label={`${m.nome} (${m.bioma}), ${humor}`}>
      {orelhasAltas ? (
        <>
          <path d="M14 22 L18 4 L26 18 Z" fill={m.pelagem} stroke={m.detalhe} strokeWidth="2" />
          <path d="M50 22 L46 4 L38 18 Z" fill={m.pelagem} stroke={m.detalhe} strokeWidth="2" />
        </>
      ) : (
        <>
          <circle cx="16" cy="18" r="6" fill={m.pelagem} />
          <circle cx="48" cy="18" r="6" fill={m.pelagem} />
        </>
      )}
      <ellipse cx="32" cy="34" rx="22" ry="20" fill={m.pelagem} />
      <ellipse cx="32" cy="40" rx="12" ry="9" fill={m.detalhe} opacity="0.85" />
      <circle cx="24" cy="30" r="3" fill="#1c1917" />
      <circle cx="40" cy="30" r="3" fill="#1c1917" />
      {sobrancelha && <path d="M20 24 l7 2 M44 24 l-7 2" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" />}
      <ellipse cx="32" cy="36" rx="3" ry="2" fill="#1c1917" />
      <path d={boca} stroke="#1c1917" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
