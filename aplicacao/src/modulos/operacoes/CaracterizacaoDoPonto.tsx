// Caracterização do dano no cartão do ponto: transcrição das respostas do POP IBAMA (itens e desvios em pop-supressao.ts)
// e dos dados de campo do roteiro. Quem usa grava a mudança no armazém da operação.

import { useId, useState } from 'react';
import type { Ponto } from './modelo.ts';
import {
  FONTE_POP, itensAplicaveis, itensDeCampoSemResposta, ITENS_POP, LIMITE_TEXTO_POP, respondido, textoCaracterizacao, type Caracterizacao, type ItemPop, type Resposta,
} from './pop-supressao.ts';

type Mudancas = Partial<Pick<Ponto, 'caracterizacao' | 'coordenadaAferida' | 'waypoint' | 'fotos' | 'drone' | 'pessoaContatada'>>;

function Item({ item, valor, aoMudar }: { item: ItemPop; valor: Resposta | undefined; aoMudar: (v: Resposta | undefined) => void }) {
  const id = useId();
  const nome = `${item.id}. ${item.texto}`;
  if (item.tipo === 'texto') {
    return (
      <label className="campo-grupo" data-testid={`pop-${item.id}`}><span>{nome}</span>
        <input className="campo" value={typeof valor === 'string' ? valor : ''} maxLength={LIMITE_TEXTO_POP} autoComplete="off" onChange={(e) => aoMudar(e.target.value || undefined)} /></label>
    );
  }
  if (item.tipo === 'unica') {
    return (
      <label className="campo-grupo" data-testid={`pop-${item.id}`}><span>{nome}</span>
        <select className="campo" value={typeof valor === 'string' ? valor : ''} onChange={(e) => aoMudar(e.target.value || undefined)}>
          <option value="">Sem resposta</option>
          {item.opcoes!.map((op) => <option key={op.texto} value={op.texto}>{op.texto}{op.vai ? ` (siga para ${op.vai})` : ''}</option>)}
        </select></label>
    );
  }
  const marcadas = Array.isArray(valor) ? valor : [];
  return (
    <fieldset className="campo-grupo" data-testid={`pop-${item.id}`} aria-labelledby={`${id}-l`}>
      <legend id={`${id}-l`}>{nome}</legend>
      {item.opcoes!.map((op) => (
        <label key={op.texto} className="campo-grupo--linha texto-pequeno">
          <input type="checkbox" checked={marcadas.includes(op.texto)} onChange={(e) => {
            const nova = e.target.checked ? [...marcadas, op.texto] : marcadas.filter((t) => t !== op.texto);
            aoMudar(nova.length ? nova : undefined);
          }} /> <span>{op.texto}{op.vai ? ` (siga para ${op.vai})` : ''}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function CaracterizacaoDoPonto({ ponto, rotulo, aoMudar }: { ponto: Ponto; rotulo: string; aoMudar: (m: Mudancas) => void }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const resp: Caracterizacao = ponto.caracterizacao ?? {};
  const aplicaveis = itensAplicaveis(resp);
  const puladas = ITENS_POP.filter((it) => !aplicaveis.includes(it)).map((it) => it.id);
  const semResposta = itensDeCampoSemResposta(resp).length;
  const mudar = (item: ItemPop, v: Resposta | undefined) => {
    const { [item.id]: _antiga, ...resto } = resp;
    void _antiga;
    aoMudar({ caracterizacao: v === undefined ? resto : { ...resto, [item.id]: v } });
    setAviso(null);
  };
  const copiar = async () => {
    const texto = textoCaracterizacao(resp);
    if (!texto) return setAviso('Nenhum item respondido para copiar.');
    try {
      await navigator.clipboard.writeText(texto);
      setAviso('Texto copiado.');
    } catch {
      setAviso('Este navegador não deixou copiar; selecione o texto abaixo e copie.');
    }
  };
  const campo = (rot: string, k: 'coordenadaAferida' | 'waypoint' | 'fotos' | 'pessoaContatada', dica?: string) => (
    <label className="campo-grupo"><span>{rot}</span>
      <input className="campo" defaultValue={ponto[k] ?? ''} maxLength={100} autoComplete="off" placeholder={dica} onBlur={(e) => { if (e.target.value.trim() !== (ponto[k] ?? '')) aoMudar({ [k]: e.target.value.trim() }); }} /></label>
  );

  return (
    <details className="mais-acoes" data-testid={`caracterizacao-${ponto.id}`}>
      <summary>Caracterização do dano ({semResposta} de campo sem resposta)</summary>
      <section aria-label={`Caracterização do dano do ${rotulo}`}>
        <p className="texto-pequeno texto-suave">
          Fonte: {FONTE_POP}. Itens e opções copiados do formulário; a adoção pela SEMA-MT depende de confirmação do responsável. Não registre CPF, endereço ou nome do autuado.
        </p>
        <h4 className="titulo-secao titulo-secao--bloco">Dados de campo</h4>
        <div className="grade grade--2" key={`${ponto.coordenadaAferida}|${ponto.waypoint}|${ponto.fotos}|${ponto.pessoaContatada}`}>
          {campo('Coordenada aferida', 'coordenadaAferida')}
          {campo('Waypoint', 'waypoint')}
          {campo('Fotos', 'fotos', '12 a 30')}
          {campo('Pessoa contatada (nome e função, sem CPF)', 'pessoaContatada')}
        </div>
        <div className="acoes acoes--centro">
          <label className="campo-grupo--linha texto-pequeno">
            <input type="checkbox" checked={!!ponto.drone?.voou} onChange={(e) => aoMudar({ drone: { voou: e.target.checked, ...(ponto.drone?.arquivo ? { arquivo: ponto.drone.arquivo } : {}) } })} /> <span>Voou drone</span>
          </label>
          {ponto.drone?.voou && (
            <label className="campo-inline texto-pequeno">Arquivo do voo
              <input className="campo" defaultValue={ponto.drone.arquivo ?? ''} maxLength={100} autoComplete="off" onBlur={(e) => aoMudar({ drone: { voou: true, ...(e.target.value.trim() ? { arquivo: e.target.value.trim() } : {}) } })} /></label>
          )}
        </div>
        {(['A', 'B'] as const).map((f) => (
          <div key={f}>
            <h4 className="titulo-secao titulo-secao--bloco">{f === 'A' ? 'Formulário A (preencher em campo)' : 'Formulário B (preencher em escritório)'}</h4>
            <div className="formulario">
              {aplicaveis.filter((it) => it.formulario === f).map((it) => <Item key={it.id} item={it} valor={resp[it.id]} aoMudar={(v) => mudar(it, v)} />)}
            </div>
          </div>
        ))}
        {puladas.length > 0 && <p className="texto-pequeno texto-suave" data-testid="pop-puladas">Itens pulados pelo formulário: {puladas.join(', ')}.</p>}
        <div className="acoes">
          <button type="button" className="botao botao--pequeno" disabled={!Object.values(resp).some(respondido)} onClick={copiar}>Copiar texto para o relatório</button>
        </div>
        {aviso && <p role="status" className="texto-pequeno">{aviso}</p>}
      </section>
    </details>
  );
}
