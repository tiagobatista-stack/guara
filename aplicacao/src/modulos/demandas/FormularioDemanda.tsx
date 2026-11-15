import { useState, type FormEvent } from 'react';
import { LIMITES, PRIORIDADES, STATUS, type EntradaDemanda } from './modelo.ts';
import { validarEntrada, type ErrosValidacao } from './regras.ts';
import { textoMotivo, type Parecida } from './parecida.ts';
import { NUMEROS, ROTULOS_NUMERO } from './identificadores.ts';
import { formatarDecimal, formatarGms, lerCoordenada } from './coordenadas.ts';
import {
  deduzirNatureza, deduzirTipo, NATUREZAS, ROTULOS_NATUREZA, ROTULOS_TIPO, textoPorque, TIPOS,
  type Deducao, type Natureza, type Tipo,
} from './classificacao.ts';

const EXEMPLO_NUMERO = { processo: 'FIC-2026-0001', simp: 'NNNNNN-NNN/AAAA', judicial: 'NNNNNNN-DD.AAAA.J.TR.OOOO' } as const;

export const ENTRADA_VAZIA: EntradaDemanda = {
  titulo: '',
  descricao: '',
  responsavel: '',
  prioridade: 'Média',
  status: 'A Fazer',
  prazo: '',
  processo: '',
  simp: '',
  judicial: '',
};

interface Props {
  titulo: string;
  inicial: EntradaDemanda;
  /** Devolve os erros de validação ou null quando gravou com sucesso. */
  aoSalvar: (entrada: EntradaDemanda) => ErrosValidacao | null;
  aoCancelar: () => void;
  /** Só no cadastro: procura demanda em aberto parecida antes de gravar. */
  verificarParecida?: (entrada: EntradaDemanda) => Parecida | null;
  /** Abre a demanda parecida (descarta o cadastro em andamento). */
  aoVerExistente?: (id: string) => void;
  /** Só no cadastro: preenche tipo e natureza pelo título enquanto a pessoa não os escolhe. */
  deduzirAoDigitar?: boolean;
}

type Classe = 'tipo' | 'natureza';

/** Tipo e natureza deduzidos da entrada (a natureza usa o tipo já escolhido, ou o deduzido). */
function deducoes(e: EntradaDemanda): { tipo: Deducao<Tipo>; natureza: Deducao<Natureza> } {
  const tipo = deduzirTipo(e.titulo);
  const temNumero = NUMEROS.some((c) => (e[c] ?? '').trim() !== '');
  return { tipo, natureza: deduzirNatureza(e.titulo, { temNumero, tipo: e.tipo ?? tipo.valor }) };
}

export function FormularioDemanda({ titulo, inicial, aoSalvar, aoCancelar, verificarParecida, aoVerExistente, deduzirAoDigitar }: Props) {
  const [entrada, setEntrada] = useState<EntradaDemanda>(inicial);
  const [erros, setErros] = useState<ErrosValidacao>({});
  const [parecida, setParecida] = useState<Parecida | null>(null);
  // Escolha da pessoa vale mais que a dedução: depois de mexer no campo, o título não o muda mais.
  const [escolhidos, setEscolhidos] = useState<Record<Classe, boolean>>({ tipo: false, natureza: false });

  // Mexer em qualquer campo retira o aviso: a próxima tentativa compara de novo.
  // `escolhido` marca o campo que a pessoa acabou de escolher (o estado `escolhidos` só muda no próximo render).
  const campo = <K extends keyof EntradaDemanda>(k: K, v: EntradaDemanda[K], escolhido?: Classe) => {
    setParecida(null);
    const fixos = escolhido ? { ...escolhidos, [escolhido]: true } : escolhidos;
    setEntrada((e) => {
      const nova = { ...e, [k]: v };
      if (!deduzirAoDigitar) return nova;
      const tipo = fixos.tipo ? nova.tipo : deduzirTipo(nova.titulo).valor ?? undefined;
      const comTipo = { ...nova, tipo };
      const natureza = fixos.natureza ? nova.natureza : deducoes(comTipo).natureza.valor ?? undefined;
      return { ...comTipo, natureza };
    });
  };

  const escolher = (c: Classe, valor: string) => {
    setEscolhidos((x) => ({ ...x, [c]: true }));
    if (c === 'tipo') campo('tipo', (valor || undefined) as Tipo | undefined, 'tipo');
    else campo('natureza', (valor || undefined) as Natureza | undefined, 'natureza');
  };

  const sugestoes = deducoes(entrada);
  const dica = (c: Classe, rotulos: Record<string, string>) => {
    const d = sugestoes[c];
    const atual = entrada[c];
    if (atual && atual === d.valor && !escolhidos[c]) {
      return <span className="texto-pequeno texto-suave" data-testid={`dica-${c}`}>Deduzido do título, {textoPorque(d)}. Troque se estiver errado.</span>;
    }
    if (!atual && d.valor) {
      return (
        <span className="texto-pequeno texto-suave" data-testid={`dica-${c}`}>
          Sugestão pelo título: {rotulos[d.valor]} ({textoPorque(d)}).{' '}
          <button type="button" className="botao botao--pequeno" onClick={() => escolher(c, d.valor!)}>Usar</button>
        </span>
      );
    }
    if (!atual && entrada.titulo.trim()) {
      return <span className="texto-pequeno texto-suave" data-testid={`dica-${c}`}>Não deu para deduzir pelo título: escolha, se souber.</span>;
    }
    return null;
  };

  const salvar = () => {
    setParecida(null);
    const r = aoSalvar(entrada);
    setErros(r ?? {});
  };

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    // Entrada inválida mostra os erros primeiro; o aviso só vale para o que poderia ser gravado.
    if (verificarParecida && Object.keys(validarEntrada(entrada)).length === 0) {
      const p = verificarParecida(entrada);
      if (p) {
        setErros({});
        setParecida(p);
        return;
      }
    }
    salvar();
  };

  // Mostra, enquanto se digita, o que foi entendido; o erro de verdade só aparece ao gravar.
  const retornoCoordenada = () => {
    const texto = (entrada.coordenada ?? '').trim();
    if (!texto || erros.coordenada) return null;
    const r = lerCoordenada(texto);
    if (!r.ok) return <span className="texto-pequeno texto-suave" data-testid="leitura-coordenada">Ainda não entendi: {r.erro}</span>;
    return (
      <span className="texto-pequeno" data-testid="leitura-coordenada">
        Entendido: {formatarGms(r.valor)} ({formatarDecimal(r.valor)}, SIRGAS 2000).
        {r.avisos.map((a) => <span key={a} className="texto--atencao"> ⚠ {a}</span>)}
        {r.trocaSugerida && (
          <>
            {' '}
            <button type="button" className="botao botao--pequeno" onClick={() => campo('coordenada', formatarDecimal({ lat: r.valor.lon, lon: r.valor.lat }))}>
              Trocar a ordem
            </button>
          </>
        )}
      </span>
    );
  };

  const ajuda = (k: keyof EntradaDemanda) =>
    erros[k] ? { 'aria-invalid': true, 'aria-describedby': `erro-${k}` } : {};
  const mensagem = (k: keyof EntradaDemanda) =>
    erros[k] ? <span id={`erro-${k}`} className="erro-campo">{erros[k]}</span> : null;

  return (
    <form className="cartao formulario" onSubmit={enviar} noValidate aria-labelledby="titulo-formulario">
      <h2 id="titulo-formulario" className="titulo-secao">{titulo}</h2>

      <label className="campo-grupo">
        <span>Título *</span>
        <input className="campo" value={entrada.titulo} maxLength={LIMITES.tituloMax + 10}
          onChange={(e) => campo('titulo', e.target.value)} {...ajuda('titulo')} />
        {mensagem('titulo')}
      </label>

      <label className="campo-grupo">
        <span>Descrição</span>
        <textarea className="campo campo--area" value={entrada.descricao} rows={3}
          onChange={(e) => campo('descricao', e.target.value)} {...ajuda('descricao')} />
        {mensagem('descricao')}
      </label>

      <div className="grade grade--2">
        <label className="campo-grupo">
          <span>Responsável</span>
          <input className="campo" value={entrada.responsavel}
            onChange={(e) => campo('responsavel', e.target.value)} {...ajuda('responsavel')} />
          {mensagem('responsavel')}
        </label>
        <label className="campo-grupo">
          <span>Prazo (opcional)</span>
          <input className="campo" type="date" value={entrada.prazo}
            onChange={(e) => campo('prazo', e.target.value)} {...ajuda('prazo')} />
          {mensagem('prazo')}
        </label>
        <label className="campo-grupo">
          <span>Prioridade</span>
          <select className="campo" value={entrada.prioridade}
            onChange={(e) => campo('prioridade', e.target.value as EntradaDemanda['prioridade'])}>
            {PRIORIDADES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="campo-grupo">
          <span>Status</span>
          <select className="campo" value={entrada.status}
            onChange={(e) => campo('status', e.target.value as EntradaDemanda['status'])}>
            {STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="grade grade--2">
        <div className="campo-grupo">
          <label className="campo-grupo">
            <span>Tipo</span>
            <select className="campo" value={entrada.tipo ?? ''} onChange={(e) => escolher('tipo', e.target.value)} {...ajuda('tipo')}>
              <option value="">Não definido</option>
              {TIPOS.map((t) => <option key={t} value={t}>{ROTULOS_TIPO[t]}</option>)}
            </select>
          </label>
          {dica('tipo', ROTULOS_TIPO)}
          {mensagem('tipo')}
        </div>
        <div className="campo-grupo">
          <label className="campo-grupo">
            <span>Natureza</span>
            <select className="campo" value={entrada.natureza ?? ''} onChange={(e) => escolher('natureza', e.target.value)} {...ajuda('natureza')}>
              <option value="">Não definida</option>
              {NATUREZAS.map((n) => <option key={n} value={n}>{ROTULOS_NATUREZA[n]}</option>)}
            </select>
          </label>
          {dica('natureza', ROTULOS_NATUREZA)}
          {mensagem('natureza')}
        </div>
      </div>

      {entrada.tipo === 'campo' && (
        <fieldset className="campo-grupo" data-testid="bloco-vistoria" aria-describedby={erros.vistoria ? 'erro-vistoria' : undefined}>
          <legend className="texto-medio">Vistoria *</legend>
          <span className="texto-pequeno texto-suave">
            Informe a data prevista ou deixe em aberto, se a demanda ainda não foi encaixada numa vistoria.
          </span>
          <label>
            <input type="radio" name="vistoria" checked={entrada.vistoria === 'data'} onChange={() => campo('vistoria', 'data')} /> Informar a data
          </label>
          {entrada.vistoria === 'data' && (
            <label className="campo-grupo">
              <span>Data da vistoria</span>
              <input className="campo" type="date" value={entrada.vistoriaData ?? ''}
                onChange={(e) => campo('vistoriaData', e.target.value)} {...ajuda('vistoriaData')} />
              {mensagem('vistoriaData')}
            </label>
          )}
          <label>
            <input type="radio" name="vistoria" checked={entrada.vistoria === 'aberta'} onChange={() => campo('vistoria', 'aberta')} /> Vistoria em aberto
          </label>
          {mensagem('vistoria')}
        </fieldset>
      )}

      <fieldset className="grade grade--2">
        <legend className="texto-medio">Números (opcionais)</legend>
        {NUMEROS.map((c) => (
          <label key={c} className="campo-grupo">
            <span>{ROTULOS_NUMERO[c]}</span>
            <input className="campo mono" value={entrada[c] ?? ''} placeholder={EXEMPLO_NUMERO[c]} autoComplete="off" spellCheck={false}
              onChange={(e) => campo(c, e.target.value)} {...ajuda(c)} />
            {mensagem(c)}
          </label>
        ))}
      </fieldset>

      <div className="campo-grupo">
        <label htmlFor="campo-coordenada">Coordenada (opcional)</label>
        <input id="campo-coordenada" className="campo mono" value={entrada.coordenada ?? ''} placeholder="Ex.: -15.5, -55.5 ou 15° 30' S, 55° 30' W" autoComplete="off" spellCheck={false}
          onChange={(e) => campo('coordenada', e.target.value)} {...ajuda('coordenada')} />
        {mensagem('coordenada')}
        {retornoCoordenada()}
        <span className="texto-pequeno texto-suave">
          Graus decimais, graus-minutos-segundos ou graus e minutos, com sinal ou com N/S/E/W (L e O também). A coordenada pode identificar
          um imóvel: não aparece na tela compartilhada.
        </span>
      </div>

      {parecida && (
        <div role="alert" className="aviso" data-testid="aviso-parecida">
          <p>
            <strong>Já existe uma demanda em aberto parecida:</strong> “{parecida.demanda.titulo}” ({parecida.demanda.status}; {textoMotivo(parecida)}).
            Criar outra mesmo assim?
          </p>
          <div className="acoes">
            <button type="button" className="botao" onClick={salvar}>Criar mesmo assim</button>
            {aoVerExistente && (
              <button type="button" className="botao" onClick={() => aoVerExistente(parecida.demanda.id)}>Ver a existente (descarta este cadastro)</button>
            )}
            <button type="button" className="botao" onClick={() => setParecida(null)}>Continuar editando</button>
          </div>
        </div>
      )}

      <div className="acoes">
        <button type="submit" className="botao botao--primario">Salvar</button>
        <button type="button" className="botao" onClick={aoCancelar}>Cancelar</button>
      </div>
    </form>
  );
}
