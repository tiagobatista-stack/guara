// Seção "Operação" do detalhe da demanda: agendar a vistoria numa operação (a demanda vira um ponto)
// ou ligar a demanda a um ponto que já existe (por exemplo, já vistoriado). O vínculo mora no ponto.

import { useMemo, useState, type FormEvent } from 'react';
import { formatarDecimal, formatarGms, lerCoordenada } from './coordenadas.ts';
import { useArmazem } from './armazem.ts';
import { paraEntrada } from './regras.ts';
import type { Demanda } from './modelo.ts';
import {
  desvincularDemandaDePonto, incluirDemandaComoPonto, useOperacoes, vincularDemandaAPonto,
} from '../operacoes/armazem.ts';
import { ROTULOS_SITUACAO, type Operacao, type Ponto } from '../operacoes/modelo.ts';
import { viagemDoPonto, vinculosDasDemandas } from '../operacoes/regras.ts';

const dataBr = (d: string) => d.split('-').reverse().join('/');
const periodo = (o: Operacao) =>
  o.inicio || o.fim ? `${o.inicio ? dataBr(o.inicio) : '…'} a ${o.fim ? dataBr(o.fim) : '…'}` : 'sem período definido';
const rotuloPonto = (o: Operacao, p: Ponto) =>
  [p.numero !== undefined ? `Ponto ${p.numero}` : 'Ponto', p.municipio, ROTULOS_SITUACAO[p.situacao], viagemDoPonto(o, p)?.equipe].filter(Boolean).join(' · ');

export function VinculoOperacao({ demanda, aoEditar }: { demanda: Demanda; aoEditar: () => void }) {
  const armazem = useArmazem();
  const operacoes = useOperacoes();
  const vinculos = useMemo(() => vinculosDasDemandas(operacoes).get(demanda.id) ?? [], [operacoes, demanda.id]);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Agendar
  const [opAgendar, setOpAgendar] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [coordenada, setCoordenada] = useState('');
  // Vincular
  const [opVincular, setOpVincular] = useState('');
  const [pontoVincular, setPontoVincular] = useState('');

  const leitura = coordenada.trim() ? lerCoordenada(coordenada) : null;
  const operacaoVincular = operacoes.find((o) => o.id === opVincular);
  const pontosDaOperacao = operacaoVincular?.pontos.filter((p) => !p.demandas.includes(demanda.id)) ?? [];
  const vistoriadoSemData = vinculos.some((v) => v.ponto.situacao === 'vistoriado') && !demanda.vistoria?.data;

  const avisar = (erro: string | null, ok: string) => setMensagem(erro ? { tipo: 'erro', texto: erro } : { tipo: 'sucesso', texto: ok });

  const agendar = (e: FormEvent) => {
    e.preventDefault();
    if (!opAgendar) return avisar('Escolha a operação.', '');
    let coord = demanda.coordenada;
    if (!coord) {
      if (!leitura) return avisar('Esta demanda não tem coordenada: informe a do ponto.', '');
      if (!leitura.ok) return avisar(leitura.erro, '');
      coord = leitura.valor;
    }
    const erro = incluirDemandaComoPonto(opAgendar, { demandaId: demanda.id, coordenada: coord, municipio });
    if (erro) return avisar(erro, '');
    let texto = 'Vistoria agendada: a demanda entrou na operação como um ponto (ainda sem viagem: encaixe-o numa viagem na tela Operações).';
    if (!demanda.coordenada) {
      // A coordenada informada também fica na demanda.
      const r = armazem.editar(demanda.id, { ...paraEntrada(demanda), coordenada: formatarDecimal(coord) });
      texto += r.ok ? ' A coordenada também foi gravada na demanda.' : ' A coordenada não foi gravada na demanda: edite a demanda e informe-a.';
    }
    setMensagem({ tipo: 'sucesso', texto });
    setCoordenada('');
    setMunicipio('');
    setOpAgendar('');
  };

  const vincular = (e: FormEvent) => {
    e.preventDefault();
    if (!opVincular || !pontoVincular) return avisar('Escolha a operação e o ponto.', '');
    const erro = vincularDemandaAPonto(opVincular, pontoVincular, demanda.id);
    avisar(erro, 'Demanda ligada ao ponto.');
    if (!erro) setPontoVincular('');
  };

  return (
    <section className="bloco-detalhe" aria-labelledby="titulo-vinculo-operacao" data-testid="vinculo-operacao">
      <h3 id="titulo-vinculo-operacao" className="titulo-secao titulo-secao--bloco">Operação</h3>
      <p className="texto-pequeno texto-suave">
        A vistoria acontece no período da operação; a data específica é a do relatório da vistoria, que você registra na demanda.
      </p>

      {mensagem && <p role={mensagem.tipo === 'erro' ? 'alert' : 'status'} className={mensagem.tipo === 'erro' ? 'erro-campo' : ''} data-testid="mensagem-operacao">{mensagem.texto}</p>}

      {vinculos.length === 0 ? (
        <p className="texto-suave" data-testid="sem-vinculo">Não está em nenhuma operação.</p>
      ) : (
        <ul className="lista-limpa" aria-label="Operações da demanda">
          {vinculos.map(({ operacao, ponto }) => (
            <li key={ponto.id} data-testid={`vinculo-${ponto.id}`}>
              <strong>{operacao.nome}</strong> ({periodo(operacao)}) · {rotuloPonto(operacao, ponto)} · <span className="mono">{formatarGms(ponto.coordenada)}</span>{' '}
              <button
                type="button" className="botao botao--pequeno" aria-label={`Desvincular de ${operacao.nome}`}
                onClick={() => avisar(desvincularDemandaDePonto(operacao.id, ponto.id, demanda.id), 'Demanda desligada do ponto.')}
              >Desvincular</button>
            </li>
          ))}
        </ul>
      )}

      {vistoriadoSemData && (
        <div className="aviso" data-testid="aviso-vistoriado-sem-data">
          <p>Há ponto vistoriado ligado a esta demanda e a vistoria ainda não tem data. Registre a data do relatório da vistoria.</p>
          <div className="acoes"><button type="button" className="botao botao--pequeno" onClick={aoEditar}>Editar para registrar a data</button></div>
        </div>
      )}

      {operacoes.length === 0 ? (
        <p className="texto-suave texto-pequeno">Nenhuma operação cadastrada. Crie uma na tela Operações para agendar ou vincular.</p>
      ) : (
        <>
          <form className="formulario" onSubmit={agendar} noValidate aria-label="Agendar em uma operação">
            <h4 className="texto-medio">Agendar em uma operação</h4>
            <div className="grade grade--2">
              <label className="campo-grupo"><span>Operação para agendar</span>
                <select className="campo" value={opAgendar} onChange={(e) => setOpAgendar(e.target.value)}>
                  <option value="">Escolha…</option>
                  {operacoes.map((o) => <option key={o.id} value={o.id}>{o.nome} ({periodo(o)})</option>)}
                </select></label>
              <label className="campo-grupo"><span>Município do ponto (opcional)</span>
                <input className="campo" value={municipio} onChange={(e) => setMunicipio(e.target.value)} /></label>
            </div>
            {demanda.coordenada ? (
              <p className="texto-pequeno texto-suave">O ponto usa a coordenada da demanda: <span className="mono">{formatarDecimal(demanda.coordenada)}</span>.</p>
            ) : (
              <div className="campo-grupo">
                <label htmlFor="coordenada-ponto">Coordenada do ponto</label>
                <input id="coordenada-ponto" className="campo mono" value={coordenada} autoComplete="off" spellCheck={false} placeholder="Ex.: -15.5, -55.5"
                  onChange={(e) => setCoordenada(e.target.value)} />
                {leitura && (
                  <span className="texto-pequeno" data-testid="leitura-coordenada-ponto">
                    {leitura.ok ? `Entendido: ${formatarGms(leitura.valor)}.` : `Ainda não entendi: ${leitura.erro}`}
                  </span>
                )}
                <span className="texto-pequeno texto-suave">A demanda não tem coordenada; a informada também será gravada nela.</span>
              </div>
            )}
            <div className="acoes"><button type="submit" className="botao botao--primario">Agendar vistoria na operação</button></div>
          </form>

          <form className="formulario" onSubmit={vincular} noValidate aria-label="Vincular a um ponto existente">
            <h4 className="texto-medio">Vincular a um ponto existente</h4>
            <div className="grade grade--2">
              <label className="campo-grupo"><span>Operação do ponto</span>
                <select className="campo" value={opVincular} onChange={(e) => { setOpVincular(e.target.value); setPontoVincular(''); }}>
                  <option value="">Escolha…</option>
                  {operacoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select></label>
              <label className="campo-grupo"><span>Ponto</span>
                <select className="campo" value={pontoVincular} disabled={!opVincular} onChange={(e) => setPontoVincular(e.target.value)}>
                  <option value="">Escolha…</option>
                  {pontosDaOperacao.map((p) => <option key={p.id} value={p.id}>{rotuloPonto(operacaoVincular!, p)}</option>)}
                </select></label>
            </div>
            <div className="acoes"><button type="submit" className="botao">Vincular ao ponto</button></div>
          </form>
        </>
      )}
    </section>
  );
}
