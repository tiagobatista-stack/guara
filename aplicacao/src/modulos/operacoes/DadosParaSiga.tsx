// Painel "Dados para o SIGA": os campos da capa do Relatório Técnico do SIGA-MT, na ordem da capa, cada um com [Copiar], e as Constatações geradas.

import { useState } from 'react';
import type { Operacao, Ponto } from './modelo.ts';
import { textoDoRelatorio } from './relatorio.ts';
import { dataBr } from './relatorio-util.ts';
import { ESTRUTURA } from './relatorio-frases.ts';
import { LIMITE_TEXTO_SIGA, UF, atividadeDoPonto, atividadeSugerida, coordenadaSiga, equipeSiga, objetivoDoPonto, objetivoSugerido } from './siga.ts';

export function DadosParaSiga({ operacao, ponto, rotulo, nomeArquivo, aoMudar, aoBaixar, aoFechar }: {
  operacao: Operacao; ponto: Ponto; rotulo: string; nomeArquivo: string;
  aoMudar: (m: Pick<Ponto, 'siga'>) => void;
  aoBaixar: (nome: string, conteudo: string, tipo: string) => void;
  aoFechar: () => void;
}) {
  const [completo, setCompleto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const viagem = operacao.viagens.find((v) => v.id === ponto.viagem);
  const equipe = equipeSiga(viagem).map((e) => `${e.nome} – ${e.cargo || `[PENDENTE: cargo de ${e.nome}]`}`);
  const constatacoes = textoDoRelatorio(operacao, ponto, { completo });
  const copiar = async (rot: string, texto: string) => {
    try { await navigator.clipboard.writeText(texto); setAviso(`Copiado: ${rot}.`); } catch { setAviso('Este navegador não deixou copiar; selecione o texto e copie.'); }
  };
  const gravar = (k: 'atividade' | 'objetivo', valor: string, sugestao: string) => {
    const v = valor.replace(/\s+/g, ' ').trim();
    const { [k]: _antigo, ...resto } = ponto.siga ?? {};
    void _antigo;
    // Texto igual à sugestão ou vazio volta a seguir a sugestão (nada gravado).
    aoMudar({ siga: v === '' || v === sugestao ? resto : { ...resto, [k]: v } });
  };

  const fixo = (rot: string, valor: string) => (
    <div className="grade grade--topo" key={rot}>
      <span><strong>{rot}</strong></span>
      <span data-testid={`siga-${rot}`}>{valor || '—'}</span>
      <button type="button" className="botao botao--pequeno" aria-label={`Copiar ${rot}`} disabled={!valor} onClick={() => copiar(rot, valor)}>Copiar</button>
    </div>
  );
  const editavel = (rot: string, k: 'atividade' | 'objetivo', valor: string, sugestao: string) => (
    <div className="grade grade--topo" key={`${rot}|${valor}`}>
      <label className="campo-grupo"><span><strong>{rot}</strong> (editável{ponto.siga?.[k] !== undefined ? '; editado' : '; sugestão'})</span>
        <input className="campo" defaultValue={valor} maxLength={LIMITE_TEXTO_SIGA} autoComplete="off" onBlur={(e) => { if (e.target.value !== valor) gravar(k, e.target.value, sugestao); }} /></label>
      <button type="button" className="botao botao--pequeno" aria-label={`Copiar ${rot}`} onClick={() => copiar(rot, valor)}>Copiar</button>
    </div>
  );

  const lavrados = (ponto.lavrados ?? []).map((d) => `${d.tipo} n.º ${d.numero}${d.data ? `, ${dataBr(d.data)}` : ''}`);
  return (
    <section aria-label={`Dados para o SIGA do ${rotulo}`} data-testid={`dados-siga-${ponto.id}`}>
      <h4 className="titulo-secao titulo-secao--bloco">Dados para o SIGA</h4>
      <p className="texto-pequeno texto-suave">Na ordem da capa do Relatório Técnico do SIGA-MT. Confira cada campo antes de colar.</p>
      {fixo('Latitude (S)', coordenadaSiga(ponto.coordenada.lat))}
      {fixo('Longitude (W)', coordenadaSiga(ponto.coordenada.lon))}
      {fixo('Município / UF', `${ponto.municipio} / ${UF}`)}
      {editavel('Atividade', 'atividade', atividadeDoPonto(ponto), atividadeSugerida(ponto.tipoDano))}
      {editavel('Objetivo', 'objetivo', objetivoDoPonto(operacao, ponto), objetivoSugerido(operacao, ponto))}
      {lavrados.length === 0 ? fixo('Autos/Termos lavrados', '') : lavrados.map((l, i) => fixo(`Autos/Termos lavrados ${i + 1}`, l))}
      {equipe.length === 0 ? fixo('Equipe técnica', '') : equipe.map((e, i) => fixo(`Equipe técnica ${i + 1}`, e))}
      <h5 className="titulo-secao titulo-secao--bloco">{ESTRUTURA.constatacoes}</h5>
      <label className="campo-grupo--linha texto-pequeno">
        <input type="checkbox" checked={completo} onChange={(e) => setCompleto(e.target.checked)} /> <span>Incluir equipe e lavrados no texto</span>
      </label>
      <textarea className="campo campo--area" readOnly rows={16} aria-label={`Relatório (texto) do ${rotulo}`} value={constatacoes} />
      <div className="acoes">
        <button type="button" className="botao botao--pequeno botao--primario" aria-label="Copiar Constatações" onClick={() => copiar('Constatações', constatacoes)}>Copiar</button>
        <button type="button" className="botao botao--pequeno" onClick={() => aoBaixar(nomeArquivo, constatacoes, 'text/plain;charset=utf-8')}>Baixar .txt</button>
        <button type="button" className="botao botao--pequeno botao--sutil" onClick={aoFechar}>Fechar</button>
      </div>
      {aviso && <p role="status" className="texto-pequeno">{aviso}</p>}
    </section>
  );
}
