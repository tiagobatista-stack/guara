// Caracterização do dano no cartão do ponto: transcrição das respostas do POP IBAMA (itens e desvios em pop-supressao.ts)
// e dos dados de campo do roteiro. Quem usa grava a mudança no armazém da operação.

import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { Ponto } from './modelo.ts';
import {
  FONTE_POP, avisosDaCopia, textoFaltam, itensAplicaveis, marcadas, sugestoesPop, itensDeCampoSemResposta, ITENS_POP, LIMITE_TEXTO_POP, textoCaracterizacao, type Caracterizacao, type ItemPop, type Resposta,
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

const ESPERA_GRAVAR_MS = 600;
const horaAgora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Campo de texto dos dados de campo: grava ao digitar (após uma pausa), ao sair do campo, ao fechar/ocultar a aba e ao desmontar.
function CampoGravavel({ valor, aoGravar, ...resto }: { valor: string; aoGravar: (v: string) => void; placeholder?: string }) {
  const [texto, setTexto] = useState(valor);
  const pendente = useRef<string | null>(null);
  const ultimo = useRef(valor);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gravarRef = useRef(aoGravar);
  gravarRef.current = aoGravar;
  const gravar = useCallback(() => {
    clearTimeout(timer.current);
    const v = pendente.current?.trim();
    pendente.current = null;
    if (v === undefined || v === ultimo.current) return;
    ultimo.current = v;
    gravarRef.current(v);
  }, []);
  useEffect(() => {
    if (pendente.current === null) { ultimo.current = valor; setTexto(valor); }
  }, [valor]);
  useEffect(() => {
    const aoOcultar = () => { if (document.visibilityState === 'hidden') gravar(); };
    document.addEventListener('visibilitychange', aoOcultar);
    window.addEventListener('pagehide', gravar);
    return () => {
      document.removeEventListener('visibilitychange', aoOcultar);
      window.removeEventListener('pagehide', gravar);
      gravar();
    };
  }, [gravar]);
  return (
    <input className="campo" {...resto} value={texto} maxLength={100} autoComplete="off"
      onChange={(e) => {
        setTexto(e.target.value);
        pendente.current = e.target.value;
        clearTimeout(timer.current);
        timer.current = setTimeout(gravar, ESPERA_GRAVAR_MS);
      }}
      onBlur={(e) => { pendente.current = e.target.value; gravar(); }} />
  );
}

export function CaracterizacaoDoPonto({ ponto, rotulo, aoMudar: aoMudarFora }: { ponto: Ponto; rotulo: string; aoMudar: (m: Mudancas) => void }) {
  const sugestoes = sugestoesPop(ponto);
  const [aviso, setAviso] = useState<string | null>(null);
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const aoMudar = (m: Mudancas) => { aoMudarFora(m); setSalvoEm(horaAgora()); };
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
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const copiarTexto = async () => {
    setConfirmar(null);
    const texto = textoCaracterizacao(resp, ponto);
    if (!texto) return setAviso('Nada respondido nem registrado para copiar.');
    const { lembretes } = avisosDaCopia(resp);
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(['Texto copiado.', ...lembretes].join(' '));
    } catch {
      setAviso('Este navegador não deixou copiar; selecione o texto abaixo e copie.');
    }
  };
  const copiar = () => {
    const f = textoFaltam(avisosDaCopia(resp).faltam);
    if (f) { setAviso(null); setConfirmar(f); } else void copiarTexto();
  };
  const campo = (rot: string, k: 'coordenadaAferida' | 'waypoint' | 'fotos' | 'pessoaContatada', dica?: string) => (
    <label className="campo-grupo"><span>{rot}</span>
      <CampoGravavel valor={ponto[k] ?? ''} placeholder={dica} aoGravar={(v) => aoMudar({ [k]: v })} /></label>
  );

  return (
    <details className="mais-acoes" data-testid={`caracterizacao-${ponto.id}`}>
      <summary>Caracterização do dano ({semResposta} de campo sem resposta)</summary>
      <section aria-label={`Caracterização do dano do ${rotulo}`}>
        <p role="status" className="texto-pequeno texto-suave" data-testid="salvamento" style={{ position: 'sticky', top: 0, background: 'Canvas', margin: 0, padding: '0.25rem 0', zIndex: 1 }}>
          {salvoEm ? `Salvo às ${salvoEm}` : 'Salva automaticamente.'}
        </p>
        <p className="texto-pequeno texto-suave">
          Fonte: {FONTE_POP}. Itens e opções copiados do formulário; a adoção pela SEMA-MT depende de confirmação do responsável. Não registre CPF, endereço ou nome do autuado.
        </p>
        <h4 className="titulo-secao titulo-secao--bloco">Dados de campo</h4>
        <div className="grade grade--2">
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
              <CampoGravavel valor={ponto.drone.arquivo ?? ''} aoGravar={(v) => aoMudar({ drone: { voou: true, ...(v ? { arquivo: v } : {}) } })} /></label>
          )}
        </div>
        {(['A', 'B'] as const).map((f) => (
          <div key={f}>
            <h4 className="titulo-secao titulo-secao--bloco">{f === 'A' ? 'Formulário A (preencher em campo)' : 'Formulário B (preencher em escritório)'}</h4>
            <div className="formulario">
              {aplicaveis.filter((it) => it.formulario === f).map((it) => {
                const sug = sugestoes[it.id];
                const jaMarcada = marcadas(resp[it.id]).includes(sug);
                return (
                  <Fragment key={it.id}>
                    <Item item={it} valor={resp[it.id]} aoMudar={(v) => mudar(it, v)} />
                    {sug && !jaMarcada && (
                      <p className="texto-pequeno" data-testid={`sugestao-${it.id}`}>
                        Sugerido — conferir ({it.id}): {sug}.{' '}
                        <button type="button" className="botao botao--pequeno" onClick={() => mudar(it, it.tipo === 'multipla' ? [...marcadas(resp[it.id]), sug] : sug)}>Usar sugestão</button>
                      </p>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        ))}
        {puladas.length > 0 && <p className="texto-pequeno texto-suave" data-testid="pop-puladas">Itens pulados pelo formulário: {puladas.join(', ')}.</p>}
        <div className="acoes">
          <button type="button" className="botao botao--pequeno" disabled={!textoCaracterizacao(resp, ponto)} onClick={copiar}>Copiar texto para o relatório</button>
        </div>
        {confirmar && (
          <div className="acoes" data-testid="confirma-copia">
            <p className="texto-pequeno">{confirmar}</p>
            <button type="button" className="botao botao--pequeno" onClick={() => void copiarTexto()}>Copiar assim mesmo</button>
            <button type="button" className="botao botao--pequeno" onClick={() => setConfirmar(null)}>Voltar</button>
          </div>
        )}
        {aviso && <p role="status" className="texto-pequeno">{aviso}</p>}
      </section>
    </details>
  );
}
