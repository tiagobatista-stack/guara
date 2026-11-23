// Texto do relatório de vistoria de um ponto, montado só com as frases fixas de relatorio-frases.ts.
// Sem IA e sem inferência: o que não está registrado vira [PENDENTE: ...] ou [CONSULTA NÃO REALIZADA: ...].

import { formatarGms } from '../demandas/coordenadas.ts';
import { consultaDoGeo, diaLocal } from './consulta-bases.ts';
import { plural } from '../../compartilhado/plural.ts';
import { BASES_CONSULTA, type BaseConsulta, type ConsultaBase, type Operacao, type Ponto, type Viagem } from './modelo.ts';
import { inspecaoAtiva } from './inspecao-agrotoxicos.ts';
import { frasesDaInspecao, frasesDosLavrados } from './relatorio-inspecao.ts';
import { ITENS_POP, itensAplicaveis, marcadas, respondido, type Caracterizacao } from './pop-supressao.ts';
import {
  ABERTURA, AVISO_SEM_RESULTADO, CARACTERIZACAO, CONSULTAS, DIVERGENCIA, EROSAO, ESTRUTURA, FECHO_CONSULTAS, FONTES, NAO_REALIZADA, NAO_REALIZADAS, ORIGENS, PONTO, POP_NAO_PREENCHIDO, PROXIMIDADE, TI_UC_AMORTECIMENTO_VAZIOS,
  type Grupo, type Questao,
} from './relatorio-frases.ts';

import { comPonto, dataBr, dataPorExtenso, limparLegenda, listaComE, minuscula1, norm, pendente, preencher, semParenteses } from './relatorio-util.ts';
export { dataPorExtenso, listaComE };

// ---------- Consultas ----------

/** Registro da consulta; bioma e vegetação vêm de `geo` (consulta automática) quando não há registro próprio. */
export function consultaDe(p: Ponto, base: BaseConsulta): ConsultaBase | undefined {
  const c = p.consultas?.[base];
  if (c) return c;
  return p.geo && (base === 'bioma' || base === 'vegetacao') ? consultaDoGeo(p.geo, base) : undefined;
}

export const consultada = (c?: ConsultaBase): c is ConsultaBase => c?.estado === 'encontrado' || c?.estado === 'vazio';

function fraseDaConsulta(p: Ponto, base: BaseConsulta): string {
  const c = consultaDe(p, base);
  const modelo = CONSULTAS[base];
  if (!consultada(c)) return preencher(NAO_REALIZADA, { base: modelo.base });
  if (c.estado === 'vazio') return modelo.vazio;
  const proximas = base === 'embargos' || base === 'autos'
    ? (c.proximidade ?? []).map((x, i, todos) => preencher(PROXIMIDADE[base], {
      m: String(x.m),
      valor: x.texto + (i === todos.length - 1 && c.maisProximos ? `, e mais ${plural(c.maisProximos, 'registro próximo', 'registros próximos')}` : ''),
    }))
    : [];
  if (!c.detalhe?.trim() && proximas.length > 0) return proximas.join(' '); // só registro pontual: sem sobreposição
  const valor = c.detalhe?.trim() || pendente(`valor da consulta de ${modelo.base}`);
  if (proximas.length > 0) return [preencher(modelo.achou, { valor }), ...proximas].join(' ');
  if (base === 'vegetacao' && p.geo?.pretetita && p.geo.legenda && c.fonte === 'automatica') {
    return preencher(CONSULTAS.vegetacaoPreterita.achou, { valor: limparLegenda(p.geo.pretetita), usoAtual: limparLegenda(p.geo.legenda) });
  }
  return preencher(modelo.achou, { valor: base === 'vegetacao' ? limparLegenda(valor) : valor });
}

/** "Vegetação IBGE (1:250.000)" → "vegetação IBGE"; siglas ficam como estão. */
const nomeNaLista = (base: string) => base.replace(/\s*\(\d[^)]*\)/, '').split(' ').map((w) => (/^[A-Z0-9/()-]+$/.test(w) ? w : w.toLowerCase())).join(' ');

function frasesDasConsultas(p: Ponto): string[] {
  const protegidas = (['ti', 'uc', 'amortecimento'] as const).map((b) => consultaDe(p, b));
  const todasVazias = protegidas.every((c) => c?.estado === 'vazio');
  const exibidas = BASES_CONSULTA.filter((b) => !(todasVazias && (b === 'ti' || b === 'uc' || b === 'amortecimento')));
  const ausentes = exibidas.filter((b) => !consultada(consultaDe(p, b)));
  const frases: string[] = [];
  for (const b of exibidas) {
    if (ausentes.length >= 2 && ausentes.includes(b)) continue;
    frases.push(fraseDaConsulta(p, b));
    if (b === 'autos' && todasVazias) frases.push(TI_UC_AMORTECIMENTO_VAZIOS);
  }
  if (ausentes.length >= 2) frases.push(preencher(NAO_REALIZADAS, { lista: listaComE(ausentes.map((b) => nomeNaLista(CONSULTAS[b].base))) }));
  const feitas = (['bioma', 'vegetacao', 'car', 'embargos', 'autos', 'ti', 'uc', 'amortecimento'] as const).filter((b) => consultada(consultaDe(p, b)));
  if (feitas.length === 0) return frases;
  const dias = [...new Set(feitas.map((b) => diaLocal(consultaDe(p, b)!.quando)))].sort();
  const datas = dias.length === 1 ? dataBr(dias[0]) : `${dataBr(dias[0])} a ${dataBr(dias[dias.length - 1])}`;
  return [...frases, preencher(FECHO_CONSULTAS, { datas, lista: listaComE(feitas.map((b) => CONSULTAS[b].base)) })];
}

// ---------- Equipe, abertura e ponto ----------

function linhasDaEquipe(operacao: Operacao, viagem?: Viagem): string[] {
  const nomes = (viagem?.integrantes ?? []).filter((n) => n !== viagem?.motorista);
  if (nomes.length === 0) return [pendente('equipe técnica da viagem')];
  return nomes.map((nome) => {
    const dados = viagem?.pessoas?.[nome];
    const cargo = dados?.cargo?.trim() || preencher(ESTRUTURA.cargoVazio, { nome });
    const lotacao = dados?.lotacao?.trim() || operacao.setor?.trim() || preencher(ESTRUTURA.lotacaoVazia, { nome });
    return preencher(ESTRUTURA.linhaEquipe, { nome, cargo, lotacao });
  });
}

function abertura(operacao: Operacao, ponto: Ponto): string {
  const o = operacao.origemAlerta;
  const detalhe = o?.detalhe?.trim();
  const origem = !o || ((o.tipo === 'requisicao' || o.tipo === 'outra') && !detalhe)
    ? ABERTURA.origemVazia
    : preencher(ORIGENS[o.tipo], { orgao: detalhe ?? '', especificar: detalhe ?? '' });
  return preencher(ABERTURA.base, {
    data: ponto.dataVistoria ? dataPorExtenso(ponto.dataVistoria) : ABERTURA.dataVazia,
    origem,
    operacao: operacao.nome,
    unidade: operacao.setor?.trim() || ABERTURA.unidadeVazia,
    apoio: operacao.apoio?.trim() ? preencher(ABERTURA.apoio, { apoio: operacao.apoio.trim() }) : '',
  });
}

function frasesDoPonto(operacao: Operacao, ponto: Ponto): string[] {
  const numero = ponto.numero ?? operacao.pontos.findIndex((x) => x.id === ponto.id) + 1;
  const objeto = ponto.tipoDano?.trim() ? minuscula1(ponto.tipoDano.trim()) : ponto.notas.trim() ? minuscula1(ponto.notas.trim()) : PONTO.objetoVazio;
  return [
    preencher(PONTO.um, { numero: String(numero).padStart(2, '0'), objeto }),
    preencher(PONTO.localizacao, {
      inicio: operacao.inicio ? dataBr(operacao.inicio) : pendente('início da operação'),
      fim: operacao.fim ? dataBr(operacao.fim) : pendente('fim da operação'),
      municipio: ponto.municipio,
      gms: formatarGms(ponto.coordenada),
    }),
  ];
}

// ---------- Caracterização em campo ----------

const QUESTOES = new Map<string, Questao>(CARACTERIZACAO.flatMap((g) => g.questoes.map((q) => [q.id, q] as const)));
const ITEM = new Map(ITENS_POP.map((i) => [i.id, i]));

function frasesDoGrupo(g: Grupo, ponto: Ponto, aplicaveis: ReadonlySet<string>): string[] {
  const resp: Caracterizacao = ponto.caracterizacao ?? {};
  const vals = (id: string) => (aplicaveis.has(id) ? marcadas(resp[id]).filter((t) => t.trim() !== '') : []);
  const texto = (id: string) => vals(id)[0]?.trim() ?? '';
  const afirmativas: string[] = [];
  const negativas: string[] = [];
  const pulados = new Set<string>();
  const bioma = consultaDe(ponto, 'bioma');
  const car = consultaDe(ponto, 'car');

  const completar = (modelo: string, q: Questao): string => preencher(modelo, {
    'A-3.1': (() => { const v = vals('A-3.1')[0]; return v ? QUESTOES.get('A-3.1')?.frases?.[v] ?? '' : ''; })(),
    'A-4.1': texto('A-4.1') ? `, a saber: ${texto('A-4.1')}` : '',
    'A-5.1': texto('A-5.1') ? ` (dimensões estimadas: ${texto('A-5.1')})` : '',
    'A-7.1': texto('A-7.1') ? `, com dimensões estimadas de ${texto('A-7.1')}` : '',
    'A-20': vals('A-20').length ? ` (${listaComE(vals('A-20').map((t) => EROSAO[t] ?? t.toLowerCase()))})` : '',
    'A-21.1': vals('A-21.1').length ? ` (rebanho: ${listaComE(vals('A-21.1').map((t) => semParenteses(t).toLowerCase()))})` : '',
    fonte: q.fonte ? FONTES_DE(vals(q.fonte)[0]) : '',
    car: ponto.car?.trim() ? `, n.º ${ponto.car.trim()}` : '',
  });

  for (const q of g.questoes) {
    if (pulados.has(q.id) || q.id === 'A-3.1' || !aplicaveis.has(q.id)) continue;
    const item = ITEM.get(q.id)!;
    const marcas = vals(q.id);

    if (marcas.length === 0) {
      if (item.opcional) continue;
      if (q.id === 'A-1' && consultaDe(ponto, 'bioma')?.estado === 'encontrado') continue;
      afirmativas.push(pendente(q.id === 'A-12' ? 'tipo de alteração da camada superficial do solo (A-12)' : `${item.texto.replace(/\?$/, '')} (${q.id})`));
      continue;
    }

    if (q.id === 'A-1' && bioma?.estado === 'encontrado' && bioma.detalhe) {
      if (norm(marcas[0]) !== norm(bioma.detalhe)) afirmativas.push(preencher(DIVERGENCIA, { tema: 'bioma', campo: marcas[0], base: bioma.detalhe }));
      continue;
    }
    if (q.id === 'B-3' && consultada(car)) {
      const campoSim = marcas[0] === 'Sim';
      if (campoSim === (car.estado === 'encontrado')) continue;
      afirmativas.push(preencher(DIVERGENCIA, {
        tema: 'Cadastro Ambiental Rural (CAR)', campo: campoSim ? 'possui CAR' : 'não possui CAR', base: car.estado === 'encontrado' ? 'CAR identificado' : 'nenhum CAR identificado',
      }));
      continue;
    }
    if (q.id === 'A-13' || q.id === 'A-14') {
      const v13 = vals('A-13'); const v14 = vals('A-14');
      if (q.id === 'A-13' && v13.length === 1 && v14.length === 1 && v13[0] === v14[0] && QUESTOES.get('A-13')?.frases?.[v13[0]]) {
        afirmativas.push(completar(QUESTOES.get('A-13')!.frases![v13[0]], q).replace('destoca', 'destoca e enleiramento'));
        pulados.add('A-14');
        continue;
      }
    }

    if (q.livre) {
      const resposta = q.id === 'A-2' ? semParenteses(marcas[0]) : marcas[0].trim();
      afirmativas.push(comPonto(completar(preencher(q.livre, { resposta }), q)));
      continue;
    }

    if (q.lista) {
      const itens: string[] = [];
      let faltaEspecificar = false;
      for (const m of marcas) {
        const modelo = q.lista[m];
        if (modelo === undefined) continue;
        if (modelo.includes('{')) {
          const extra = texto(q.id === 'A-12' ? 'A-12.1' : 'A-24.1');
          if (extra) itens.push(extra); else faltaEspecificar = true;
        } else itens.push(modelo);
      }
      if (itens.length) afirmativas.push(comPonto(completar(preencher(q.listaFrase!, { lista: listaComE(itens) }), q)));
      if (faltaEspecificar) afirmativas.push(pendente(q.id === 'A-12' ? 'especificar outros recursos (A-12)' : 'especificar outras ameaças externas (A-24.1)'));
      if (q.id === 'A-5' && itens.length && !texto('A-5.1')) afirmativas.push(pendente('dimensões estimadas dos corpos hídricos (A-5.1)'));
    }

    for (const m of marcas) {
      const modelo = q.frases?.[m];
      if (modelo) {
        const frase = comPonto(completar(modelo, q));
        afirmativas.push(q.id === 'A-6' && texto('A-6.1') ? frase.replace(/\.$/, ` (${texto('A-6.1')}).`) : frase);
      }
      const neg = q.negativas?.[m];
      if (neg) negativas.push(neg);
    }
    if (q.id === 'A-7' && marcas.includes('Sim (açude, represa, cacimba, barragem de captação etc.)') && !texto('A-7.1')) {
      afirmativas.push(pendente('dimensões estimadas dos reservatórios artificiais (A-7.1)'));
    }
    if (q.id === 'A-6' && texto('A-6.1')) {
      const esp = texto('A-6.1');
      const citaTi = /\bTI\b|terra ind[ií]gena/i.test(esp) && consultaDe(ponto, 'ti')?.estado === 'vazio';
      const citaUc = /\bUC\b|unidade de conserva[cç][aã]o/i.test(esp) && consultaDe(ponto, 'uc')?.estado === 'vazio';
      if (citaTi || citaUc) {
        afirmativas.push(preencher(DIVERGENCIA, { tema: 'proteção legal', campo: esp, base: `sem sobreposição com ${citaTi && citaUc ? 'TI e UC' : citaTi ? 'Terras Indígenas' : 'Unidades de Conservação'}` }));
      }
    }
  }
  if (g.negativa && negativas.length) afirmativas.push(preencher(g.negativa, { lista: listaComE(negativas) }));
  return afirmativas;
}

const FONTES_DE = (fonte?: string) => (fonte && FONTES[fonte]) || '';

/** Revisão final: espaços, pontuação e palavras repetidas em sequência. */
export function revisar(t: string): string {
  let r = t.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.;])/g, '$1').replace(/\.{2,}/g, '.').replace(/,\./g, '.');
  for (let anterior = ''; anterior !== r;) { anterior = r; r = r.replace(/(^|[^\p{L}])(\p{L}+)[ \t]+\2(?![\p{L}])/giu, '$1$2'); }
  return r;
}

/** Marcadores de modelo que ficaram sem valor (deve ser vazio). */
export const chavesSobrando = (t: string): string[] => t.match(/\{[^{}]*\}/g) ?? [];

/**
 * Texto das constatações. Padrão: começa em CONSTATAÇÕES, sem equipe e sem as frases dos documentos lavrados (eles vão nos campos da capa do SIGA).
 * `completo`: inclui a equipe técnica e os lavrados (antigo formato).
 */
export function textoDoRelatorio(operacao: Operacao, ponto: Ponto, opcoes: { completo?: boolean } = {}): string {
  const completo = !!opcoes.completo;
  const viagem = operacao.viagens.find((v) => v.id === ponto.viagem);
  const aplicaveis = new Set(itensAplicaveis(ponto.caracterizacao).map((i) => i.id));
  const popIniciado = Object.values(ponto.caracterizacao ?? {}).some(respondido);
  const blocos = [
    abertura(operacao, ponto),
    [...frasesDoPonto(operacao, ponto), ...frasesDasConsultas(ponto)].join(' '),
    ...(popIniciado ? CARACTERIZACAO.map((g) => frasesDoGrupo(g, ponto, aplicaveis).join(' ')) : [POP_NAO_PREENCHIDO]),
    ...(inspecaoAtiva(ponto) ? frasesDaInspecao(ponto, consultada(consultaDe(ponto, 'car')) ? (consultaDe(ponto, 'car')!.estado as 'encontrado' | 'vazio') : undefined) : []),
    ...(completo ? [frasesDosLavrados(ponto)] : []),
  ].filter((b) => b.trim() !== '');
  const corpo = [
    ...(ponto.resultado === undefined ? [AVISO_SEM_RESULTADO, ''] : []),
    ...(completo ? [ESTRUTURA.equipe, ...linhasDaEquipe(operacao, viagem), ''] : []),
    ESTRUTURA.constatacoes, ...blocos.map((b) => `${ESTRUTURA.marcador}${b}`), '',
    ESTRUTURA.rodape,
  ].join('\n');
  return `${revisar(corpo)}\n`;
}

