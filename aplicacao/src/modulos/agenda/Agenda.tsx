// Agenda: calendário mensal (domingo a sábado, como o Google Agenda) com vistorias e saídas, exportação .ics
// e as demandas de campo ainda não encaixadas. Sem login nem serviço externo: o .ics é importado pela própria pessoa.

import { useState } from 'react';
import { useEstadoDemandas } from '../demandas/armazem.ts';
import { useOperacoes } from '../operacoes/armazem.ts';
import { demandasEncaixadas } from '../operacoes/regras.ts';
import { listarSemVistoria } from '../demandas/vistoria.ts';
import { EstadoVazio } from '../../compartilhado/EstadoVazio.tsx';
import { gerarIcs, gradeDoMes, montarAgenda } from './regras.ts';

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function Agenda({ agora = () => new Date() }: { agora?: () => Date }) {
  const { demandas } = useEstadoDemandas();
  const operacoes = useOperacoes();
  const instante = agora();
  const hoje = instante.toLocaleDateString('sv-SE');
  const [mes, setMes] = useState({ ano: instante.getFullYear(), mes: instante.getMonth() + 1 });
  const [escolhido, setEscolhido] = useState(hoje);
  const dias = montarAgenda(demandas, operacoes);
  const porDia = new Map(dias.map((d) => [d.dia, d.itens]));
  const semVistoria = listarSemVistoria(demandas, demandasEncaixadas(operacoes));
  const grade = gradeDoMes(mes.ano, mes.mes);
  const titulo = new Date(mes.ano, mes.mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const mover = (n: number) => {
    const d = new Date(mes.ano, mes.mes - 1 + n, 1);
    setMes({ ano: d.getFullYear(), mes: d.getMonth() + 1 });
  };

  function exportar() {
    const url = URL.createObjectURL(new Blob([gerarIcs(dias.flatMap((d) => d.itens), agora())], { type: 'text/calendar;charset=utf-8' }));
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
        <p className="texto-suave texto-medio">Vistorias das demandas e saídas dos pontos planejados, dos dados deste navegador.</p>
      </div>

      <div className="cartao">
        <div className="agenda-barra">
          <button type="button" className="botao" onClick={() => mover(-1)} aria-label="Mês anterior">‹</button>
          <h2 className="titulo-secao" data-testid="agenda-mes" aria-live="polite">{titulo}</h2>
          <button type="button" className="botao" onClick={() => mover(1)} aria-label="Próximo mês">›</button>
          <button type="button" className="botao" onClick={() => { setMes({ ano: instante.getFullYear(), mes: instante.getMonth() + 1 }); setEscolhido(hoje); }}>Hoje</button>
          <button type="button" className="botao" onClick={exportar} disabled={dias.length === 0}>Exportar para o Google Agenda (.ics)</button>
        </div>
        <div className="agenda-grade" role="grid" aria-label={`Calendário de ${titulo}`}>
          <div role="row" className="agenda-linha">
            {SEMANA.map((s) => <div key={s} role="columnheader" className="agenda-cabecalho">{s}</div>)}
          </div>
          {grade.map((semana) => (
            <div role="row" className="agenda-linha" key={semana[0].data}>
              {semana.map(({ data, doMes }) => {
                const itens = porDia.get(data) ?? [];
                const nomeMes = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long' });
                return (
                  <button
                    type="button" role="gridcell" key={data} data-testid={`dia-${data}`}
                    className={`agenda-dia${doMes ? '' : ' agenda-dia--fora'}${data === hoje ? ' agenda-dia--hoje' : ''}${data === escolhido ? ' agenda-dia--escolhido' : ''}`}
                    aria-selected={data === escolhido}
                    aria-label={`${Number(data.slice(8))} de ${nomeMes}${itens.length ? `, ${itens.length} evento(s)` : ''}`}
                    onClick={() => setEscolhido(data)}
                  >
                    <span className="agenda-numero">{Number(data.slice(8))}</span>
                    {itens.slice(0, 2).map((i, n) => <span key={n} className={`agenda-evento agenda-evento--${i.tipo}`}>{i.texto}</span>)}
                    {itens.length > 2 && <span className="texto-pequeno texto-suave">+{itens.length - 2}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <p className="texto-pequeno texto-suave">No Google Agenda: Configurações › Importar e exportar › Importar, e escolha o arquivo baixado. É uma cópia de hoje, não uma sincronização.</p>
      </div>

      <div className="cartao" data-testid="agenda-dia-escolhido">
        <h2 className="titulo-secao">{escolhido.split('-').reverse().join('/')}</h2>
        {doDia.length === 0 ? (
          <EstadoVazio texto="Nada marcado neste dia." />
        ) : (
          <ul className="lista-limpa lista-divisoria texto-medio">
            {doDia.map((i, n) => <li key={n}>{i.tipo === 'vistoria' ? 'Vistoria' : 'Saída'}: {i.texto}</li>)}
          </ul>
        )}
      </div>

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
