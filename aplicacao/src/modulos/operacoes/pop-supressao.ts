// Caracterização do dano por supressão de vegetação nativa: perguntas e opções do Anexo I (Formulários A e B) do POP do IBAMA
// (Portaria Ibama nº 83/2022, DOU de 29/09/2022; PDF em docs/referencias/). Os itens são DADOS, copiados do Anexo I sem resumir;
// os desvios ("siga para a pergunta N") ficam na opção que os causa. A adoção deste POP pela SEMA-MT precisa ser confirmada pelo responsável.
// Desvios do texto do POP (não só do Anexo): seção 4.2.12 (sem alteração da camada superficial do solo, siga para o item 18) e seção 4.2.15
// (sem arraste, siga para o item 18; com arraste, item 16). Divergência conhecida: A-15 "Fogo → A-16" segue o Anexo I; o texto da
// seção 4.2.15 só trata de arraste/sem arraste. Mantido o Anexo.
// Leituras minhas, fora do texto do formulário (ver `nota` e `opcional`): A-5 aceita várias marcas; os itens `opcional` não entram na conta
// de "sem resposta". Onde o PDF traz símbolo, usei o equivalente: "£ 50%" é "≤ 50%"; "At e r r o" é "Aterro".

import type { SugestaoGeo } from './sugestao-vegetacao.ts';

// Tipos novos (Inspeção de agrotóxicos, inspecao-agrotoxicos.ts; mesmo motor): 'simnao' (Sim/Não/N.A.), 'numero' e 'data' (AAAA-MM-DD).
// Todas as respostas continuam texto ou lista de textos.
export type TipoItem = 'unica' | 'multipla' | 'texto' | 'simnao' | 'numero' | 'data';
export type Resposta = string | string[];
export type Caracterizacao = { [item: string]: Resposta };

export interface OpcaoPop {
  texto: string;
  /** Desvio do formulário: "siga para a pergunta N" (id do item de destino). */
  vai?: string;
}

export interface ItemPop {
  /** "A-10": formulário e número do item no POP. */
  id: string;
  /** A e B: POP. C: Inspeção de agrotóxicos. */
  formulario: 'A' | 'B' | 'C';
  texto: string;
  tipo: TipoItem;
  opcoes?: OpcaoPop[];
  /** Formulário A: preencher preferencialmente em campo; B: em escritório. */
  onde: 'campo' | 'escritorio';
  nota?: string;
  /** Fora da conta de "sem resposta": o POP diz "desejável" ou "se for o caso", ou é sub-item/complemento que depende de outro. */
  opcional?: boolean;
  /** Pergunta condicional: só se aplica quando o item `item` (ele próprio aplicável) tem uma destas respostas. */
  se?: { item: string; vale: readonly string[] };
  /** Inspeção: 'previa' (conferir no escritório) ou 'campo'. No POP, vale `onde`. */
  fase?: 'previa' | 'campo';
  /** Inspeção: número da seção do questionário (1 a 7). */
  secao?: number;
}

const o = (...textos: string[]): OpcaoPop[] => textos.map((texto) => ({ texto }));
const SIM_NAO = o('Sim', 'Não');
const SIM_NAO_NFV = o('Sim', 'Não', 'Não foi possível verificar');
const CONSTATACAO = o('Sim, constatada visualmente', 'Sim, constatada por indícios', 'Parcialmente (menor ou igual de 50%)', 'Não', 'Não foi possível verificar');
const FONTE = o('Verificação em campo', 'Verificação por imagem');

function item(id: string, texto: string, tipo: TipoItem, extra: Partial<ItemPop> = {}): ItemPop {
  const formulario = id[0] as 'A' | 'B';
  return { id, formulario, texto, tipo, onde: formulario === 'A' ? 'campo' : 'escritorio', ...extra };
}

/** Tabela 1 do POP (item 4.2.2): lista de fitofisionomias do formulário. */
export const FITOFISIONOMIAS = o(
  'Floresta Ombrófila Densa (Floresta Amazônica ou Floresta Atlântica)', 'Floresta Ombrófila Aberta (Floresta-de-palmeiras ou Floresta-de-bambus)',
  'Floresta Ombrófila Mista (Floresta de Araucária)', 'Floresta Estacional Sempre-Verde (Floresta Estacional Perenifólia)',
  'Floresta Estacional Semidecidual (Floresta de Planalto)', 'Floresta Estacional Decidual (Mata Seca)',
  'Campinarana (Caatinga da Amazônia, Caatinga-Gapó e Campina da Amazônia)', 'Campinarana Florestada (Caatinga da Amazônia e Caatinga-Gapó)',
  'Campinarana Arborizada (Campinarana e Caatinga-Gapó)', 'Campinarana Arbustiva (Campina da Amazônia e Caatinga-Gapó)',
  'Campinarana Gramíneo-Lenhosa (Campina da Amazônia)', 'Cerrado Típico', 'Cerradão', 'Campo Cerrado, Cerrado Ralo, Cerrado Típico e Cerrado Denso',
  'Campo-Sujo-de-Cerrado, Cerrado-de-Pantanal, Campos-de-Murundus ou Covoal e Campo Rupestre', 'Campo-Limpo-de-Cerrado', 'Caatinga do Sertão Árido',
  'Campos de Roraima', 'Chaco Mato-Grossense-do-Sul', 'Parque de Espinilho da Barra do Rio Quaraí', 'Campos do sul do Brasil', 'Campo Sujo ou Parkland',
  'Campo Limpo', 'Sistema Edáfico de Primeira Ocupação (áreas das formações pioneiras)', 'Vegetação com influência marinha (Restinga)',
  'Vegetação com influência fluviomarinha (Manguezal)', 'Vegetação com influência fluviomarinha (Campos Salinos)',
  'Vegetação com influência fluvial (comunidades aluviais)', 'Outras (abrir campo para livre descrição de informações)',
  'Sistema das Áreas sem Vegetação (dunas)', 'Sistema das Áreas sem Vegetação (afloramentos rochosos)',
);

export const ITENS_POP: readonly ItemPop[] = [
  // Formulário A — área alterada/degradada (preencher preferencialmente em campo)
  item('A-1', 'Bioma', 'unica', { opcoes: o('Amazônia', 'Caatinga', 'Cerrado', 'Mata Atlântica', 'Pampa', 'Pantanal') }),
  item('A-2', 'Fitofisionomia da vegetação suprimida', 'unica', {
    opcoes: FITOFISIONOMIAS, opcional: true,
    nota: 'Item desejável, mas somente se a vegetação for identificada por um dos membros da equipe de fiscalização ou informação levantada pelo elemento "geo" da operação.',
  }),
  item('A-3', 'Estágio sucessional da vegetação suprimida', 'texto', {
    opcional: true, nota: 'Item desejável, mas somente se a vegetação for identificada por um dos membros da equipe de fiscalização. Descrever.',
  }),
  item('A-3.1', 'Forma de obtenção da informação acerca do estágio sucessional', 'unica', {
    opcoes: o('Análise de imagens', 'Vegetação limítrofe remanescente', 'Material lenhoso remanescente'), opcional: true,
  }),
  item('A-4', 'Foi constatado corte ou queima de espécies declaradas por lei como imunes de corte?', 'unica', { opcoes: SIM_NAO }),
  item('A-4.1', 'Identificação das espécies imunes de corte para as quais se constatou o corte ou queima', 'texto', { opcional: true }),
  item('A-5', 'Tipos de corpos hídricos e áreas úmidas na área', 'multipla', {
    opcoes: o('Nascentes', 'Trechos de cursos dágua (rios, igarapés, córregos, riachos, arroios, regatos)', 'Lagos, lagoas naturais', 'Veredas',
      'Áreas úmidas (pântanos, charcos etc.)', 'Não houve constatação na área durante a vistoria', 'Não foi possível verificar'),
    nota: 'O formulário não diz "pode marcar mais de 1"; aqui aceita várias marcas porque a lista é de presenças (POP 4.2.5).',
  }),
  item('A-5.1', 'Dimensões estimadas dos corpos hídricos (diâmetro, largura ou área total, conforme o caso)', 'texto', { opcional: true }),
  item('A-5.2', 'Fonte das informações', 'unica', { opcoes: FONTE, opcional: true }),
  item('A-6', 'Indique a proteção legal da área', 'unica', {
    opcoes: o('Espaços especialmente protegidos (RL, APP, área de uso restrito, UC ou TI)', 'Área passível de conversão para uso alternativo do solo'),
  }),
  item('A-6.1', 'Especificar a proteção legal da área', 'texto', { opcional: true }),
  item('A-7', 'Há presença de reservatórios artificiais?', 'unica', { opcoes: o('Sim (açude, represa, cacimba, barragem de captação etc.)', 'Não') }),
  item('A-7.1', 'Dimensões estimadas dos reservatórios artificiais', 'texto', { opcional: true }),
  item('A-8', 'Indique o tipo de exploração', 'unica', { opcoes: o('Exploração seletiva', 'Corte raso') }),
  item('A-9', 'Há presença ou indícios de equipamentos/maquinário no local?', 'unica', { opcoes: SIM_NAO }),
  item('A-10', 'Houve ocorrência de fogo recente ou indícios?', 'unica', { opcoes: SIM_NAO_NFV }),
  item('A-11', 'Há solo exposto na área?', 'unica', { opcoes: o('Sim', 'Sim, parcialmente', 'Não') }),
  item('A-12', 'Indique o tipo de alteração da camada superficial do solo', 'unica', {
    opcoes: [...o('Preparo do solo com máquinas', 'Aterro', 'Remoção de solo', 'Uso de correntão', 'Outros recursos'), { texto: 'Não houve alteração perceptível da camada superficial do solo', vai: 'A-18' }],
  }),
  item('A-12.1', 'Especificar os outros recursos de alteração da camada superficial do solo', 'texto', { opcional: true }),
  item('A-13', 'Houve destoca?', 'unica', { opcoes: CONSTATACAO }),
  item('A-14', 'Houve enleiramento?', 'unica', { opcoes: CONSTATACAO }),
  item('A-15', 'Houve limpeza da área?', 'multipla', {
    opcoes: [{ texto: 'Arraste', vai: 'A-16' }, { texto: 'Uso de fogo para queima de biomassa', vai: 'A-16' }, { texto: 'Não', vai: 'A-18' }],
    nota: 'Pode marcar mais de um item.',
  }),
  item('A-16', 'Houve preparo físico do solo (subsolagem, aração e gradagem)?', 'unica', {
    opcoes: [{ texto: 'Sim, houve preparo', vai: 'A-17' }, { texto: 'Não, não houve preparo', vai: 'A-18' }, { texto: 'Não foi possível verificar', vai: 'A-17' }],
  }),
  item('A-17', 'Há indícios de preparo químico do solo (correção de acidez, adubação química)?', 'unica', {
    opcoes: o('Sim, houve preparo', 'Não, não houve preparo', 'Não foi possível verificar'),
  }),
  item('A-18', 'Indique o tipo de cobertura do solo com vegetação na área degradada/alterada no momento da ação fiscalizatória', 'unica', {
    opcoes: o(
      'Vegetação nativa alterada com presença predominante de espécies regenerantes nativas (capoeira, indivíduos arbóreo/arbustivos de forma espaçada, plântulas)',
      'Vegetação nativa degradada com presença predominante de espécies regenerantes nativas (capoeira, plântulas, estágio inicial de regeneração)',
      'Presença de vegetação nativa regenerante conjuntamente à presença de espécies exóticas, inclusive invasoras (ex.: pasto sujo)',
      'Implantação de cultura agrícola, pastagem ou silvicultura em parte (≤ 50%) da área degradada/alterada',
      'Implantação de cultura agrícola, pastagem ou silvicultura na maior parte (> 50%) da área degradada/alterada',
      'Sem vegetação',
    ),
  }),
  item('A-19', 'Há processo erosivo na área?', 'unica', {
    opcoes: [{ texto: 'Sim', vai: 'A-20' }, { texto: 'Não', vai: 'A-21' }, { texto: 'Não foi possível verificar', vai: 'A-21' }],
  }),
  item('A-20', 'Indique os tipos de processos erosivos', 'unica', { opcoes: o('Laminar', 'Ravinar', 'Voçoroca', 'Eólica (ex.: restinga)', 'Não foi possível classificar') }),
  item('A-21', 'Há presença de animais de criação na área?', 'unica', { opcoes: o('Criação extensiva', 'Criação intensiva', 'Não') }),
  item('A-21.1', 'Indique os tipos de rebanho (pode marcar mais de 1 alternativa)', 'multipla', {
    opcoes: o('Bovino', 'Ovino', 'Caprino', 'Bubalino', 'Outros (especificar nas Informações Complementares)'), opcional: true,
  }),
  item('A-22', 'Informações complementares da área alterada/degradada', 'texto', {
    opcional: true,
    nota: 'Informar outros aspectos verificados que considerar pertinentes à caracterização do dano, especialmente, relacionados à fauna, aos serviços ecossistêmicos impactados, às mudanças climáticas, e se trata-se de área incluída em mapeamento de áreas prioritárias para conservação.',
  }),
  // Formulário A — entorno da área alterada/degradada
  item('A-23', 'Há conectividade e fluxos da paisagem?', 'unica', {
    opcoes: o('Sim, mais de 50% do perímetro limítrofe com fragmento de vegetação nativa', 'Sim, menos de 50% do perímetro limítrofe com fragmento de vegetação nativa', 'Não'),
  }),
  item('A-23.1', 'Fonte das informações', 'unica', { opcoes: FONTE, opcional: true }),
  item('A-24', 'Há ameaças externas, devido à presença ou proximidade da área degradada/alterada com: (pode marcar mais de 1 alternativa)', 'multipla', {
    opcoes: o('Áreas urbanas e loteamentos residenciais, industriais e de lazer', 'Ocorrência de invasões e de ocupações irregulares de terra (problemas fundiários) no entorno',
      'Áreas com atividades agropecuárias (uso indiscriminado de queimadas, agrotóxicos etc.)', 'Obras civis diversas', 'Rodovias', 'Estrada vicinal principal bem conservada',
      'Potenciais alterações no ordenamento territorial local e regional', 'Outras'),
  }),
  item('A-24.1', 'Especificar as "outras" ameaças externas, se for o caso', 'texto', { opcional: true }),
  item('A-25', 'Informações complementares do entorno da área alterada/degradada', 'texto', { opcional: true }),
  // Formulário B — preencher preferencialmente em escritório
  item('B-1', 'Tipo de imóvel onde está inserida a área fiscalizada', 'unica', {
    opcoes: [{ texto: 'Público', vai: 'B-2' }, { texto: 'Privado', vai: 'B-3' }, { texto: 'Indeterminado', vai: 'B-3' }],
  }),
  item('B-2', 'Domínio da área degradada/alterada', 'unica', { opcoes: o('Federal', 'Estadual', 'Distrital', 'Municipal') }),
  item('B-3', 'O imóvel possui Cadastro Ambiental Rural (CAR)?', 'unica', { opcoes: SIM_NAO }),
  item('B-4', 'Houve supressão de vegetação em área de ocorrência de espécies ameaçadas de extinção, constantes em lista oficial?', 'unica', { opcoes: o('Sim', 'Não', 'Não identificado') }),
];

export const FONTE_POP = 'POP IBAMA (Portaria Ibama nº 83/2022), Anexo I';
export const LIMITE_TEXTO_POP = 500;

const POSICAO = new Map(ITENS_POP.map((it, i) => [it.id, i]));
export const marcadas = (r: Resposta | undefined): string[] => (Array.isArray(r) ? r : r ? [r] : []);
export const respondido = (r: Resposta | undefined) => marcadas(r).some((t) => t.trim() !== '');

/** Itens a perguntar, em ordem, já com os desvios aplicados ("siga para a pergunta N" pula o que fica no meio) e as condicionais (`se`). */
export function itensAplicaveis(resp: Caracterizacao | undefined = {}, itens: readonly ItemPop[] = ITENS_POP): ItemPop[] {
  const posicao = itens === ITENS_POP ? POSICAO : new Map(itens.map((it, i) => [it.id, i]));
  const condicaoOk = (it: ItemPop): boolean => {
    if (!it.se) return true;
    const pai = itens.find((x) => x.id === it.se!.item);
    return !!pai && condicaoOk(pai) && marcadas(resp[pai.id]).some((m) => it.se!.vale.includes(m));
  };
  const lista: ItemPop[] = [];
  let i = 0;
  while (i < itens.length) {
    const it = itens[i];
    if (condicaoOk(it)) lista.push(it);
    const destinos = marcadas(resp[it.id]).map((m) => it.opcoes?.find((op) => op.texto === m)?.vai).filter((v): v is string => !!v).map((v) => posicao.get(v)!);
    i = Math.max(i + 1, ...destinos);
  }
  return lista;
}

/** Itens de campo aplicáveis, obrigatórios e ainda sem resposta (Formulário A do POP; na inspeção, os de fase 'campo'). */
export const itensDeCampoSemResposta = (resp: Caracterizacao | undefined, itens: readonly ItemPop[] = ITENS_POP): ItemPop[] =>
  itensAplicaveis(resp, itens).filter((it) => it.onde === 'campo' && !it.opcional && !respondido(resp?.[it.id]));

const chaveResposta = (r: Resposta | undefined) => marcadas(r).map((t) => t.trim()).sort().join('|');
/** Itens de fase prévia respondidos nos dois lados com respostas diferentes: [DIVERGÊNCIA] entre o conferido antes e o visto em campo. */
export const divergencias = (previa: Caracterizacao | undefined, campo: Caracterizacao | undefined, itens: readonly ItemPop[]): ItemPop[] =>
  itens.filter((it) => it.fase === 'previa' && respondido(previa?.[it.id]) && respondido(campo?.[it.id]) && chaveResposta(previa![it.id]) !== chaveResposta(campo![it.id]));

export interface DadosDeCampo { coordenadaAferida?: string; waypoint?: string; fotos?: string; drone?: { voou: boolean; arquivo?: string }; pessoaContatada?: string }

/** Linhas da seção "Dados de campo": só o que já foi registrado. */
function linhasDadosDeCampo(d: DadosDeCampo | undefined): string[] {
  if (!d) return [];
  const l: string[] = [];
  if (d.coordenadaAferida?.trim()) l.push(`Coordenada aferida: ${d.coordenadaAferida.trim()}`);
  if (d.waypoint?.trim()) l.push(`Waypoint: ${d.waypoint.trim()}`);
  if (d.fotos?.trim()) l.push(`Fotos: ${d.fotos.trim()}`);
  if (d.drone?.voou) l.push(`Voo de drone: sim${d.drone.arquivo?.trim() ? ` (arquivo ${d.drone.arquivo.trim()})` : ''}`);
  if (d.pessoaContatada?.trim()) l.push(`Pessoa contatada: ${d.pessoaContatada.trim()}`);
  return l;
}

/** Só o que foi respondido (e ainda se aplica), na ordem do POP, mais os dados de campo já registrados, para colar no relatório. */
export function textoCaracterizacao(resp: Caracterizacao | undefined, dados?: DadosDeCampo): string {
  const linhas = itensAplicaveis(resp).filter((it) => respondido(resp?.[it.id])).map((it) => `${it.id}. ${it.texto}: ${marcadas(resp![it.id]).join('; ')}`);
  const campo = linhasDadosDeCampo(dados);
  return [
    ...(linhas.length ? [`Caracterização do dano (${FONTE_POP}):`, ...linhas] : []),
    ...(campo.length ? ['Dados de campo:', ...campo] : []),
  ].join('\n');
}

const lista = (ids: string[]) => (ids.length > 1 ? `${ids.slice(0, -1).join(', ')} e ${ids[ids.length - 1]}` : ids[0]);

/** Avisos antes de copiar (nunca bloqueiam): obrigatórios sem resposta, resposta genérica sem detalhe em A-22 e incoerência em A-5. */
export function avisosDaCopia(resp: Caracterizacao | undefined): { faltam: string[]; lembretes: string[] } {
  const r = resp ?? {};
  const aplicaveis = itensAplicaveis(r).map((it) => it.id);
  const faltam = itensDeCampoSemResposta(r).map((it) => it.id);
  const lembretes: string[] = [];
  const semA22 = !respondido(r['A-22']);
  if (semA22 && aplicaveis.includes('A-12') && marcadas(r['A-12']).includes('Outros recursos')) lembretes.push('A-12 marcou "Outros recursos": descreva em A-22.');
  if (semA22 && aplicaveis.includes('A-21.1') && marcadas(r['A-21.1']).some((t) => t.startsWith('Outros (especificar'))) lembretes.push('A-21.1 marcou "Outros (especificar…)": descreva em A-22.');
  if (marcadas(r['A-5']).includes('Não foi possível verificar') && marcadas(r['A-5.2']).includes('Verificação em campo')) {
    lembretes.push('A-5 diz "Não foi possível verificar", mas A-5.2 diz "Verificação em campo": confira.');
  }
  return { faltam, lembretes };
}

/** Texto do aviso de itens obrigatórios sem resposta; vazio se não falta nenhum. */
export const textoFaltam = (faltam: string[]) => (faltam.length ? `Faltam ${lista(faltam)}. Copiar assim mesmo?` : '');

export const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/**
 * Sugestões de resposta tiradas dos dados do ponto, sempre "sugerido — conferir", nunca resposta final:
 * sem CAR (situação ou etiqueta "fora de CAR") sugere "Não" em B-3; etiqueta "perto de TI" sugere a proteção legal de A-6.
 */
export function sugestoesPop(p: { situacaoCar?: string; etiquetas?: readonly string[]; geo?: SugestaoGeo }): Record<string, string> {
  const etiquetas = (p.etiquetas ?? []).map(norm);
  const s: Record<string, string> = {};
  const { bioma, fitos } = popGeo(p);
  if (bioma) s['A-1'] = bioma;
  if (fitos.length === 1) s['A-2'] = fitos[0];
  if (p.situacaoCar === 'sem-car' || etiquetas.includes('fora de car')) s['B-3'] = 'Não';
  if (etiquetas.includes('perto de ti')) s['A-6'] = ITENS_POP.find((i) => i.id === 'A-6')!.opcoes![0].texto;
  return s;
}

export const FONTE_GEO = 'Sugestão: Vegetação IBGE, escala 1:250.000 (via Geoportal SEMA-MT). Confirmar em campo.';

// Texto da vegetação (LEGENDA ou NM_PRETET do IBGE) → opções da Tabela 1. Só família ("Floresta Ombrófila") destaca todas as dela;
// o que não é vegetação nativa (agricultura, água) não destaca nada. "Contato A/B" destaca A e B.
const FAMILIAS: { fam: RegExp; todas: string; esp: [RegExp, string][] }[] = [
  { fam: /ombrofila/, todas: 'floresta ombrofila', esp: [[/densa/, 'floresta ombrofila densa'], [/aberta/, 'floresta ombrofila aberta'], [/mista/, 'floresta ombrofila mista']] },
  { fam: /estacional/, todas: 'floresta estacional', esp: [[/sempre-?verde|perenifolia/, 'floresta estacional sempre'], [/semidecidual/, 'floresta estacional semidecidual'], [/decidual/, 'floresta estacional decidual']] },
  { fam: /campinarana/, todas: 'campinarana (', esp: [[/florestada/, 'campinarana florestada'], [/arborizada/, 'campinarana arborizada'], [/arbustiva/, 'campinarana arbustiva'], [/gramineo/, 'campinarana gramineo']] },
  { fam: /savana/, todas: '', esp: [[/florestada/, 'cerradao'], [/arborizada/, 'campo cerrado,'], [/parque/, 'campo-sujo-de-cerrado'], [/gramineo/, 'campo-limpo-de-cerrado']] },
  { fam: /cerradao/, todas: 'cerradao', esp: [] },
  { fam: /formacao pioneira|influencia fluvial/, todas: 'vegetacao com influencia fluvial', esp: [] },
];

export function fitosDoTexto(texto: string): string[] {
  const achadas = new Set<string>();
  for (const parte of norm(texto).replace(/^contato\s+/, '').split('/')) {
    for (const { fam, todas, esp } of FAMILIAS) {
      if (!fam.test(parte)) continue;
      const prefixos = esp.filter(([r]) => r.test(parte)).map(([, pre]) => pre);
      if (!prefixos.length && todas) prefixos.push(todas);
      for (const op of FITOFISIONOMIAS) if (prefixos.some((pre) => norm(op.texto).startsWith(pre))) achadas.add(op.texto);
    }
  }
  return [...achadas];
}

// shortcut: leitura minha, que o POP não traz (a Tabela 1 não separa por bioma): A-2 tira as fitofisionomias de outros biomas
// (Araucária, Caatinga, Roraima, Chaco, Espinilho, campos do sul, restinga, mangue, dunas) e, no Cerrado e no Pantanal, as florestas
// ombrófilas e as campinaranas. Confirmar com o responsável; a sugestão do IBGE nunca sai da lista.
const FORA_DE_MT = /^(floresta ombrofila mista|caatinga do sertao|campos de roraima|chaco|parque de espinilho|campos do sul|campo sujo ou parkland|vegetacao com influencia (marinha|fluviomarinha)|sistema das areas sem vegetacao \(dunas)/;
const SO_AMAZONIA = /^(floresta ombrofila|campinarana)/;
const BIOMAS_MT = ['Amazônia', 'Cerrado', 'Pantanal'];

/** Bioma (opção de A-1), fitofisionomias sugeridas (A-2) e as opções de A-2 a mostrar (lista completa se o bioma for desconhecido). */
export function popGeo(p: { geo?: SugestaoGeo }): { bioma?: string; fitos: string[]; opcoes: OpcaoPop[] } {
  const bioma = ITENS_POP[0].opcoes!.find((op) => norm(op.texto) === norm(p.geo?.bioma ?? ''))?.texto;
  const todas = p.geo ? fitosDoTexto(p.geo.pretetita ?? p.geo.legenda ?? '') : [];
  if (!bioma || !BIOMAS_MT.includes(bioma)) return { ...(bioma ? { bioma } : {}), fitos: todas, opcoes: FITOFISIONOMIAS };
  const fitos = todas.filter((t) => !FORA_DE_MT.test(norm(t))); // "Floresta Ombrófila" sem qualificação não inclui a de Araucária em MT
  const fora = (t: string) => FORA_DE_MT.test(norm(t)) || (bioma !== 'Amazônia' && SO_AMAZONIA.test(norm(t)));
  return { bioma, fitos, opcoes: FITOFISIONOMIAS.filter((op) => !fora(op.texto) || fitos.includes(op.texto)) };
}

/** O bloco da caracterização é automático para desmatamento (inclui o químico), aplicação irregular de agrotóxico e exploração seletiva; nos demais tipos, só se o ponto o ativar (`popAtivo`). */
export const blocoPopAtivo = (p: { tipoDano?: string; popAtivo?: boolean }): boolean =>
  /desmat|exploracao seletiva|aplicacao irregular de agrotoxico/.test(norm(p.tipoDano ?? '')) || p.popAtivo === true;

/** Valida o que vem do armazenamento: só ids da lista, só opções da lista, texto até 500 caracteres, número e data bem formados. */
export function caracterizacaoValida(x: unknown, itens: readonly ItemPop[] = ITENS_POP): x is Caracterizacao {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  return Object.entries(x).every(([id, r]) => {
    const it = itens.find((i) => i.id === id);
    if (!it) return false;
    if (it.tipo === 'texto') return typeof r === 'string' && r.length <= LIMITE_TEXTO_POP;
    if (it.tipo === 'numero') return typeof r === 'string' && /^\d{1,9}([.,]\d{0,4})?$/.test(r);
    if (it.tipo === 'data') return typeof r === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r) && !Number.isNaN(Date.parse(r));
    const textos = it.opcoes!.map((op) => op.texto);
    if (it.tipo === 'unica' || it.tipo === 'simnao') return typeof r === 'string' && textos.includes(r);
    return Array.isArray(r) && r.length <= textos.length && r.every((t) => typeof t === 'string' && textos.includes(t)) && new Set(r).size === r.length;
  });
}
