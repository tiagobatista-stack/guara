// Seção "Texto para o relatório" do detalhe da demanda: mostra o contexto do processo e copia para colar no relatório.
// O texto sai de contexto-relatorio.ts (lista branca); aqui só a escolha do ponto ligado, a cópia e os avisos.

import { useMemo, useState } from 'react';
import type { Demanda } from './modelo.ts';
import { contextoDoRelatorio, escolherVinculo } from './contexto-relatorio.ts';
import { useOperacoes } from '../operacoes/armazem.ts';
import { vinculosDasDemandas } from '../operacoes/regras.ts';

const lista = (itens: string[]) => (itens.length > 1 ? `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}` : itens[0]);

export function ContextoDoRelatorio({ demanda }: { demanda: Demanda }) {
  const operacoes = useOperacoes();
  const vinculos = useMemo(() => vinculosDasDemandas(operacoes).get(demanda.id) ?? [], [operacoes, demanda.id]);
  const vinculo = escolherVinculo(vinculos);
  const { texto, faltam } = contextoDoRelatorio(demanda, vinculo);
  const [aviso, setAviso] = useState<string | null>(null);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso(faltam.length ? `Texto copiado. Complete no relatório os marcadores entre colchetes.` : 'Texto copiado.');
    } catch {
      setAviso('Este navegador não deixou copiar; selecione o texto abaixo e copie.');
    }
  };

  return (
    <section className="bloco-detalhe" aria-labelledby="titulo-contexto-relatorio" data-testid="contexto-relatorio">
      <h3 id="titulo-contexto-relatorio" className="titulo-secao titulo-secao--bloco">Texto para o relatório</h3>
      <p className="texto-pequeno texto-suave">
        Contexto do processo montado com os dados da demanda{vinculo ? ' e do ponto de operação ligado' : ''}. Status, responsável, bloqueio e anotações não entram.
        Confira antes de colar: a redação final e a assinatura são do analista.
      </p>
      {vinculos.length > 1 && (
        <p className="texto-pequeno" data-testid="contexto-varios-pontos">
          A demanda está ligada a {vinculos.length} pontos; o texto usa o {vinculo?.ponto.situacao === 'vistoriado' ? 'primeiro vistoriado' : 'primeiro da lista'} ({vinculo?.operacao.nome}).
        </p>
      )}
      {faltam.length > 0 && (
        <p className="aviso texto-pequeno" data-testid="contexto-faltam">Falta{faltam.length > 1 ? 'm' : ''}: {lista(faltam)}. Ficam marcados entre colchetes no texto.</p>
      )}
      <textarea className="campo mono" readOnly rows={10} value={texto} aria-label="Contexto do processo para o relatório" data-testid="contexto-texto" />
      <div className="acoes">
        <button type="button" className="botao" onClick={() => void copiar()}>Copiar texto para o relatório</button>
      </div>
      {aviso && <p role="status" className="texto-pequeno" data-testid="contexto-aviso">{aviso}</p>}
    </section>
  );
}
