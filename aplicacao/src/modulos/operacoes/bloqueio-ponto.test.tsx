// Bloqueio do ponto (regra compartilhada com a demanda) e "Gerar códigos" (18/11/2026).

import { fireEvent, render, screen, within } from '@testing-library/react';
import { BloqueioDoItem } from '../../compartilhado/BloqueioDoItem.tsx';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { MOTIVOS_BLOQUEIO } from '../demandas/modelo.ts';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, destravarPonto, gerarCodigos, incluirPontos, obterOperacoes, registrarRelatorio, registrarResultado, travarPonto } from './armazem.ts';
import { CHAVE_OPERACOES } from './modelo.ts';
import { pendenciasDeCampo, planejarCodigos, progressoDaOperacao, validarListaOperacoes } from './regras.ts';
import { corDaSituacao, itensDoMapa, rotuloDaSituacao } from '../mapa/regras.ts';

const HOJE = '2026-11-18';
const ponto = (municipio = 'Brasnorte') => ({ coordenada: { lat: -12.1, lon: -58.2 }, municipio, notas: '', demandas: [], situacao: 'planejado' as const, equipe: 'A', saida: '2026-10-05', retorno: '2026-10-09' });
const envio = { enviadoEm: '2026-11-10', protocoloSiga: '', notas: '' };
const sim = { resultado: 'sim' as const, motivo: '', protocolo: '', observacao: '', dataVistoria: '' };
beforeEach(() => localStorage.clear());

function operacao(nome = 'Op', inicio = '2026-10-05', n = 2) {
  const r = criarOperacao({ nome, inicio, fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação não criada');
  incluirPontos(r.id, Array.from({ length: n }, () => ponto()));
  return r.id;
}
/** Grava as operações com a troca dada nos pontos (a gravação normal completa os códigos sozinha). */
function regravar(troca: (p: Record<string, unknown>, operacaoId: string) => Record<string, unknown>) {
  localStorage.setItem(CHAVE_OPERACOES, JSON.stringify(obterOperacoes().map((o) => ({ ...o, pontos: o.pontos.map((p) => troca({ ...p }, o.id)) }))));
}
const semCodigos = () => regravar((p) => { delete p.codigo; return p; });
const montarTela = () => {
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
};

describe('BloqueioDoItem (comum a demanda e ponto)', () => {
  it.each(['demanda', 'ponto'] as const)('item %s: motivo novo, aviso de dado pessoal, marcar e destravar', (item) => {
    const aoTravar = vi.fn();
    const aoDestravar = vi.fn();
    const { rerender } = render(<BloqueioDoItem item={item} aoTravar={aoTravar} aoDestravar={aoDestravar} />);
    expect(screen.getByText(/Não registre CPF, endereço ou nome do autuado aqui\./)).toBeInTheDocument();
    expect(within(screen.getByLabelText('Motivo do bloqueio')).getByRole('option', { name: MOTIVOS_BLOQUEIO.autuado })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Motivo do bloqueio'), { target: { value: 'autuado' } });
    fireEvent.change(screen.getByLabelText('Detalhe do bloqueio (opcional)'), { target: { value: '  aguardando   a polícia ' } });
    fireEvent.click(screen.getByRole('button', { name: item === 'demanda' ? 'Marcar como travada' : 'Marcar como travado' }));
    expect(aoTravar).toHaveBeenCalledWith('autuado', 'aguardando a polícia', 'marcar');
    rerender(<BloqueioDoItem item={item} bloqueio={{ motivo: 'autuado', desde: '2026-11-01T00:00:00Z' }} aoTravar={aoTravar} aoDestravar={aoDestravar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Destravou' }));
    expect(aoDestravar).toHaveBeenCalled();
  });

  it('detalhe acima de 300 caracteres: mostra o erro e não grava', () => {
    const aoTravar = vi.fn();
    render(<BloqueioDoItem item="ponto" aoTravar={aoTravar} aoDestravar={() => {}} />);
    fireEvent.change(screen.getByLabelText('Detalhe do bloqueio (opcional)'), { target: { value: 'x'.repeat(301) } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como travado' }));
    expect(screen.getByRole('alert')).toHaveTextContent('no máximo 300');
    expect(aoTravar).not.toHaveBeenCalled();
  });
});

describe('bloqueio do ponto: regra', () => {
  it('trava e destrava sem mudar a situação; "desde" se mantém ao atualizar', () => {
    const id = operacao();
    const p = obterOperacoes()[0].pontos[0];
    registrarResultado(id, p.id, sim, HOJE);
    expect(travarPonto(id, p.id, 'autuado', 'ofício enviado', '2026-11-10T12:00:00Z')).toBeNull();
    expect(obterOperacoes()[0].pontos[0]).toMatchObject({ resultado: 'sim', bloqueio: { motivo: 'autuado', desde: '2026-11-10T12:00:00Z', detalhe: 'ofício enviado' } });
    travarPonto(id, p.id, 'outro', '', '2026-11-17T12:00:00Z');
    expect(obterOperacoes()[0].pontos[0].bloqueio).toEqual({ motivo: 'outro', desde: '2026-11-10T12:00:00Z' });
    expect(destravarPonto(id, p.id)).toBeNull();
    expect(obterOperacoes()[0].pontos[0]).toMatchObject({ resultado: 'sim' });
    expect(obterOperacoes()[0].pontos[0].bloqueio).toBeUndefined();
  });

  it('ponto cancelado não é travado; bloqueio inválido é recusado na leitura', () => {
    const id = operacao();
    const [p] = obterOperacoes()[0].pontos;
    regrava_cancelado();
    expect(travarPonto(id, p.id, 'autuado', '', '2026-11-10T12:00:00Z')).toMatch(/cancelado/);
    const o = obterOperacoes()[0];
    expect(validarListaOperacoes([{ ...o, pontos: [{ ...o.pontos[0], bloqueio: { motivo: 'inventado', desde: 'x' } }] }])).toEqual([]);
  });

  it('selo: campo encerrado com elaboração ou com ponto travado; encerrada só com tudo concluído e sem bloqueio', () => {
    const id = operacao();
    const [p1, p2] = obterOperacoes()[0].pontos;
    for (const p of [p1, p2]) registrarResultado(id, p.id, sim, HOJE);
    expect(progressoDaOperacao(obterOperacoes()[0], HOJE)).toMatchObject({ selo: 'campo-encerrado', emElaboracao: 2, concluidos: 0, travados: 0 });
    for (const p of [p1, p2]) registrarRelatorio(id, p.id, envio, HOJE);
    expect(progressoDaOperacao(obterOperacoes()[0], HOJE)).toMatchObject({ selo: 'encerrada', concluidos: 2, travados: 0, aFinalizar: 0 });
    travarPonto(id, p1.id, 'autuado', '', '2026-11-10T12:00:00Z');
    expect(progressoDaOperacao(obterOperacoes()[0], HOJE)).toMatchObject({ selo: 'campo-encerrado', travados: 1, encerrados: 2, aFinalizar: 0 });
    destravarPonto(id, p1.id);
    expect(progressoDaOperacao(obterOperacoes()[0], HOJE).selo).toBe('encerrada');
  });

  it('ponto travado continua vencido (o bloqueio não suspende o prazo) e entra na lista de travados', () => {
    const id = operacao();
    const [p1] = obterOperacoes()[0].pontos;
    travarPonto(id, p1.id, 'campo', '', '2026-11-10T12:00:00Z');
    const r = pendenciasDeCampo(obterOperacoes(), HOJE);
    expect([r.semResultado.length, r.travados.length]).toEqual([2, 1]);
    expect(progressoDaOperacao(obterOperacoes()[0], HOJE)).toMatchObject({ aFinalizar: 2, vencidos: 2, travados: 1 });
  });

  it('mapa: ponto travado leva o motivo e o detalhe e segue vencido', () => {
    const id = operacao();
    const [p1] = obterOperacoes()[0].pontos;
    travarPonto(id, p1.id, 'autuado', 'aguardando a polícia', '2026-11-10T12:00:00Z');
    const { noMapa } = itensDoMapa([], obterOperacoes(), HOJE);
    expect(noMapa.find((i) => i.id === p1.id)).toMatchObject({ travado: { motivo: 'aguardando dados do autuado', detalhe: 'aguardando a polícia' }, vencido: true });
    expect(noMapa.find((i) => i.id !== p1.id)?.travado).toBeUndefined();
  });

  it('mapa: cor e rótulo pela fase (em elaboração diferente de concluído)', () => {
    const id = operacao();
    const [p1, p2] = obterOperacoes()[0].pontos;
    registrarResultado(id, p1.id, sim, HOJE);
    registrarResultado(id, p2.id, sim, HOJE);
    registrarRelatorio(id, p2.id, envio, HOJE);
    const { noMapa } = itensDoMapa([], obterOperacoes(), HOJE);
    const [a, b] = [p1, p2].map((p) => noMapa.find((i) => i.id === p.id)!);
    expect([a.situacao, b.situacao]).toEqual(['elaboracao', 'concluido']);
    expect(corDaSituacao('elaboracao')).not.toBe(corDaSituacao('concluido'));
    expect([rotuloDaSituacao(a), rotuloDaSituacao(b)]).toEqual(['em elaboração', 'concluído']);
  });
});

function regrava_cancelado() {
  regravar((p) => ({ ...p, situacao: 'cancelado' }));
}

describe('uma regra só para vencido e travado', () => {
  it('1 vencido sem bloqueio e 2 com bloqueio: vencidos 3, travados 2 no progresso, no aviso, no mapa e no cartão', () => {
    const id = operacao('Brasnorte', '2026-10-05', 3);
    const [, p2, p3] = obterOperacoes()[0].pontos;
    travarPonto(id, p2.id, 'autuado', '', '2026-11-10T12:00:00Z');
    travarPonto(id, p3.id, 'campo', '', '2026-10-01T12:00:00Z');
    expect(progressoDaOperacao(obterOperacoes()[0], HOJE)).toMatchObject({ vencidos: 3, travados: 2 });
    const aviso = pendenciasDeCampo(obterOperacoes(), HOJE);
    expect(aviso.semResultado).toHaveLength(3);
    expect(aviso.travados.map((x) => x.ponto.id)).toEqual([p3.id, p2.id]); // do mais antigo ao mais recente
    const { noMapa } = itensDoMapa([], obterOperacoes(), HOJE);
    expect([noMapa.filter((i) => i.vencido).length, noMapa.filter((i) => i.travado).length]).toEqual([3, 2]);
    montarTela();
    expect(screen.getByTestId(`progresso-${id}`)).toHaveTextContent('2 travado(s)');
    expect(screen.getByTestId(`progresso-${id}`)).toHaveTextContent('3 vencido(s)');
    expect(screen.getByTestId('pendencias-campo')).toHaveTextContent('3 ponto(s) sem resultado');
    const grupo = screen.getByTestId(`travados-${id}`);
    expect(within(grupo).getAllByRole('listitem').map((li) => li.getAttribute('data-testid'))).toEqual([`travado-${p3.id}`, `travado-${p2.id}`]);
    expect(screen.getByTestId(`travado-${p3.id}`)).toHaveTextContent('depende de campo · parado há 48 dias');
    expect(screen.getByTestId(`travado-${p2.id}`)).toHaveTextContent('aguardando dados do autuado · parado há 8 dias');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
    expect(screen.getByTestId('pendencias-operacao')).toHaveTextContent('3 ponto(s) sem resultado');
    expect(screen.getByTestId('pendencias-operacao')).toHaveTextContent('2 ponto(s) travado(s)');
  });
});

describe('Gerar códigos', () => {
  it('planejarCodigos: gera, deixa de fora conflito e falta de dado, nunca troca código existente', () => {
    operacao('Outra', '2026-10-05', 1); // já tem BRASNORTE202610-01
    const id = operacao('Esta', '2026-10-05', 3);
    semCodigos();
    const [a, b, c] = obterOperacoes().find((o) => o.id === id)!.pontos;
    regravar((p, oid) => {
      if (oid !== id) return { ...p, codigo: 'BRASNORTE202610-01' };
      return p.id === c.id ? { ...p, municipio: '' } : p;
    });
    const esta = () => obterOperacoes().find((o) => o.id === id)!;
    const plano = planejarCodigos(esta(), obterOperacoes());
    expect(plano.gerar.map((g) => g.codigo)).toEqual(['BRASNORTE202610-02']);
    expect(plano.gerar[0].pontoId).toBe(b.id);
    expect(plano.fora).toEqual([
      { pontoId: a.id, rotulo: 'Ponto 1', motivo: expect.stringContaining('BRASNORTE202610-01 já existe (Outra)') },
      { pontoId: c.id, rotulo: 'Ponto 3', motivo: 'falta município' },
    ]);
    expect(gerarCodigos(id)).toBe(1);
    expect(esta().pontos.map((p) => p.codigo)).toEqual([undefined, 'BRASNORTE202610-02', undefined]);
    expect(gerarCodigos(id)).toBe(0);
  });

  it('tela: mostra a prévia; cancelar não muda nada e confirmar grava', () => {
    const id = operacao('Brasnorte', '2026-10-05', 2);
    semCodigos();
    montarTela();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
    expect(screen.getByTestId('sem-codigo')).toHaveTextContent('2 ponto(s) sem código');
    fireEvent.click(screen.getByRole('button', { name: 'Gerar códigos' }));
    const previa = screen.getByRole('list', { name: 'Códigos a gerar' });
    expect(previa).toHaveTextContent('Ponto 1 → BRASNORTE202610-01');
    expect(previa).toHaveTextContent('Ponto 2 → BRASNORTE202610-02');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(obterOperacoes().find((o) => o.id === id)!.pontos.every((p) => !p.codigo)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Gerar códigos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar 2 código(s)' }));
    expect(obterOperacoes().find((o) => o.id === id)!.pontos.map((p) => p.codigo)).toEqual(['BRASNORTE202610-01', 'BRASNORTE202610-02']);
    expect(screen.queryByTestId('sem-codigo')).toBeNull();
  });

  it('tela: ponto bloqueado mostra o motivo no cartão e na lista de travados, e a ajuda diz que o prazo não para', () => {
    const id = operacao('Brasnorte', '2026-10-05', 1);
    montarTela();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
    fireEvent.click(screen.getByRole('button', { name: 'Travar Ponto 1' }));
    expect(screen.getByText(/O bloqueio não suspende o prazo\./)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Motivo do bloqueio'), { target: { value: 'autuado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como travado' }));
    const p = obterOperacoes().find((o) => o.id === id)!.pontos[0];
    expect(screen.getByTestId(`bloqueio-${p.id}`)).toHaveTextContent('travado hoje: aguardando dados do autuado');
    expect(screen.getByTestId(`travado-${p.id}`)).toHaveTextContent('aguardando dados do autuado · parado desde hoje');
  });
});
