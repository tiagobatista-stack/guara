// Frases do relatório (rev. 2, revisada pelo analista). Dados puros; a montagem está em relatorio.ts.
// Frases-modelo fixas do "Relatório (texto)": sem IA e sem inferência. Só entra o que está registrado no ponto.
// Marcadores: {x} = valor do ponto; [PENDENTE: ...], [CONSULTA NÃO REALIZADA: ...] e [DIVERGÊNCIA: ...]
// vão literais para o texto.
//
// Convenções de redação (valem para todas as frases):
// - Constatações de campo no pretérito impessoal: "Constatou-se...", "Verificou-se...".
// - Estado da área no momento da vistoria: "No momento da ação fiscalizatória, ...".
// - Evitar concordância variável: usar "a presença de {lista}", "constatação de {lista}",
//   "a ocorrência de {tema}", que funcionam com qualquer gênero e número.
// - Nenhum comentário ou instrução dentro das strings.

// ---------- Cabeçalho e constatações gerais ----------

export const ESTRUTURA = {
  equipe: 'EQUIPE TÉCNICA',
  constatacoes: 'CONSTATAÇÕES',
  linhaEquipe: '{nome} – {cargo} – {lotacao}',
  cargoVazio: '[PENDENTE: cargo de {nome}]',
  lotacaoVazia: '[PENDENTE: lotação de {nome}]',
  marcador: '· ',
  rodape: 'Rascunho gerado pelo GUARÁ — revisar antes de juntar ao processo.',
} as const;

/** Origem do alerta: lista fechada na operação. "outra" pede o texto especificado. */
export const ORIGENS: Record<string, string> = {
  planet: 'pelo Sistema de Alertas Planet',
  deter: 'por alerta do sistema DETER',
  denuncia: 'para apuração de denúncia',
  requisicao: 'em atendimento a requisição de {orgao}',
  outra: '{especificar}',
};

export const ABERTURA = {
  // {data} = data da vistoria DO PONTO (data própria), por extenso: "21 de outubro de 2026".
  base: 'No dia {data}, nos dirigimos ao imóvel para fiscalização {origem}, no escopo da {operacao}, de autoria da SEMA-MT por meio da {unidade}{apoio}.',
  apoio: ', com o apoio da {apoio}',
  dataVazia: '[PENDENTE: data da vistoria]',
  origemVazia: '[PENDENTE: origem do alerta]',
  unidadeVazia: '[PENDENTE: unidade]',
};

export const PONTO = {
  um: 'Trata-se do Ponto de Vistoria n.º {numero}, aberto para apuração de {objeto}.',
  varios: 'Trata-se dos Pontos de Vistoria n.º {numeros}, abertos para apuração de {objeto}.',
  objetoVazio: '[PENDENTE: objeto da apuração]',
  // O período é o da operação; a data da vistoria do ponto já está na abertura.
  localizacao: 'O ponto, vistoriado no período da operação ({inicio} a {fim}), está localizado no município de {municipio}/MT, próximo às coordenadas geográficas {gms}.',
};

// ---------- Consultas às bases: três estados ----------
// encontrado → `achou`; consultado e vazio → `vazio`; sem consulta registrada com sucesso → NAO_REALIZADA.
// Guardar no ponto: { base, quando (ISO), fonte: 'automatica' | 'manual', resultado: 'encontrado' | 'vazio' | 'falha', valor? }.

export interface FraseConsulta { base: string; achou: string; vazio: string }
/** Registro pontual (camada _PONTO) a até ~500 m do ponto; uma frase por registro. */
export const PROXIMIDADE = {
  embargos: 'Foi identificado embargo (registro pontual) nas proximidades, a cerca de {m} m: {valor}.',
  autos: 'Foi identificado auto de infração (registro pontual) nas proximidades, a cerca de {m} m: {valor}.',
} as const;
export const NAO_REALIZADA = '[CONSULTA NÃO REALIZADA: {base}]';

export const CONSULTAS: Record<string, FraseConsulta> = {
  bioma: {
    base: 'Bioma',
    achou: 'A área está inserida no bioma {valor}.',
    vazio: '[PENDENTE: bioma não identificado na base consultada]',
  },
  vegetacao: {
    base: 'Vegetação IBGE (1:250.000)',
    // {valor} = nome sem o prefixo numérico e sem o código ("1Dse - " é removido), entre aspas.
    achou: 'A área está localizada sobre vegetação do tipo "{valor}", segundo o mapa de vegetação do IBGE (escala 1:250.000).',
    vazio: 'Não foi identificada vegetação mapeada no local, segundo o mapa de vegetação do IBGE (escala 1:250.000).',
  },
  // Variante quando o valor vem de NM_PRETET (área já antropizada no mapeamento):
  vegetacaoPreterita: {
    base: 'Vegetação IBGE (1:250.000)',
    achou: 'Segundo o mapa de vegetação do IBGE (escala 1:250.000), a vegetação original da área é do tipo "{valor}", estando o local atualmente mapeado como "{usoAtual}".',
    vazio: '',
  },
  car: {
    base: 'CAR/SIMCAR',
    achou: 'Foi identificado Cadastro Ambiental Rural (CAR) n.º {valor} sobreposto à área, na base do SIMCAR.',
    vazio: 'Não foi identificado Cadastro Ambiental Rural (CAR) para a área consultada na base do SIMCAR.',
  },
  embargos: {
    base: 'Embargos SEMA-MT',
    achou: 'Foi identificada sobreposição com termo(s) de embargo da SEMA-MT: {valor}.',
    vazio: 'Não foi identificada sobreposição com termos de embargo da SEMA-MT na base consultada.',
  },
  autos: {
    base: 'Autos de infração SEMA-MT',
    achou: 'Foi identificada sobreposição com auto(s) de infração da SEMA-MT: {valor}.',
    vazio: 'Não foi identificada sobreposição com autos de infração da SEMA-MT na base consultada.',
  },
  ti: {
    base: 'Terras Indígenas',
    achou: 'A área está sobreposta à Terra Indígena {valor}.',
    vazio: 'A área não possui sobreposição com Terras Indígenas.',
  },
  uc: {
    base: 'Unidades de Conservação',
    achou: 'A área está sobreposta à Unidade de Conservação {valor}.',
    vazio: 'A área não possui sobreposição com Unidades de Conservação.',
  },
  amortecimento: {
    base: 'Zonas de amortecimento (TI/UC)',
    achou: 'A área está inserida na zona de amortecimento (entorno) de {valor}.',
    vazio: 'A área não possui sobreposição com zonas de amortecimento (entorno) de Terras Indígenas ou Unidades de Conservação.',
  },
};

/** Se TI, UC e amortecimento forem TODOS "vazio", substituir as três frases por esta. */
export const TI_UC_AMORTECIMENTO_VAZIOS =
  'A área não possui sobreposição com Terras Indígenas, Unidades de Conservação ou com as respectivas zonas de amortecimento (entorno).';

/** Fecho das consultas, com rastreabilidade. {lista} = bases consultadas; {datas} = data única ou intervalo. */
/** Várias consultas ausentes (2 ou mais) viram um marcador só. {lista} = nomes das bases. */
export const NAO_REALIZADAS = '[CONSULTAS NÃO REALIZADAS: {lista}]';

/** Sem nenhuma resposta do POP: um marcador no lugar dos pendentes item a item. */
export const POP_NAO_PREENCHIDO = '[PENDENTE: caracterização do dano (POP) não preenchida]';

/** Topo do texto quando o ponto não tem resultado registrado. */
export const AVISO_SEM_RESULTADO = '[ATENÇÃO: o ponto ainda não tem resultado registrado.]';

export const FECHO_CONSULTAS = 'Consultas realizadas em {datas} nas bases do Geoportal da SEMA-MT ({lista}).';

/** Campo × base em desacordo: não escolher um lado; marcar para o analista decidir. */
export const DIVERGENCIA = '[DIVERGÊNCIA: {tema} — em campo: {campo}; na base: {base}]';
// Comparar: A-1 × consulta bioma; B-3 × consulta CAR; A-6 "UC ou TI" × consultas TI/UC (só avisar se campo = UC/TI e base = vazio).
// Quando A-1 = bioma da consulta, a frase do bioma sai UMA vez só (a da consulta).

// ---------- Caracterização em campo (POP) ----------
// Cinco itens, na ordem. Cada questão:
//   frases    = uma frase por opção marcada (chave = texto exato da opção);
//   lista     = opções de marcação múltipla que viram UMA frase (modelo em `listaFrase`);
//   negativas = opções "Não" agrupadas na frase negativa do grupo;
//   livre     = texto digitado entra no modelo como está;
//   fonte     = id da subquestão "Fonte das informações", anexada à frase;
//   pendente  = condição que gera [PENDENTE: ...].

export interface Questao {
  id: string;
  frases?: Record<string, string>;
  lista?: Record<string, string>;
  listaFrase?: string;
  negativas?: Record<string, string>;
  livre?: string;
  fonte?: string;
  pendente?: { quando: string; texto: string };
}
export interface Grupo { titulo: string; negativa?: string; questoes: Questao[] }

/** Frase negativa única do grupo: "constatação de" aceita qualquer gênero/número. */
const NEGATIVA = 'Não houve constatação de {lista}.';

/** Fonte das informações (A-5.2, A-23.1), anexada ao fim da frase. */
export const FONTES: Record<string, string> = {
  'Verificação em campo': ', conforme verificação em campo',
  'Verificação por imagem': ', conforme verificação por imagem',
};

/** A-20 anexado à frase de A-19, entre parênteses. Várias marcas → lista com "e". */
export const EROSAO: Record<string, string> = {
  Laminar: 'erosão laminar',
  Ravinar: 'erosão em ravinas',
  'Voçoroca': 'voçorocas',
  'Eólica (ex.: restinga)': 'erosão eólica',
  'Não foi possível classificar': 'tipo não classificado',
};

export const CARACTERIZACAO: Grupo[] = [
  {
    titulo: 'Vegetação suprimida',
    negativa: NEGATIVA,
    questoes: [
      {
        id: 'A-8',
        frases: {
          'Corte raso': 'Em vistoria, constatou-se a supressão de vegetação nativa por corte raso.',
          'Exploração seletiva': 'Em vistoria, constatou-se a exploração seletiva de vegetação nativa.',
        },
      },
      // A-1: só entra se divergir da consulta de bioma (ver DIVERGENCIA) ou se não houver consulta.
      { id: 'A-1', livre: 'A área foi caracterizada, em campo, como pertencente ao bioma {resposta}.' },
      // {resposta} sem o parêntese explicativo da opção: "Floresta Ombrófila Densa".
      { id: 'A-2', livre: 'A fitofisionomia da vegetação suprimida foi identificada como {resposta}.' },
      // A-3 e A-3.1 numa frase só. Sem A-3.1, a frase termina após {resposta}.
      { id: 'A-3', livre: 'O estágio sucessional da vegetação suprimida foi estimado como {resposta}{A-3.1}.' },
      {
        id: 'A-3.1',
        frases: {
          'Análise de imagens': ', com base em análise de imagens',
          'Vegetação limítrofe remanescente': ', com base na vegetação limítrofe remanescente',
          'Material lenhoso remanescente': ', com base no material lenhoso remanescente',
        },
      },
      {
        id: 'A-4',
        frases: { Sim: 'Constatou-se o corte ou a queima de espécies declaradas por lei como imunes de corte{A-4.1}.' },
        negativas: { Não: 'corte ou queima de espécies imunes de corte' },
      },
    ],
  },
  {
    titulo: 'Recursos hídricos e proteção legal',
    negativa: NEGATIVA,
    questoes: [
      {
        id: 'A-5',
        lista: {
          Nascentes: 'nascentes',
          'Trechos de cursos dágua (rios, igarapés, córregos, riachos, arroios, regatos)': 'trechos de cursos d’água',
          'Lagos, lagoas naturais': 'lagos ou lagoas naturais',
          Veredas: 'veredas',
          'Áreas úmidas (pântanos, charcos etc.)': 'áreas úmidas (pântanos, charcos etc.)',
        },
        // {A-5.1} = " (dimensões estimadas: <texto>)"; {fonte} = FONTES[A-5.2].
        listaFrase: 'Constatou-se a presença de {lista} na área{A-5.1}{fonte}.',
        frases: { 'Não foi possível verificar': 'Não foi possível verificar a existência de corpos hídricos ou áreas úmidas na área.' },
        negativas: { 'Não houve constatação na área durante a vistoria': 'corpos hídricos ou áreas úmidas na área' },
        fonte: 'A-5.2',
        pendente: { quando: 'alguma marca da lista e A-5.1 vazio', texto: 'dimensões estimadas dos corpos hídricos (A-5.1)' },
      },
      {
        id: 'A-6',
        frases: {
          'Espaços especialmente protegidos (RL, APP, área de uso restrito, UC ou TI)':
            'A área está inserida em espaço especialmente protegido (Reserva Legal, Área de Preservação Permanente, área de uso restrito, Unidade de Conservação ou Terra Indígena).',
          'Área passível de conversão para uso alternativo do solo': 'A área é passível de conversão para uso alternativo do solo.',
        },
      },
      {
        id: 'A-7',
        // {A-7.1} = ", com dimensões estimadas de <texto>"
        frases: { 'Sim (açude, represa, cacimba, barragem de captação etc.)': 'Constatou-se a presença de reservatório artificial na área{A-7.1}.' },
        negativas: { Não: 'reservatórios artificiais' },
        pendente: { quando: 'A-7 = Sim e A-7.1 vazio', texto: 'dimensões estimadas dos reservatórios artificiais (A-7.1)' },
      },
    ],
  },
  {
    titulo: 'Solo e forma de exploração',
    negativa: NEGATIVA,
    questoes: [
      {
        id: 'A-9',
        frases: { Sim: 'Constatou-se a presença ou indícios de equipamentos ou maquinário no local.' },
        negativas: { Não: 'equipamentos ou maquinário no local' },
      },
      {
        id: 'A-10',
        frases: {
          Sim: 'Constatou-se a ocorrência ou indícios de fogo recente.',
          'Não foi possível verificar': 'Não foi possível verificar a ocorrência de fogo recente.',
        },
        negativas: { Não: 'indícios de fogo recente' },
      },
      {
        id: 'A-11',
        frases: { Sim: 'Constatou-se solo exposto na área.', 'Sim, parcialmente': 'Constatou-se solo parcialmente exposto na área.' },
        negativas: { Não: 'solo exposto' },
      },
      {
        id: 'A-12',
        lista: {
          'Preparo do solo com máquinas': 'preparo do solo com máquinas',
          Aterro: 'aterro',
          'Remoção de solo': 'remoção de solo',
          'Uso de correntão': 'uso de correntão',
          'Outros recursos': '{especificar}',
        },
        listaFrase: 'A camada superficial do solo foi alterada por {lista}.',
        negativas: { 'Não houve alteração perceptível da camada superficial do solo': 'alteração perceptível da camada superficial do solo' },
        pendente: {
          quando: 'A-12 aplicável e sem resposta; ou "Outros recursos" com "Especificar" vazio',
          texto: 'tipo de alteração da camada superficial do solo / especificar outros recursos (A-12)',
        },
      },
      // A-13 e A-14 com a mesma resposta → UMA frase: "...a ocorrência de destoca e enleiramento."
      { id: 'A-13', frases: constatacao('destoca'), negativas: { Não: 'destoca' } },
      { id: 'A-14', frases: constatacao('enleiramento'), negativas: { Não: 'enleiramento' } },
      {
        id: 'A-15',
        lista: { Arraste: 'arraste', 'Uso de fogo para queima de biomassa': 'uso de fogo para queima de biomassa' },
        listaFrase: 'A limpeza da área foi realizada por {lista}.',
        negativas: { Não: 'limpeza da área' },
      },
      {
        id: 'A-16',
        frases: {
          'Sim, houve preparo': 'Constatou-se o preparo físico do solo (subsolagem, aração ou gradagem).',
          'Não foi possível verificar': 'Não foi possível verificar a ocorrência de preparo físico do solo.',
        },
        negativas: { 'Não, não houve preparo': 'preparo físico do solo' },
      },
      {
        id: 'A-17',
        frases: {
          'Sim, houve preparo': 'Constataram-se indícios de preparo químico do solo (correção de acidez ou adubação química).',
          'Não foi possível verificar': 'Não foi possível verificar indícios de preparo químico do solo.',
        },
        negativas: { 'Não, não houve preparo': 'indícios de preparo químico do solo' },
      },
      {
        id: 'A-19',
        // {A-20} = ", do tipo <EROSAO...>" (lista com "e")
        frases: {
          Sim: 'Constatou-se processo erosivo na área{A-20}.',
          'Não foi possível verificar': 'Não foi possível verificar a existência de processo erosivo na área.',
        },
        negativas: { Não: 'processo erosivo' },
      },
    ],
  },
  {
    titulo: 'Uso atual e entorno',
    negativa: NEGATIVA,
    questoes: [
      {
        id: 'A-18',
        frases: {
          'Vegetação nativa alterada com presença predominante de espécies regenerantes nativas (capoeira, indivíduos arbóreo/arbustivos de forma espaçada, plântulas)':
            'No momento da ação fiscalizatória, a área apresentava vegetação nativa alterada, com predominância de espécies regenerantes nativas.',
          'Vegetação nativa degradada com presença predominante de espécies regenerantes nativas (capoeira, plântulas, estágio inicial de regeneração)':
            'No momento da ação fiscalizatória, a área apresentava vegetação nativa degradada, com predominância de espécies regenerantes nativas em estágio inicial de regeneração.',
          'Presença de vegetação nativa regenerante conjuntamente à presença de espécies exóticas, inclusive invasoras (ex.: pasto sujo)':
            'No momento da ação fiscalizatória, a área apresentava vegetação nativa regenerante associada a espécies exóticas, inclusive invasoras (ex.: pasto sujo).',
          'Implantação de cultura agrícola, pastagem ou silvicultura em parte (≤ 50%) da área degradada/alterada':
            'No momento da ação fiscalizatória, constatou-se a implantação de cultura agrícola, pastagem ou silvicultura em parte (até 50%) da área alterada.',
          'Implantação de cultura agrícola, pastagem ou silvicultura na maior parte (> 50%) da área degradada/alterada':
            'No momento da ação fiscalizatória, constatou-se a implantação de cultura agrícola, pastagem ou silvicultura na maior parte (mais de 50%) da área alterada.',
          'Sem vegetação': 'No momento da ação fiscalizatória, a área encontrava-se sem cobertura vegetal.',
        },
      },
      {
        id: 'A-21',
        // {A-21.1} = " (rebanho: bovino e ovino)"
        frases: {
          'Criação extensiva': 'Constatou-se a presença de animais de criação na área, em regime extensivo{A-21.1}.',
          'Criação intensiva': 'Constatou-se a presença de animais de criação na área, em regime intensivo{A-21.1}.',
        },
        negativas: { Não: 'animais de criação na área' },
      },
      { id: 'A-22', livre: 'Informações complementares da área alterada: {resposta}' },
      {
        id: 'A-23',
        frases: {
          'Sim, mais de 50% do perímetro limítrofe com fragmento de vegetação nativa':
            'Verificou-se conectividade da área com a paisagem, com mais de 50% do perímetro limítrofe a fragmento de vegetação nativa{fonte}.',
          'Sim, menos de 50% do perímetro limítrofe com fragmento de vegetação nativa':
            'Verificou-se conectividade da área com a paisagem, com menos de 50% do perímetro limítrofe a fragmento de vegetação nativa{fonte}.',
        },
        negativas: { Não: 'conectividade da área com fragmentos de vegetação nativa' },
        fonte: 'A-23.1',
      },
      {
        id: 'A-24',
        lista: {
          'Áreas urbanas e loteamentos residenciais, industriais e de lazer': 'áreas urbanas e loteamentos residenciais, industriais e de lazer',
          'Ocorrência de invasões e de ocupações irregulares de terra (problemas fundiários) no entorno': 'invasões e ocupações irregulares de terra no entorno',
          'Áreas com atividades agropecuárias (uso indiscriminado de queimadas, agrotóxicos etc.)': 'áreas com atividades agropecuárias (uso indiscriminado de queimadas, agrotóxicos etc.)',
          'Obras civis diversas': 'obras civis diversas',
          Rodovias: 'rodovias',
          'Estrada vicinal principal bem conservada': 'estrada vicinal principal bem conservada',
          'Potenciais alterações no ordenamento territorial local e regional': 'potenciais alterações no ordenamento territorial local e regional',
          Outras: '{A-24.1}',
        },
        listaFrase: 'Identificaram-se ameaças externas decorrentes da presença ou proximidade de {lista}.',
        pendente: { quando: '"Outras" marcada e A-24.1 vazio', texto: 'especificar outras ameaças externas (A-24.1)' },
      },
      { id: 'A-25', livre: 'Informações complementares do entorno: {resposta}' },
    ],
  },
  {
    // Sem frase negativa agrupada: no imóvel, cada resposta "Não" tem frase própria.
    titulo: 'Imóvel',
    questoes: [
      {
        id: 'B-1',
        frases: {
          Público: 'O imóvel onde está inserida a área fiscalizada é público.',
          Privado: 'O imóvel onde está inserida a área fiscalizada é privado.',
          Indeterminado: 'Não foi possível determinar se o imóvel onde está inserida a área fiscalizada é público ou privado.',
        },
      },
      {
        id: 'B-2',
        frases: {
          Federal: 'O domínio da área é federal.',
          Estadual: 'O domínio da área é estadual.',
          Distrital: 'O domínio da área é distrital.',
          Municipal: 'O domínio da área é municipal.',
        },
      },
      // B-3: se coincidir com a consulta CAR, sai só a frase da consulta; se divergir, DIVERGENCIA.
      {
        id: 'B-3',
        frases: {
          Sim: 'Em campo, verificou-se que o imóvel possui Cadastro Ambiental Rural (CAR){car}.',
          Não: 'Em campo, verificou-se que o imóvel não possui Cadastro Ambiental Rural (CAR).',
        },
      },
      {
        id: 'B-4',
        frases: {
          Sim: 'Constatou-se supressão de vegetação em área de ocorrência de espécies ameaçadas de extinção constantes em lista oficial.',
          Não: 'Não houve supressão de vegetação em área de ocorrência de espécies ameaçadas de extinção constantes em lista oficial.',
          'Não identificado': 'Não foi identificada supressão de vegetação em área de ocorrência de espécies ameaçadas de extinção constantes em lista oficial.',
        },
      },
    ],
  },
];

/** A-13/A-14. Formas sem concordância variável ("a ocorrência de {tema}"). */
function constatacao(tema: string): Record<string, string> {
  return {
    'Sim, constatada visualmente': `Constatou-se visualmente a ocorrência de ${tema}.`,
    'Sim, constatada por indícios': `Constatou-se, por indícios, a ocorrência de ${tema}.`,
    'Parcialmente (menor ou igual de 50%)': `Constatou-se a ocorrência de ${tema} em parte (até 50%) da área.`,
    'Não foi possível verificar': `Não foi possível verificar a ocorrência de ${tema}.`,
  };
}

// TODO (próxima tarefa): consultas automáticas no mesmo GeoServer e chave. Camadas já confirmadas:
//   CAR = Geoportal:MVW_REQUERIMENTO_ATP
//   embargos = Geoportal:AREA_EMBARGADA_SIGA_POLIGONO / _PONTO + Geoportal:AREAS_EMBARGADAS_SEMA (deduplicar)
//   autos = Geoportal:AUTOS_DE_INFRACAO_SIGA_POLIGONO / _PONTO
//   TI = Geoportal:TERRAS_INDIGENAS · UC = Geoportal:UNIDADES_CONSERVACAO
//   amortecimento = Geoportal:TI_AMORTECIMENTO + Geoportal:UC_AMORTECIMENTO

// ---------- Regras de montagem ----------
// 1. Constatações em 3 blocos: abertura; ponto + consultas (+ fecho com datas); caracterização em campo (um "· " por grupo).
// 2. Dentro do grupo: questões na ordem do array; frases afirmativas primeiro, depois UMA frase negativa
//    ("Não houve constatação de X, Y e Z."). Grupo "Imóvel" não tem negativa agrupada.
// 3. Listas: vírgulas e "e" antes do último item ("a, b e c"). Um item só: sem vírgula.
// 4. Questões consecutivas com a mesma resposta e a mesma função de frase (A-13/A-14) → uma frase com "e".
// 5. Opções com parêntese explicativo (ex.: A-2 "Floresta Ombrófila Densa (Floresta Amazônica ou Floresta
//    Atlântica)") entram SEM o parêntese.
// 6. Questão exigida sem resposta → "[PENDENTE: <descrição>]". Opcionais sem resposta não geram nada.
// 7. Campo × base: iguais → uma frase (a da base); diferentes → DIVERGENCIA. Nunca escolher um lado.
// 8. Texto livre entra como digitado (sem reescrever); só ganha ponto final se não tiver.
// 9. Data por extenso: "21 de outubro de 2026" (mês minúsculo). Datas curtas: DD/MM/AAAA.
//    Coordenadas: GMS como gravadas no ponto, sem reconverter.
// 10. Revisão final automática: sem espaço duplo, sem palavra repetida em sequência ("área área"),
//     sem ponto duplo, sem "{...}" sobrando no texto (falha de teste se sobrar).
