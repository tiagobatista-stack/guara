// Tela Demandas (P04): criar → editar → recarregar → conferir → excluir com confirmação.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from './armazem.ts';
import { Demandas } from './Demandas.tsx';
import { criarOperacao, incluirPontos, obterOperacoes } from '../operacoes/armazem.ts';

function montar() {
  let n = 0;
  const armazem = criarArmazem(localStorage, { gerarId: () => `id-${++n}`, exemplos: () => [] });
  render(
    <ContextoArmazem.Provider value={armazem}>
      <Demandas />
    </ContextoArmazem.Provider>,
  );
  return armazem;
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('tela Demandas', () => {
  it('cria uma demanda pelo formulário e mostra sucesso só depois de gravar', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Revisar checklist de laboratório' } });
    fireEvent.change(screen.getByLabelText('Responsável'), { target: { value: 'Equipe A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Demanda criada e gravada.');
    expect(screen.getByText('Revisar checklist de laboratório', { selector: 'strong' })).toBeInTheDocument();
    expect(localStorage.getItem('guara:demandas:v1')).toContain('Revisar checklist de laboratório');
  });

  it('mostra erro de validação e não grava título curto', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'ab' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText(/pelo menos 3 caracteres/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Título/)).toHaveAttribute('aria-invalid', 'true');
    expect(JSON.parse(localStorage.getItem('guara:demandas:v1')!).demandas).toHaveLength(0);
  });

  it('edita, persiste após remontar e exclui somente com confirmação', () => {
    const armazem = montar();
    act(() => { armazem.criar({ titulo: 'Atualizar manual', descricao: '', responsavel: 'Equipe B', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
    fireEvent.click(screen.getByRole('button', { name: /Editar Atualizar manual/ }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Atualizar manual de atendimento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Alterações gravadas.');

    // "Recarregar": novo armazém lendo o mesmo localStorage.
    const recarregado = criarArmazem(localStorage, { exemplos: () => [] });
    expect(recarregado.obter().demandas[0].titulo).toBe('Atualizar manual de atendimento');

    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(confirmar).toHaveBeenCalled();
    expect(armazem.obter().demandas).toHaveLength(1);

    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(armazem.obter().demandas).toHaveLength(0);
    expect(screen.getByText('Nenhuma demanda cadastrada.')).toBeInTheDocument();
  });

  it('filtra a lista por status', () => {
    const armazem = montar();
    act(() => {
      armazem.criar({ titulo: 'Demanda A', descricao: '', responsavel: 'X', prioridade: 'Alta', status: 'A Fazer', prazo: '' });
      armazem.criar({ titulo: 'Demanda B', descricao: '', responsavel: 'Y', prioridade: 'Baixa', status: 'Concluída', prazo: '' });
    });
    const filtros = screen.getByRole('search');
    fireEvent.change(within(filtros).getByLabelText('Status'), { target: { value: 'Concluída' } });
    const lista = screen.getByRole('list', { name: 'Lista de demandas' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(1);
    expect(within(lista).getByText('Demanda B', { selector: 'strong' })).toBeInTheDocument();
  });

  it('aviso de armazenamento corrompido sem apagar dados', () => {
    localStorage.setItem('guara:demandas:v1', 'corrompido');
    render(
      <ContextoArmazem.Provider value={criarArmazem(localStorage, { exemplos: () => [] })}>
        <Demandas />
      </ContextoArmazem.Provider>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('corrompidos');
    expect(screen.queryByRole('button', { name: 'Nova demanda' })).toBeNull();
    expect(localStorage.getItem('guara:demandas:v1')).toBe('corrompido');
  });

  it('histórico no detalhe: criação, status e bloqueio, do mais novo ao mais antigo; demanda antiga avisa que não tem', () => {
    const armazem = montar();
    act(() => { armazem.criar({ titulo: 'Analisar processo FIC-0004', descricao: '', responsavel: 'Equipe A', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
    act(() => { armazem.mudarStatus('id-1', 'Em Andamento'); });
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Analisar processo FIC-0004' }));
    fireEvent.change(screen.getByLabelText('Motivo do bloqueio'), { target: { value: 'documento' } });
    fireEvent.change(screen.getByLabelText('Detalhe do bloqueio (opcional)'), { target: { value: 'Aguardando certidão (fictícia).' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como travada' }));
    const itens = within(screen.getByTestId('historico')).getAllByRole('listitem').map((li) => li.textContent);
    expect(itens).toHaveLength(3);
    expect(itens[0]).toContain('travou: falta documento · “Aguardando certidão (fictícia).”');
    expect(itens[1]).toContain('mudou o status: A Fazer → Em Andamento');
    expect(itens[2]).toContain('criada em A Fazer');
    expect(screen.queryByText(/anterior ao histórico/)).toBeNull();
  });

  it('demanda gravada antes do histórico avisa que não tem eventos', () => {
    const antiga = {
      id: 'antiga', titulo: 'Demanda antiga (fictícia)', descricao: '', responsavel: 'Equipe A', prioridade: 'Média' as const,
      status: 'A Fazer' as const, criadaEm: '2026-11-01T12:00:00.000Z', ultimaAcaoRelevante: '2026-11-01T12:00:00.000Z',
    };
    const armazem = criarArmazem(localStorage, { exemplos: () => [antiga] });
    render(
      <ContextoArmazem.Provider value={armazem}>
        <Demandas />
      </ContextoArmazem.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Demanda antiga (fictícia)' }));
    expect(screen.queryByTestId('historico')).toBeNull();
    expect(screen.getByText('Nenhum evento registrado: esta demanda é anterior ao histórico (14/11/2026).')).toBeInTheDocument();
  });

  it('coordenada: mostra o que entendeu ao digitar, sugere trocar a ordem, grava em decimal e não vai para a tela compartilhada', () => {
    const armazem = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Vistoria de campo FIC-0006' } });
    const campo = screen.getByLabelText('Coordenada (opcional)');
    fireEvent.change(campo, { target: { value: '-55.5, -15.5' } });
    expect(screen.getByTestId('leitura-coordenada')).toHaveTextContent('Parece que a ordem está trocada');
    fireEvent.click(screen.getByRole('button', { name: 'Trocar a ordem' }));
    expect(campo).toHaveValue('-15.500000, -55.500000');
    expect(screen.getByTestId('leitura-coordenada')).toHaveTextContent(`Entendido: 15° 30' 0" S, 55° 30' 0" W (-15.500000, -55.500000, SIRGAS 2000).`);
    fireEvent.click(screen.getByLabelText('Vistoria em aberto')); // o título "Vistoria…" deduz tipo campo
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(armazem.obter().demandas[0].coordenada).toEqual({ lat: -15.5, lon: -55.5 });

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Vistoria de campo FIC-0006' }));
    expect(screen.getByTestId('coordenada-detalhe')).toHaveTextContent(`-15.500000, -55.500000 · 15° 30' 0" S, 55° 30' 0" W (SIRGAS 2000)`);
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tela compartilhada' }));
    expect(screen.queryByText(/55\.5/)).toBeNull();
  });

  it('coordenada em formato não aceito é recusada ao gravar, com a mensagem no campo', () => {
    const armazem = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Vistoria de campo FIC-0007' } });
    fireEvent.change(screen.getByLabelText('Coordenada (opcional)'), { target: { value: '21L 512345 8712345' } });
    expect(screen.getByTestId('leitura-coordenada')).toHaveTextContent('Ainda não entendi: UTM ainda não é aceito');
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('UTM ainda não é aceito: informe em graus (ex.: -15.5, -55.5).')).toBeInTheDocument();
    expect(armazem.obter().demandas).toHaveLength(0);
  });

  it('vistoria: o bloco só aparece para tipo campo, exige data ou "em aberto" e aparece no detalhe e no filtro', () => {
    const armazem = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Organizar arquivo fictício' } });
    expect(screen.queryByTestId('bloco-vistoria')).toBeNull();
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'campo' } });
    expect(screen.getByTestId('bloco-vistoria')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByText('Informe a data da vistoria ou marque como vistoria em aberto.')).toBeInTheDocument();
    expect(armazem.obter().demandas).toHaveLength(0);
    fireEvent.click(screen.getByLabelText('Informar a data'));
    fireEvent.change(screen.getByLabelText('Data da vistoria'), { target: { value: '2026-12-12' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(armazem.obter().demandas[0].vistoria).toEqual({ data: '2026-12-12' });
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Organizar arquivo fictício' }));
    expect(screen.getByTestId('vistoria-detalhe')).toHaveTextContent('12/12/2026');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    fireEvent.change(screen.getByLabelText('Vistoria'), { target: { value: 'sem-data' } });
    expect(screen.getByText('Nenhuma demanda corresponde aos filtros.')).toBeInTheDocument();
  });

  it('detalhe livre do bloqueio: grava, aparece só no detalhe da demanda e volta ao reabrir', () => {
    const armazem = montar();
    act(() => { armazem.criar({ titulo: 'Analisar processo FIC-0003', descricao: '', responsavel: 'Equipe A', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Analisar processo FIC-0003' }));
    fireEvent.change(screen.getByLabelText('Motivo do bloqueio'), { target: { value: 'setor' } });
    fireEvent.change(screen.getByLabelText('Detalhe do bloqueio (opcional)'), { target: { value: 'Aguardando ofício do setor de cadastro (fictício).' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como travada' }));
    expect(screen.getByTestId('bloqueio-detalhe-livre')).toHaveTextContent('Aguardando ofício do setor de cadastro (fictício).');
    expect(screen.getByLabelText('Detalhe do bloqueio (opcional)')).toHaveValue('');
    expect(armazem.obter().demandas[0].bloqueio?.detalhe).toBe('Aguardando ofício do setor de cadastro (fictício).');

    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    expect(screen.getByTestId('bloqueio-id-1')).toHaveTextContent('aguardando outro setor');
    expect(screen.queryByText(/Aguardando ofício/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tela compartilhada' }));
    expect(screen.queryByText(/Aguardando ofício/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sair da tela compartilhada' }));

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Analisar processo FIC-0003' }));
    // A caixa abre em branco; em branco, atualizar o motivo mantém o detalhe gravado.
    expect(screen.getByLabelText('Detalhe do bloqueio (opcional)')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Motivo do bloqueio'), { target: { value: 'documento' } });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar bloqueio' }));
    expect(screen.getByRole('status')).toHaveTextContent('Bloqueio atualizado.');
    expect(armazem.obter().demandas[0].bloqueio?.detalhe).toBe('Aguardando ofício do setor de cadastro (fictício).');
    // Apagar o detalhe é ação explícita.
    fireEvent.click(screen.getByRole('button', { name: 'Apagar detalhe' }));
    expect(screen.getByRole('status')).toHaveTextContent('Detalhe do bloqueio apagado.');
    expect(screen.queryByTestId('bloqueio-detalhe-livre')).toBeNull();
    expect(armazem.obter().demandas[0].bloqueio).not.toHaveProperty('detalhe');
  });

  it('marca como travada pelo detalhe, mostra na lista e no filtro, e destrava', () => {
    const armazem = montar();
    act(() => { armazem.criar({ titulo: 'Analisar processo FIC-0002', descricao: '', responsavel: 'Equipe A', prioridade: 'Média', status: 'Em Andamento', prazo: '' }); });
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Analisar processo FIC-0002' }));
    expect(screen.getByTestId('bloqueio-detalhe')).toHaveTextContent('não está travada');
    fireEvent.change(screen.getByLabelText('Motivo do bloqueio'), { target: { value: 'campo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como travada' }));
    expect(screen.getByRole('status')).toHaveTextContent('Demanda marcada como travada.');
    expect(screen.getByTestId('bloqueio-detalhe')).toHaveTextContent('⛔ travada hoje: depende de campo');
    expect(screen.getByRole('button', { name: 'Atualizar bloqueio' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    expect(screen.getByTestId('bloqueio-id-1')).toHaveTextContent('depende de campo');
    fireEvent.change(screen.getByLabelText('Bloqueio'), { target: { value: 'livres' } });
    expect(screen.getByText('Nenhuma demanda corresponde aos filtros.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Bloqueio'), { target: { value: 'travadas' } });

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Analisar processo FIC-0002' }));
    fireEvent.click(screen.getByRole('button', { name: 'Destravou' }));
    expect(screen.getByRole('status')).toHaveTextContent('Demanda destravada.');
    expect(screen.getByTestId('bloqueio-detalhe')).toHaveTextContent('não está travada');
    expect(armazem.obter().demandas[0]).not.toHaveProperty('bloqueio');
  });

  it('demanda concluída não oferece travar', () => {
    const armazem = montar();
    act(() => { armazem.criar({ titulo: 'Arquivar processo FIC-0003', descricao: '', responsavel: '', prioridade: 'Baixa', status: 'Concluída', prazo: '' }); });
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Arquivar processo FIC-0003' }));
    expect(screen.queryByLabelText('Motivo do bloqueio')).toBeNull();
  });

  describe('aviso de demanda parecida', () => {
    const preencher = (titulo: string) => {
      fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
      fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: titulo } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    };
    const total = () => JSON.parse(localStorage.getItem('guara:demandas:v1')!).demandas.length;

    it('avisa antes de gravar; "Criar mesmo assim" grava a segunda', () => {
      const armazem = montar();
      act(() => { armazem.criar({ titulo: 'Resposta ofício 2', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
      preencher('resposta oficio 2');
      expect(screen.getByTestId('aviso-parecida')).toHaveTextContent('Já existe uma demanda em aberto parecida: “Resposta ofício 2” (A Fazer; mesmo título)');
      expect(total()).toBe(1);
      fireEvent.click(screen.getByRole('button', { name: 'Criar mesmo assim' }));
      expect(screen.getByRole('status')).toHaveTextContent('Demanda criada e gravada.');
      expect(total()).toBe(2);
    });

    it('"Ver a existente" abre o detalhe sem gravar; mexer no título retira o aviso', () => {
      const armazem = montar();
      act(() => { armazem.criar({ titulo: 'Entregar relatório mensal', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
      preencher('Relatório mensal');
      expect(screen.getByTestId('aviso-parecida')).toHaveTextContent('o título digitado está inteiro no título dela');
      fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Relatório anual' } });
      expect(screen.queryByTestId('aviso-parecida')).toBeNull();
      fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Relatório mensal' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      fireEvent.click(screen.getByRole('button', { name: 'Ver a existente (descarta este cadastro)' }));
      expect(screen.getByRole('heading', { name: 'Entregar relatório mensal' })).toBeInTheDocument();
      expect(total()).toBe(1);
    });

    it('título inválido mostra o erro, não o aviso; editar não avisa', () => {
      const armazem = montar();
      act(() => { armazem.criar({ titulo: 'Resposta ofício 2', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
      preencher('ab');
      expect(screen.getByText(/pelo menos 3 caracteres/)).toBeInTheDocument();
      expect(screen.queryByTestId('aviso-parecida')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

      fireEvent.click(screen.getByRole('button', { name: 'Editar Resposta ofício 2' }));
      fireEvent.change(screen.getByLabelText('Responsável'), { target: { value: 'Equipe B' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(screen.queryByTestId('aviso-parecida')).toBeNull();
      expect(screen.getByRole('status')).toHaveTextContent('Alterações gravadas.');
    });
  });

  it('três números: erro no campo certo, gravação normalizada e exibição na lista e no detalhe', () => {
    const armazem = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
    fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: 'Responder ofício fictício' } });
    fireEvent.change(screen.getByLabelText('Processo administrativo'), { target: { value: 'fic-2026-0042' } });
    fireEvent.change(screen.getByLabelText(/^SIMP/), { target: { value: '12-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByLabelText(/^SIMP/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/NNNNNN-NNN\/AAAA \(ex\.: 000001-001\/2099\)/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('guara:demandas:v1')!).demandas).toHaveLength(0);

    fireEvent.change(screen.getByLabelText(/^SIMP/), { target: { value: 'SIMP 000001-001/2099' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Demanda criada e gravada.');
    expect(armazem.obter().demandas[0]).toMatchObject({ processo: 'FIC-2026-0042', simp: '000001-001/2099' });
    expect(armazem.obter().demandas[0]).not.toHaveProperty('judicial');
    expect(screen.getByTestId('processo-id-1')).toHaveTextContent('FIC-2026-0042');

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Responder ofício fictício' }));
    expect(screen.getByText('Processo judicial (CNJ)').nextElementSibling).toHaveTextContent('—');
  });

  describe('tipo e natureza pelo título', () => {
    const titulo = (t: string) => fireEvent.change(screen.getByLabelText(/^Título/), { target: { value: t } });

    it('no cadastro, deduz e explica; a escolha da pessoa não é sobrescrita pelo título', () => {
      const armazem = montar();
      fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
      titulo('Vistoria no lote 4');
      expect(screen.getByLabelText('Tipo')).toHaveValue('campo');
      expect(screen.getByTestId('dica-tipo')).toHaveTextContent('Deduzido do título, pela palavra «Vistoria». Troque se estiver errado.');
      expect(screen.getByLabelText('Natureza')).toHaveValue('demanda');

      fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'gabinete' } });
      titulo('Vistoria no lote 5');
      expect(screen.getByLabelText('Tipo')).toHaveValue('gabinete');
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(armazem.obter().demandas[0]).toMatchObject({ tipo: 'gabinete', natureza: 'demanda' });
      expect(screen.getByTestId('classe-id-1')).toHaveTextContent('🏢 Gabinete · Demanda');
    });

    it('na dúvida, deixa "não definido" e pede a escolha', () => {
      montar();
      fireEvent.click(screen.getByRole('button', { name: 'Nova demanda' }));
      titulo('Analisar vistoria');
      expect(screen.getByLabelText('Tipo')).toHaveValue('');
      expect(screen.getByTestId('dica-tipo')).toHaveTextContent('Não deu para deduzir pelo título: escolha, se souber.');
      titulo('Reunião sobre o embargo');
      expect(screen.getByLabelText('Natureza')).toHaveValue('comum');
    });

    it('na edição, não muda sozinho: só sugere com "Usar"', () => {
      const armazem = montar();
      act(() => { armazem.criar({ titulo: 'Redigir resposta fictícia', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' }); });
      fireEvent.click(screen.getByRole('button', { name: 'Editar Redigir resposta fictícia' }));
      expect(screen.getByLabelText('Tipo')).toHaveValue('');
      expect(screen.getByTestId('dica-tipo')).toHaveTextContent('Sugestão pelo título: 🏢 Gabinete (pela palavra «Redigir»).');
      fireEvent.click(within(screen.getByTestId('dica-tipo')).getByRole('button', { name: 'Usar' }));
      expect(screen.getByLabelText('Tipo')).toHaveValue('gabinete');
      expect(armazem.obter().demandas[0]).not.toHaveProperty('tipo');
      fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(armazem.obter().demandas[0].tipo).toBe('gabinete');
    });

    it('filtro por tipo na lista', () => {
      const armazem = montar();
      act(() => {
        armazem.criar({ titulo: 'Vistoria fictícia A', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '', tipo: 'campo', vistoria: 'aberta' });
        armazem.criar({ titulo: 'Organizar arquivo', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' });
      });
      fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'campo' } });
      expect(screen.getByText('Vistoria fictícia A', { selector: 'strong' })).toBeInTheDocument();
      expect(screen.queryByText('Organizar arquivo', { selector: 'strong' })).toBeNull();
    });
  });

  it('tela compartilhada: só o resumo, sem responsável, descrição nem números do MP; sair volta à lista', () => {
    const armazem = montar();
    act(() => {
      armazem.criar({ titulo: 'Vistoria fictícia no lote 9', descricao: 'Falar com Fulana Fictícia', responsavel: 'Beltrano Fictício', prioridade: 'Alta', status: 'A Fazer', prazo: '', processo: 'FIC-2026-0009', simp: '000001-001/2099' });
      armazem.criar({ titulo: 'Arquivar relatório fictício', descricao: '', responsavel: '', prioridade: 'Baixa', status: 'Concluída', prazo: '' });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tela compartilhada' }));

    const pagina = document.body.textContent ?? '';
    for (const proibido of ['Beltrano', 'Fulana', '000001-001/2099']) expect(pagina).not.toContain(proibido);
    expect(screen.queryByLabelText('Responsável')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nova demanda' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Editar/ })).toBeNull();
    const cartao = screen.getByTestId('resumo-id-1');
    expect(cartao).toHaveTextContent('Vistoria fictícia no lote 9');
    expect(cartao).toHaveTextContent('FIC-2026-0009');
    expect(cartao).toHaveTextContent('tem (número fora do resumo)');
    expect(screen.queryByTestId('resumo-id-2')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Sair da tela compartilhada' }));
    expect(screen.getByLabelText('Responsável')).toBeInTheDocument();
    expect(screen.getByText('Beltrano Fictício', { selector: 'dd' })).toBeInTheDocument();
  });

  it('campos essenciais: "Falta" na lista e no detalhe, filtro e sumiço ao completar', () => {
    const armazem = montar();
    act(() => {
      armazem.criar({ titulo: 'Organizar arquivo do setor', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '' });
      armazem.criar({ titulo: 'Reunião fictícia', descricao: '', responsavel: 'Equipe A', prioridade: 'Baixa', status: 'A Fazer', prazo: '2026-11-30', natureza: 'comum' });
    });
    expect(screen.getByTestId('falta-id-1')).toHaveTextContent('Falta: natureza, tipo, prazo, responsável.');
    expect(screen.queryByTestId('falta-id-2')).toBeNull();

    fireEvent.change(screen.getByLabelText('Preenchimento'), { target: { value: 'faltando' } });
    expect(screen.getByText('Organizar arquivo do setor', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('Reunião fictícia', { selector: 'strong' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Preenchimento'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Reunião fictícia' }));
    expect(screen.getByTestId('preenchimento-detalhe')).toHaveTextContent('campos essenciais preenchidos');
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));

    act(() => { armazem.editar('id-1', { titulo: 'Organizar arquivo do setor', descricao: '', responsavel: 'Equipe B', prioridade: 'Média', status: 'A Fazer', prazo: '2026-12-01', natureza: 'comum' }); });
    expect(screen.queryByTestId('falta-id-1')).toBeNull();
  });
});

describe('vínculo com operação, na ficha da demanda', () => {
  const COORD = { lat: -11.5, lon: -58.5 };
  const demandaDeCampo = (armazem: ReturnType<typeof montar>, extra: Record<string, string> = {}) => {
    act(() => {
      armazem.criar({ titulo: 'Vistoria fictícia em campo', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '', tipo: 'campo', vistoria: 'aberta', ...extra });
    });
    return armazem.obter().demandas[0];
  };
  const novaOperacao = () => {
    const r = criarOperacao({ nome: 'Operação fictícia', inicio: '2026-09-18', fim: '2026-09-25', origem: '' }, '2026-09-01T12:00:00.000Z');
    if (!r.ok) throw new Error();
    return r.id;
  };
  const abrir = (titulo: string) => fireEvent.click(screen.getByRole('button', { name: `Detalhes de ${titulo}` }));

  it('agenda com a coordenada da demanda: cria o ponto na operação e a vistoria passa a "em operação"', () => {
    const armazem = montar();
    const opId = novaOperacao();
    const d = demandaDeCampo(armazem, { coordenada: '-11.5, -58.5' });
    abrir(d.titulo);
    expect(screen.getByTestId('sem-vinculo')).toBeInTheDocument();
    const form = screen.getByRole('form', { name: 'Agendar em uma operação' });
    fireEvent.change(within(form).getByLabelText('Operação para agendar'), { target: { value: opId } });
    fireEvent.change(within(form).getByLabelText('Município do ponto (opcional)'), { target: { value: 'Lugar Fictício' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Agendar vistoria na operação' }));
    expect(screen.getByTestId('mensagem-operacao')).toHaveTextContent('Vistoria agendada');
    const ponto = obterOperacoes()[0].pontos[0];
    expect(ponto).toMatchObject({ coordenada: COORD, municipio: 'Lugar Fictício', demandas: [d.id], situacao: 'planejado' });
    expect(screen.getByTestId(`vinculo-${ponto.id}`)).toHaveTextContent('Operação fictícia');
    expect(screen.getByTestId('vistoria-detalhe')).toHaveTextContent('em operação (data a registrar)');
  });

  it('sem coordenada na demanda: pede a coordenada, recusa a inválida e grava a válida também na demanda', () => {
    const armazem = montar();
    const opId = novaOperacao();
    const d = demandaDeCampo(armazem);
    abrir(d.titulo);
    const form = screen.getByRole('form', { name: 'Agendar em uma operação' });
    fireEvent.change(within(form).getByLabelText('Operação para agendar'), { target: { value: opId } });
    fireEvent.click(within(form).getByRole('button', { name: 'Agendar vistoria na operação' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Esta demanda não tem coordenada: informe a do ponto.');
    fireEvent.change(within(form).getByLabelText('Coordenada do ponto'), { target: { value: 'abc' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Agendar vistoria na operação' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(obterOperacoes()[0].pontos).toHaveLength(0);
    fireEvent.change(within(form).getByLabelText('Coordenada do ponto'), { target: { value: '-11.5, -58.5' } });
    expect(screen.getByTestId('leitura-coordenada-ponto')).toHaveTextContent('Entendido:');
    fireEvent.click(within(form).getByRole('button', { name: 'Agendar vistoria na operação' }));
    expect(obterOperacoes()[0].pontos[0].coordenada).toEqual(COORD);
    expect(armazem.obter().demandas[0].coordenada).toEqual(COORD);
    expect(screen.getByTestId('mensagem-operacao')).toHaveTextContent('A coordenada também foi gravada na demanda.');
  });

  it('vincula a um ponto já vistoriado: avisa que falta a data do relatório e deixa desvincular', () => {
    const armazem = montar();
    const opId = novaOperacao();
    incluirPontos(opId, [{ coordenada: COORD, municipio: 'Lugar', notas: '', demandas: [], situacao: 'vistoriado', equipe: 'Equipe A', numero: 3 }]);
    const d = demandaDeCampo(armazem);
    abrir(d.titulo);
    const form = screen.getByRole('form', { name: 'Vincular a um ponto existente' });
    fireEvent.change(within(form).getByLabelText('Operação do ponto'), { target: { value: opId } });
    fireEvent.change(within(form).getByLabelText('Ponto'), { target: { value: obterOperacoes()[0].pontos[0].id } });
    fireEvent.click(within(form).getByRole('button', { name: 'Vincular ao ponto' }));
    expect(obterOperacoes()[0].pontos[0].demandas).toEqual([d.id]);
    expect(screen.getByTestId('aviso-vistoriado-sem-data')).toHaveTextContent('Registre a data do relatório');
    fireEvent.click(screen.getByRole('button', { name: 'Desvincular de Operação fictícia' }));
    expect(obterOperacoes()[0].pontos[0].demandas).toEqual([]);
    expect(screen.queryByTestId('aviso-vistoriado-sem-data')).toBeNull();
  });

  it('com a data da vistoria registrada, o aviso do ponto vistoriado some', () => {
    const armazem = montar();
    const opId = novaOperacao();
    incluirPontos(opId, [{ coordenada: COORD, municipio: '', notas: '', demandas: [], situacao: 'vistoriado' }]);
    const d = demandaDeCampo(armazem, { vistoria: 'data', vistoriaData: '2026-09-20' });
    abrir(d.titulo);
    const form = screen.getByRole('form', { name: 'Vincular a um ponto existente' });
    fireEvent.change(within(form).getByLabelText('Operação do ponto'), { target: { value: opId } });
    fireEvent.change(within(form).getByLabelText('Ponto'), { target: { value: obterOperacoes()[0].pontos[0].id } });
    fireEvent.click(within(form).getByRole('button', { name: 'Vincular ao ponto' }));
    expect(screen.queryByTestId('aviso-vistoriado-sem-data')).toBeNull();
    expect(screen.getByTestId('vistoria-detalhe')).toHaveTextContent('20/09/2026');
  });

  it('sem operação cadastrada, orienta a criar uma', () => {
    const armazem = montar();
    const d = demandaDeCampo(armazem);
    abrir(d.titulo);
    expect(screen.getByText(/Nenhuma operação cadastrada/)).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Agendar em uma operação' })).toBeNull();
  });

  it('o filtro "Falta encaixar" tira da lista a demanda que já está numa operação', () => {
    const armazem = montar();
    const opId = novaOperacao();
    act(() => {
      armazem.criar({ titulo: 'Campo encaixada fictícia', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '', tipo: 'campo', vistoria: 'aberta' });
      armazem.criar({ titulo: 'Campo solta fictícia', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '', tipo: 'campo', vistoria: 'aberta' });
    });
    const [encaixada] = armazem.obter().demandas;
    act(() => {
      incluirPontos(opId, [{ coordenada: COORD, municipio: '', notas: '', demandas: [encaixada.id], situacao: 'planejado' }]);
    });
    fireEvent.change(screen.getByLabelText('Vistoria'), { target: { value: 'sem-encaixe' } });
    expect(screen.queryByText('Campo encaixada fictícia', { selector: 'strong' })).toBeNull();
    expect(screen.getByText('Campo solta fictícia', { selector: 'strong' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Vistoria'), { target: { value: 'sem-data' } });
    expect(screen.getByText('Campo encaixada fictícia', { selector: 'strong' })).toBeInTheDocument();
  });
});

describe('tela Demandas: rota "abrir" (botão do assistente)', () => {
  afterEach(() => { window.location.hash = ''; });

  function criarUma() {
    const armazem = criarArmazem(localStorage, { gerarId: () => 'id-1', exemplos: () => [] });
    const r = armazem.criar({ titulo: 'Renovação de licença fictícia', descricao: '', responsavel: 'Equipe A', prioridade: 'Média', status: 'A Fazer', prazo: '2026-11-10' } as never);
    if (!r.ok) throw new Error('não criou');
    return { armazem, id: armazem.obter().demandas[0].id };
  }

  it('abre a demanda para edição, foca o Prazo e limpa os parâmetros da URL', () => {
    const { armazem, id } = criarUma();
    window.location.hash = `#/demandas?abrir=${id}&campo=prazo`;
    render(<ContextoArmazem.Provider value={armazem}><Demandas /></ContextoArmazem.Provider>);
    expect(screen.getByRole('heading', { name: 'Editar demanda' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Prazo/)).toHaveFocus();
    expect(window.location.hash).toBe('#/demandas');
  });

  it('código inexistente vira mensagem na tela, sem erro e sem abrir formulário', () => {
    const { armazem } = criarUma();
    window.location.hash = '#/demandas?abrir=DEM-FIC-0099&campo=prazo';
    render(<ContextoArmazem.Provider value={armazem}><Demandas /></ContextoArmazem.Provider>);
    expect(screen.getByRole('alert')).toHaveTextContent('Não encontrei a demanda DEM-FIC-0099');
    expect(screen.queryByRole('heading', { name: 'Editar demanda' })).toBeNull();
  });
});
