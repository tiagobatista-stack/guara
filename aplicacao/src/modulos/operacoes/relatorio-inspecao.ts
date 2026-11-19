// Texto do relatório da Inspeção de agrotóxicos: interpreta as frases de relatorio-frases-inspecao.ts sobre as respostas do ponto
// (campo prevalece sobre a conferência prévia). Sem IA e sem inferência: o que falta vira [PENDENTE: ...]; prévia × campo diferentes, [DIVERGÊNCIA: ...].

import { DIVERGENCIA } from './relatorio-frases.ts';
import { ITENS_INSPECAO } from './inspecao-agrotoxicos.ts';
import type { Ponto } from './modelo.ts';
import { itensAplicaveis, marcadas, respondido, type Caracterizacao } from './pop-supressao.ts';
import {
  APLICACAO, APLICACAO_PENDENTE, COMPLEMENTO, DIVERGENCIA_PREVIA, FONTE_PREVIA, FONTES_PREVIA, FRAGMENTOS, HIDROMETRO_VOLUME, INSPECAO, INSPECAO_NAO_PREENCHIDA,
  NAO_APRESENTADOS, NAO_IDENTIFICADO_PREVIA, NEGATIVA, ORGAO_EMBARGO, PREVIA, type Agrupada, type QuestaoInspecao,
} from './relatorio-frases-inspecao.ts';
import { comPonto, dataPorExtenso, listaComE, minuscula1, norm, pendente, preencher } from './relatorio-util.ts';

const ITEM = new Map(ITENS_INSPECAO.map((i) => [i.id, i]));
const MARCADOR = /\{(C-[\d.]+)\}/g;
const semInterrogacao = (t: string) => t.replace(/\?$/, '').trim();
const TITULO_DOCUMENTOS = 'Documentação técnica e registros';
const TITULO_CADASTROS = 'Cadastros, licenciamento e autorizações';
const PERSONALIZADAS = new Set(['C-5.4.1', 'C-5.7', 'C-5.10.1']);

interface Nao { nome: string; conjunto?: string }
/** Estado "Não" de documento ou registro, por fonte (previa) ou geral (campo). */
const entradas = (itens: readonly Nao[]): string[] => {
  const simples = itens.filter((i) => !i.conjunto).map((i) => i.nome);
  const conjuntos = [...new Set(itens.filter((i) => i.conjunto).map((i) => i.conjunto!))].map((modelo) => preencher(modelo, { lista: listaComE(itens.filter((i) => i.conjunto === modelo).map((i) => i.nome)) }));
  return [...simples, ...conjuntos];
};

/** Uma entrada por grupo da inspeção (parágrafos do relatório). `car`: resultado da consulta automática do CAR, se feita. */
export function frasesDaInspecao(ponto: Pick<Ponto, 'inspecao' | 'conferenciaPrevia' | 'tipoDano'>, car?: 'encontrado' | 'vazio'): string[] {
  const previa: Caracterizacao = ponto.conferenciaPrevia ?? {};
  const campo: Caracterizacao = ponto.inspecao ?? {};
  if (![...Object.values(previa), ...Object.values(campo)].some(respondido)) return [INSPECAO_NAO_PREENCHIDA];

  const efetivas: Caracterizacao = { ...previa };
  for (const [id, r] of Object.entries(campo)) if (respondido(r)) efetivas[id] = r;
  const aplicaveis = new Set(itensAplicaveis(efetivas, ITENS_INSPECAO).map((i) => i.id));
  const vals = (id: string) => (aplicaveis.has(id) ? marcadas(efetivas[id]).filter((t) => t.trim() !== '') : []);
  const txt = (id: string) => vals(id)[0]?.trim() ?? '';
  const soPrevia = (id: string) => !respondido(campo[id]) && respondido(previa[id]);
  const diverge = (id: string) => ITEM.get(id)?.fase === 'previa' && respondido(previa[id]) && respondido(campo[id])
    && [...marcadas(previa[id])].sort().join('|') !== [...marcadas(campo[id])].sort().join('|');
  const aplicacaoIrregular = norm(ponto.tipoDano ?? '') === 'aplicacao irregular de agrotoxico';

  /** Fonte da conferência prévia do item: "consulta ao SIGA" etc. (vazia se não registrada). */
  const fonte = (id: string): string => {
    const rotulo = txt(`${id}@fonte`) || marcadas(previa[`${id}@fonte`])[0] || '';
    const modelo = FONTES_PREVIA[rotulo];
    return modelo ? preencher(modelo, { texto: marcadas(previa[`${id}@fonte.outra`])[0]?.trim() ?? '' }).replace(/^fonte:\s*$/, '') : '';
  };
  const prefixo = (f: string) => preencher(PREVIA, { fonte: f ? preencher(FONTE_PREVIA, { fonte: f }) : '' });

  const extras: string[] = []; // pendências de subperguntas obrigatórias
  const complemento = (id: string): string => {
    if (!aplicaveis.has(id)) return '';
    const item = ITEM.get(id)!;
    const v = txt(id);
    if (id === 'C-2.3.1') return v === 'Outro' ? txt('C-2.3.2') : v;
    if (item.tipo === 'simnao') {
      if (!v && item.onde === 'campo' && !item.opcional) extras.push(pendente(`${semInterrogacao(item.texto)} (${id})`));
      const modelo = FRAGMENTOS[id]?.[v] ?? QUESTAO.get(id)?.frases?.[v] ?? '';
      return id === 'C-2.7.1' ? preencher(modelo, { volume: txt('C-2.7.2') ? preencher(HIDROMETRO_VOLUME, { v: txt('C-2.7.2') }) : '' }) : expandir(modelo);
    }
    if (!v) return '';
    const bruto = item.tipo === 'data' ? dataPorExtenso(v) : v;
    return COMPLEMENTO[id] ? preencher(COMPLEMENTO[id], { v: bruto }) : bruto;
  };
  const expandir = (modelo: string) => modelo.replace(MARCADOR, (_, id: string) => complemento(id));

  const naoApresentados: Nao[] = [];
  const naoIdentificados = new Map<string, Nao[]>(); // por fonte
  const registrarNao = (id: string, nome: string, conjunto?: string) => {
    if (soPrevia(id)) naoIdentificados.set(fonte(id), [...(naoIdentificados.get(fonte(id)) ?? []), { nome, conjunto }]);
    else naoApresentados.push({ nome, conjunto });
  };

  const saidas = INSPECAO.map((g) => {
    const out: string[] = [];
    const negativas: string[] = [];
    const referenciados = new Set<string>();
    for (const q of g.questoes) for (const f of [...Object.values(q.frases ?? {}), ...Object.values(q.lista ?? {})]) for (const m of f.matchAll(MARCADOR)) referenciados.add(m[1]);
    for (const q of g.questoes) if (q.livre) for (const m of q.livre.matchAll(MARCADOR)) referenciados.add(m[1]);
    const temaDe = (id: string, q?: QuestaoInspecao) => q?.nome ?? semInterrogacao(ITEM.get(id)!.texto);
    const divergencia = (id: string, tema: string) => preencher(DIVERGENCIA_PREVIA, { tema, campo: marcadas(campo[id]).join('; '), previa: marcadas(previa[id]).join('; ') });

    const personalizada = (id: string) => {
      if (id === 'C-5.4.1') {
        const nome = txt('C-5.4.1'); const pa = txt('C-5.4.2');
        if (nome || pa) out.push(preencher(APLICACAO.produtos, { produtos: nome ? nome + (pa ? preencher(APLICACAO.principioAtivo, { v: pa }) : '') : preencher(APLICACAO.soPrincipioAtivo, { v: pa }) }));
      } else if (id === 'C-5.7') {
        const dose = txt('C-5.7'); const unidade = txt('C-5.7.1');
        const area = txt('C-5.8') ? preencher(APLICACAO.area, { v: txt('C-5.8') }) : '';
        const data = txt('C-5.9') ? preencher(APLICACAO.data, { v: dataPorExtenso(txt('C-5.9')) + (txt('C-5.9.1') ? preencher(APLICACAO.horario, { v: txt('C-5.9.1') }) : '') }) : '';
        if (dose) out.push(preencher(APLICACAO.comDose, { dose: unidade ? `${dose} ${unidade}` : dose, area, data }));
        else if (area || data) out.push(preencher(APLICACAO.semDose, { area, data }));
      } else {
        const partes = [txt('C-5.10.1') && preencher(APLICACAO.vento, { v: txt('C-5.10.1') }), txt('C-5.10.2') && preencher(APLICACAO.temperatura, { v: txt('C-5.10.2') }), txt('C-5.10.3') && preencher(APLICACAO.umidade, { v: txt('C-5.10.3') })].filter(Boolean) as string[];
        if (partes.length) out.push(preencher(APLICACAO.meteorologia, { lista: listaComE(partes) }));
      }
    };

    for (const q of g.questoes) {
      const id = q.id;
      if (referenciados.has(id) || !aplicaveis.has(id) || id === 'C-4.1.1') continue;
      if (PERSONALIZADAS.has(id)) { personalizada(id); continue; }
      const item = ITEM.get(id)!;
      const marcas = vals(id);
      if (marcas.length === 0) {
        if (!item.opcional && item.onde === 'campo') out.push(pendente(`${semInterrogacao(item.texto)} (${id})`));
        continue;
      }
      if (diverge(id)) { out.push(divergencia(id, temaDe(id, q))); continue; }
      if (id === 'C-1.11' && car) {
        if ((marcas[0] === 'Sim') !== (car === 'encontrado')) {
          out.push(preencher(DIVERGENCIA, { tema: 'Cadastro Ambiental Rural (CAR)', campo: marcas[0] === 'Sim' ? 'possui CAR' : 'não possui CAR', base: car === 'encontrado' ? 'CAR identificado' : 'nenhum CAR identificado' }));
        }
        continue; // coincide: sai só a frase da consulta
      }
      const via = soPrevia(id);
      const dizer = (modelo: string) => { const f = comPonto(expandir(modelo)); return via ? prefixo(fonte(id)) + minuscula1(f) : f; };

      if (id === 'C-2.13') { embargos(marcas[0], q); continue; }
      if (q.livre) { out.push(comPonto(preencher(q.livre, { resposta: marcas[0].trim() }))); continue; }

      const chaveLista = id === 'C-4.1' ? 'C-4.1.1' : q.lista ? id : undefined;
      for (const m of id === 'C-4.1' || !q.lista ? marcas : []) {
        const modelo = q.frases?.[m];
        if (q.tipo === 'D' && m === 'Não') { registrarNao(id, q.nome ?? temaDe(id, q)); continue; }
        if (q.tipo === 'P' && m === 'Não') { out.push(pendente(`${semInterrogacao(item.texto)} (${id})`)); continue; }
        if (modelo) {
          const exigidos = q.pendente ? [...(q.frases?.Sim ?? '').matchAll(MARCADOR)].map((x) => x[1]).filter((x) => ITEM.get(x)?.tipo !== 'simnao') : [];
          if (m === 'Sim' && exigidos.some((x) => !txt(x))) out.push(pendente(q.pendente!.texto));
          else out.push(dizer(modelo));
        }
        const neg = q.negativas?.[m];
        if (neg) negativas.push(neg);
      }
      if (chaveLista) {
        const rotulos = vals(chaveLista);
        const nomes: string[] = [];
        for (const r of rotulos) {
          const modelo = q.lista?.[r];
          if (modelo === undefined) {
            const neg = q.negativas?.[r];
            if (neg) negativas.push(neg);
          } else if (modelo.includes('{')) {
            const extra = expandir(modelo);
            if (extra) nomes.push(extra); else out.push(pendente('especificar a outra motivação da aplicação (C-5.5.1)'));
          } else nomes.push(modelo);
        }
        if (nomes.length) out.push(comPonto(preencher(q.listaFrase!, { lista: listaComE(nomes) })));
      }
    }

    function embargos(resposta: string, q: QuestaoInspecao) {
      if (resposta === 'Não') { out.push(q.frases!.Não); return; }
      if (resposta !== 'Sim') return;
      let algum = false;
      for (let k = 1; k <= 10; k++) {
        const n = txt(`C-2.13.${k}.1`); const org = txt(`C-2.13.${k}.2`); const outro = txt(`C-2.13.${k}.3`);
        if (!n && !org) continue;
        algum = true;
        if (!n) out.push(pendente(`número do embargo ${k} (C-2.13.${k}.1)`));
        else if (!org) out.push(pendente(`órgão do embargo n.º ${n} (C-2.13.${k}.2)`));
        else if (org === 'Outro' && !outro) out.push(pendente(`especificar o órgão do embargo n.º ${n} (C-2.13.${k}.3)`));
        else out.push(preencher(q.frases!.Sim, { numero: n, orgao: preencher(ORGAO_EMBARGO[org] ?? org, { texto: outro }) }));
      }
      if (!algum) out.push(pendente('número e órgão do embargo (C-2.13.1.1 e C-2.13.1.2)'));
    }

    // Aplicação: o que faltar só vira pendência em "Aplicação irregular de agrotóxico".
    if (aplicacaoIrregular && g.titulo === 'Uso e aplicação') {
      for (const [id, descricao] of Object.entries(APLICACAO_PENDENTE)) if (aplicaveis.has(id) && vals(id).length === 0) out.push(pendente(`${descricao} (${id})`));
    }

    // Agrupadas: uma frase para vários itens.
    for (const a of g.agrupadas ?? []) agrupada(a);
    function agrupada(a: Agrupada) {
      const sims: { nome: string; fonte: string; via: boolean }[] = [];
      for (const [id, modelo] of Object.entries(a.itens)) {
        if (!aplicaveis.has(id)) continue;
        const item = ITEM.get(id)!;
        const marcas = vals(id);
        if (marcas.length === 0) { if (!item.opcional && item.onde === 'campo') out.push(pendente(`${semInterrogacao(item.texto)} (${id})`)); continue; }
        if (diverge(id)) { out.push(divergencia(id, semInterrogacao(item.texto))); continue; }
        const nome = expandir(modelo);
        if (marcas[0] === 'Sim') sims.push({ nome, fonte: fonte(id), via: soPrevia(id) });
        else if (marcas[0] === 'Não') {
          if (a.tipo === 'P') out.push(pendente(`${semInterrogacao(item.texto)} (${id})`));
          else registrarNao(id, a.conjunto ? semParenteses2(nome) : nome, a.conjunto);
        }
      }
      const campoSim = sims.filter((s) => !s.via).map((s) => s.nome);
      if (campoSim.length) out.push(preencher(a.sim, { lista: listaComE(campoSim) }));
      for (const f of [...new Set(sims.filter((s) => s.via).map((s) => s.fonte))]) {
        out.push(prefixo(f) + minuscula1(preencher(a.sim, { lista: listaComE(sims.filter((s) => s.via && s.fonte === f).map((s) => s.nome)) })));
      }
    }

    if (negativas.length) out.push(preencher(NEGATIVA, { lista: listaComE(negativas) }));
    return { titulo: g.titulo, out };
  });

  // Listas de "Não" valem para a inspeção toda e fecham grupos fixos.
  const documentos = saidas.find((s) => s.titulo === TITULO_DOCUMENTOS)!;
  if (naoApresentados.length) documentos.out.push(preencher(NAO_APRESENTADOS, { lista: listaComE(entradas(naoApresentados)) }));
  const cadastros = saidas.find((s) => s.titulo === TITULO_CADASTROS)!;
  for (const [f, itens] of naoIdentificados) cadastros.out.push(preencher(NAO_IDENTIFICADO_PREVIA, { fonte: f ? preencher(FONTE_PREVIA, { fonte: f }) : '', lista: listaComE(entradas(itens)) }));
  if (extras.length) documentos.out.push(...new Set(extras));
  return saidas.map((s) => s.out.join(' ')).filter((t) => t.trim() !== '');
}

const QUESTAO = new Map<string, QuestaoInspecao>(INSPECAO.flatMap((g) => g.questoes.map((q) => [q.id, q] as const)));
/** "Autorização Ambiental para desmatamento (n.º 1)" → nome sem o número, para a entrada conjunta da lista de "Não". */
const semParenteses2 = (t: string) => t.replace(/\s*\(n\.º [^)]*\)/, '').trim();
