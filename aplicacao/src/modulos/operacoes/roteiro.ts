// Roteiro de vistoria imprimível de uma viagem, no modelo de docs/referencias/roteiro_exemplo.pdf: capa com a lista dos pontos
// e o que levar, uma folha por ponto (dados, campo a preencher à mão, croqui, assinaturas) e, nos pontos com o bloco ativo,
// o verso "Caracterização do dano (POP)" com caixas de marcar (itens, opções e desvios de pop-supressao.ts).
// O navegador imprime ou salva em PDF. Só dados do próprio navegador; nada sai daqui.
// Não entram, de propósito: responsável/contato/documento (sem CPF nem contato de pessoa). CAR federal fica "—" (o GUARÁ não tem).

import { formatarDecimal, formatarGms } from '../demandas/coordenadas.ts';
import { SITUACOES_CAR, type Operacao, type Ponto, type Viagem } from './modelo.ts';
import { blocoPopAtivo, FONTE_POP, ITENS_POP, sugestoesPop, type ItemPop } from './pop-supressao.ts';
import { textoViagem } from './regras.ts';

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

function itemPop(it: ItemPop, sugestao?: string): string {
  const titulo = `<b>${esc(it.id)}.</b> ${esc(it.texto)}${it.tipo === 'multipla' ? ' <i>(pode marcar mais de um)</i>' : ''}`;
  if (it.tipo === 'texto') return `<div class="it"><p>${titulo}</p><p>${linha(60)}</p></div>`;
  return `<div class="it"><p>${titulo}</p><p class="ops">${it.opcoes!.map((o) => `<span class="op">${CAIXA} ${esc(o.texto)}${o.texto === sugestao ? ' <i class="sug">(sugerido — conferir)</i>' : ''}</span>`).join(' ')}</p>${desvios(it).map((d) => `<p class="desvio">${d}</p>`).join('')}</div>`;
}

/** Formulário A em duas páginas, divididas pelo peso (texto das perguntas e opções) para não deixar uma cheia e a outra vazia. */
function paginasPop(): ItemPop[][] {
  const itens = ITENS_POP.filter((i) => i.formulario === 'A');
  const peso = (it: ItemPop) => it.texto.length + (it.opcoes ?? []).reduce((s, o) => s + o.texto.length + 6, 0);
  const total = itens.reduce((s, it) => s + peso(it), 0);
  let acum = 0;
  const corte = itens.findIndex((it) => (acum += peso(it)) >= total / 2) + 1;
  return [itens.slice(0, corte), itens.slice(corte)];
}

function versoPop(p: Ponto, rotuloPonto: string): string {
  return paginasPop().map((itens, k) => `<article class="folha folha--pop"><header class="cab"><h2>${esc(rotuloPonto)} · ${esc(p.municipio)}</h2><p>Caracterização do dano (POP) · ${k + 1}/2</p></header>
${k === 0 ? `<p class="peq">Formulário A, preencher em campo. Fonte: ${esc(FONTE_POP)}. Transcreva depois no ponto do GUARÁ. Não anote CPF, endereço ou nome do autuado.</p>` : ''}
<div class="col">${itens.map((it) => itemPop(it, sugestoesPop(p)[it.id])).join('')}</div></article>`).join('');
}

/** Constatação de embargo só em ponto com demanda de embargo ligada. */
export const temDemandaDeEmbargo = (ligadas: readonly { titulo: string }[]) => ligadas.some((d) => /embargo/.test(d.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()));

function folhaPonto(p: Ponto, n: number, total: number, demandas: readonly DemandaDoRoteiro[], nomeOperacao: string, rotuloViagem: string): string {
  const rotuloPonto = `Ponto ${String(p.numero ?? n).padStart(2, '0')}`;
  const ligadas = p.demandas.map((id) => demandas.find((d) => d.id === id)).filter((d): d is DemandaDoRoteiro => !!d);
  const dados: [string, string][] = [
    ['Demanda', ligadas.map((d) => d.titulo).join('; ') || '—'],
    ['Processo', ligadas.map((d) => d.processo).filter(Boolean).join('; ') || '—'],
    ['Código', p.codigo ?? '—'],
    ['Imóvel / local', p.imovel ?? '—'],
    ['Desmate (ha)', p.areaHa !== undefined ? String(p.areaHa).replace('.', ',') : '—'],
    ['CAR estadual', p.car ?? '—'],
    ['CAR federal', '—'],
    ['Situação do CAR', p.situacaoCar ? SITUACOES_CAR[p.situacaoCar] : '—'],
    ['Tipo de dano', p.tipoDano ?? '—'],
    ['Etiquetas', p.etiquetas?.join(', ') || '—'],
    ['Coordenadas', formatarGms(p.coordenada)],
    ['', `${formatarDecimal(p.coordenada)} (graus decimais, EPSG:4674)`],
    ['Observações / planejamento', p.notas || '—'],
  ];
  const frente = `<article class="folha"><header class="cab"><h2>${esc(rotuloPonto)} · ${esc(p.municipio)}</h2><p>${n} de ${total} · ${esc(nomeOperacao)}</p></header>
<p class="sub">${esc(rotuloViagem)}</p>
<dl>${dados.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
<h3>Campo · preencher à mão</h3>
<p>Data/hora de chegada: ${linha(10)}/${linha(10)}/${linha(14)} ${linha(8)}:${linha(8)}</p>
<p>Coordenada aferida: S ${linha(8)}° ${linha(8)}' ${linha(14)}" W ${linha(8)}° ${linha(8)}' ${linha(14)}" · Waypoint nº: ${linha(22)}</p>
<p>Constatação: ${caixas(...(temDemandaDeEmbargo(ligadas) ? ['embargo respeitado', 'embargo descumprido'] : []), 'regeneração', 'atividade em curso', 'não localizado', 'acesso impedido')}</p>
<p>Auto / notificação lavrado: ${caixas('auto de infração', 'notificação', 'termo de embargo')} nº ${linha(34)}</p>
<p>Fotos nº ${linha(14)} a ${linha(14)} (12 a 30) · Voo de drone: ${caixas('sim', 'não')} Arquivo: ${linha(40)}</p>
<p>Pessoa contatada (nome e função, sem CPF): ${linha(80)}</p>
<p>Observações de campo:</p>${'<p class="obs"><span class="ln"></span></p>'.repeat(6)}
<h3>Croqui</h3><div class="croqui"><span>N ↑</span></div>
<p class="ass"><span>Fiscal ${linha(60)}</span><span>Acompanhante ${linha(60)}</span></p></article>`;
  return frente + (blocoPopAtivo(p) ? versoPop(p, rotuloPonto) : '');
}

const ESTILO = `@page{size:A4;margin:12mm;@bottom-right{content:"pág. " counter(page);font:10.5pt system-ui,sans-serif}}*{box-sizing:border-box}
body{font:10.5pt/1.35 system-ui,sans-serif;color:#000;background:#fff;margin:0;padding:8px}
h1{font-size:14pt;margin:0}h2{font-size:13pt;margin:0}h3{font-size:11pt;margin:8px 0 3px;border-bottom:1px solid #000}p{margin:3px 0}.peq{font-size:8.5pt}.sub{margin:0 0 6px;font-size:10.5pt}
.cab{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #000;margin-bottom:6px}
dl{display:grid;grid-template-columns:42mm 1fr;gap:2px 8px;margin:0}dt{font-weight:600}dd{margin:0;overflow-wrap:anywhere}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #000;padding:2px 4px;text-align:left;font-size:10pt}
.cx{display:inline-block;width:10px;height:10px;border:1px solid #000;vertical-align:-1px}.op{white-space:nowrap;margin-right:6px}
.ln{display:inline-block;border-bottom:1px solid #000;height:1em;vertical-align:baseline}.obs{height:1.9em}.obs .ln{display:block;width:100%}
.folha{display:flex;flex-direction:column;break-after:page;page-break-after:always;min-height:260mm}.folha:last-child{break-after:auto;page-break-after:auto}
.croqui{flex:1;min-height:40mm;border:1px solid #000;padding:2px;text-align:right;font-size:9pt}.ass{display:flex;justify-content:space-between;margin-top:14px}
.folha--pop{min-height:0}.col{column-count:2;column-gap:10px;font-size:8.5pt;line-height:1.25}.it{break-inside:avoid;margin-bottom:5px;overflow-wrap:anywhere}.it p{margin:0}.it .ops{margin-left:2px}.col .op{white-space:normal}.desvio,.sug{font-style:italic}.sug{font-weight:600}
.barra{margin:0 0 8px}@media screen{body{max-width:190mm;margin:0 auto}}@media print{.barra{display:none}body{padding:0}}`;

/** Página completa do roteiro. `geradoEm` é AAAA-MM-DD. */
export function htmlDoRoteiro(o: { operacao: Operacao; viagem: Viagem; pontos: readonly Ponto[]; demandas: readonly DemandaDoRoteiro[]; geradoEm: string }): string {
  const { operacao, viagem, demandas, geradoEm } = o;
  const pontos = o.pontos.filter((p) => p.situacao !== 'cancelado');
  const rotuloViagem = textoViagem(viagem);
  const municipios = [...new Set(pontos.map((p) => p.municipio).filter(Boolean))];
  const gerado = geradoEm.split('-').reverse().join('/');
  const capa = `<article class="folha"><header class="cab"><h1>Roteiro de vistoria</h1><p>Motorista: ${viagem.motorista ? `<b>${esc(viagem.motorista)}</b>` : linha(60)}</p></header>
<h2>${esc(operacao.nome)}</h2><p>${esc(rotuloViagem)}</p>
${municipios.length ? `<p>Municípios: ${esc(municipios.join(', '))}</p>` : ''}
<p>Equipe: ${esc(viagem.equipe || '—')}${viagem.integrantes.length ? ` · Integrantes: ${esc(viagem.integrantes.join(', '))}` : ''}${viagem.veiculos.length ? ` · Veículos: ${esc(viagem.veiculos.join(', '))}` : ''}</p>
<h3>Pontos na ordem</h3>
${pontos.length ? `<table><thead><tr><th>Nº</th><th>Ponto</th><th>Município</th><th>Coordenadas</th><th>Demanda / etiquetas</th></tr></thead><tbody>${pontos.map((p, i) => {
    const ligadas = p.demandas.map((id) => demandas.find((d) => d.id === id)).filter((d): d is DemandaDoRoteiro => !!d);
    return `<tr><td>${i + 1}</td><td>${String(p.numero ?? i + 1).padStart(2, '0')}</td><td>${esc(p.municipio)}</td><td>${esc(formatarGms(p.coordenada))}</td><td>${esc(ligadas.map((d) => d.titulo + (d.processo ? ` · ${d.processo}` : '')).join('; ') || '—')}${p.etiquetas?.length ? `<br><i>${esc(p.etiquetas.join(', '))}</i>` : ''}</td></tr>`;
  }).join('')}</tbody></table>` : '<p>Nenhum ponto nesta viagem.</p>'}
<h3>Checklist: o que levar</h3><p>${caixas('Pontos e coordenadas', 'Mapa', 'Documentos', 'GPS', 'Drone', 'Câmera')}</p>
<p class="peq">Gerado em ${gerado} pelo GUARÁ, com dados do seu navegador. Apoio ao trabalho; decisões e registros oficiais são humanos.</p></article>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Roteiro de vistoria · ${esc(operacao.nome)} · ${esc(rotuloViagem)}</title><style>${ESTILO}</style></head><body>
<div class="barra"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>
${capa}${pontos.map((p, i) => folhaPonto(p, i + 1, pontos.length, demandas, operacao.nome, rotuloViagem)).join('')}
</body></html>`;
}
