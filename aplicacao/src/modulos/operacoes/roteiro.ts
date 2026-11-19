// Roteiro de vistoria imprimível de uma viagem, no modelo de docs/referencias/roteiro_exemplo.pdf: capa com a lista dos pontos
// e o que levar, uma folha por ponto (dados, QR do ponto no Google Maps, campo à mão, observações até as assinaturas) e, nos pontos com o bloco ativo,
// o verso "Caracterização do dano (POP)" com caixas de marcar (itens, opções e desvios de pop-supressao.ts).
// O navegador imprime ou salva em PDF. Só dados do próprio navegador; nada sai daqui.
// Não entram, de propósito: responsável/contato/documento (sem CPF nem contato de pessoa). CAR federal fica "—" (o GUARÁ não tem).

import { coordenadaValida, formatarDecimal, formatarGms } from '../demandas/coordenadas.ts';
import { SITUACOES_CAR, type Operacao, type Ponto, type Viagem } from './modelo.ts';
import { blocoPopAtivo, FONTE_GEO, FONTE_POP, ITENS_POP, popGeo, sugestoesPop, type ItemPop } from './pop-supressao.ts';
import { textoViagem } from './regras.ts';
import { inspecaoAtiva, ITENS_INSPECAO, SECOES_INSPECAO } from './inspecao-agrotoxicos.ts';
import { marcadas, respondido } from './pop-supressao.ts';

/** Link do ponto no Google Maps (6 casas, ponto decimal, lat,lon). */
export const urlDoMapa = ({ lat, lon }: { lat: number; lon: number }) =>
  `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lon.toFixed(6)}`;

export interface DemandaDoRoteiro { id: string; titulo: string; processo?: string }

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const CAIXA = '<span class="cx"></span>';
const linha = (mm = 35) => `<span class="ln" style="min-width:${mm}mm"></span>`;
const caixas = (...ops: string[]) => ops.map((o) => `<span class="op">${CAIXA} ${esc(o)}</span>`).join(' ');
const POSICAO = new Map(ITENS_POP.map((it, i) => [it.id, i]));

/** "Se "Não", pule para A-18": só as opções cujo destino pula pelo menos um item (ir para o próximo não é desvio). */
function desvios(it: ItemPop): string[] {
  const i = POSICAO.get(it.id)!;
  return (it.opcoes ?? []).filter((op) => op.vai && POSICAO.get(op.vai)! > i + 1).map((op) => `Se "${esc(op.texto)}", pule para ${esc(op.vai!)}.`);
}

function itemPop(it: ItemPop, sugeridas: readonly string[] = []): string {
  const titulo = `<b>${esc(it.id)}.</b> ${esc(it.texto)}${it.tipo === 'multipla' ? ' <i>(pode marcar mais de um)</i>' : ''}`;
  if (it.tipo === 'texto') return `<div class="it"><p>${titulo}</p><p>${linha(60)}</p></div>`;
  return `<div class="it"><p>${titulo}</p><p class="ops">${it.opcoes!.map((o) => `<span class="op">${CAIXA} ${sugeridas.includes(o.texto) ? `<b>${esc(o.texto)}</b> <i class="sug">(sugerido — conferir)</i>` : esc(o.texto)}</span>`).join(' ')}</p>${desvios(it).map((d) => `<p class="desvio">${d}</p>`).join('')}</div>`;
}

/** Formulário A numa página só (A4, 2 colunas, 8 pt), sem quebra dentro de uma questão. */
function versoPop(p: Ponto, rotuloPonto: string): string {
  const geo = popGeo(p);
  const sug = sugestoesPop(p);
  // A-2 só com as fitofisionomias do bioma sugerido (lista completa se o bioma for desconhecido); a caixa nunca vem marcada.
  const itens = ITENS_POP.filter((i) => i.formulario === 'A').map((i) => (i.id === 'A-2' ? { ...i, opcoes: geo.opcoes } : i));
  const sugeridas = (id: string) => (id === 'A-2' ? geo.fitos : sug[id] ? [sug[id]] : []);
  return `<article class="folha folha--pop"><header class="cab"><h2>${esc(rotuloPonto)} · ${esc(p.municipio)}</h2><p>Caracterização do dano (POP)</p></header>
<p class="peq">Formulário A, preencher em campo. Fonte: ${esc(FONTE_POP)}. Transcreva depois no ponto do GUARÁ. Não anote CPF, endereço ou nome do autuado.${geo.bioma || geo.fitos.length ? ` ${esc(FONTE_GEO)}` : ''}</p>
<div class="col">${itens.map((it) => itemPop(it, sugeridas(it.id))).join('')}</div></article>`;
}


// ---------- Inspeção de agrotóxicos (depois do POP) ----------
// Formato FIXO de 2 páginas (A4, 2 colunas, 7,5 pt), sem estimar tamanho: seções 1 a 3 na primeira página e 4 a 7 na segunda. Cada item é uma linha
// compacta ("id texto ☐ opção ☐ opção"); a pergunta condicional vem como linha própria marcada "se aplicável: se C-x = Sim". A conferência prévia
// entra como um parágrafo corrido. O bloco do ponto fecha sempre com 4 páginas (ficha + POP + 2, ou ficha + 2 + anotações), então fica par.
const MAX_EMBARGOS_IMPRESSOS = 3;
const SECOES_PAGINA_1 = 3;
export const PAGINAS_INSPECAO = 2;

function itemInspecao(it: ItemPop): string {
  const cond = it.se ? ` <i class="sa">(se aplicável: se ${esc(it.se.item)} = ${esc(it.se.vale.join(' ou '))})</i>` : '';
  const resposta = !it.opcoes ? linha(it.tipo === 'texto' ? 40 : 18) : caixas(...it.opcoes.map((o) => o.texto));
  const multi = it.tipo === 'multipla' ? ' <i>(mais de um)</i>' : it.tipo === 'data' ? ' <i>(dd/mm/aaaa)</i>' : '';
  return `<div class="it${it.se ? ' it--se' : ''}"><b>${esc(it.id)}</b> ${esc(it.texto)}${multi}${cond} ${resposta}</div>`;
}

const camposDaInspecao = () => ITENS_INSPECAO.filter((it) => it.fase === 'campo' && !(/^C-2\.13\.(\d+)\./.test(it.id) && Number(/^C-2\.13\.(\d+)\./.exec(it.id)![1]) > MAX_EMBARGOS_IMPRESSOS));

/** Resumo do que foi conferido antes (fase prévia), num parágrafo só: o respondido, com a fonte; vazio, uma frase dizendo isso. */
function resumoDaPrevia(p: Ponto): string {
  const prev = p.conferenciaPrevia ?? {};
  const partes = ITENS_INSPECAO.filter((it) => it.fase === 'previa' && !it.id.includes('@') && respondido(prev[it.id])).map((it) => {
    const f = marcadas(prev[`${it.id}@fonte`])[0];
    const fonte = f ? ` (${f === 'Outra (especificar)' ? marcadas(prev[`${it.id}@fonte.outra`])[0] ?? f : f})` : '';
    return `${esc(it.id)} ${esc(it.texto.replace(/\?$/, ''))}: <b>${esc(marcadas(prev[it.id]).join('; '))}</b>${esc(fonte)}`;
  });
  return `<p class="resumo"><b>Conferido antes:</b> ${partes.length ? partes.join(' · ') : 'conferência prévia não registrada no GUARÁ.'}</p>`;
}

/** Sempre 2 páginas. */
function paginasInspecao(p: Ponto, rotuloPonto: string): string[] {
  const paginas: string[][] = [[], []];
  let secao = 0;
  for (const it of camposDaInspecao()) {
    const pg = it.secao! <= SECOES_PAGINA_1 ? 0 : 1;
    if (it.secao !== secao) { secao = it.secao!; paginas[pg].push(`<h3>${secao}. ${esc(SECOES_INSPECAO[secao])}${secao === 6 || it.se?.item === 'C-5.2' ? ' <i>(aplicação aérea)</i>' : ''}</h3>`); }
    paginas[pg].push(itemInspecao(it));
  }
  paginas[1].push(`<h3>Observações da inspeção</h3>${'<p class="obs"><span class="ln"></span></p>'.repeat(4)}`);
  return paginas.map((itens, i) => `<article class="folha folha--pop folha--insp"><header class="cab"><h2>${esc(rotuloPonto)} · ${esc(p.municipio)}</h2><p>Inspeção de agrotóxicos, em campo (${i + 1}/${PAGINAS_INSPECAO})</p></header>
${i === 0 ? `<p class="peq">Marque em campo e transcreva depois no ponto do GUARÁ. Não anote nome, CPF/CNPJ, telefone, e-mail nem endereço de pessoas. Linhas "se aplicável": só se a condição indicada valer.</p>${resumoDaPrevia(p)}` : ''}<div class="col">${itens.join('')}</div></article>`);
}

/** O ponto tem bloco após a ficha (POP e/ou inspeção)? Então ele começa em página ímpar e fecha par. */
export const temBlocoApos = (p: Ponto) => blocoPopAtivo(p) || inspecaoAtiva(p);

/** Constatação de embargo só em ponto com demanda de embargo ligada. */
export const temDemandaDeEmbargo = (ligadas: readonly { titulo: string }[]) => ligadas.some((d) => /embargo/.test(d.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));

function folhaPonto(p: Ponto, n: number, total: number, demandas: readonly DemandaDoRoteiro[], nomeOperacao: string, rotuloViagem: string, qrSvg?: (texto: string) => string): { html: string; paginas: number } {
  const rotuloPonto = `Ponto ${String(p.numero ?? n).padStart(2, '0')}`;
  const ligadas = p.demandas.map((id) => demandas.find((d) => d.id === id)).filter((d): d is DemandaDoRoteiro => !!d);
  // Vazio some (demanda, processo, imóvel, desmate, CAR, etiquetas); código, tipo de dano, coordenadas e observações sempre aparecem.
  const dados: [string, string, boolean?][] = [
    ['Demanda', ligadas.map((d) => d.titulo).join('; '), true],
    ['Processo', ligadas.map((d) => d.processo).filter(Boolean).join('; ')],
    ['Código', p.codigo ?? '—'],
    ['Tipo de dano', p.tipoDano ?? '—'],
    ['Imóvel / local', p.imovel ?? ''],
    ['Desmate (ha)', p.areaHa !== undefined ? String(p.areaHa).replace('.', ',') : ''],
    ['CAR estadual', p.car ?? ''],
    ['Situação do CAR', p.situacaoCar ? SITUACOES_CAR[p.situacaoCar] : ''],
    ['Etiquetas', p.etiquetas?.join(', ') ?? '', true],
    ['Coordenadas', `${formatarGms(p.coordenada)} · ${formatarDecimal(p.coordenada)} (graus decimais, EPSG:4674)`, true],
    ['Observações / planejamento', p.notas || '—', true],
  ];
  const qr = qrSvg && coordenadaValida(p.coordenada) ? `<div class="qr" data-testid="qr">${qrSvg(urlDoMapa(p.coordenada))}<p>Abrir no Google Maps</p></div>` : '';
  const comPop = blocoPopAtivo(p);
  const comBloco = temBlocoApos(p);
  const frente = `<article class="folha ficha${comBloco ? ' ficha--pop' : ''}"><header class="topo"><div class="topo-texto"><div class="cab"><h2>${esc(rotuloPonto)} · ${esc(p.municipio)}</h2><p>${n} de ${total} · ${esc(nomeOperacao)}</p></div>
<p class="sub">${esc(rotuloViagem)}</p></div>${qr}</header>
<dl>${dados.filter(([, v]) => v).map(([k, v, larga]) => `<div class="par${larga ? ' larga' : ''}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
<h3>Campo · preencher à mão</h3>
<p>Data/hora de chegada: ${linha(10)}/${linha(10)}/${linha(14)} ${linha(8)}:${linha(8)}</p>
<p>Coordenada aferida: S ${linha(8)}° ${linha(8)}' ${linha(14)}" W ${linha(8)}° ${linha(8)}' ${linha(14)}" · Waypoint nº: ${linha(22)}</p>
<p>Constatação: ${caixas(...(temDemandaDeEmbargo(ligadas) ? ['embargo respeitado', 'embargo descumprido'] : []), 'regeneração', 'atividade em curso', 'não localizado', 'acesso impedido')}</p>
<p>Auto / notificação lavrado: ${caixas('auto de infração', 'notificação', 'termo de embargo')} nº ${linha(34)}</p>
<p>Fotos nº ${linha(14)} a ${linha(14)} (12 a 30) · Voo de drone: ${caixas('sim', 'não')} Arquivo: ${linha(40)}</p>
<p>Pessoa contatada (nome e função, sem CPF): ${linha(80)}</p>
<p>Observações de campo:</p>${'<p class="obs"><span class="ln"></span></p>'.repeat(5)}
<p class="ass"><span>Fiscal ${linha(60)}</span><span>Acompanhante ${linha(60)}</span></p></article>`;
  const inspecao = inspecaoAtiva(p) ? paginasInspecao(p, rotuloPonto) : [];
  // Sem POP, a inspeção (ficha + 2) ficaria com 3 páginas: uma de anotações fecha o par.
  const notas = inspecao.length && !comPop ? [`<article class="folha folha--pop folha--insp"><header class="cab"><h2>${esc(rotuloPonto)} · ${esc(p.municipio)}</h2><p>Anotações</p></header>${'<p class="obs"><span class="ln"></span></p>'.repeat(30)}</article>`] : [];
  return { html: frente + (comPop ? versoPop(p, rotuloPonto) : '') + inspecao.join('') + notas.join(''), paginas: 1 + (comPop ? 1 : 0) + inspecao.length + notas.length };
}

const ESTILO = `@page{size:A4;margin:12mm;@bottom-right{content:"pág. " counter(page);font:10.5pt system-ui,sans-serif}}@page pop{margin:8mm 10mm}*{box-sizing:border-box}
body{font:10pt/1.3 system-ui,sans-serif;color:#000;background:#fff;margin:0;padding:8px}
h1{font-size:14pt;margin:0}h2{font-size:13pt;margin:0}h3{font-size:10.5pt;margin:6px 0 2px;border-bottom:1px solid #000}p{margin:2px 0}.peq{font-size:8.5pt}.sub{margin:0 0 4px;font-size:10pt}
.cab{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #000;margin-bottom:4px}
dl{display:grid;grid-template-columns:1fr 1fr;gap:1px 12px;margin:0}.par{display:flex;gap:4px;min-width:0}.par.larga{grid-column:1/-1}dt{font-weight:600;white-space:nowrap}dt::after{content:":"}dd{margin:0;overflow-wrap:anywhere}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:2px 4px;text-align:left;font-size:10pt}
.cx{display:inline-block;width:10px;height:10px;border:1px solid #000;vertical-align:-1px}.op{white-space:nowrap;margin-right:6px}
.ln{display:inline-block;border-bottom:1px solid #000;height:1em;vertical-align:baseline}.obs{height:1.8em}.obs .ln{display:block;width:100%}
.folha{break-inside:avoid;page-break-inside:avoid}.capa{break-after:page;page-break-after:always}.branca{break-before:page;page-break-before:always;height:1px}.folha:last-child{break-after:auto;page-break-after:auto}.cel{max-height:2.7em;overflow:hidden}
.ficha{padding-bottom:6px;border-bottom:1px dashed #666;margin-bottom:6px}.ficha--pop{break-before:right;page-break-before:right;break-after:page;page-break-after:always;border-bottom:0}
.topo{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px}.topo-texto{flex:1;min-width:0}.topo-texto .cab{margin-bottom:2px}
.qr{width:22mm;text-align:center;font-size:7pt;line-height:1.1}.qr svg{display:block;width:22mm;height:22mm}.qr p{margin:1px 0 0}
.ass{display:flex;justify-content:space-between;margin-top:12px}
.resumo p{margin:0 0 1px}.folha--pop{page:pop;break-after:page;page-break-after:always}.col{column-count:2;column-gap:10px;font-size:8pt;line-height:1.15}.folha--insp .col{font-size:7.5pt;line-height:1.12}.folha--insp .resumo{font-size:7.5pt;margin:0 0 3px}.it{break-inside:avoid;margin-bottom:2px;overflow-wrap:anywhere}.it p{margin:0}.it .ops{margin-left:2px}.col .it{margin-bottom:1px}.col .it--se{padding-left:6px;border-left:2px solid #000}.sa{font-weight:600}.col h3{font-size:8.5pt;margin:3px 0 1px;break-after:avoid}.col .op{white-space:normal}.desvio,.sug{font-style:italic}.sug{font-weight:600}
.barra{margin:0 0 8px}@media screen{body{max-width:190mm;margin:0 auto}}@media print{.barra{display:none}body{padding:0}}`;

/** Página completa do roteiro. `geradoEm` é AAAA-MM-DD. */
export function htmlDoRoteiro(o: { operacao: Operacao; viagem: Viagem; pontos: readonly Ponto[]; demandas: readonly DemandaDoRoteiro[]; geradoEm: string; qrSvg?: (texto: string) => string }): string {
  const { operacao, viagem, demandas, geradoEm } = o;
  const pontos = o.pontos.filter((p) => p.situacao !== 'cancelado');
  const rotuloViagem = textoViagem(viagem);
  const municipios = [...new Set(pontos.map((p) => p.municipio).filter(Boolean))];
  const gerado = geradoEm.split('-').reverse().join('/');
  // Capa: SEMPRE um número par de páginas (frente e verso, e cresce em blocos de 2), então as fichas começam em página ímpar.
  // shortcut: a capa conta linhas, não mede a página; cabem LINHAS_CAPA por página e a célula de demanda/etiquetas é cortada em 2 linhas.
  // Equipe, integrantes ou municípios que passem de ~4 linhas na frente podem estourar a página; nesse caso, imprima sem frente e verso.
  const LINHAS_CAPA = { frente: 18, ultima: 14, meio: 22 };
  const linhas = pontos.map((p, i) => {
    const ligadas = p.demandas.map((id) => demandas.find((d) => d.id === id)).filter((d): d is DemandaDoRoteiro => !!d);
    return `<tr><td>${i + 1}</td><td>${String(p.numero ?? i + 1).padStart(2, '0')}</td><td>${esc(p.municipio)}</td><td>${esc(formatarGms(p.coordenada))}</td><td><div class="cel">${esc(ligadas.map((d) => d.titulo + (d.processo ? ` · ${d.processo}` : '')).join('; ') || '—')}${p.etiquetas?.length ? `<br><i>${esc(p.etiquetas.join(', '))}</i>` : ''}</div></td><td>${CAIXA}</td><td>${linha(18)}</td></tr>`;
  });
  const tabela = (rows: string[]) => rows.length ? `<table><thead><tr><th>Nº</th><th>Ponto</th><th>Município</th><th>Coordenadas</th><th>Demanda / etiquetas</th><th>Visitado</th><th>Data</th></tr></thead><tbody>${rows.join('')}</tbody></table>` : '';
  const resto = [...linhas];
  const frente = resto.splice(0, LINHAS_CAPA.frente);
  const meio: string[][] = [];
  while (resto.length > LINHAS_CAPA.ultima) meio.push(resto.splice(0, LINHAS_CAPA.meio));
  const diario = `<h3>Diário de bordo da viagem</h3>
<p>Km de saída: ${linha(30)} Km de chegada: ${linha(30)}</p>
<p>Abastecimentos:</p><table><thead><tr><th>Data</th><th>Litros</th><th>Local</th></tr></thead><tbody>${'<tr><td>&nbsp;</td><td></td><td></td></tr>'.repeat(3)}</tbody></table>
<p>Ocorrências / anotações gerais:</p>${'<p class="obs"><span class="ln"></span></p>'.repeat(6)}
<p class="ass"><span>Motorista${viagem.motorista ? ` <b>${esc(viagem.motorista)}</b>` : ''} ${linha(50)}</span></p>
<p class="peq">Gerado em ${gerado} pelo GUARÁ, com dados do seu navegador. Apoio ao trabalho; decisões e registros oficiais são humanos.</p>`;
  const paginasCapa = [
    `<article class="folha capa"><header class="cab"><h1>Roteiro de vistoria</h1><p>Motorista: ${viagem.motorista ? `<b>${esc(viagem.motorista)}</b>` : linha(60)}</p></header>
<h2>${esc(operacao.nome)}</h2><p>${esc(rotuloViagem)}</p>
${municipios.length ? `<p>Municípios: ${esc(municipios.join(', '))}</p>` : ''}
<p>Equipe: ${esc(viagem.equipe || '—')}${viagem.integrantes.length ? ` · Integrantes: ${esc(viagem.integrantes.join(', '))}` : ''}${viagem.veiculos.length ? ` · Veículos: ${esc(viagem.veiculos.join(', '))}` : ''}</p>
<p>Checklist: ${caixas('Pontos e coordenadas', 'Mapa', 'Documentos', 'GPS', 'Drone', 'Câmera')}</p>
${pontos.some(inspecaoAtiva) ? `<p>Inspeção de agrotóxicos, levar: ${caixas('EPI da equipe', 'Material de coleta de amostra', 'Lacres', 'Termo de apreensão/depósito')}</p>` : ''}
<!-- TODO: mapa estático dos pontos na capa; o app só tem mapa interativo (Leaflet com WMS), sem imagem estática. -->
<h3>Pontos na ordem</h3>${pontos.length ? tabela(frente) : '<p>Nenhum ponto nesta viagem.</p>'}</article>`,
    ...meio.map((rows) => `<article class="folha capa"><h3>Pontos na ordem (continuação)</h3>${tabela(rows)}</article>`),
  ];
  // Com meio ímpar, a capa teria páginas ímpares: entra uma página de anotações para fechar o par.
  if (meio.length % 2 === 1) paginasCapa.push(`<article class="folha capa"><h3>Anotações da viagem</h3>${'<p class="obs"><span class="ln"></span></p>'.repeat(28)}</article>`);
  paginasCapa.push(`<article class="folha capa">${resto.length ? `<h3>Pontos na ordem (continuação)</h3>${tabela(resto)}` : ''}${diario}</article>`);
  const capa = paginasCapa.join('');

  // Cada ponto com POP ocupa 2 páginas e começa em página ímpar (frente e verso = 1 folha). O Chrome/Edge ignoram `break-before: right`,
  // então a página em branco é calculada aqui. Fichas sem POP dividem a folha, 2 por página (shortcut: supõe que cabem duas; se uma ficha
  // crescer demais e ocupar a página sozinha, o verso/frente desalinha, e o jeito é imprimir esse ponto à parte).
  let paginas = paginasCapa.length;
  let metade = false; // há uma ficha sem POP esperando a segunda da folha
  const folhas = pontos.map((p, i) => {
    const { html, paginas: doPonto } = folhaPonto(p, i + 1, pontos.length, demandas, operacao.nome, rotuloViagem, o.qrSvg);
    if (temBlocoApos(p)) {
      const branca = paginas % 2 === 1; // a próxima página seria par
      metade = false;
      paginas += (branca ? 1 : 0) + doPonto;
      return (branca ? '<div class="branca"></div>' : '') + html;
    }
    if (metade) metade = false; else { metade = true; paginas++; }
    return html;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Roteiro de vistoria · ${esc(operacao.nome)} · ${esc(rotuloViagem)}</title><style>${ESTILO}</style></head><body>
<div class="barra"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>
${capa}${folhas}
</body></html>`;
}
