// Inspeção de agrotóxicos no cartão do ponto: conferência prévia (escritório) e campo, no mesmo formato do POP (itens em inspecao-agrotoxicos.ts).
// Quem usa grava a mudança no armazém da operação. A decisão é do fiscal: o sistema só mostra "conferido antes" e sinaliza [DIVERGÊNCIA].

import { Fragment, useState } from 'react';
import type { Ponto } from './modelo.ts';
import { ESTADOS_CONSULTA, LIMITES_OPERACAO } from './modelo.ts';
import { divergencias, itensAplicaveis, itensDeCampoSemResposta, marcadas, respondido, type Caracterizacao, type ItemPop, type Resposta } from './pop-supressao.ts';
import { ITENS_INSPECAO, MAX_EMBARGOS, inspecaoAtiva, inspecaoVazia, SECOES_INSPECAO, sugestoesInspecao } from './inspecao-agrotoxicos.ts';
import { Item } from './CaracterizacaoDoPonto.tsx';
import { providenciasSugeridas, type EstadoProvidencia } from './providencias.ts';

type Mudancas = Partial<Pick<Ponto, 'inspecao' | 'conferenciaPrevia' | 'inspecaoAtiva' | 'imovel' | 'providencias' | 'lavrados'>>;
const valorTexto = (r: Resposta | undefined) => marcadas(r).join('; ');

export function InspecaoDoPonto({ ponto, rotulo, aoMudar }: { ponto: Ponto; rotulo: string; aoMudar: (m: Mudancas) => void }) {
  const [aba, setAba] = useState<'previa' | 'campo'>('previa');
  const [confirmaRemocao, setConfirmaRemocao] = useState(false);
  const previa: Caracterizacao = ponto.conferenciaPrevia ?? {};
  const campo: Caracterizacao = ponto.inspecao ?? {};
  const juntas = { ...previa, ...campo }; // condicionais de campo olham a resposta de campo e, na falta dela, a conferida antes
  const sugestoes = sugestoesInspecao(ponto);
  const doEmbargo = (id: string) => Number(/^C-2\.13\.(\d+)\./.exec(id)?.[1] ?? 0);
  const ultimoRespondido = Math.max(0, ...Object.keys(campo).filter((id) => respondido(campo[id])).map(doEmbargo));
  const [pares, setPares] = useState(Math.max(1, ultimoRespondido));
  const paresVisiveis = Math.max(pares, ultimoRespondido);
  const divergentes = divergencias(previa, campo, ITENS_INSPECAO);
  const semResposta = itensDeCampoSemResposta(juntas, ITENS_INSPECAO).length;

  const gravar = (k: 'inspecao' | 'conferenciaPrevia', resp: Caracterizacao, item: ItemPop, v: Resposta | undefined) => {
    const { [item.id]: _antiga, ...resto } = resp;
    void _antiga;
    aoMudar({ [k]: v === undefined ? resto : { ...resto, [item.id]: v } });
  };
  // Na aba de campo não entram os "@fonte" (só se registram na prévia); embargos além do último par aberto ficam escondidos.
  const aplicaveis = itensAplicaveis(aba === 'previa' ? previa : juntas, ITENS_INSPECAO)
    .filter((it) => (aba === 'campo' ? !it.id.includes('@') : it.fase === 'previa') && doEmbargo(it.id) <= paresVisiveis);

  const sugeridas = providenciasSugeridas(ponto);
  const marcar = (id: string, estado: EstadoProvidencia) => {
    const { [id]: atual, ...resto } = ponto.providencias ?? {};
    aoMudar({ providencias: atual === estado ? resto : { ...resto, [id]: estado } });
  };

  const remover = () => {
    if (!inspecaoVazia(ponto) && !confirmaRemocao) return setConfirmaRemocao(true);
    aoMudar({ inspecaoAtiva: undefined, inspecao: {}, conferenciaPrevia: {}, providencias: undefined, lavrados: undefined });
  };

  return (
    <details className="mais-acoes" data-testid={`inspecao-${ponto.id}`}>
      <summary>Inspeção de agrotóxicos ({semResposta} de campo sem resposta{divergentes.length > 0 ? `; ${divergentes.length} divergência${divergentes.length > 1 ? 's' : ''}` : ''})</summary>
      <section aria-label={`Inspeção de agrotóxicos do ${rotulo}`}>
        <p className="texto-pequeno texto-suave">
          Fonte: questionário da equipe de fiscalização. Sem campos de dados pessoais: o nome, o documento, o contato e o endereço de pessoas ficam no auto de inspeção; aqui só se confere que foram registrados.
        </p>
        <div className="acoes" role="group" aria-label="Fase da inspeção">
          <button type="button" className="botao botao--pequeno" aria-pressed={aba === 'previa'} onClick={() => setAba('previa')}>Conferência prévia</button>
          <button type="button" className="botao botao--pequeno" aria-pressed={aba === 'campo'} onClick={() => setAba('campo')}>Em campo</button>
        </div>
        {aba === 'previa' && (
          <div className="texto-pequeno" data-testid="consulta-previa">
            <p>Consulta automática (CAR, embargos e autos):</p>
            <ul className="lista-limpa">
              {(['car', 'embargos', 'autos'] as const).map((b) => {
                const cs = ponto.consultas?.[b];
                return <li key={b}>{b === 'car' ? 'CAR' : b === 'embargos' ? 'Embargos' : 'Autos'}: {cs ? `${ESTADOS_CONSULTA[cs.estado]}${cs.detalhe ? `: ${cs.detalhe}` : ''}` : 'não consultado'}</li>;
              })}
            </ul>
          </div>
        )}
        {aba === 'campo' && divergentes.length > 0 && (
          <ul className="lista-limpa texto-pequeno texto--atencao" data-testid="divergencias">
            {divergentes.map((it) => <li key={it.id}>[DIVERGÊNCIA] {it.id}: conferido antes: {valorTexto(previa[it.id])}; em campo: {valorTexto(campo[it.id])}.</li>)}
          </ul>
        )}
        <label className="campo-grupo" key={`imovel|${ponto.imovel}`}><span>Imóvel / local (o mesmo do planejamento do ponto)</span>
          <input className="campo" defaultValue={ponto.imovel ?? ''} maxLength={LIMITES_OPERACAO.imovel} autoComplete="off" onBlur={(e) => { if (e.target.value.trim() !== (ponto.imovel ?? '')) aoMudar({ imovel: e.target.value.trim() }); }} /></label>
        {Object.entries(SECOES_INSPECAO).map(([n, titulo]) => {
          const doBloco = aplicaveis.filter((it) => it.secao === Number(n));
          if (doBloco.length === 0) return null;
          return (
            <div key={n}>
              <h4 className="titulo-secao titulo-secao--bloco">{n}. {titulo}</h4>
              <div className="formulario">
                {doBloco.map((it) => {
                  const lado = aba === 'previa' ? previa : campo;
                  const chave = aba === 'previa' ? 'conferenciaPrevia' : 'inspecao';
                  const sug = aba === 'previa' ? sugestoes[it.id] : undefined;
                  const antes = aba === 'campo' && it.fase === 'previa' && respondido(previa[it.id]);
                  return (
                    <Fragment key={it.id}>
                      <Item item={it} valor={lado[it.id]} aoMudar={(v) => gravar(chave, lado, it, v)} />
                      {antes && <p className="texto-pequeno texto-suave" data-testid={`antes-${it.id}`}>conferido antes: {valorTexto(previa[it.id])}</p>}
                      {sug && !marcadas(lado[it.id]).includes(sug) && (
                        <p className="texto-pequeno" data-testid={`sugestao-${it.id}`}>
                          Sugerido (consulta automática) — conferir ({it.id}): {sug}.{' '}
                          <button type="button" className="botao botao--pequeno" onClick={() => gravar(chave, lado, it, sug)}>Usar sugestão</button>
                        </p>
                      )}
                    </Fragment>
                  );
                })}
              </div>
              {aba === 'campo' && n === '2' && marcadas(juntas['C-2.13']).includes('Sim') && (
                <button type="button" className="botao botao--pequeno" disabled={paresVisiveis >= MAX_EMBARGOS} onClick={() => setPares(paresVisiveis + 1)}>+ Adicionar embargo</button>
              )}
            </div>
          );
        })}
        {aba === 'campo' && (
          <div data-testid="providencias">
            <h4 className="titulo-secao titulo-secao--bloco">Providências e documentos lavrados</h4>
            {sugeridas.length > 0 && (
              <>
                <p className="texto-pequeno texto-suave">Lembretes de procedimento a partir das respostas; a decisão é sua. Enquadramento e multa ficam no SIGA Autuação.</p>
                <ul className="lista-limpa">
                  {sugeridas.map((pv) => {
                    const estado = ponto.providencias?.[pv.id];
                    return (
                      <li key={pv.id} data-testid={`providencia-${pv.id}`}>
                        <p>{pv.texto}</p>
                        <p className="texto-pequeno texto-suave">{pv.motivo}.</p>
                        <div className="acoes" role="group" aria-label={`Marcar: ${pv.texto}`}>
                          <button type="button" className="botao botao--pequeno" aria-pressed={estado === 'feito'} onClick={() => marcar(pv.id, 'feito')}>Feito</button>
                          <button type="button" className="botao botao--pequeno" aria-pressed={estado === 'nao-aplicavel'} onClick={() => marcar(pv.id, 'nao-aplicavel')}>Não aplicável</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            {([['notificacao', 'Notificação lavrada: n.º'], ['auto', 'Auto de infração lavrado: n.º']] as const).map(([k, rotulo]) => (
              <label className="campo-grupo" key={`${k}|${ponto.lavrados?.[k] ?? ''}`}><span>{rotulo}</span>
                <input className="campo" defaultValue={ponto.lavrados?.[k] ?? ''} maxLength={100} autoComplete="off"
                  onBlur={(e) => { if (e.target.value.trim() !== (ponto.lavrados?.[k] ?? '')) aoMudar({ lavrados: { ...ponto.lavrados, [k]: e.target.value.trim() } }); }} /></label>
            ))}
          </div>
        )}
        {ponto.inspecaoAtiva && !inspecaoAtiva({ tipoDano: ponto.tipoDano }) ? (
          <div className="acoes">
            {confirmaRemocao ? (
              <>
                <span className="texto-pequeno" role="alert">Há respostas nesta inspeção; remover apaga todas elas.</span>
                <button type="button" className="botao botao--pequeno botao--perigo" onClick={remover}>Remover e apagar respostas</button>
                <button type="button" className="botao botao--pequeno" onClick={() => setConfirmaRemocao(false)}>Manter</button>
              </>
            ) : (
              <button type="button" className="botao botao--pequeno" onClick={remover}>Remover inspeção de agrotóxicos</button>
            )}
          </div>
        ) : (
          <p className="texto-pequeno texto-suave">Esta inspeção vem do tipo de dano do ponto; para tirá-la, mude o tipo no planejamento.</p>
        )}
      </section>
    </details>
  );
}
