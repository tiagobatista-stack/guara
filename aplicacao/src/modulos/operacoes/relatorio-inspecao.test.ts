// Relatório da inspeção de agrotóxicos: tipos E/D/I/C/P/X, listas de "Não", fonte da conferência, embargos em pares, pendências da aplicação e divergência.
// Dados fictícios (ponto FIC-). Cada caso fala de uma regra do arquivo de frases.

import { FONTES_CONFERENCIA, ITENS_INSPECAO, MAX_EMBARGOS } from './inspecao-agrotoxicos.ts';
import { caracterizacaoValida } from './pop-supressao.ts';
import { FONTES_PREVIA } from './relatorio-frases-inspecao.ts';
import { frasesDaInspecao } from './relatorio-inspecao.ts';
import { chavesSobrando, textoDoRelatorio } from './relatorio.ts';
import type { Operacao, Ponto } from './modelo.ts';

type R = Record<string, string | string[]>;
const gerar = (campo: R = {}, previa: R = {}, tipoDano = 'Desmatamento químico', car?: 'encontrado' | 'vazio') =>
  frasesDaInspecao({ inspecao: campo, conferenciaPrevia: previa, tipoDano }, car).join('\n');

describe('relatório da inspeção', () => {
  it('sem resposta nenhuma: um marcador só', () => {
    expect(frasesDaInspecao({ tipoDano: 'Desmatamento químico' })).toEqual(['[PENDENTE: inspeção de agrotóxicos não preenchida]']);
  });

  it('as fontes da conferência da lista fechada têm texto de relatório', () => {
    expect(Object.keys(FONTES_PREVIA)).toEqual([...FONTES_CONFERENCIA]);
  });

  it('tipo E: Sim → frase; Não → "Não houve constatação de …" agrupada; tipo I igual', () => {
    const t = gerar({ 'C-1.2': 'Sim', 'C-4.9': 'Não', 'C-7.3': 'Não', 'C-4.3': 'Não', 'C-6.1': 'Sim' });
    expect(t).toContain('Constatou-se placa de identificação');
    expect(t).toContain('Não houve constatação de produtos vencidos e sistema de ponto de abastecimento.');
    expect(t).toContain('Não houve constatação de indícios de embalagens enterradas ou queimadas.');
    expect(t).not.toContain('pátio de descontaminação'); // sem aplicação aérea
  });

  it('documento ausente: nunca "Não houve constatação"; lista própria, uma frase no fim da documentação', () => {
    const t = gerar({ 'C-3.1': 'Não', 'C-3.2': 'Sim', 'C-3.5': 'Não', 'C-1.15': 'Não' });
    expect(t).toContain('Não foram apresentados os seguintes documentos: contrato de arrendamento, contratos de prestação de serviços para pulverização de agrotóxicos e Relatório operacional (IN MAPA n.º 02/2008).');
    expect(t).toContain('Constatou-se a apresentação de contratos de prestação de serviços para outras atividades.');
    expect(t).not.toMatch(/Não houve constatação de (contrato|Relat)/);
    expect(t.match(/Não foram apresentados/g)).toHaveLength(1);
  });

  it('registro só prévio com "Não": "Na conferência prévia (fonte), não foi identificado registro de …", por fonte', () => {
    const t = gerar({}, { 'C-2.9': 'Não', 'C-2.9@fonte': 'SIGA', 'C-2.10': 'Não', 'C-2.10@fonte': 'SISDEV/INDEA', 'C-2.5': 'Não', 'C-2.5@fonte': 'SIGA' });
    expect(t).toContain('Na conferência prévia (consulta ao SIGA), não foi identificado registro de Declaração de Limpeza da Área (DLA) e estabelecimento no MAPA.');
    expect(t).toContain('Na conferência prévia (consulta ao SISDEV/INDEA), não foi identificado registro de estabelecimento no INDEA.');
  });

  it('fonte "Outra": entra como "(fonte: texto)"; sem texto, sem parêntese', () => {
    const com = gerar({}, { 'C-2.2': 'Não', 'C-2.2@fonte': 'Outra (especificar)', 'C-2.2@fonte.outra': 'ofício 12/2026' });
    expect(com).toContain('Na conferência prévia (fonte: ofício 12/2026), não foi identificado registro de empreendimento no Cadastro Técnico Federal (CTF).');
    const sem = gerar({}, { 'C-2.2': 'Não', 'C-2.2@fonte': 'Outra (especificar)' });
    expect(sem).toContain('Na conferência prévia, não foi identificado registro');
  });

  it('resposta só prévia positiva leva o prefixo e a primeira letra em minúscula', () => {
    const t = gerar({}, { 'C-2.6': 'Sim', 'C-2.6@fonte': 'Sistema de outorga' });
    expect(t).toContain('Na conferência prévia (consulta ao sistema de outorga), constatou-se a existência de outorga de uso da água');
  });

  it('prévia com frase que abre por palavra de uma letra: "o empreendimento", não "O empreendimento"', () => {
    const t = gerar({}, { 'C-2.2': 'Sim', 'C-2.2@fonte': 'Consulta pública CTF/IBAMA', 'C-2.2.1': '1234567', 'C-2.2.2': '21-47' });
    expect(t).toContain('Na conferência prévia (consulta pública ao CTF/IBAMA), o empreendimento está registrado no Cadastro Técnico Federal (CTF), inscrição n.º 1234567, atividade(s) de código 21-47.');
  });

  it('campo prevalece; se diferir da prévia, [DIVERGÊNCIA] e nenhuma das duas frases', () => {
    const t = gerar({ 'C-2.6': 'Não' }, { 'C-2.6': 'Sim' });
    expect(t).toContain('[DIVERGÊNCIA: outorga de uso da água ou declaração de uso insignificante — em campo: Não; conferido antes: Sim]');
    expect(t).not.toContain('Constatou-se a existência de outorga');
    expect(gerar({ 'C-2.6': 'Sim' }, { 'C-2.6': 'Sim' })).toContain('Constatou-se a existência de outorga');
  });

  it('CAR: coincidindo com a consulta, só a frase da consulta; divergindo, [DIVERGÊNCIA]', () => {
    expect(gerar({}, { 'C-1.11': 'Sim' }, 'Desmatamento químico', 'encontrado')).not.toContain('Cadastro Ambiental Rural');
    expect(gerar({}, { 'C-1.11': 'Sim' }, 'Desmatamento químico', 'vazio')).toContain('[DIVERGÊNCIA: Cadastro Ambiental Rural (CAR)');
  });

  it('licença: tipo, número e validade por extenso; faltando, [PENDENTE]; "Outro" usa o texto', () => {
    const ok = gerar({}, { 'C-2.3': 'Sim', 'C-2.3.1': 'Outro', 'C-2.3.2': 'LP', 'C-2.3.3': '123/2026', 'C-2.3.4': '2027-03-05' });
    expect(ok).toContain('o empreendimento possui Licença Ambiental (LP), n.º 123/2026, válida até 5 de março de 2027.');
    expect(gerar({}, { 'C-2.3': 'Sim', 'C-2.3.1': 'LO' })).toContain('[PENDENTE: tipo, número e validade da licença ambiental (C-2.3.1, C-2.3.3 e C-2.3.4)]');
  });

  it('autorizações: Sim em lista com número; Não numa entrada só "Autorização Ambiental para a, b e c"', () => {
    const t = gerar({}, { 'C-2.4.1': 'Sim', 'C-2.4.1.1': '77', 'C-2.4.2': 'Não', 'C-2.4.3': 'Não', 'C-2.4.1@fonte': 'SIGA', 'C-2.4.2@fonte': 'SIGA', 'C-2.4.3@fonte': 'SIGA' });
    expect(t).toContain('Na conferência prévia (consulta ao SIGA), constatou-se a existência de Autorização Ambiental para desmatamento (n.º 77).');
    expect(t).toContain('não foi identificado registro de Autorização Ambiental para supressão da vegetação nativa e exploração florestal.');
  });

  it('tipo C: "Não" tem frase própria e não entra em lista', () => {
    const t = gerar({ 'C-4.1': 'Não', 'C-4.6': 'Sim' });
    expect(t).toContain('Constatou-se que o armazenamento não segue os critérios da NBR 9843/2013 da ABNT.');
    expect(t).toContain('Constatou-se que as embalagens são manuseadas com o uso de EPI adequados.');
  });

  it('tipo P: "Não" vira pendência; N.A. não gera nada', () => {
    const t = gerar({ 'C-1.3': 'Não', 'C-1.16': 'N.A.', 'C-1.7': 'Sim', 'C-1.7.1': 'Sim' });
    expect(t).toContain('[PENDENTE: Fotografia georreferenciada com data e hora registrada (usar aplicativos específicos) (C-1.3)]');
    expect(t).toContain('Foi solicitada a atualização cadastral do responsável no SIGA, com notificação do responsável e prazo estabelecido.');
    expect(t).not.toContain('fotografados ou copiados');
  });

  it('embargos de outros órgãos: Não → frase própria; Sim → uma frase por par, "Outro" com o texto; par incompleto → pendência', () => {
    expect(gerar({ 'C-2.13': 'Não' })).toContain('Em campo, não foram identificados nem relatados embargos de outros órgãos (IBAMA, ICMBio ou decisão judicial) incidentes sobre a propriedade.');
    const t = gerar({ 'C-2.13': 'Sim', 'C-2.13.1.1': '10/2026', 'C-2.13.1.2': 'IBAMA', 'C-2.13.2.1': '5', 'C-2.13.2.2': 'Outro', 'C-2.13.2.3': 'Justiça Federal', 'C-2.13.3.1': '8' });
    expect(t).toContain('Foi identificado embargo n.º 10/2026, do IBAMA.');
    expect(t).toContain('Foi identificado embargo n.º 5, de Justiça Federal.');
    expect(t).toContain('[PENDENTE: órgão do embargo n.º 8 (C-2.13.3.2)]');
    expect(gerar({ 'C-2.13': 'Sim' })).toContain('[PENDENTE: número e órgão do embargo');
  });

  it('até 10 embargos por ponto', () => {
    expect(MAX_EMBARGOS).toBe(10);
    const resp: R = { 'C-2.13': 'Sim' };
    for (let k = 1; k <= 10; k++) { resp[`C-2.13.${k}.1`] = String(k); resp[`C-2.13.${k}.2`] = k % 2 ? 'ICMBio' : 'Decisão judicial'; }
    expect(caracterizacaoValida(resp, ITENS_INSPECAO)).toBe(true);
    expect(gerar(resp).match(/Foi identificado embargo/g)).toHaveLength(10);
    expect(caracterizacaoValida({ 'C-2.13.11.1': '1' }, ITENS_INSPECAO)).toBe(false);
  });

  it('aplicação: pendências só em "Aplicação irregular de agrotóxico"; em desmatamento químico campo vazio não gera nada', () => {
    const parcial: R = { 'C-5.3': 'talhão 4', 'C-5.4.1': 'Glifosato Fic', 'C-5.7': '2', 'C-5.7.1': 'L/ha' };
    const irregular = gerar(parcial, {}, 'Aplicação irregular de agrotóxico');
    expect(irregular).toContain('A aplicação ocorria, ou ocorreu recentemente, em: talhão 4.');
    expect(irregular).toContain('Os produtos aplicados, ou em aplicação, eram: Glifosato Fic.');
    expect(irregular).toContain('Registrou-se a aplicação com dosagem de 2 L/ha.');
    expect(irregular).toContain('[PENDENTE: área aplicada (ha) (C-5.8)]');
    expect(irregular).toContain('[PENDENTE: data da aplicação (C-5.9)]');
    expect(irregular).toContain('[PENDENTE: princípio ativo dos produtos aplicados (C-5.4.2)]');
    const quimico = gerar(parcial, {}, 'Desmatamento químico');
    expect(quimico).not.toContain('PENDENTE: área aplicada');
    expect(gerar(parcial, {}, 'aplicacao irregular de agrotoxico')).toContain('PENDENTE: área aplicada');
  });

  it('aplicação completa: dose, área, data com horário e meteorologia em frases únicas', () => {
    const t = gerar({ 'C-5.7': '2,5', 'C-5.7.1': 'L/ha', 'C-5.8': '40', 'C-5.9': '2026-09-12', 'C-5.9.1': '8h', 'C-5.10.1': 'fraco', 'C-5.10.2': '31', 'C-5.10.3': '45' });
    expect(t).toContain('Registrou-se a aplicação com dosagem de 2,5 L/ha, em área de 40 ha, em 12 de setembro de 2026, às 8h.');
    expect(t).toContain('As condições meteorológicas eram: vento fraco, temperatura de 31 °C e umidade de 45%.'.replace('As', 'No momento da aplicação, as'));
  });

  it('aeronaves e pátio só aparecem com aplicação aérea', () => {
    expect(gerar({ 'C-5.2': 'Não' })).not.toContain('Certificado de Operador Aéreo');
    const t = gerar({ 'C-5.2': 'Sim', 'C-5.2.1': 'Sim', 'C-3.6': 'Não', 'C-3.7': 'Sim', 'C-6.1': 'Sim', 'C-6.2': 'Não' });
    expect(t).toContain('registro de aplicação de agrotóxicos por via aérea, com o operador aéreo identificado no auto de inspeção.');
    expect(t).toContain('Não foram apresentados os seguintes documentos: Certificado de Operador Aéreo (COA).');
    expect(t).toContain('Na aplicação aérea, constatou-se a apresentação de Certificado de Aeronavegabilidade');
    expect(t).toContain('O pátio de descontaminação não funciona conforme a IN MAPA n.º 02/2008.');
  });

  it('campo obrigatório sem resposta vira [PENDENTE] com o id', () => {
    expect(gerar({ 'C-4.1': 'Sim' })).toContain('[PENDENTE: Existem produtos vencidos (C-4.3)]');
  });

  it('nenhuma frase sai com marcador {…} sobrando, mesmo com todas as respostas "Sim"', () => {
    const todas: R = {};
    for (const it of ITENS_INSPECAO) {
      if (it.id.includes('@')) continue;
      todas[it.id] = it.tipo === 'simnao' ? 'Sim' : it.tipo === 'texto' ? 'x' : it.tipo === 'numero' ? '1' : it.tipo === 'data' ? '2026-09-12' : it.tipo === 'multipla' ? [it.opcoes![0].texto] : it.opcoes![0].texto;
    }
    for (const tipo of ['Desmatamento químico', 'Aplicação irregular de agrotóxico']) expect(chavesSobrando(gerar(todas, {}, tipo))).toEqual([]);
    expect(chavesSobrando(gerar({}, todas))).toEqual([]);
  });

  it('textoDoRelatorio inclui a inspeção só em ponto com inspeção ativa', () => {
    const base: Ponto = { id: 'p1', numero: 1, codigo: 'FIC-001', coordenada: { lat: -12.5, lon: -58.7 }, municipio: 'Juína', notas: '', demandas: [], situacao: 'planejado', dataVistoria: '2026-10-21', resultado: 'sim', viagem: 'v1' };
    const op = (p: Ponto): Operacao => ({ id: 'o1', nome: 'Op', criadaEm: '2026-10-22T13:00:00.000Z', viagens: [{ id: 'v1', equipe: 'A', integrantes: [], veiculos: [], notas: '' }], pontos: [p] }) as Operacao;
    const com = { ...base, tipoDano: 'Desmatamento químico' };
    expect(textoDoRelatorio(op(com), com)).toContain('inspeção de agrotóxicos não preenchida');
    expect(textoDoRelatorio(op(base), base)).not.toContain('inspeção de agrotóxicos');
    const ativa = { ...base, tipoDano: 'Cerca', inspecaoAtiva: true, inspecao: { 'C-1.2': 'Sim' } };
    expect(textoDoRelatorio(op(ativa), ativa)).toContain('Constatou-se placa de identificação');
  });
});
