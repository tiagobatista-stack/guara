// Painel das consultas às bases do ponto (registro manual e lista). O texto do relatório vem de relatorio.ts, só com frases fixas.

import { useState, type FormEvent } from 'react';
import { BASES_CONSULTA, ESTADOS_CONSULTA, LIMITES_OPERACAO, type BaseConsulta, type EstadoConsulta, type Ponto } from './modelo.ts';
import { plural } from '../../compartilhado/plural.ts';
import { consultaDe } from './relatorio.ts';
import { CONSULTAS } from './relatorio-frases.ts';

const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ROTULO_ESTADO: Record<EstadoConsulta | 'nenhuma', string> = { ...ESTADOS_CONSULTA, 'nao-consultado': 'não consultada', falha: 'falha', nenhuma: 'não consultada' };

/** Painel das consultas às bases (lista e registro manual). A consulta automática e o texto do relatório ficam na seção "Formulários e relatório". */
export function ConsultasDoPonto({ ponto, rotulo, aberto, aoMudar }: { ponto: Ponto; rotulo: string; aberto: boolean; aoMudar: (m: Pick<Ponto, 'consultas'>) => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const [base, setBase] = useState<BaseConsulta>('car');
  const [estado, setEstado] = useState<'encontrado' | 'vazio'>('vazio');
  const [data, setData] = useState(hojeIso);
  const [detalhe, setDetalhe] = useState('');
  const registrar = (e: FormEvent) => {
    e.preventDefault();
    const [a, m, d] = data.split('-').map(Number);
    if (!a || !m || !d) return setErro('Informe a data da consulta.');
    if (estado === 'encontrado' && !detalhe.trim()) return setErro('Informe o que foi encontrado (nº do CAR, nome da TI etc.).');
    setErro(null);
    aoMudar({ consultas: { ...ponto.consultas, [base]: { estado, quando: new Date(a, m - 1, d, 12).toISOString(), fonte: 'manual', ...(detalhe.trim() ? { detalhe: detalhe.trim() } : {}) } } });
    setDetalhe('');
    setManual(false);
  };
  const remover = (b: BaseConsulta) => {
    const { [b]: _tirada, ...resto } = ponto.consultas ?? {};
    void _tirada;
    aoMudar({ consultas: resto });
  };
  return (
    <div className={aberto ? 'painel-form' : 'painel-form recolhido'}>
      <section aria-label={`Consultas e relatório do ${rotulo}`}>
        <h4 className="titulo-secao titulo-secao--bloco">Consultas às bases</h4>
        <p className="texto-pequeno texto-suave">Só entra no relatório como "não identificado" o que foi consultado com sucesso e está registrado aqui. Sem registro: [CONSULTA NÃO REALIZADA].</p>
        <ul className="lista-limpa">
          {BASES_CONSULTA.map((b) => {
            const c = consultaDe(ponto, b);
            return (
              <li key={b} className="texto-pequeno" data-testid={`consulta-${b}`}>
                <strong>{CONSULTAS[b].base}</strong>{' '}
                <span className={`selo-situacao${!c || c.estado === 'falha' || c.estado === 'nao-consultado' ? ' selo-situacao--atencao' : ''}`}>{ROTULO_ESTADO[c?.estado ?? 'nenhuma']}</span>
                {c && <> {dataBr(c.quando)} · {c.fonte === 'manual' ? 'manual' : 'auto'}{c.detalhe ? ` — ${c.detalhe}` : ''}{c.proximidade?.map((x) => ` — pontual a ${x.m} m: ${x.texto}`).join('')}{c.maisProximos ? ` — e mais ${plural(c.maisProximos, 'registro próximo', 'registros próximos')}` : ''}</>}
                {ponto.consultas?.[b] && <> <button type="button" className="botao botao--pequeno botao--sutil" aria-label={`Remover registro de ${CONSULTAS[b].base}`} onClick={() => remover(b)}>Remover</button></>}
              </li>
            );
          })}
        </ul>
        <div className="acoes acoes--centro">
          {!manual && <button type="button" className="botao botao--pequeno botao--sutil" onClick={() => setManual(true)}>+ Registrar consulta manual</button>}
        </div>
        {manual && (
          <form className="formulario" aria-label="Registrar consulta manual" onSubmit={registrar} noValidate>
            <div className="grade grade--2">
              <label className="campo-grupo"><span>Base consultada</span>
                <select className="campo" value={base} onChange={(e) => setBase(e.target.value as BaseConsulta)}>
                  {BASES_CONSULTA.map((b) => <option key={b} value={b}>{CONSULTAS[b].base}</option>)}
                </select></label>
              <label className="campo-grupo"><span>Resultado</span>
                <select className="campo" value={estado} onChange={(e) => setEstado(e.target.value as 'encontrado' | 'vazio')}>
                  <option value="vazio">Nada encontrado</option>
                  <option value="encontrado">Encontrado</option>
                </select></label>
              <label className="campo-grupo"><span>Data da consulta</span>
                <input className="campo" type="date" value={data} onChange={(e) => setData(e.target.value)} /></label>
              <label className="campo-grupo"><span>O que foi encontrado (nº do CAR, nome da TI…)</span>
                <input className="campo" value={detalhe} maxLength={LIMITES_OPERACAO.detalheConsulta} autoComplete="off" onChange={(e) => setDetalhe(e.target.value)} /></label>
            </div>
            {erro && <p role="alert" className="erro-campo">{erro}</p>}
            <div className="acoes">
              <button type="submit" className="botao botao--pequeno">Registrar consulta (Geoportal, QGIS…)</button>
              <button type="button" className="botao botao--pequeno botao--sutil" onClick={() => { setManual(false); setErro(null); }}>Cancelar</button>
            </div>
          </form>
        )}

      </section>
    </div>
  );
}
