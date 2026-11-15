// Configurações: por enquanto, só as preferências dos mascotes (principal e nomes).
// A escolha é visual: não muda permissões, dados nem capacidades do sistema.

import { useState } from 'react';
import { Mascote, MASCOTES, type EspecieMascote } from '../../compartilhado/Mascote.tsx';
import {
  escolherPrincipal,
  nomearMascote,
  TAMANHO_MAXIMO_NOME,
  usePreferenciasMascote,
  usePreferenciasSoNaMemoria,
} from '../../compartilhado/preferencias-mascote.ts';

// O campo guarda o texto como foi digitado (com espaços no meio da digitação);
// a preferência gravada é sempre a versão limpa.
function CampoNome({ especie, inicial }: { especie: EspecieMascote; inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const m = MASCOTES[especie];
  return (
    <label className="campo-grupo">
      <span>Nome do mascote</span>
      <input
        className="campo"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          nomearMascote(especie, e.target.value);
        }}
        placeholder={m.nome}
        maxLength={TAMANHO_MAXIMO_NOME}
        aria-label={`Nome do mascote ${m.nome}`}
        autoComplete="off"
      />
    </label>
  );
}

export function Configuracoes() {
  const preferencias = usePreferenciasMascote();
  const soNaMemoria = usePreferenciasSoNaMemoria();
  const especies = Object.keys(MASCOTES) as EspecieMascote[];

  return (
    <section aria-labelledby="titulo-configuracoes" className="pagina pagina--media">
      <h1 id="titulo-configuracoes" className="titulo-pagina">Configurações</h1>

      <section aria-labelledby="titulo-mascotes" className="cartao configuracao-mascotes">
        <div>
          <h2 id="titulo-mascotes"><strong>Mascotes</strong></h2>
          <p className="texto-suave texto-medio">
            Escolha o mascote principal e, se quiser, dê um nome a cada um. É só uma preferência visual, guardada neste
            navegador: não muda permissões, dados nem o que o sistema faz.
          </p>
        </div>

        {soNaMemoria && (
          <p role="alert" className="aviso" data-testid="aviso-preferencias-sem-gravacao">
            Este navegador não deixou gravar as preferências (armazenamento bloqueado, cheio ou em modo privado). As mudanças
            valem só até fechar ou recarregar a página.
          </p>
        )}

        <ul className="lista-limpa opcoes-mascote">
          {especies.map((especie) => {
            const m = MASCOTES[especie];
            const principal = preferencias.principal === especie;
            return (
              <li key={especie} className={principal ? 'opcao-mascote opcao-mascote--principal' : 'opcao-mascote'} data-testid={`mascote-${especie}`}>
                <Mascote especie={especie} humor="tranquilo" tamanho={72} nome={preferencias.nomes[especie]} />
                <div className="opcao-mascote-campos">
                  <p>
                    <strong>{m.nome}</strong> <span className="texto-pequeno texto-suave">· {m.bioma}</span>
                  </p>
                  <CampoNome especie={especie} inicial={preferencias.nomes[especie] ?? ''} />
                  <label className="campo-grupo--linha">
                    <input
                      type="radio"
                      name="mascote-principal"
                      checked={principal}
                      onChange={() => escolherPrincipal(especie)}
                    />
                    <span>Usar como mascote principal</span>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="texto-pequeno texto-suave">
          Sem nome, o mascote usa o nome da espécie. As mudanças são gravadas na hora (até {TAMANHO_MAXIMO_NOME} caracteres por nome).
        </p>
      </section>
    </section>
  );
}
