// Aviso do ponto com dados digitados que não puderam ser lidos (guardados em `ponto.quarentena`, nunca descartados sozinhos).

import { useState } from 'react';
import { baixar } from '../../compartilhado/baixar.ts';
import { descartarQuarentenaDoPonto } from './armazem.ts';
import type { Operacao, Ponto } from './modelo.ts';

export function QuarentenaDoPonto({ operacao, ponto, rotulo }: { operacao: Operacao; ponto: Ponto; rotulo: string }) {
  const [aberto, setAberto] = useState(false);
  const campos = Object.entries(ponto.quarentena ?? {});
  if (campos.length === 0) return null;
  const texto = JSON.stringify(ponto.quarentena, null, 2);
  return (
    <div className="aviso" role="status" data-testid={`quarentena-${ponto.id}`}>
      <p>
        Há dados que não puderam ser lidos: {campos.map(([c]) => c).join(', ')}.{' '}
        <button type="button" className="botao botao--pequeno" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>Ver/recuperar</button>
      </p>
      {aberto && (
        <>
          <p className="texto-pequeno">O conteúdo está guardado como foi gravado. Copie ou baixe para refazer o preenchimento; só descarte depois de recuperar.</p>
          {campos.map(([campo, valor]) => (
            <label key={campo} className="campo-grupo">
              <span>{campo}</span>
              <textarea className="campo campo--area" readOnly rows={6} aria-label={`Conteúdo não lido: ${campo} do ${rotulo}`} value={JSON.stringify(valor, null, 2)} />
            </label>
          ))}
          <div className="acoes">
            <button type="button" className="botao botao--pequeno" onClick={() => baixar(`quarentena-${(ponto.codigo ?? rotulo).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, texto)}>Baixar .json</button>
            <button
              type="button" className="botao botao--pequeno botao--perigo"
              onClick={() => { if (window.confirm('Descartar o conteúdo ilegível deste ponto? Só faça isso se já recuperou ou baixou.')) descartarQuarentenaDoPonto(operacao.id, ponto.id); }}
            >Descartar</button>
          </div>
        </>
      )}
    </div>
  );
}
