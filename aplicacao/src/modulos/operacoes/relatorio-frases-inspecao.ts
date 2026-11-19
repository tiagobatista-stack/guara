// Frases do relatório da Inspeção de agrotóxicos (RASCUNHO PARA REVISÃO: ainda não ligado a relatorio.ts).
// Mesmo formato e mesmas convenções de relatorio-frases.ts: dados puros, frases-modelo fixas, sem IA, sem inferência.
// Só entra o que está registrado no ponto. Marcadores: {x} = valor do ponto; [PENDENTE: ...] e [DIVERGÊNCIA: ...] vão literais.
// SEM DADO PESSOAL: as frases só dizem que a conferência foi feita e registrada no auto de inspeção; nenhum nome, CPF/CNPJ,
// telefone, e-mail ou endereço entra no texto (o modelo não tem esses campos). Números de CTF, licença, ART, receituário e embargo entram.
//
// Convenções (as de relatorio-frases.ts, mais as da inspeção):
// - Constatações no pretérito impessoal: "Constatou-se...", "Verificou-se...". Negativa agrupada: "Não houve constatação de {lista}."
// - Concordância neutra: "a existência de {lista}", "a apresentação {lista}" (cada item da lista já traz o seu "do/da/dos").
// - A resposta "Sim" tem sentido diferente conforme a pergunta; por isso cada questão tem um TIPO:
//     E = existência/documento. Sim → frase afirmativa; Não → negativa agrupada. Ex.: licença, DLA, ART, placa.
//     I = irregularidade. Sim → "Constatou-se..."; Não → negativa agrupada. Ex.: produtos vencidos, embalagens enterradas.
//     C = conformidade. Sim → "...está em conformidade"; Não → frase própria "...não está em conformidade" (nunca agrupada,
//         porque é achado de irregularidade). Ex.: NBR 9843, EPI, bula.
//     P = procedimento do fiscal (foto, notificação, apreensão, qualificação no auto). Sim → frase; Não → [PENDENTE: ...]
//         (é ação a fazer, não fato a negar).
// - N.A. não gera frase. Questão obrigatória sem resposta → [PENDENTE: <texto da pergunta> (<id>)]. Opcional sem resposta: nada.
//   Sem nenhuma resposta da inspeção: um marcador só (INSPECAO_NAO_PREENCHIDA), no lugar dos pendentes item a item.
// - Resposta de campo x conferido antes (fase prévia): vale a de campo; se as duas existem e diferem → DIVERGENCIA_PREVIA
//   (não escolher um lado). Resposta só prévia entra com o prefixo PREVIA ("Na conferência prévia, ...").
// - CAR e embargos: se a consulta automática foi feita e coincide com a resposta, sai só a frase da consulta (regra 7 do POP);
//   se diverge, DIVERGENCIA (campo × base), igual a B-3.
// - Datas por extenso ("10 de novembro de 2026"); números como digitados (vírgula decimal); texto livre como digitado.
// - Nenhum comentário ou instrução dentro das strings.

import type { Questao } from './relatorio-frases.ts';

export const INSPECAO_NAO_PREENCHIDA = '[PENDENTE: inspeção de agrotóxicos não preenchida]';
export const PREVIA = 'Na conferência prévia, ';
export const DIVERGENCIA_PREVIA = '[DIVERGÊNCIA: {tema} — em campo: {campo}; conferido antes: {previa}]';
export const NEGATIVA = 'Não houve constatação de {lista}.';

/** Várias questões numa frase só (conferências registradas no auto; documentos). `itens`: texto de cada id na lista; Sim entra na frase `sim`; Não entra na `nao` (E) ou vira [PENDENTE] (P). */
export interface Agrupada { tipo: 'E' | 'P'; itens: Record<string, string>; sim: string; nao?: string }
export interface QuestaoInspecao extends Questao { tipo: 'E' | 'I' | 'C' | 'P' }
export interface GrupoInspecao { titulo: string; questoes: QuestaoInspecao[]; agrupadas?: Agrupada[] }

const q = (tipo: QuestaoInspecao['tipo'], id: string, resto: Omit<QuestaoInspecao, 'id' | 'tipo'> = {}): QuestaoInspecao => ({ tipo, id, ...resto });

/** Tipo E/I simples: "Sim" → frase; "Não" → item da negativa agrupada. */
const sim = (frase: string, negativa?: string): Pick<QuestaoInspecao, 'frases' | 'negativas'> => ({ frases: { Sim: frase }, ...(negativa ? { negativas: { Não: negativa } } : {}) });
/** Tipo C: Sim e Não são frases próprias. */
const conf = (sim_: string, nao: string): Pick<QuestaoInspecao, 'frases'> => ({ frases: { Sim: sim_, Não: nao } });

export const INSPECAO: GrupoInspecao[] = [
  {
    titulo: 'Identificação e conferências em campo',
    agrupadas: [
      {
        tipo: 'P',
        itens: {
          'C-1.5': 'o documento do responsável', 'C-1.6': 'o endereço para correspondência (com o comprovante fotografado)',
          'C-1.8': 'a qualificação do(s) responsável(is) técnico(s) presente(s) e o registro profissional', 'C-1.9': 'a qualificação das pessoas presentes',
          'C-1.10': 'a identificação do acompanhante da vistoria',
        },
        sim: 'Conferiu-se e registrou-se, no auto de inspeção, {lista}.',
      },
      {
        tipo: 'E',
        itens: {
          'C-1.13': 'do documento da propriedade (matrícula ou posse)', 'C-1.14': 'do documento de registro ou certificação da área junto ao INCRA',
          'C-1.15': 'de contrato de arrendamento',
        },
        sim: 'Constatou-se a apresentação {lista}.',
        nao: 'Não houve constatação de apresentação {lista}.',
      },
    ],
    questoes: [
      q('E', 'C-1.2', sim('Constatou-se placa de identificação na entrada principal ou nos acessos da propriedade.', 'placa de identificação na entrada principal ou nos acessos da propriedade')),
      q('P', 'C-1.3', { frases: { Sim: 'Realizou-se o registro fotográfico georreferenciado, com data e hora.' } }),
      q('P', 'C-1.7', { frases: { Sim: 'Foi solicitada a atualização cadastral do responsável no SIGA{C-1.7.1}.' } }),
      q('P', 'C-1.7.1', { frases: { Sim: ', com notificação do responsável e prazo estabelecido' } }),
      q('P', 'C-1.16', { frases: { Sim: 'Os documentos citados na entrevista foram fotografados ou copiados.' } }),
    ],
  },
  {
    titulo: 'Cadastros, licenciamento e autorizações',
    agrupadas: [
      {
        tipo: 'E',
        itens: {
          'C-2.4.1': 'desmatamento{C-2.4.1.1}', 'C-2.4.2': 'supressão da vegetação nativa{C-2.4.2.1}', 'C-2.4.3': 'exploração florestal{C-2.4.3.1}',
          'C-2.4.4': 'manejo florestal{C-2.4.4.1}', 'C-2.4.5': 'intervenção em área de preservação permanente{C-2.4.5.1}', 'C-2.4.6': 'abertura de estradas{C-2.4.6.1}',
        },
        // {C-2.4.k.1} = " (n.º <número>)"
        sim: 'Constatou-se a existência de Autorização Ambiental para {lista}.',
        nao: 'Não houve constatação de Autorização Ambiental para {lista}.',
      },
    ],
    questoes: [
      q('E', 'C-1.11', { ...sim('Verificou-se que o imóvel possui Cadastro Ambiental Rural estadual (SIMCAR){C-1.11.1}.', 'Cadastro Ambiental Rural estadual (SIMCAR)') }),
      q('E', 'C-1.12', { ...sim('Verificou-se que o imóvel possui Cadastro Ambiental Rural federal{C-1.12.1}.', 'Cadastro Ambiental Rural federal') }),
      q('E', 'C-2.1', { ...sim('O empreendimento está registrado no Cadastro Técnico Estadual (CTE){C-2.1.1}.', 'registro no Cadastro Técnico Estadual (CTE)') }),
      q('E', 'C-2.1.1', { frases: { Sim: ', com Certificado de Regularidade atualizado', Não: ', sem Certificado de Regularidade atualizado' } }),
      q('E', 'C-2.2', {
        ...sim('O empreendimento está registrado no Cadastro Técnico Federal (CTF), inscrição n.º {C-2.2.1}, atividade(s) de código {C-2.2.2}{C-2.2.3}.', 'registro no Cadastro Técnico Federal (CTF)'),
        pendente: { quando: 'C-2.2 = Sim e C-2.2.1 ou C-2.2.2 vazio', texto: 'número de inscrição e código da atividade no CTF (C-2.2.1 e C-2.2.2)' },
      }),
      q('E', 'C-2.2.3', { frases: { Sim: ', com Certificado de Regularidade atualizado', Não: ', sem Certificado de Regularidade atualizado' } }),
      // {C-2.3.1} = tipo (ou o texto de C-2.3.2 se "Outro"); {C-2.3.4} = data por extenso. Sem número ou validade: [PENDENTE].
      q('E', 'C-2.3', {
        ...sim('O empreendimento possui Licença Ambiental ({C-2.3.1}), n.º {C-2.3.3}, válida até {C-2.3.4}.', 'licença ambiental para operação da atividade'),
        pendente: { quando: 'C-2.3 = Sim e C-2.3.1, C-2.3.3 ou C-2.3.4 vazio', texto: 'tipo, número e validade da licença ambiental (C-2.3.1, C-2.3.3 e C-2.3.4)' },
      }),
      // {C-2.3.6} = " (observação: <texto>)". Só se C-2.3 = Sim.
      q('C', 'C-2.3.5', {
        frases: {
          Conformes: 'Em campo, constatou-se que as condicionantes da licença estão em conformidade{C-2.3.6}.',
          'Não conformes': 'Em campo, constatou-se que as condicionantes da licença não estão em conformidade{C-2.3.6}.',
        },
      }),
      q('E', 'C-2.5', {
        ...sim('Constatou-se a existência de Declaração de Limpeza da Área (DLA) n.º {C-2.5.1}, válida até {C-2.5.2}.', 'Declaração de Limpeza da Área (DLA)'),
        pendente: { quando: 'C-2.5 = Sim e C-2.5.1 ou C-2.5.2 vazio', texto: 'número e validade da DLA (C-2.5.1 e C-2.5.2)' },
      }),
      q('E', 'C-2.6', sim('Constatou-se a existência de outorga de uso da água ou declaração de uso insignificante.', 'outorga de uso da água ou declaração de uso insignificante')),
      // {C-2.7.1} Sim = ", com hidrômetro, cujo volume registrado era de {C-2.7.2} litros"; Não = ", sem hidrômetro"
      q('E', 'C-2.7', sim('Constatou-se poço artesiano com registro{C-2.7.1}.', 'registro do poço artesiano')),
      q('E', 'C-2.8', sim('Constatou-se a existência de termo de compromisso de recuperação de área degradada.', 'termo de compromisso de recuperação de área degradada')),
      q('E', 'C-2.9', sim('Constatou-se o registro do estabelecimento no MAPA{C-2.9.1}.', 'registro do estabelecimento no MAPA')),
      q('E', 'C-2.10', sim('Constatou-se o registro do estabelecimento no INDEA{C-2.10.1}.', 'registro do estabelecimento no INDEA')),
      q('E', 'C-2.11', sim('Constatou-se que o estabelecimento registra no SISDEV as informações de prescrição, comercialização e aplicação de produtos.', 'registro, no SISDEV, das informações de prescrição, comercialização e aplicação de produtos')),
      q('E', 'C-2.12', sim('Constatou-se autorização do MAPA para operar em Unidade da Federação diferente daquela em que a empresa está registrada.', 'autorização do MAPA para operar em outra Unidade da Federação')),
      // {C-2.13.1} = ", n.º <números>"; {C-2.13.2} = ", emitido(s) por <órgãos, com "e">". Com consulta de embargos: ver regra de CAR/embargos acima.
      q('E', 'C-2.13', sim('Constatou-se a existência de embargo na propriedade rural{C-2.13.1}{C-2.13.2}.', 'embargos na propriedade rural')),
    ],
  },
  {
    titulo: 'Documentação técnica e registros',
    agrupadas: [
      {
        tipo: 'E',
        itens: {
          'C-3.1': 'de contratos de prestação de serviços para pulverização de agrotóxicos', 'C-3.2': 'de contratos de prestação de serviços para outras atividades',
          'C-3.5': 'do Relatório operacional (IN MAPA n.º 02/2008)', 'C-3.10': 'de livro de registro ou outro sistema de controle do estoque de agrotóxicos',
          'C-3.11': 'do programa de treinamento de aplicadores de agrotóxicos', 'C-3.12': 'de mapas das áreas pulverizadas com agrotóxicos',
        },
        sim: 'Constatou-se a apresentação {lista}.',
        nao: 'Não houve constatação de apresentação {lista}.',
      },
      {
        // Só na aplicação aérea (C-5.2 = Sim).
        tipo: 'E',
        itens: {
          'C-3.6': 'do Certificado de Operador Aéreo (COA)', 'C-3.7': 'do Certificado de Aeronavegabilidade da(s) aeronave(s) e de outros registros na ANAC',
          'C-3.8': 'da autorização para operar (SAE), emitida pela ANAC', 'C-3.9': 'dos documentos de análise do Sistema de Gerenciamento de Segurança Operacional (SGSO) de cada pista utilizada',
        },
        sim: 'Na aplicação aérea, constatou-se a apresentação {lista}.',
        nao: 'Na aplicação aérea, não houve constatação de apresentação {lista}.',
      },
    ],
    questoes: [
      q('E', 'C-3.3', { ...sim('Constatou-se a apresentação de Anotação de Responsabilidade Técnica (ART) atualizada{C-3.3.1}.', 'apresentação de Anotação de Responsabilidade Técnica (ART) atualizada') }),
      // {C-3.4.1} = " n.º <número>"; {C-3.4.2} = ", de <data>"; {C-3.4.3}: Sim = ", com as informações detalhadas exigidas"; Não = ", sem as informações detalhadas exigidas"
      q('E', 'C-3.4', sim('Constatou-se a apresentação de receituário agronômico{C-3.4.1}{C-3.4.2}{C-3.4.3}.', 'apresentação de receituário agronômico')),
      // C-3.5.1: Sim = frase própria; Não = [PENDENTE] (planilha só se solicitada: N.A. não gera nada).
      q('P', 'C-3.5.1', { frases: { Sim: 'Foi apresentada, em meio digital, a planilha com a compilação das informações dos relatórios operacionais.' } }),
    ],
  },
  {
    titulo: 'Armazenamento de agrotóxicos',
    agrupadas: [],
    questoes: [
      q('C', 'C-4.1', {
        ...conf('Constatou-se que o armazenamento segue os critérios da NBR 9843/2013 da ABNT.', 'Constatou-se que o armazenamento não segue os critérios da NBR 9843/2013 da ABNT.'),
        lista: {
          'Piso impermeável': 'piso impermeável', 'Ventilação eficiente': 'ventilação eficiente', 'Sinalização de perigo': 'sinalização de perigo', 'EPIs no local': 'EPIs no local',
          'Sistema de contenção de vazamentos (canaletas, alteamento no piso, tanque armazenador em caso de derramamento)': 'sistema de contenção de vazamentos',
          'Banheiro nas proximidades': 'banheiro nas proximidades', 'Área de lavagem de EPI nas proximidades': 'área de lavagem de EPI nas proximidades',
        },
        // Lista de C-4.1.1: o que foi observado. Sai como segunda frase, só se houver marca.
        listaFrase: 'No local de armazenamento, observou-se {lista}.',
      }),
      q('I', 'C-4.2.1', { ...conf('No aeródromo, constatou-se depósito de agrotóxicos de acordo com a legislação estadual.', 'No aeródromo, constatou-se depósito de agrotóxicos em desacordo com a legislação estadual.') }),
      // {C-4.3.1} = ", a saber: <quantidade e tipo>"; {C-4.3.2} = " (lotes: <texto>)"; C-4.3.3: Sim = frase própria; Não = [PENDENTE]; N.A. = nada
      q('I', 'C-4.3', { ...sim('Constatou-se a existência de produtos vencidos{C-4.3.1}{C-4.3.2}.', 'produtos vencidos') }),
      q('P', 'C-4.3.3', { frases: { Sim: 'O responsável foi notificado para o recolhimento dos produtos vencidos há menos de 6 meses.' } }),
      q('I', 'C-4.4', { ...sim('Constatou-se a existência de produtos contrabandeados, falsificados ou adulterados{C-4.4.1}.', 'produtos contrabandeados, falsificados ou adulterados') }),
      q('I', 'C-4.4.2', { ...sim('Constatou-se a existência de produtos com rotulagem em língua estrangeira.', 'produtos com rotulagem em língua estrangeira') }),
      q('I', 'C-4.5', { ...sim('Constatou-se a existência de agrotóxicos adquiridos há mais de um ano sem comprovação de uso ou destinação.', 'agrotóxicos adquiridos há mais de um ano sem comprovação de uso ou destinação') }),
      q('C', 'C-4.6', { ...conf('Constatou-se que as embalagens são manuseadas com o uso de EPI adequados.', 'Constatou-se que as embalagens não são manuseadas com o uso de EPI adequados.') }),
      q('I', 'C-4.7', { ...sim('Constatou-se a existência de embalagens danificadas ou com vazamentos no local de armazenamento.', 'embalagens danificadas ou com vazamentos no local de armazenamento') }),
      q('I', 'C-4.8', { ...sim('Sem abrir as embalagens, constatou-se odor atípico, que pode indicar irregularidade.', 'odor atípico no local de armazenamento') }),
      q('E', 'C-4.9', { ...sim('Constatou-se a existência de sistema de ponto de abastecimento{C-4.9.1}.', 'sistema de ponto de abastecimento') }),
      q('C', 'C-4.9.1', { frases: { Sim: ', em conformidade com a Resolução ANP n.º 12/2007 e com o licenciamento ambiental', Não: ', em desacordo com a Resolução ANP n.º 12/2007 ou com o licenciamento ambiental' } }),
    ],
  },
  {
    titulo: 'Uso e aplicação',
    questoes: [
      q('E', 'C-5.1', sim('Constatou-se registro de aplicação de agrotóxicos por via terrestre.', 'registro de aplicação de agrotóxicos por via terrestre')),
      // {C-5.2.1}: Sim = ", com o operador aéreo identificado no auto de inspeção"; Não = [PENDENTE]
      q('E', 'C-5.2', sim('Constatou-se registro de aplicação de agrotóxicos por via aérea{C-5.2.1}.', 'registro de aplicação de agrotóxicos por via aérea')),
      q('P', 'C-5.3', { livre: 'A aplicação ocorria, ou ocorreu recentemente, em: {resposta}' }),
      // C-5.4.1 e C-5.4.2 numa frase só; um sem o outro: a frase sai só com o que há.
      q('P', 'C-5.4.1', { livre: 'Os produtos aplicados, ou em aplicação, eram: {resposta}{C-5.4.2}' }),
      q('P', 'C-5.5', {
        lista: { 'Combate a erva daninha': 'combate a erva daninha', 'Combate a insetos': 'combate a insetos', 'Combate a fungos': 'combate a fungos', Dessecação: 'dessecação', Outra: '{C-5.5.1}' },
        listaFrase: 'A aplicação tinha por motivação {lista}.',
      }),
      q('C', 'C-5.6', conf('Constatou-se que os produtos estão sendo aplicados adequadamente para a cultura plantada, conforme a bula.', 'Constatou-se que os produtos não estão sendo aplicados adequadamente para a cultura plantada, conforme a bula.')),
      // C-5.7 + C-5.7.1 + C-5.8 + C-5.9 + C-5.9.1 numa frase só, com o que houver:
      q('P', 'C-5.7', { livre: 'Registrou-se a aplicação com dosagem de {resposta} {C-5.7.1}{area}{data}.' }),
      // {area} = ", em área de {C-5.8} ha"; {data} = ", em {C-5.9 por extenso}{horario}"; {horario} = ", às {C-5.9.1}"
      // Condições meteorológicas, numa frase: "No momento da aplicação, as condições meteorológicas eram: vento {C-5.10.1}, temperatura de {C-5.10.2} °C e umidade de {C-5.10.3}%."
      q('P', 'C-5.10.1', { livre: 'No momento da aplicação, as condições meteorológicas eram: vento {resposta}{C-5.10.2}{C-5.10.3}.' }),
      q('C', 'C-5.11', conf('Constatou-se que a equipe de aplicação utiliza os EPIs adequados.', 'Constatou-se que a equipe de aplicação não utiliza os EPIs adequados.')),
      q('I', 'C-5.11.1', { ...sim('Constatou-se a falta de EPI durante o manuseio ou a aplicação.', 'falta de EPI durante o manuseio ou a aplicação') }),
      q('I', 'C-5.12', { livre: 'Constataram-se plantas com sinais de queima ou outros efeitos da aplicação: {resposta}' }),
      q('I', 'C-5.13', {
        lista: {
          'Corpos hídricos': 'corpos hídricos', Pomares: 'pomares', Residências: 'residências', Comunidades: 'comunidades', Escolas: 'escolas', 'Criação de animais': 'criação de animais',
        },
        listaFrase: 'A aplicação ocorria nas proximidades de {lista}.',
        negativas: { 'Nenhum dos anteriores': 'corpos hídricos, pomares, residências, comunidades, escolas ou criação de animais nas proximidades da aplicação' },
      }),
      q('P', 'C-5.14', { frases: { Sim: 'Antes do ingresso nos locais de uso, as atividades de aplicação estavam totalmente paralisadas.', Não: 'Antes do ingresso nos locais de uso, as atividades de aplicação não estavam totalmente paralisadas.' } }),
    ],
  },
  {
    titulo: 'Pátio de descontaminação (aplicação aérea)',
    questoes: [
      q('E', 'C-6.1', sim('Constatou-se a existência de pátio de descontaminação.', 'pátio de descontaminação')),
      q('C', 'C-6.2', conf('O pátio de descontaminação funciona conforme a IN MAPA n.º 02/2008.', 'O pátio de descontaminação não funciona conforme a IN MAPA n.º 02/2008.')),
      q('C', 'C-6.2.1', conf('Sua capacidade operacional está conforme o Anexo 6 da IN MAPA n.º 02/2008.', 'Sua capacidade operacional não está conforme o Anexo 6 da IN MAPA n.º 02/2008.')),
      q('C', 'C-6.2.2', conf('O pátio e o sistema de oxidação estão funcionais e íntegros.', 'O pátio e o sistema de oxidação não estão funcionais e íntegros.')),
      q('E', 'C-6.3', sim('Constatou-se a existência de Licença de Operação do pátio de descontaminação.', 'Licença de Operação do pátio de descontaminação')),
      // Lavagem das aeronaves: C-6.4.1 (piso, texto) abre a frase; C-6.4.2 a C-6.4.4 entram na sequência.
      q('P', 'C-6.4.1', { livre: 'No local de lavagem das aeronaves, o piso apresentava o seguinte estado: {resposta}' }),
      q('I', 'C-6.4.2', { ...sim('Constataram-se rachaduras no piso do local de lavagem das aeronaves.', 'rachaduras no piso do local de lavagem das aeronaves') }),
      q('C', 'C-6.4.3', conf('A tubulação de destino dos efluentes encontra-se em bom estado.', 'A tubulação de destino dos efluentes não se encontra em bom estado.')),
      q('C', 'C-6.4.4', conf('Existe tubulação específica para água pluvial, independente do efluente de lavagem.', 'Não existe tubulação específica para água pluvial independente do efluente de lavagem.')),
    ],
  },
  {
    titulo: 'Embalagens vazias e destinação final',
    questoes: [
      q('E', 'C-7.1', sim('Constatou-se o armazenamento de embalagens vazias{C-7.1.1}.', 'armazenamento de embalagens vazias')),
      q('I', 'C-7.2', { ...sim('Constatou-se o descarte irregular de embalagens vazias{C-7.2.1}.', 'descarte irregular de embalagens vazias') }),
      q('I', 'C-7.3', { ...sim('Constataram-se indícios de embalagens enterradas ou queimadas.', 'indícios de embalagens enterradas ou queimadas') }),
      q('E', 'C-7.4', sim('Constatou-se a apresentação de comprovantes de devolução para a logística reversa.', 'apresentação de comprovantes de devolução para a logística reversa')),
      q('P', 'C-7.5', { frases: { Sim: 'O autuado foi notificado a efetuar a entrega, em central ou posto autorizado, dos produtos e embalagens com registro no Brasil em situação ilegal ou irregular.' } }),
      q('P', 'C-7.6', { frases: { Sim: 'Os produtos e embalagens sem registro no Brasil e de origem estrangeira foram encaminhados à Polícia Civil.' } }),
      q('P', 'C-7.6.1', { frases: { Sim: 'Na impossibilidade do encaminhamento, realizou-se a coleta de amostra, a apreensão e o depósito com o autuado, com notificação para a destruição ambientalmente correta.' } }),
      q('P', 'C-7.7', { frases: { Sim: 'Os produtos e embalagens sem registro no Brasil e de origem nacional foram apreendidos e ficaram em depósito com o autuado, com notificação para a destruição ambientalmente correta.' } }),
      q('P', 'C-7.8', { frases: { Sim: 'O fiel depositário designado foi orientado a manter o material em depósito adequado, conforme a NBR 9843/2013.' } }),
      q('P', 'C-7.8.1', { frases: { Sim: 'Na ausência de depósito adequado, foram determinadas condições mínimas de armazenamento (local coberto, ventilado, impermeável, de acesso restrito e separado de alimentos).' } }),
    ],
  },
];
