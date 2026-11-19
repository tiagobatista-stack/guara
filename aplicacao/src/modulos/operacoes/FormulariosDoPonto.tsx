// Seção "Formulários e relatório" do ponto expandido: uma linha por item (POP, Inspeção, Consultas) com estado visível, e o botão que gera o texto do relatório.
// Os painéis de edição ficam abaixo da lista e abrem pelo botão [Preencher]/[Continuar]/[Ver].

import { useState } from 'react';
import type { Operacao, Ponto } from './modelo.ts';
import { CaracterizacaoDoPonto } from './CaracterizacaoDoPonto.tsx';
import { InspecaoDoPonto } from './InspecaoDoPonto.tsx';
import { ConsultasDoPonto } from './RelatorioDoPonto.tsx';
import { ROTULO_SELO, estadoInspecao, estadoPop, resumoConsultas, resumoDoRelatorio, textoInspecao, textoPop, type EstadoFormulario } from './estado-formularios.ts';
import { textoDoRelatorio } from './relatorio.ts';
import { lerAuthkey } from './sugestao-vegetacao.ts';
import { inspecaoAtiva } from './inspecao-agrotoxicos.ts';
import { blocoPopAtivo } from './pop-supressao.ts';
import { plural } from '../../compartilhado/plural.ts';

type Painel = 'pop' | 'inspecao' | 'consultas';
const dataHoraBr = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const dataBr = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');
const DICA_DESABILITADO = 'Preencha a caracterização do dano para gerar o texto';

export function FormulariosDoPonto({ operacao, ponto, rotulo, aoMudar, aoReconsultarGeo, aoConsultarBases, aoBaixar }: {
  operacao: Operacao; ponto: Ponto; rotulo: string;
  aoMudar: (m: Partial<Ponto>) => void;
  aoReconsultarGeo: () => Promise<string | null>;
  aoConsultarBases: () => Promise<string | null>;
  aoBaixar: (nome: string, conteudo: string, tipo: string) => void;
}) {
  const [aberto, setAberto] = useState<Painel | null>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);
  const semChave = !lerAuthkey();
  const comPop = blocoPopAtivo(ponto);
  const comInspecao = inspecaoAtiva(ponto);
  const pop = estadoPop(ponto);
  const insp = estadoInspecao(ponto);
  const cons = resumoConsultas(ponto);
  const alterna = (p: Painel) => setAberto(aberto === p ? null : p);
  const base = (ponto.codigo ?? rotulo).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const podeGerar = (comPop && pop.n > 0) || (comInspecao && insp.n > 0);
  const marcador = podeGerar ? resumoDoRelatorio(operacao, ponto) : null;
  const consultar = async () => {
    setConsultando(true);
    setAviso(null);
    try { setAviso((await aoConsultarBases()) ?? 'Consulta feita.'); } finally { setConsultando(false); }
  };

  const linha = (id: Painel, titulo: string, e: EstadoFormulario, editado: string | undefined, exportar: () => string) => (
    <li className="texto-pequeno" data-testid={`formulario-${id}`}>
      <strong>{titulo}</strong>{' '}
      <span className={`selo-situacao${e.selo === 'completo' ? '' : ' selo-situacao--atencao'}`} data-testid={`selo-${id}`}>{ROTULO_SELO[e.selo]}</span>{' '}
      {e.n > 0 && <span data-testid={`contagem-${id}`}>{e.n} de {e.m}</span>}
      {editado && <span className="texto-suave"> · editado em {dataHoraBr(editado)}</span>}{' '}
      <button type="button" className="botao botao--pequeno" aria-expanded={aberto === id} aria-label={`${e.n > 0 ? 'Continuar' : 'Preencher'} ${titulo}`} onClick={() => alterna(id)}>{e.n > 0 ? 'Continuar' : 'Preencher'}</button>
      {e.n > 0 && <> <button type="button" className="botao botao--pequeno" aria-label={`Exportar TXT de ${titulo}`} onClick={() => aoBaixar(`${base}-${id}.txt`, exportar(), 'text/plain;charset=utf-8')}>Exportar TXT</button></>}
    </li>
  );

  return (
    <section aria-label={`Formulários e relatório do ${rotulo}`} data-testid={`relatorio-texto-${ponto.id}`}>
      <h4 className="titulo-secao titulo-secao--bloco">Formulários e relatório</h4>
      <ul className="lista-limpa">
        {comPop && linha('pop', 'Caracterização do dano (POP)', pop, ponto.editadoEm?.pop, () => textoPop(ponto))}
        {comInspecao && linha('inspecao', 'Inspeção de agrotóxicos', insp, ponto.editadoEm?.inspecao, () => textoInspecao(ponto))}
        <li className="texto-pequeno" data-testid="formulario-consultas">
          <strong>Consultas às bases</strong> <span>{cons.feitas} de {cons.total} consultadas</span>
          {cons.ultima && <span className="texto-suave"> · última em {dataBr(cons.ultima)}</span>}{' '}
          <button type="button" className="botao botao--pequeno" disabled={semChave || consultando} title={semChave ? 'Preencha a chave do GeoServer em Configurações' : undefined} onClick={consultar}>{consultando ? 'Consultando…' : 'Consultar bases'}</button>{' '}
          <button type="button" className="botao botao--pequeno" aria-expanded={aberto === 'consultas'} onClick={() => alterna('consultas')}>Ver</button>
        </li>
        {!comInspecao && (
          <li><button type="button" className="botao botao--pequeno botao--sutil" onClick={() => aoMudar({ inspecaoAtiva: true })}>+ Adicionar inspeção de agrotóxicos</button></li>
        )}
      </ul>
      {semChave && <p className="texto-pequeno texto-suave">Para consultar as bases, preencha a chave do GeoServer em Configurações.</p>}

      <div className="acoes acoes--centro">
        <button type="button" className="botao botao--primario" disabled={!podeGerar} title={podeGerar ? undefined : DICA_DESABILITADO}
          onClick={() => { setTexto(textoDoRelatorio(operacao, ponto)); setAviso(null); }}>Gerar texto do relatório</button>
        {marcador ? (
          marcador.pendencias === 0 && marcador.naoConsultadas === 0
            ? <span className="texto-pequeno selo-situacao" data-testid="resumo-relatorio">sem pendências</span>
            : <span className="texto-pequeno texto--atencao" data-testid="resumo-relatorio">{plural(marcador.pendencias, 'pendência', 'pendências')} · {plural(marcador.naoConsultadas, 'consulta não realizada', 'consultas não realizadas')}</span>
        ) : <span className="texto-pequeno texto-suave" data-testid="dica-relatorio">{DICA_DESABILITADO}</span>}
      </div>
      {texto !== null && (
        <>
          <textarea className="campo campo--area" readOnly rows={16} aria-label={`Relatório (texto) do ${rotulo}`} value={texto} />
          <div className="acoes">
            <button type="button" className="botao botao--pequeno botao--primario" onClick={async () => { try { await navigator.clipboard.writeText(texto); setAviso('Texto copiado.'); } catch { setAviso('Este navegador não deixou copiar; selecione o texto e copie.'); } }}>Copiar</button>
            <button type="button" className="botao botao--pequeno" onClick={() => aoBaixar(`relatorio-${base}.txt`, texto, 'text/plain;charset=utf-8')}>Baixar .txt</button>
            <button type="button" className="botao botao--pequeno botao--sutil" onClick={() => setTexto(null)}>Fechar</button>
          </div>
        </>
      )}
      {aviso && <p role="status" className="texto-pequeno">{aviso}</p>}

      {comPop && <CaracterizacaoDoPonto ponto={ponto} rotulo={rotulo} aberto={aberto === 'pop'} aoMudar={aoMudar} aoReconsultar={aoReconsultarGeo} />}
      {comInspecao && <InspecaoDoPonto ponto={ponto} rotulo={rotulo} aberto={aberto === 'inspecao'} aoMudar={aoMudar} />}
      <ConsultasDoPonto ponto={ponto} rotulo={rotulo} aberto={aberto === 'consultas'} aoMudar={aoMudar} />
    </section>
  );
}
