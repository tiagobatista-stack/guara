// Caracterização do dano por supressão de vegetação nativa: perguntas e opções do Anexo I (Formulários A e B) do POP do IBAMA
// (Portaria Ibama nº 83/2022, DOU de 29/09/2022; PDF em docs/referencias/). Os itens são DADOS, copiados do Anexo I sem resumir;
// os desvios ("siga para a pergunta N") ficam na opção que os causa. A adoção deste POP pela SEMA-MT precisa ser confirmada pelo responsável.
// Desvios do texto do POP (não só do Anexo): seção 4.2.12 (sem alteração da camada superficial do solo, siga para o item 18) e seção 4.2.15
// (sem arraste, siga para o item 18; com arraste, item 16).
// Leituras minhas, fora do texto do formulário (ver `nota` e `opcional`): A-5 aceita várias marcas; os itens `opcional` não entram na conta
// de "sem resposta". Onde o PDF traz símbolo, usei o equivalente: "£ 50%" é "≤ 50%"; "At e r r o" é "Aterro".

export type TipoItem = 'unica' | 'multipla' | 'texto';
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
  formulario: 'A' | 'B';
  texto: string;
  tipo: TipoItem;
  opcoes?: OpcaoPop[];
  /** Formulário A: preencher preferencialmente em campo; B: em escritório. */
  onde: 'campo' | 'escritorio';
  nota?: string;
  /** Fora da conta de "sem resposta": o POP diz "desejável" ou "se for o caso", ou é sub-item/complemento que depende de outro. */
  opcional?: boolean;
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
const FITOFISIONOMIAS = o(
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
  item('A-7', 'Há presença de reservatórios artificiais?', 'unica', { opcoes: o('Sim (açude, represa, cacimba, barragem de captação etc.)', 'Não') }),
  item('A-7.1', 'Dimensões estimadas dos reservatórios artificiais', 'texto', { opcional: true }),
  item('A-8', 'Indique o tipo de exploração', 'unica', { opcoes: o('Exploração seletiva', 'Corte raso') }),
  item('A-9', 'Há presença ou indícios de equipamentos/maquinário no local?', 'unica', { opcoes: SIM_NAO }),
  item('A-10', 'Houve ocorrência de fogo recente ou indícios?', 'unica', { opcoes: SIM_NAO_NFV }),
  item('A-11', 'Há solo exposto na área?', 'unica', { opcoes: o('Sim', 'Sim, parcialmente', 'Não') }),
  item('A-12', 'Indique o tipo de alteração da camada superficial do solo', 'unica', {
    opcoes: [...o('Preparo do solo com máquinas', 'Aterro', 'Remoção de solo', 'Uso de correntão', 'Outros recursos'), { texto: 'Não houve alteração perceptível da camada superficial do solo', vai: 'A-18' }],
  }),
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
const marcadas = (r: Resposta | undefined): string[] => (Array.isArray(r) ? r : r ? [r] : []);
export const respondido = (r: Resposta | undefined) => marcadas(r).some((t) => t.trim() !== '');

/** Itens a perguntar, em ordem, já com os desvios aplicados ("siga para a pergunta N" pula o que fica no meio). */
export function itensAplicaveis(resp: Caracterizacao | undefined = {}): ItemPop[] {
  const lista: ItemPop[] = [];
  let i = 0;
  while (i < ITENS_POP.length) {
    const it = ITENS_POP[i];
    lista.push(it);
    const destinos = marcadas(resp[it.id]).map((m) => it.opcoes?.find((op) => op.texto === m)?.vai).filter((v): v is string => !!v).map((v) => POSICAO.get(v)!);
    i = Math.max(i + 1, ...destinos);
  }
  return lista;
}

/** Itens de campo (Formulário A) aplicáveis, obrigatórios e ainda sem resposta. */
export const itensDeCampoSemResposta = (resp: Caracterizacao | undefined): ItemPop[] =>
  itensAplicaveis(resp).filter((it) => it.onde === 'campo' && !it.opcional && !respondido(resp?.[it.id]));

/** Só o que foi respondido (e ainda se aplica), na ordem do POP, para colar no relatório. */
export function textoCaracterizacao(resp: Caracterizacao | undefined): string {
  const linhas = itensAplicaveis(resp).filter((it) => respondido(resp?.[it.id])).map((it) => `${it.id}. ${it.texto}: ${marcadas(resp![it.id]).join('; ')}`);
  return linhas.length ? [`Caracterização do dano (${FONTE_POP}):`, ...linhas].join('\n') : '';
}

const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** O bloco da caracterização é automático para desmatamento e exploração seletiva; nos demais tipos, só se o ponto o ativar (`popAtivo`). */
export const blocoPopAtivo = (p: { tipoDano?: string; popAtivo?: boolean }): boolean =>
  /desmat|exploracao seletiva/.test(norm(p.tipoDano ?? '')) || p.popAtivo === true;

/** Valida o que vem do armazenamento: só ids do POP, só opções do POP, texto até 500 caracteres. */
export function caracterizacaoValida(x: unknown): x is Caracterizacao {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  return Object.entries(x).every(([id, r]) => {
    const it = ITENS_POP.find((i) => i.id === id);
    if (!it) return false;
    if (it.tipo === 'texto') return typeof r === 'string' && r.length <= LIMITE_TEXTO_POP;
    const textos = it.opcoes!.map((op) => op.texto);
    if (it.tipo === 'unica') return typeof r === 'string' && textos.includes(r);
    return Array.isArray(r) && r.length <= textos.length && r.every((t) => typeof t === 'string' && textos.includes(t)) && new Set(r).size === r.length;
  });
}
