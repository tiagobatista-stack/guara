// Dados da capa do Relatório Técnico do SIGA-MT, na ordem em que o SIGA pede: funções puras (coordenada, atividade, objetivo, equipe).

import type { Operacao, Ponto, Viagem } from './modelo.ts';

export const UF = 'MT';
export const LIMITE_TEXTO_SIGA = 200;

/** Graus decimais → sinal + G:MM:SS,ss (ex.: -10.010555 → "-10:00:38,00"). Arredonda a centésimo de segundo; 60 s vira minuto, 60 min vira grau. */
export function coordenadaSiga(graus: number): string {
  const cs = Math.round(Math.abs(graus) * 3600 * 100);
  const g = Math.floor(cs / 360000);
  const m = Math.floor(cs / 6000) % 60;
  const s = Math.floor(cs / 100) % 60;
  const c = cs % 100;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${graus < 0 && cs > 0 ? '-' : ''}${g}:${p(m)}:${p(s)},${p(c)}`;
}

/** Atividade (texto livre no SIGA), sugerida pelo tipo de dano; o usuário pode editar. */
export const ATIVIDADE_POR_TIPO_DE_DANO: Record<string, string> = {
  'Desmatamento': 'Supressão',
  'Desmatamento químico': 'Supressão por desmatamento químico',
  'Queimada': 'Queimada',
  'Aplicação irregular de agrotóxico': 'Aplicação de agrotóxico',
};
export const atividadeSugerida = (tipoDano?: string): string => (tipoDano && ATIVIDADE_POR_TIPO_DE_DANO[tipoDano]) || '';

const ORIGEM_NO_OBJETIVO: Record<string, string> = { planet: 'Planet', deter: 'DETER', denuncia: 'Denúncia' };
/** "FISCALIZAÇÃO DE ALERTAS DE {TIPO} {ORIGEM} {OPERAÇÃO}", em maiúsculas; o usuário pode editar. */
export function objetivoSugerido(operacao: Pick<Operacao, 'origemAlerta' | 'nome'>, ponto: Pick<Ponto, 'tipoDano'>): string {
  const o = operacao.origemAlerta;
  const origem = !o ? '' : o.tipo === 'requisicao' ? `Requisição ${o.detalhe ?? ''}` : o.tipo === 'outra' ? o.detalhe ?? '' : ORIGEM_NO_OBJETIVO[o.tipo] ?? '';
  return ['Fiscalização de alertas de', ponto.tipoDano ?? '', origem, operacao.nome].map((x) => x.trim()).filter(Boolean).join(' ').toUpperCase();
}

export const atividadeDoPonto = (p: Pick<Ponto, 'siga' | 'tipoDano'>) => p.siga?.atividade ?? atividadeSugerida(p.tipoDano);
export const objetivoDoPonto = (o: Pick<Operacao, 'origemAlerta' | 'nome'>, p: Pick<Ponto, 'siga' | 'tipoDano'>) => p.siga?.objetivo ?? objetivoSugerido(o, p);

/** Equipe técnica: nome e cargo (sem lotação). Cargo não registrado vira pendência. */
export function equipeSiga(viagem?: Viagem): { nome: string; cargo: string }[] {
  return (viagem?.integrantes ?? []).filter((n) => n !== viagem?.motorista).map((nome) => ({ nome, cargo: viagem?.pessoas?.[nome]?.cargo?.trim() ?? '' }));
}
