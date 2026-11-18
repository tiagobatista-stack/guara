// Reimportação da planilha da SEMA (pedido do responsável, 15/11/2026): a planilha volta preenchida depois do campo.
// Linha com o código (ou o número) de um ponto que já está na operação atualiza esse ponto, em vez de duplicar.
// O planejamento do sistema prevalece; da planilha entra o que no ponto ainda está vazio (resultado, motivo, protocolo,
// observação, tipo de dano). Diferenças são listadas, nunca aplicadas em silêncio.

import { RESULTADOS, type Operacao, type Ponto, type PontoNovo } from './modelo.ts';
import type { LinhaImportada } from './importar-csv.ts';
import { distanciaMetros, normalizar, textoViagem, viagemDoPonto } from './regras.ts';

/** Distância acima da qual a coordenada da planilha conta como diferente da do sistema. */
export const TOLERANCIA_COORDENADA_M = 50;

export interface Atualizacao {
  linha: number;
  ponto: Ponto;
  /** Campos vazios no ponto que a planilha preenche. */
  preencher: Partial<Pick<Ponto, 'resultado' | 'motivo' | 'protocolo' | 'observacao' | 'tipoDano' | 'situacao'>>;
  /** "resultado: Sim" — o que vai mudar, em texto. */
  mudancas: string[];
  /** Diferenças que não são aplicadas (o sistema prevalece). */
  diferencas: string[];
}

export interface PlanoDeImportacao {
  novas: LinhaImportada[];
  atualizacoes: Atualizacao[];
  /** Linhas recusadas nesta conferência (código de outra operação, número ocupado por outro código, repetidas). */
  recusadas: { linha: number; erro: string }[];
}

const br = (d?: string) => (d ? d.split('-').reverse().join('/') : '—');

function compararPlanejamento(op: Operacao, p: Ponto, n: PontoNovo): string[] {
  const dif: string[] = [];
  const v = viagemDoPonto(op, p);
  const lado = (rotulo: string, planilha: string, sistema: string) => `${rotulo}: planilha ${planilha}, sistema ${sistema}`;
  if (n.equipe !== undefined && normalizar(n.equipe) !== normalizar(v?.equipe ?? '')) dif.push(lado('equipe', n.equipe || '—', v?.equipe || '—'));
  if (n.saida !== undefined && n.saida !== v?.saida) dif.push(lado('saída', br(n.saida), br(v?.saida)));
  if (n.retorno !== undefined && n.retorno !== v?.retorno) dif.push(lado('retorno', br(n.retorno), br(v?.retorno)));
  if (n.municipio && normalizar(n.municipio) !== normalizar(p.municipio)) dif.push(lado('município', n.municipio, p.municipio || '—'));
  const d = distanciaMetros(n.coordenada, p.coordenada);
  if (d > TOLERANCIA_COORDENADA_M) dif.push(`coordenada: a planilha aponta um lugar a ${Math.round(d)} m do sistema`);
  if (n.numero !== undefined && p.numero !== undefined && n.numero !== p.numero) dif.push(lado('número', String(n.numero), String(p.numero)));
  return dif;
}

/** Campos do pós-campo: preenche o que está vazio; o que já existe e é diferente vira diferença. */
function compararResultados(p: Ponto, n: PontoNovo): Pick<Atualizacao, 'preencher' | 'mudancas' | 'diferencas'> {
  const preencher: Atualizacao['preencher'] = {};
  const mudancas: string[] = [];
  const diferencas: string[] = [];
  const texto = (campo: 'resultado' | 'motivo' | 'protocolo' | 'observacao' | 'tipoDano', v?: string) =>
    campo === 'resultado' && v ? RESULTADOS[v as keyof typeof RESULTADOS] : (v ?? '');
  const ROTULO = { resultado: 'resultado', motivo: 'motivo', protocolo: 'protocolo', observacao: 'observação', tipoDano: 'tipo de dano' } as const;
  for (const campo of ['resultado', 'motivo', 'protocolo', 'observacao', 'tipoDano'] as const) {
    const novo = n[campo];
    if (!novo) continue;
    if (campo === 'resultado' && p.reprogramado) {
      diferencas.push('resultado: o ponto já foi reprogramado em outra operação; registre o resultado lá');
      continue;
    }
    const atual = p[campo];
    if (!atual) {
      (preencher as Record<string, string>)[campo] = novo;
      mudancas.push(`${ROTULO[campo]}: ${texto(campo, novo)}`);
    } else if (normalizar(atual) !== normalizar(novo)) {
      diferencas.push(`${ROTULO[campo]}: planilha ${texto(campo, novo)}, sistema ${texto(campo, atual)}`);
    }
  }
  // O resultado novo muda a situação como no registro pela tela ("Não" = não fiscalizado continua planejado).
  if (preencher.resultado && p.situacao !== 'cancelado') preencher.situacao = preencher.resultado === 'nao' ? 'planejado' : 'vistoriado';
  return { preencher, mudancas, diferencas };
}

/**
 * Separa as linhas válidas da conferência em pontos novos e atualizações da operação `op`.
 * Casa pelo código (sem diferença de maiúsculas); sem código na linha, pelo número do ponto.
 */
export function planejarImportacao(op: Operacao, todas: readonly Operacao[], linhas: readonly LinhaImportada[]): PlanoDeImportacao {
  const novas: LinhaImportada[] = [];
  const atualizacoes: Atualizacao[] = [];
  const recusadas: PlanoDeImportacao['recusadas'] = [];
  const porCodigo = new Map(op.pontos.filter((p) => p.codigo).map((p) => [p.codigo!.toUpperCase(), p] as const));
  const emOutras = new Map(todas.filter((o) => o.id !== op.id).flatMap((o) => o.pontos.filter((p) => p.codigo).map((p) => [p.codigo!.toUpperCase(), o.nome] as const)));
  const usados = new Set<string>();

  for (const l of linhas) {
    const n = l.ponto;
    if (!n) continue;
    const codigo = n.codigo?.trim().toUpperCase();
    let alvo: Ponto | undefined;
    if (codigo) {
      if (emOutras.has(codigo)) { recusadas.push({ linha: l.linha, erro: `O código ${n.codigo} já existe em ${emOutras.get(codigo)}.` }); continue; }
      alvo = porCodigo.get(codigo);
      if (!alvo && n.numero !== undefined) {
        const mesmoNumero = op.pontos.find((p) => p.numero === n.numero);
        if (mesmoNumero?.codigo) { recusadas.push({ linha: l.linha, erro: `O ponto ${n.numero} já existe com o código ${mesmoNumero.codigo}, diferente de ${n.codigo}.` }); continue; }
        alvo = mesmoNumero;
      }
    } else if (n.numero !== undefined) {
      alvo = op.pontos.find((p) => p.numero === n.numero);
    }
    if (!alvo) { novas.push(l); continue; }
    if (usados.has(alvo.id)) { recusadas.push({ linha: l.linha, erro: `Outra linha do arquivo já atualiza o ${alvo.codigo ?? `ponto ${alvo.numero}`}.` }); continue; }
    usados.add(alvo.id);
    const r = compararResultados(alvo, n);
    atualizacoes.push({ linha: l.linha, ponto: alvo, ...r, diferencas: [...compararPlanejamento(op, alvo, n), ...r.diferencas] });
  }
  return { novas, atualizacoes, recusadas };
}

/** "JUINA202610-01 (Equipe A · 18/09/2026 a 22/09/2026)" para a prévia. */
export const rotuloAtualizacao = (op: Operacao, a: Atualizacao) => {
  const v = viagemDoPonto(op, a.ponto);
  return `${a.ponto.codigo ?? (a.ponto.numero !== undefined ? `Ponto ${a.ponto.numero}` : 'Ponto')}${v ? ` (${textoViagem(v)})` : ''}`;
};
