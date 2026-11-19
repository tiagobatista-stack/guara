// Consultas às bases (automática no GeoServer ou registro manual) e "Relatório (texto)" do ponto. O texto vem de relatorio.ts, só com frases fixas.

import { useState, type FormEvent } from 'react';
import { BASES_CONSULTA, ESTADOS_CONSULTA, LIMITES_OPERACAO, type BaseConsulta, type EstadoConsulta, type Operacao, type Ponto } from './modelo.ts';
import { plural } from '../../compartilhado/plural.ts';
import { consultaDe, textoDoRelatorio } from './relatorio.ts';
import { CONSULTAS } from './relatorio-frases.ts';
import { lerAuthkey } from './sugestao-vegetacao.ts';

const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ROTULO_ESTADO: Record<EstadoConsulta | 'nenhuma', string> = { ...ESTADOS_CONSULTA, 'nao-consultado': 'não consultada', falha: 'falha', nenhuma: 'não consultada' };

export function RelatorioDoPonto({ operacao, ponto, rotulo, aoMudar, aoBaixar, aoConsultar }: {
  operacao: Operacao; ponto: Ponto; rotulo: string;
  aoMudar: (m: Pick<Ponto, 'consultas'>) => void;
  aoBaixar: (nome: string, conteudo: string, tipo: string) => void;
  /** Consulta o GeoServer e grava; devolve um aviso (ou null). */
  aoConsultar: () => Promise<string | null>;
}) {
  const [texto, setTexto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [manual, setManual] = useState(false);
  const [base, setBase] = useState<BaseConsulta>('car');
  const [estado, setEstado] = useState<'encontrado' | 'vazio'>('vazio');
  const [data, setData] = useState(hojeIso);
  const [detalhe, setDetalhe] = useState('');
  const semChave = !lerAuthkey();

  const consultar = async () => {
    setConsultando(true);
    setAviso(null);
    try { setAviso((await aoConsultar()) ?? 'Consulta feita.'); } finally { setConsultando(false); }
  };
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
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto ?? ''); setAviso('Texto copiado.'); } catch { setAviso('Este navegador não deixou copiar; selecione o texto e copie.'); }
  };
  const nomeArquivo = `relatorio-${(ponto.codigo ?? rotulo).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.txt`;

  return (
    <details className="mais-acoes" data-testid={`relatorio-texto-${ponto.id}`}>
      <summary>Consultas às bases e relatório (texto)</summary>
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
          <button type="button" className="botao botao--pequeno" disabled={semChave || consultando} title={semChave ? 'Preencha a chave do GeoServer em Configurações' : undefined} onClick={consultar}>
            {consultando ? 'Consultando…' : 'Consultar bases (GeoServer)'}
          </button>
          {semChave && <span className="texto-pequeno texto-suave">Preencha a chave do GeoServer em Configurações.</span>}
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

        <h4 className="titulo-secao titulo-secao--bloco">Relatório</h4>
        <div className="acoes">
          <button type="button" className="botao botao--pequeno" onClick={() => { setTexto(textoDoRelatorio(operacao, ponto)); setAviso(null); }}>Relatório (texto)</button>
        </div>
        {texto !== null && (
          <>
            <textarea className="campo campo--area" readOnly rows={16} aria-label={`Relatório (texto) do ${rotulo}`} value={texto} />
            <div className="acoes">
              <button type="button" className="botao botao--pequeno botao--primario" onClick={copiar}>Copiar</button>
              <button type="button" className="botao botao--pequeno" onClick={() => aoBaixar(nomeArquivo, texto, 'text/plain;charset=utf-8')}>Baixar .txt</button>
              <button type="button" className="botao botao--pequeno botao--sutil" onClick={() => setTexto(null)}>Fechar</button>
            </div>
          </>
        )}
        {aviso && <p role="status" className="texto-pequeno">{aviso}</p>}
      </section>
    </details>
  );
}
