// Inspeção de agrotóxicos: perguntas do questionário da equipe de fiscalização (documentacao/questionario-agrotoxicos.md, recebido em 19/11/2026),
// como DADOS do mesmo motor do POP (pop-supressao.ts: itensAplicaveis, caracterizacaoValida…). Ids "C-<seção>.<pergunta>[.<sub>]".
// Padronização do tipo de resposta, sem mudar o conteúdo; cada ajuste (lacuna fechada, condicional) está em
// gestao/decisoes/2026-11-19-inspecao-agrotoxicos.md. As transcrições de lei e os valores de multa do questionário NÃO entram aqui.
// DADOS PESSOAIS: não há campo de nome, CPF/CNPJ, telefone, e-mail, endereço nem de nomes de pessoas presentes; no lugar, perguntas de conferência
// (Sim/Não/N.A.). Números de CTF, licença, ART, receituário e embargo não são dado pessoal e entram.
// Fase: 'previa' (conferir no escritório; a resposta de campo diferente gera [DIVERGÊNCIA]) ou 'campo'. Só 'campo' conta em "sem resposta".

import { norm, type ItemPop, type OpcaoPop, type TipoItem } from './pop-supressao.ts';
import type { Ponto } from './modelo.ts';

const o = (...textos: string[]): OpcaoPop[] => textos.map((texto) => ({ texto }));
const SIM_NAO_NA = o('Sim', 'Não', 'N.A.');
const SIM = ['Sim'];

type Fase = 'previa' | 'campo';
interface Extra { se?: string; vale?: string[]; opcional?: boolean; nota?: string; opcoes?: OpcaoPop[] }

function c(id: string, texto: string, tipo: TipoItem, fase: Fase, e: Extra = {}): ItemPop {
  const { se, vale = SIM, opcoes, ...resto } = e;
  return {
    id, formulario: 'C', texto, tipo, fase, secao: Number(id.slice(2).split('.')[0]), onde: fase === 'previa' ? 'escritorio' : 'campo',
    ...(tipo === 'simnao' ? { opcoes: SIM_NAO_NA } : opcoes ? { opcoes } : {}),
    // Complementos de uma resposta (número, validade, "especifique"): fora da conta de "sem resposta". Sim/Não condicional continua obrigatório.
    ...(se ? { se: { item: se, vale }, ...(tipo === 'simnao' ? {} : { opcional: true }) } : {}),
    ...resto,
  };
}
const sn = (id: string, t: string, f: Fase, e?: Extra) => c(id, t, 'simnao', f, e);
const tx = (id: string, t: string, f: Fase, e?: Extra) => c(id, t, 'texto', f, e);
const nu = (id: string, t: string, f: Fase, e?: Extra) => c(id, t, 'numero', f, e);
const da = (id: string, t: string, f: Fase, e?: Extra) => c(id, t, 'data', f, e);
const li = (id: string, t: string, f: Fase, opcoes: OpcaoPop[], e?: Extra) => c(id, t, 'unica', f, { ...e, opcoes });
const ml = (id: string, t: string, f: Fase, opcoes: OpcaoPop[], e?: Extra) => c(id, t, 'multipla', f, { ...e, opcoes });

const AEREA = { se: 'C-5.2' };

/** Embargos de outros órgãos: pares {número, órgão} repetíveis (máx. 10); a tela mostra um par e o botão "+ Adicionar embargo" revela o seguinte. */
export const MAX_EMBARGOS = 10;
const EMBARGOS = Array.from({ length: MAX_EMBARGOS }, (_, i) => i + 1);
export const ORGAOS_EMBARGO = ['IBAMA', 'ICMBio', 'Decisão judicial', 'Outro'] as const;

/** Fonte da conferência prévia (lista fechada); "Outra (especificar)" abre um texto. O texto que vai ao relatório está em relatorio-frases-inspecao.ts. */
export const FONTES_CONFERENCIA = ['SIGA', 'SIMCAR', 'Geoportal SEMA-MT', 'Consulta pública CTF/IBAMA', 'SISDEV/INDEA', 'Sistema de outorga', 'Outra (especificar)'] as const;
export const OUTRA_FONTE = 'Outra (especificar)';

/** "Possui Autorização Ambiental para..." (o texto original termina sem a lista): uma pergunta Sim/Não/N.A. e o número por autorização. */
const AUTORIZACOES = ['desmatamento', 'supressão da vegetação nativa', 'exploração florestal', 'manejo florestal', 'intervenção em área de preservação permanente', 'abertura de estradas'];

export const SECOES_INSPECAO: Record<number, string> = {
  1: 'Identificação', 2: 'Cadastro técnico, licenciamento ambiental e autorizações', 3: 'Documentação técnica e registros',
  4: 'Armazenamento de agrotóxicos', 5: 'Uso e aplicação', 6: 'Pátio de descontaminação', 7: 'Embalagens vazias e destinação final',
};

const BASE: readonly ItemPop[] = [
  // 1. Identificação (só conferências: sem campos de dados pessoais)
  // C-1.1 (nome da propriedade) não existe: vale o "Imóvel / local" do ponto, mostrado e editado também na inspeção (revisão de 19/11/2026).
  sn('C-1.2', 'Possui placa na entrada principal ou nos acessos da propriedade?', 'campo'),
  sn('C-1.3', 'Fotografia georreferenciada com data e hora registrada (usar aplicativos específicos)?', 'campo'),
  tx('C-1.4', 'Localização (zona rural, estrada MT ou BR, km, referências próximas)', 'campo', { opcional: true, nota: 'Município e coordenadas já constam do ponto.' }),
  sn('C-1.5', 'Documento do responsável conferido e fotografado?', 'campo'),
  sn('C-1.6', 'Endereço para correspondência confirmado (comprovante fotografado)?', 'campo'),
  sn('C-1.7', 'Atualização cadastral no SIGA solicitada?', 'campo'),
  sn('C-1.7.1', 'Responsável notificado, com prazo estabelecido para a atualização?', 'campo', { se: 'C-1.7' }),
  sn('C-1.8', 'Responsável(is) técnico(s) presente(s) qualificado(s) no auto de inspeção, com o registro profissional (CREA) conferido?', 'campo'),
  sn('C-1.9', 'Pessoas presentes qualificadas no auto de inspeção (trabalho, vínculo, documentos)?', 'campo'),
  sn('C-1.10', 'Gerente, capataz ou responsável que acompanhou a vistoria (galpões, estruturas, maquinários, combustíveis, agrotóxicos, sementes, insumos, lixos, resíduos) qualificado no auto de inspeção?', 'campo'),
  sn('C-1.11', 'Possui Cadastro Ambiental Rural de Mato Grosso (SIMCAR)?', 'previa'),
  tx('C-1.11.1', 'Número do CAR estadual', 'previa', { se: 'C-1.11' }),
  sn('C-1.12', 'Possui Cadastro Ambiental Rural federal (recibo)?', 'previa'),
  tx('C-1.12.1', 'Número do recibo do CAR federal', 'previa', { se: 'C-1.12' }),
  sn('C-1.13', 'Possui documento da propriedade (matrícula e/ou posse)?', 'campo'),
  sn('C-1.14', 'Possui documento de registro e/ou certificação da área junto ao INCRA?', 'campo'),
  sn('C-1.15', 'Possui contrato de arrendamento?', 'campo'),
  sn('C-1.16', 'Documentos citados (CPF, RG, CNPJ, endereço, alvará, contratos etc.) fotografados ou copiados?', 'campo'),

  // 2. Cadastro técnico, licenciamento ambiental, autorizações
  sn('C-2.1', 'A propriedade/empreendimento está registrada(o) no Cadastro Técnico Estadual (CTE)?', 'previa'),
  sn('C-2.1.1', 'Possui Certificado de Regularidade do CTE atualizado?', 'previa', { se: 'C-2.1' }),
  sn('C-2.2', 'A propriedade/empreendimento está registrada(o) no Cadastro Técnico Federal (CTF)?', 'previa'),
  tx('C-2.2.1', 'Número de inscrição no CTF', 'previa', { se: 'C-2.2' }),
  tx('C-2.2.2', 'Código(s) da(s) atividade(s) registrada(s) no CTF', 'previa', {
    se: 'C-2.2', nota: 'Exemplos: 21-32 operação de aeródromo; 21-47 aplicação de agrotóxicos; 7-1 serraria e desdobramento de madeira; 1-1 pesquisa mineral com guia de utilização; 1-4 lavra garimpeira; 20-60 silvicultura (Lei 12.651/2012, art. 35, §§ 1º e 3º, espécies nativas); 20-61 silvicultura (art. 35, § 1º, espécies exóticas).',
  }),
  sn('C-2.2.3', 'Possui Certificado de Regularidade do CTF atualizado?', 'previa', { se: 'C-2.2' }),
  sn('C-2.3', 'Possui Licença Ambiental para operação da atividade (agropecuária, mineral, incluindo atividade aeroagrícola e aeródromo, pulverização de agrotóxicos, se aplicável)?', 'previa'),
  li('C-2.3.1', 'Tipo de licença', 'previa', o('LO', 'LI', 'LAS', 'LAC', 'APF rural', 'Outro'), { se: 'C-2.3' }),
  tx('C-2.3.2', 'Especifique o outro tipo de licença', 'previa', { se: 'C-2.3.1', vale: ['Outro'] }),
  tx('C-2.3.3', 'Número da licença', 'previa', { se: 'C-2.3' }),
  da('C-2.3.4', 'Validade da licença', 'previa', { se: 'C-2.3' }),
  li('C-2.3.5', 'Condicionantes da licença verificadas em campo', 'campo', o('Conformes', 'Não conformes', 'N.A.'), { se: 'C-2.3', opcional: false }),
  tx('C-2.3.6', 'Observação sobre as condicionantes da licença', 'campo', { se: 'C-2.3' }),
  ...AUTORIZACOES.flatMap((a, i) => [
    sn(`C-2.4.${i + 1}`, `Possui Autorização Ambiental para ${a}?`, 'previa'),
    tx(`C-2.4.${i + 1}.1`, `Número da Autorização Ambiental para ${a}`, 'previa', { se: `C-2.4.${i + 1}` }),
  ]),
  sn('C-2.5', 'Possui Declaração de Limpeza da Área (DLA)?', 'previa'),
  tx('C-2.5.1', 'Número da DLA', 'previa', { se: 'C-2.5' }),
  da('C-2.5.2', 'Validade da DLA', 'previa', { se: 'C-2.5' }),
  sn('C-2.6', 'Possui outorga de uso da água ou declaração de uso insignificante?', 'previa'),
  sn('C-2.7', 'Possui registro do poço artesiano?', 'campo'),
  sn('C-2.7.1', 'Há hidrômetro no poço?', 'campo', { se: 'C-2.7' }),
  nu('C-2.7.2', 'Volume registrado no hidrômetro (litros)', 'campo', { se: 'C-2.7.1' }),
  sn('C-2.7.3', 'Hidrômetro fotografado?', 'campo', { se: 'C-2.7.1' }),
  sn('C-2.8', 'Possui termo de compromisso de recuperação de área degradada?', 'previa'),
  sn('C-2.9', 'Possui registro do estabelecimento no MAPA (Ministério da Agricultura, Pecuária e Abastecimento)?', 'previa'),
  tx('C-2.9.1', 'Número do registro no MAPA', 'previa', { se: 'C-2.9' }),
  sn('C-2.10', 'Possui registro do estabelecimento no órgão estadual de agricultura (INDEA)?', 'previa'),
  tx('C-2.10.1', 'Número do registro no INDEA', 'previa', { se: 'C-2.10' }),
  sn('C-2.12', 'Possui autorização do MAPA para operar em Unidade da Federação diferente daquela onde a empresa está registrada?', 'previa'),
  // Embargos da SEMA vêm só da consulta às bases (não se repete aqui); em campo, só os de outros órgãos.
  sn('C-2.13', 'Embargos de outros órgãos (IBAMA, ICMBio, decisão judicial)?', 'campo'),
  ...EMBARGOS.flatMap((k) => [
    tx(`C-2.13.${k}.1`, `Embargo ${k}: número`, 'campo', { se: 'C-2.13' }),
    li(`C-2.13.${k}.2`, `Embargo ${k}: órgão`, 'campo', o(...ORGAOS_EMBARGO), { se: 'C-2.13' }),
    tx(`C-2.13.${k}.3`, `Embargo ${k}: especifique o outro órgão`, 'campo', { se: `C-2.13.${k}.2`, vale: ['Outro'] }),
  ]),

  // 3. Documentação técnica e registros
  sn('C-3.1', 'Existem contratos de prestação de serviços para pulverização de agrotóxicos?', 'campo'),
  sn('C-3.2', 'Existem contratos de prestação de serviços para outras atividades?', 'campo'),
  sn('C-3.3', 'Existe Anotação de Responsabilidade Técnica (ART) atualizada do engenheiro agrônomo responsável técnico pela empresa e do(s) técnico(s) responsável(is) pelo acompanhamento presencial, se aplicável?', 'campo'),
  tx('C-3.3.1', 'Número da ART', 'campo', { se: 'C-3.3' }),
  sn('C-3.4', 'Possui receituário(s) agronômico(s) apresentado(s) para os produtos aplicados ou em estoque?', 'campo'),
  tx('C-3.4.1', 'Número do receituário agronômico', 'campo', { se: 'C-3.4' }),
  da('C-3.4.2', 'Data do receituário agronômico', 'campo', { se: 'C-3.4' }),
  sn('C-3.4.3', 'O receituário traz as informações detalhadas (identificação do usuário, propriedade, diagnóstico, produto, cultura, doses, modalidade, época etc.)?', 'campo', { se: 'C-3.4' }),
  sn('C-3.5', 'Possui Relatório operacional (IN MAPA nº 02/2008) disponível e apresentado?', 'campo'),
  sn('C-3.5.1', 'Planilha em meio digital com a compilação das informações dos relatórios operacionais apresentada (se solicitada)?', 'campo', { se: 'C-3.5' }),
  sn('C-3.6', 'Certificado de Operador Aéreo (COA) apresentado?', 'campo', AEREA),
  sn('C-3.7', 'Certificado de Aeronavegabilidade da(s) aeronave(s) e outros registros na ANAC apresentados?', 'campo', AEREA),
  sn('C-3.8', 'Autorização para operar (SAE), emitida pela ANAC, apresentada?', 'campo', AEREA),
  sn('C-3.9', 'Documentos de análise do Sistema de Gerenciamento de Segurança Operacional (SGSO) de cada uma das pistas utilizadas apresentados?', 'campo', AEREA),
  sn('C-3.10', 'Possui livro de registro ou outro sistema de controle do estoque de agrotóxicos?', 'campo'),
  sn('C-3.11', 'Programa de treinamento de aplicadores de agrotóxicos apresentado?', 'campo'),
  sn('C-3.12', 'Possui mapas impressos ou digitais das áreas pulverizadas com agrotóxicos?', 'campo'),

  // 4. Armazenamento de agrotóxicos
  sn('C-4.1', 'O armazenamento segue os critérios da NBR 9843/2013 da ABNT?', 'campo'),
  ml('C-4.1.1', 'Observado no local de armazenamento', 'campo', o(
    'Piso impermeável', 'Ventilação eficiente', 'Sinalização de perigo', 'EPIs no local',
    'Sistema de contenção de vazamentos (canaletas, alteamento no piso, tanque armazenador em caso de derramamento)', 'Banheiro nas proximidades', 'Área de lavagem de EPI nas proximidades',
  ), { opcional: true }),
  sn('C-4.2', 'Há aeródromo na propriedade?', 'campo'),
  sn('C-4.2.1', 'Existe depósito de agrotóxicos no aeródromo e está de acordo com a legislação estadual?', 'campo', { se: 'C-4.2' }),
  sn('C-4.3', 'Existem produtos vencidos?', 'campo'),
  tx('C-4.3.1', 'Produtos vencidos: quantidade e tipo', 'campo', { se: 'C-4.3' }),
  tx('C-4.3.2', 'Produtos vencidos: identificar todos os lotes', 'campo', { se: 'C-4.3' }),
  sn('C-4.3.3', '(Se vencido há menos de 6 meses) O responsável foi notificado para recolhimento?', 'campo', { se: 'C-4.3' }),
  sn('C-4.4', 'Foram identificados produtos contrabandeados, falsificados ou adulterados?', 'campo'),
  tx('C-4.4.1', 'Identificação dos produtos contrabandeados, falsificados ou adulterados', 'campo', { se: 'C-4.4' }),
  sn('C-4.4.2', 'Existem produtos com rotulagem em línguas estrangeiras?', 'campo'),
  sn('C-4.5', 'Foram encontrados agrotóxicos adquiridos há mais de um ano sem comprovação de uso ou destinação?', 'campo'),
  sn('C-4.6', 'As embalagens (fechadas ou abertas) estão sendo manuseadas com o uso de EPI adequados?', 'campo'),
  sn('C-4.7', 'Existem embalagens danificadas ou com vazamentos no local de armazenamento?', 'campo'),
  sn('C-4.8', '(Sem abrir embalagens) Há odor atípico que possa indicar irregularidade?', 'campo'),
  sn('C-4.9', 'Existe Sistema de Ponto de Abastecimento?', 'campo'),
  sn('C-4.9.1', 'O ponto de abastecimento está em conformidade com a Resolução ANP nº 12/2007 e com o licenciamento ambiental (se capacidade superior a 15 m³)?', 'campo', { se: 'C-4.9' }),

  // 5. Uso e aplicação
  sn('C-5.1', 'Há registro da aplicação de agrotóxicos por via terrestre?', 'campo'),
  sn('C-5.2', 'Há registro da aplicação de agrotóxicos por via aérea?', 'campo'),
  sn('C-5.2.1', 'Operador aéreo identificado no auto de inspeção?', 'campo', { se: 'C-5.2' }),
  tx('C-5.3', 'Onde está ocorrendo (ou ocorreu recentemente) a aplicação?', 'campo', { opcional: true }),
  tx('C-5.4.1', 'Produtos sendo (ou já) aplicados: nome comercial', 'campo', { opcional: true }),
  tx('C-5.4.2', 'Produtos sendo (ou já) aplicados: princípio ativo', 'campo', { opcional: true }),
  ml('C-5.5', 'Motivação da aplicação', 'campo', o('Combate a erva daninha', 'Combate a insetos', 'Combate a fungos', 'Dessecação', 'Outra'), { opcional: true }),
  tx('C-5.5.1', 'Especifique a outra motivação da aplicação', 'campo', { se: 'C-5.5', vale: ['Outra'] }),
  sn('C-5.6', 'Os produtos estão sendo aplicados adequadamente para a cultura plantada, conforme bula?', 'campo'),
  nu('C-5.7', 'Dosagem utilizada', 'campo', { opcional: true }),
  li('C-5.7.1', 'Unidade da dosagem', 'campo', o('L/ha', 'kg/ha'), { opcional: true }),
  nu('C-5.8', 'Área aplicada (ha)', 'campo', { opcional: true }),
  da('C-5.9', 'Data da aplicação', 'campo', { opcional: true }),
  tx('C-5.9.1', 'Horário da aplicação', 'campo', { opcional: true }),
  tx('C-5.10.1', 'Condições meteorológicas no momento: vento', 'campo', { opcional: true }),
  nu('C-5.10.2', 'Condições meteorológicas no momento: temperatura (°C)', 'campo', { opcional: true }),
  nu('C-5.10.3', 'Condições meteorológicas no momento: umidade (%)', 'campo', { opcional: true }),
  sn('C-5.11', 'A equipe de aplicação está utilizando os EPIs adequados?', 'campo'),
  sn('C-5.11.1', '(Verificação de irregularidades) Falta de EPI durante manuseio/aplicação constatada?', 'campo'),
  tx('C-5.12', 'Plantas com sinais de queima ou outros efeitos da aplicação', 'campo', { opcional: true }),
  ml('C-5.13', 'Aplicação próxima de', 'campo', o('Corpos hídricos', 'Pomares', 'Residências', 'Comunidades', 'Escolas', 'Criação de animais', 'Nenhum dos anteriores'), { opcional: true }),
  sn('C-5.14', '(Antes de ingressar em locais de uso) As atividades de aplicação estão totalmente paralisadas?', 'campo'),

  // 6. Pátio de descontaminação (bloco da aplicação aérea)
  sn('C-6.1', 'Existe pátio de descontaminação?', 'campo', AEREA),
  sn('C-6.2', 'Funcionalidade conforme IN MAPA nº 02/2008?', 'campo', { se: 'C-6.1' }),
  sn('C-6.2.1', 'A capacidade operacional está conforme o Anexo 6 da IN MAPA nº 02/2008?', 'campo', { se: 'C-6.1' }),
  sn('C-6.2.2', 'O pátio e o sistema de oxidação estão funcionais e íntegros?', 'campo', { se: 'C-6.1' }),
  sn('C-6.3', 'Possui Licença de Operação do Pátio de Descontaminação?', 'campo', { se: 'C-6.1' }),
  tx('C-6.4.1', 'Local de lavagem das aeronaves: estado do piso', 'campo', { ...AEREA }),
  sn('C-6.4.2', 'Local de lavagem das aeronaves: existem rachaduras no piso?', 'campo', AEREA),
  sn('C-6.4.3', 'A tubulação de destino dos efluentes se encontra em bom estado?', 'campo', AEREA),
  sn('C-6.4.4', 'Existe tubulação específica para água pluvial, independente do efluente de lavagem?', 'campo', AEREA),

  // 7. Embalagens vazias e destinação final
  sn('C-7.1', 'Há armazenamento de embalagens vazias?', 'campo'),
  tx('C-7.1.1', 'Volume total armazenado de embalagens vazias (quantidade e unidade)', 'campo', { se: 'C-7.1' }),
  sn('C-7.2', 'Existem embalagens vazias descartadas de forma irregular (arredores da sede, áreas de RL/APP/corpos d\'água, lavouras, estradas etc.)?', 'campo'),
  tx('C-7.2.1', 'Local do descarte irregular', 'campo', { se: 'C-7.2' }),
  sn('C-7.3', 'Há indícios de embalagens enterradas ou queimadas?', 'campo'),
  sn('C-7.4', 'Possui comprovantes de devolução para logística reversa (nota fiscal, recibo InPEV, notas fiscais de entrega)?', 'campo'),
  sn('C-7.5', '(Produtos/embalagens com registro no Brasil em situação ilegal ou irregular) O autuado foi notificado a efetuar a entrega em centrais ou postos autorizados?', 'campo'),
  sn('C-7.6', '(Produtos/embalagens sem registro no Brasil e de origem estrangeira) Foram encaminhados à Polícia Civil?', 'campo'),
  sn('C-7.6.1', 'Em caso de impossibilidade, foi realizada coleta de amostra, apreensão e depósito com o autuado, com notificação para destruição ambientalmente correta?', 'campo', { se: 'C-7.6', vale: ['Não'] }),
  sn('C-7.7', '(Produtos/embalagens sem registro no Brasil e de origem nacional: falsificados etc.) Foi realizada a apreensão e depósito com o autuado, com notificação para destruição ambientalmente correta?', 'campo'),
  sn('C-7.8', 'O autuado designado como fiel depositário foi orientado a manter o material em depósito adequado (NBR 9843/2013)?', 'campo'),
  sn('C-7.8.1', 'Na ausência de depósito adequado, foram determinadas condições mínimas de armazenamento (local coberto, ventilado, impermeável, acesso restrito, separado de alimentos etc.)?', 'campo'),
];

/** Toda pergunta Sim/Não/N.A. da fase prévia ganha, logo depois, "fonte da conferência" (ids `<id>@fonte` e `<id>@fonte.outra`), opcional e só se já respondida. */
export const ITENS_INSPECAO: readonly ItemPop[] = BASE.flatMap((it) => it.fase === 'previa' && it.tipo === 'simnao' ? [
  it,
  li(`${it.id}@fonte`, 'Fonte da conferência', 'previa', o(...FONTES_CONFERENCIA), { se: it.id, vale: ['Sim', 'Não'] }),
  tx(`${it.id}@fonte.outra`, 'Fonte da conferência (especifique)', 'previa', { se: `${it.id}@fonte`, vale: [OUTRA_FONTE] }),
] : [it]);

/** Tipos de dano que trazem POP e Inspeção de agrotóxicos juntos (sugeridos no planejamento do ponto). */
export const TIPOS_DANO_AGROTOXICO = ['Desmatamento químico', 'Aplicação irregular de agrotóxico'] as const;

/** A inspeção é automática nesses tipos de dano; em qualquer outro, só se o ponto a adicionar (`inspecaoAtiva`). */
export const inspecaoAtiva = (p: Pick<Ponto, 'tipoDano' | 'inspecaoAtiva'>): boolean =>
  TIPOS_DANO_AGROTOXICO.some((t) => norm(t) === norm(p.tipoDano ?? '')) || p.inspecaoAtiva === true;

/** Há resposta (prévia ou de campo) no formulário? Remover só é livre quando não há. */
export const inspecaoVazia = (p: Pick<Ponto, 'inspecao' | 'conferenciaPrevia'>): boolean =>
  Object.keys(p.inspecao ?? {}).length === 0 && Object.keys(p.conferenciaPrevia ?? {}).length === 0;

/** Sugestões de resposta prévia tiradas do ponto e da consulta automática (CAR): "sugerido, conferir", nunca resposta final. */
export function sugestoesInspecao(p: Pick<Ponto, 'situacaoCar' | 'car' | 'consultas'>): Record<string, string> {
  const s: Record<string, string> = {};
  const car = p.consultas?.car;
  if (p.situacaoCar === 'com-car' || car?.estado === 'encontrado') s['C-1.11'] = 'Sim';
  else if (p.situacaoCar === 'sem-car' || car?.estado === 'vazio') s['C-1.11'] = 'Não';
  const numero = p.car?.trim() || (car?.estado === 'encontrado' ? car.detalhe : undefined);
  if (numero && s['C-1.11'] === 'Sim') s['C-1.11.1'] = numero;
  return s;
}
