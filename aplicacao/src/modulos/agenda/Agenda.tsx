// Agenda: calendário mensal (domingo a sábado, como o Google Agenda) com vistorias e saídas, exportação .ics
// e as demandas de campo ainda não encaixadas. Sem login nem serviço externo: o .ics é importado pela própria pessoa.

import { useEffect, useState } from 'react';
import { useEstadoDemandas } from '../demandas/armazem.ts';
import { useOperacoes } from '../operacoes/armazem.ts';
import { demandasEncaixadas } from '../operacoes/regras.ts';
import { listarSemVistoria } from '../demandas/vistoria.ts';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { parametrosDaRota } from '../../nucleo/registro-modulos.ts';
import { lerRotaDeCompromisso } from '../assistente/compromissoPelaConversa.ts';
import { concluirOcorrencia, limparRascunho, reabrirOcorrencia, useCompromissos, type Compromisso } from './compromissos.ts';
import { FormularioCompromisso, type InicialDoFormulario } from './FormularioCompromisso.tsx';
import { descreverSemanaDoMes } from './recorrencia.ts';
import { gerarIcs, gradeDoMes, montarAgenda, operacoesNoDia } from './regras.ts';

const paraFormulario = (c: Compromisso, ocorrencia: string): InicialDoFormulario => ({
  id: c.id, tipo: c.tipo, data: c.data, hora: c.hora, assunto: c.assunto, demanda: c.demanda,
  dataFim: c.dataFim, repeticao: c.repeticao, repetirAte: c.repetirAte, ocorrencia,
});

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function Agenda({ agora = () => new Date() }: { agora?: () => Date }) {
  const { demandas } = useEstadoDemandas();
  const operacoes = useOperacoes();
  const compromissos = useCompromissos();
  const instante = agora();
  const hoje = instante.toLocaleDateString('sv-SE');
  const [mes, setMes] = useState({ ano: instante.getFullYear(), mes: instante.getMonth() + 1 });
  const [escolhido, setEscolhido] = useState(hoje);
  // Formulário: aberto vazio ("Novo compromisso"), com um compromisso ("Editar") ou preenchido pelo assistente ("Corrigir").
  const [formulario, setFormulario] = useState<InicialDoFormulario | null>(null);
  const [recado, setRecado] = useState('');
  useEffect(() => {
    const aplicar = () => {
      const parametros = parametrosDaRota(window.location.hash);
      const novo = parametros.get('novo');
      if (novo === null) return;
      window.history.replaceState(null, '', '#/agenda');
      limparRascunho();
      const campos = lerRotaDeCompromisso(novo, { fim: parametros.get('fim'), rep: parametros.get('rep'), ate: parametros.get('ate') });
      if (!campos) return;
      setFormulario(campos);
      if (campos.data) {
        setEscolhido(campos.data);
        setMes({ ano: Number(campos.data.slice(0, 4)), mes: Number(campos.data.slice(5, 7)) });
      }
    };
    aplicar();
    window.addEventListener('hashchange', aplicar);
    return () => window.removeEventListener('hashchange', aplicar);
  }, []);
  const grade = gradeDoMes(mes.ano, mes.mes);
  // As séries só são expandidas nas semanas que estão na tela (e o dia escolhido, que pode estar fora do mês).
  const janela = { de: [grade[0][0].data, escolhido].sort()[0], ate: [grade[grade.length - 1][6].data, escolhido].sort()[1] };
  const dias = montarAgenda(demandas, operacoes, compromissos, janela);
  const porDia = new Map(dias.map((d) => [d.dia, d.itens]));
  const semVistoria = listarSemVistoria(demandas, demandasEncaixadas(operacoes));
  const titulo = new Date(mes.ano, mes.mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const mover = (n: number) => {
    const d = new Date(mes.ano, mes.mes - 1 + n, 1);
    setMes({ ano: d.getFullYear(), mes: d.getMonth() + 1 });
  };

  function exportar() {
    const todos = montarAgenda(demandas, operacoes, compromissos);
    const url = URL.createObjectURL(new Blob([gerarIcs(todos.flatMap((d) => d.itens), agora())], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guara-agenda.ics';
    a.click();
    URL.revokeObjectURL(url);
  }

  const doDia = porDia.get(escolhido) ?? [];

  return (
    <section aria-labelledby="titulo-agenda" className="pagina">
      <div>
        <h1 id="titulo-agenda" className="titulo-pagina">Agenda</h1>
        <p className="texto-suave texto-medio">Compromissos, vistorias das demandas e saídas dos pontos planejados, dos dados deste navegador.</p>
      </div>

      <div className="cartao">
        <div className="agenda-barra">
          <button type="button" className="botao" onClick={() => mover(-1)} aria-label="Mês anterior">‹</button>
          <h2 className="titulo-secao" data-testid="agenda-mes" aria-live="polite">{titulo}</h2>
          <button type="button" className="botao" onClick={() => mover(1)} aria-label="Próximo mês">›</button>
          <button type="button" className="botao" onClick={() => { setMes({ ano: instante.getFullYear(), mes: instante.getMonth() + 1 }); setEscolhido(hoje); }}>Hoje</button>
          <button type="button" className="botao" onClick={exportar} disabled={dias.length === 0 && compromissos.length === 0}>Exportar para o Google Agenda (.ics)</button>
        </div>
        <div className="agenda-grade" role="grid" aria-label={`Calendário de ${titulo}`}>
          <div role="row" className="agenda-linha">
            {SEMANA.map((s) => <div key={s} role="columnheader" className="agenda-cabecalho">{s}</div>)}
          </div>
          {grade.map((semana) => (
            <div role="row" className="agenda-linha" key={semana[0].data}>
              {semana.map(({ data, doMes }) => {
                const itens = porDia.get(data) ?? [];
                const emOperacao = operacoesNoDia(operacoes, data);
                const nomeMes = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long' });
                return (
                  <button
                    type="button" role="gridcell" key={data} data-testid={`dia-${data}`}
                    className={`agenda-dia${doMes ? '' : ' agenda-dia--fora'}${emOperacao.length ? ' agenda-dia--operacao' : ''}${data === hoje ? ' agenda-dia--hoje' : ''}${data === escolhido ? ' agenda-dia--escolhido' : ''}`}
                    aria-selected={data === escolhido}
                    aria-label={`${Number(data.slice(8))} de ${nomeMes}${itens.length ? `, ${itens.length} evento(s)` : ''}${emOperacao.length ? `, em operação: ${emOperacao.join(', ')}` : ''}`}
                    title={emOperacao.length ? `Operação: ${emOperacao.join(', ')}` : undefined}
                    onClick={() => setEscolhido(data)}
                  >
                    <span className="agenda-numero">{Number(data.slice(8))}</span>
                    {itens.slice(0, 2).map((i, n) => (
                      <span key={n} className={`agenda-evento agenda-evento--${i.tipo}${i.concluido ? ' agenda-evento--concluido' : ''}${i.repete ? ' agenda-evento--repete' : ''}${i.total ? ' agenda-evento--continua' : ''}`}>
                        {i.hora ? `${i.hora} ` : ''}{i.repete ? '↻ ' : ''}{i.texto}{i.total ? ` (${i.numero}/${i.total})` : ''}
                      </span>
                    ))}
                    {itens.length > 2 && <span className="texto-pequeno texto-suave">+{itens.length - 2}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <p className="texto-pequeno texto-suave">Dias em vermelho estão no período de uma operação. No Google Agenda: Configurações › Importar e exportar › Importar, e escolha o arquivo baixado. É uma cópia de hoje, não uma sincronização.</p>
      </div>

      <div className="cartao" data-testid="agenda-dia-escolhido">
        <h2 className="titulo-secao">{escolhido.split('-').reverse().join('/')} <span className="texto-pequeno texto-suave" data-testid="agenda-semana-do-mes">· {descreverSemanaDoMes(escolhido)}</span></h2>
        {operacoesNoDia(operacoes, escolhido).map((n) => <p key={n} className="texto-medio texto--falha">Em operação: {n}</p>)}
        {doDia.length === 0 ? (
          <EstadoVazio texto="Nada marcado neste dia." />
        ) : (
          <ul className="lista-limpa lista-divisoria texto-medio">
            {doDia.map((i, n) => {
              if (i.tipo !== 'compromisso') return <li key={n}>{i.tipo === 'vistoria' ? 'Vistoria' : 'Saída'}: {i.texto}</li>;
              const c = compromissos.find((x) => x.id === i.id);
              return (
                <li key={n} data-testid={`compromisso-do-dia-${i.id}`}>
                  <span className={i.concluido ? 'agenda-evento--concluido' : undefined}>
                    {i.hora ? `${i.hora} · ` : 'Dia todo · '}{i.texto}
                    {i.total ? ` · Dia ${i.numero} de ${i.total}` : ''}{i.repete ? ` · ↻ ${i.repete}` : ''}{i.concluido ? ' (concluído)' : ''}
                  </span>
                  {c && (
                    <span className="acoes-aviso" role="group" aria-label={`Compromisso: ${i.texto}`}>
                      <button type="button" className="botao botao--pequeno" onClick={() => { setRecado(''); setFormulario(paraFormulario(c, escolhido)); }}>Editar</button>
                      <button type="button" className="botao botao--pequeno" onClick={() => (i.concluido ? reabrirOcorrencia(c.id, i.ocorrencia ?? c.data) : concluirOcorrencia(c.id, i.ocorrencia ?? c.data))}>{i.concluido ? 'Reabrir' : 'Concluir'}</button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {recado && <p role="status" className="texto-pequeno texto-suave">{recado}</p>}
        {!formulario && <button type="button" className="botao" onClick={() => { setRecado(''); setFormulario({ data: escolhido }); }}>Novo compromisso ou lembrete</button>}
      </div>

      {formulario && (
        <div className="cartao">
          <FormularioCompromisso key={`${formulario.id ?? 'novo'}-${formulario.data ?? ''}-${formulario.dataFim ?? ''}-${formulario.repeticao ?? ''}-${formulario.assunto ?? ''}`} inicial={formulario} hoje={hoje} agora={agora} aoFechar={(m) => { setFormulario(null); if (m) setRecado(m); }} />
        </div>
      )}

      <div className="cartao">
        <h2 className="titulo-secao">Demandas de campo sem data nem operação</h2>
        {semVistoria.length === 0 ? (
          <EstadoVazio texto="Nenhuma demanda de campo aguardando encaixe." />
        ) : (
          <ul className="lista-limpa lista-divisoria texto-medio" data-testid="agenda-sem-vistoria">
            {semVistoria.map((d) => <li key={d.id}>{d.titulo}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
