// Anotações em checklist da demanda e do ponto (18/11/2026): regra pura, componente nas duas telas, selo, confirmação ao concluir, exportações.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../modulos/demandas/armazem.ts';
import type { Demanda } from '../modulos/demandas/modelo.ts';
import { Demandas } from '../modulos/demandas/Demandas.tsx';
import { Kanban } from '../modulos/kanban/Kanban.tsx';
import { Operacoes } from '../modulos/operacoes/Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes, registrarResultado } from '../modulos/operacoes/armazem.ts';
import { exportarCsv, exportarGeoJson, exportarPlanilhaSema } from '../modulos/operacoes/exportar.ts';
import { itensDoMapa } from '../modulos/mapa/regras.ts';
import {
  adicionarAnotacao, alternarAnotacao, anotacoesValidas, contarAbertas, editarAnotacao, excluirAnotacao, LIMITES_ANOTACAO, ordenarAnotacoes, type Anotacao,
} from './anotacoes.ts';

const T0 = '2026-11-18T10:00:00.000Z';
const an = (id: string, texto: string, extra: Partial<Anotacao> = {}): Anotacao => ({ id, texto, feita: false, criadaEm: T0, ...extra });
beforeEach(() => localStorage.clear());

describe('regra das anotações', () => {
  it('texto: 1 a 200 caracteres, sem só espaços; espaços repetidos viram um', () => {
    expect(adicionarAnotacao([], '   ', T0, 'a')).toEqual({ ok: false, mensagem: 'Escreva a anotação.' });
    expect(adicionarAnotacao([], 'x'.repeat(201), T0, 'a')).toMatchObject({ ok: false });
    expect(adicionarAnotacao([], 'x'.repeat(200), T0, 'a').ok).toBe(true);
    expect(adicionarAnotacao(undefined, '  pedir   ofício  ', T0, 'a')).toEqual({ ok: true, lista: [{ id: 'a', texto: 'pedir ofício', feita: false, criadaEm: T0 }] });
    expect(editarAnotacao([an('a', 'x')], 'a', ' ')).toMatchObject({ ok: false });
  });

  it('limite de 50 itens por demanda ou ponto', () => {
    const cheia = Array.from({ length: LIMITES_ANOTACAO.itens }, (_, i) => an(`i${i}`, `n${i}`));
    expect(adicionarAnotacao(cheia, 'mais uma', T0, 'z')).toMatchObject({ ok: false });
    expect(anotacoesValidas(cheia)).toBe(true);
    expect(anotacoesValidas([...cheia, an('z', 'z')])).toBe(false);
  });

  it('marcar grava feitaEm e desmarcar apaga', () => {
    const marcada = alternarAnotacao([an('a', 'x')], 'a', '2026-11-19T08:00:00.000Z');
    expect(marcada[0]).toMatchObject({ feita: true, feitaEm: '2026-11-19T08:00:00.000Z' });
    const desmarcada = alternarAnotacao(marcada, 'a', T0);
    expect(desmarcada[0].feita).toBe(false);
    expect('feitaEm' in desmarcada[0]).toBe(false);
    expect(excluirAnotacao(marcada, 'a')).toEqual([]);
  });

  it('ordem: abertas em cima na ordem de criação; feitas embaixo; contagem só das abertas', () => {
    const lista = [an('1', 'a', { criadaEm: '2026-11-18T10:00:00Z', feita: true, feitaEm: T0 }), an('2', 'b', { criadaEm: '2026-11-18T11:00:00Z' }), an('3', 'c', { criadaEm: '2026-11-18T09:00:00Z' })];
    expect(ordenarAnotacoes(lista).map((a) => a.id)).toEqual(['3', '2', '1']);
    expect(contarAbertas(lista)).toBe(2);
    expect(contarAbertas(undefined)).toBe(0);
  });

  it('validação do que vem do armazenamento: id repetido, texto vazio, data ruim', () => {
    expect(anotacoesValidas([an('a', 'x'), an('a', 'y')])).toBe(false);
    expect(anotacoesValidas([an('a', '  ')])).toBe(false);
    expect(anotacoesValidas([{ ...an('a', 'x'), criadaEm: 'ontem' }])).toBe(false);
    expect(anotacoesValidas([{ ...an('a', 'x'), feita: 'sim' }])).toBe(false);
    expect(anotacoesValidas('x')).toBe(false);
  });
});

const demanda = (extra: Partial<Demanda> = {}): Demanda => ({
  id: 'd1', titulo: 'Vistoria fictícia', descricao: '', responsavel: 'Equipe A', prioridade: 'Alta', status: 'Em Andamento',
  criadaEm: '2026-11-13T09:00:00.000Z', ultimaAcaoRelevante: '2026-11-13T09:00:00.000Z', ...extra,
});
const montarDemandas = (itens: Demanda[], tela: 'demandas' | 'kanban' = 'demandas') => {
  const armazem = criarArmazem(localStorage, { exemplos: () => itens });
  render(<ContextoArmazem.Provider value={armazem}>{tela === 'kanban' ? <Kanban /> : <Demandas />}</ContextoArmazem.Provider>);
  return armazem;
};

describe('anotações na demanda', () => {
  it('anota (botão e Enter), marca, edita, oculta feitas e exclui; grava no armazém sem mexer na última ação', () => {
    const armazem = montarDemandas([demanda()]);
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Vistoria fictícia' }));
    expect(screen.getAllByText(/Não registre CPF, endereço ou nome do autuado aqui\./).length).toBeGreaterThan(0);
    const campo = screen.getByLabelText('Nova anotação');
    fireEvent.change(campo, { target: { value: 'pedir croqui' } });
    fireEvent.submit(campo.closest('form')!); // Enter
    fireEvent.change(screen.getByLabelText('Nova anotação'), { target: { value: 'ligar para o município' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }));
    const gravada = () => armazem.obter().demandas[0];
    expect(gravada().anotacoes?.map((a) => a.texto)).toEqual(['pedir croqui', 'ligar para o município']);
    expect(gravada().ultimaAcaoRelevante).toBe('2026-11-13T09:00:00.000Z');

    fireEvent.click(screen.getByRole('checkbox', { name: 'pedir croqui' }));
    expect(gravada().anotacoes![0]).toMatchObject({ feita: true });
    expect(gravada().anotacoes![0].feitaEm).toBeTruthy();
    const lista = screen.getByRole('list', { name: 'Anotações' });
    expect(within(lista).getAllByRole('checkbox').map((c) => c.getAttribute('aria-label') ?? c.closest('label')!.textContent!.trim())).toEqual(['ligar para o município', 'pedir croqui']);

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar feitas (1)' }));
    expect(screen.queryByRole('checkbox', { name: 'pedir croqui' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar feitas (1)' }));

    fireEvent.click(screen.getByRole('button', { name: 'Editar anotação: ligar para o município' }));
    fireEvent.change(screen.getByLabelText('Texto da anotação'), { target: { value: 'ligar para a prefeitura' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(gravada().anotacoes!.map((a) => a.texto)).toContain('ligar para a prefeitura');

    // Feita sai sem confirmação; aberta pergunta (e "não" mantém).
    fireEvent.click(screen.getByRole('button', { name: 'Excluir anotação: pedir croqui' }));
    expect(gravada().anotacoes).toHaveLength(1);
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir anotação: ligar para a prefeitura' }));
    expect(gravada().anotacoes).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir anotação: ligar para a prefeitura' }));
    expect(gravada().anotacoes).toBeUndefined();
    expect(confirmar).toHaveBeenCalledTimes(2);
    confirmar.mockRestore();
  });

  it('selo "N anotação(ões) aberta(s)" no cartão da lista e no Kanban', () => {
    montarDemandas([demanda({ anotacoes: [an('a', 'x'), an('b', 'y'), an('c', 'z', { feita: true, feitaEm: T0 })] })]);
    expect(screen.getByTestId('anotacoes-d1')).toHaveTextContent('2 anotação(ões) aberta(s)');
  });

  it('selo no Kanban, e sem selo quando não há aberta', () => {
    montarDemandas([demanda({ anotacoes: [an('a', 'x')] }), demanda({ id: 'd2', titulo: 'Outra', anotacoes: [an('b', 'y', { feita: true, feitaEm: T0 })] })], 'kanban');
    expect(screen.getByTestId('anotacoes-d1')).toHaveTextContent('1 anotação(ões) aberta(s)');
    expect(screen.queryByTestId('anotacoes-d2')).toBeNull();
  });

  it('Kanban: concluir com aberta pergunta (Voltar não muda; Concluir conclui); sem aberta conclui direto', () => {
    const armazem = montarDemandas([demanda({ anotacoes: [an('a', 'x'), an('b', 'y')] }), demanda({ id: 'd2', titulo: 'Outra' })], 'kanban');
    fireEvent.change(screen.getByLabelText('Mover "Vistoria fictícia" para'), { target: { value: 'Concluída' } });
    expect(screen.getByTestId('confirma-conclusao')).toHaveTextContent('Há 2 anotação(ões) aberta(s). Concluir mesmo assim?');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(armazem.obter().demandas[0].status).toBe('Em Andamento');
    expect(screen.queryByTestId('confirma-conclusao')).toBeNull();
    fireEvent.change(screen.getByLabelText('Mover "Vistoria fictícia" para'), { target: { value: 'Concluída' } });
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(armazem.obter().demandas[0].status).toBe('Concluída');
    fireEvent.change(screen.getByLabelText('Mover "Outra" para'), { target: { value: 'Concluída' } });
    expect(screen.queryByTestId('confirma-conclusao')).toBeNull();
    expect(armazem.obter().demandas[1].status).toBe('Concluída');
  });

  it('edição: status Concluída com aberta pergunta antes de gravar', () => {
    const armazem = montarDemandas([demanda({ anotacoes: [an('a', 'x')] })]);
    fireEvent.click(screen.getByRole('button', { name: 'Editar Vistoria fictícia' }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Concluída' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByTestId('confirma-conclusao')).toHaveTextContent('Há 1 anotação(ões) aberta(s). Concluir mesmo assim?');
    expect(armazem.obter().demandas[0].status).toBe('Em Andamento');
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(armazem.obter().demandas[0]).toMatchObject({ status: 'Concluída' });
    expect(armazem.obter().demandas[0].anotacoes).toHaveLength(1); // a edição não apaga as anotações
  });
});

const ponto = { coordenada: { lat: -12.1, lon: -58.2 }, municipio: 'Brasnorte', notas: '', demandas: [], situacao: 'planejado' as const, equipe: 'A', saida: '2026-10-05', retorno: '2026-10-09' };
function montarPonto() {
  const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação não criada');
  incluirPontos(r.id, [ponto]);
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
  return { id: r.id, ponto: obterOperacoes()[0].pontos[0] };
}

describe('anotações no ponto de operação', () => {
  it('mesmo componente: anota, marca e mostra o selo no cartão do ponto', () => {
    const { ponto: p } = montarPonto();
    fireEvent.change(screen.getByLabelText('Nova anotação'), { target: { value: 'confirmar coordenada com o CAR' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }));
    expect(screen.getAllByText(/Não registre CPF, endereço ou nome do autuado aqui\./).length).toBeGreaterThan(0);
    expect(obterOperacoes()[0].pontos[0].anotacoes?.[0]).toMatchObject({ texto: 'confirmar coordenada com o CAR', feita: false });
    expect(screen.getByTestId(`anotacoes-${p.id}`)).toHaveTextContent('1 anotação(ões) aberta(s)');
    fireEvent.click(screen.getByRole('checkbox', { name: 'confirmar coordenada com o CAR' }));
    expect(obterOperacoes()[0].pontos[0].anotacoes?.[0].feitaEm).toBeTruthy();
    expect(screen.queryByTestId(`anotacoes-${p.id}`)).toBeNull();
  });

  it('registrar o envio do relatório com aberta pergunta; Voltar não grava, Concluir grava; sem aberta grava direto', () => {
    const { id, ponto: p } = montarPonto();
    act(() => { registrarResultado(id, p.id, { resultado: 'sim', motivo: '', protocolo: '', observacao: '', dataVistoria: '' }, '2026-11-15'); });
    fireEvent.change(screen.getByLabelText('Nova anotação'), { target: { value: 'juntar croqui' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }));
    const enviar = () => {
      fireEvent.click(screen.getByRole('button', { name: 'Registrar relatório no SIGA do Ponto 1' }));
      fireEvent.change(screen.getByLabelText('Data de envio no SIGA-MT'), { target: { value: '2026-11-17' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar envio' }));
    };
    enviar();
    expect(screen.getByTestId('confirma-conclusao')).toHaveTextContent('Há 1 anotação(ões) aberta(s). Concluir mesmo assim?');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(obterOperacoes()[0].pontos[0].relatorio).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar envio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(obterOperacoes()[0].pontos[0].relatorio?.enviadoEm).toBe('2026-11-17');
  });

  it('sem aberta, o envio do relatório grava direto', () => {
    const { id, ponto: p } = montarPonto();
    act(() => { registrarResultado(id, p.id, { resultado: 'sim', motivo: '', protocolo: '', observacao: '', dataVistoria: '' }, '2026-11-15'); });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar relatório no SIGA do Ponto 1' }));
    fireEvent.change(screen.getByLabelText('Data de envio no SIGA-MT'), { target: { value: '2026-11-17' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar envio' }));
    expect(screen.queryByTestId('confirma-conclusao')).toBeNull();
    expect(obterOperacoes()[0].pontos[0].relatorio?.enviadoEm).toBe('2026-11-17');
  });
});

describe('anotações fora das exportações e no mapa', () => {
  it('não entram na planilha da SEMA, no CSV nem no GeoJSON; o mapa leva só a contagem de abertas', () => {
    const { id, ponto: p } = montarPonto();
    const lista = [an('a', 'SEGREDO-ANOTACAO-1'), an('b', 'SEGREDO-ANOTACAO-2', { feita: true, feitaEm: T0 })];
    const op = { ...obterOperacoes()[0], pontos: [{ ...p, anotacoes: lista }] };
    for (const saida of [exportarCsv(op), exportarGeoJson(op), exportarPlanilhaSema(op)]) {
      expect(saida).not.toContain('SEGREDO-ANOTACAO');
      expect(saida.toLowerCase()).not.toContain('anota');
    }
    const { noMapa } = itensDoMapa([{ id: 'd', titulo: 'D', status: 'A Fazer', coordenada: { lat: -12, lon: -56 }, anotacoes: [an('x', 'y')] }], [op], '2026-11-18');
    expect(noMapa.find((i) => i.id === p.id)?.anotacoesAbertas).toBe(1);
    expect(noMapa.find((i) => i.id === 'd')?.anotacoesAbertas).toBe(1);
    expect(id).toBeTruthy();
  });
});
