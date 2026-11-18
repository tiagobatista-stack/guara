// Caracterização do dano (POP IBAMA, Anexo I): itens, desvios, texto e tela do ponto.

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import type { Demanda } from '../demandas/modelo.ts';
import { Operacoes } from './Operacoes.tsx';
import { criarOperacao, incluirPontos, obterOperacoes, registrarResultado } from './armazem.ts';
import { validarListaOperacoes } from './regras.ts';
import {
  caracterizacaoValida, itensAplicaveis, itensDeCampoSemResposta, ITENS_POP, possivelSupressao, textoCaracterizacao,
} from './pop-supressao.ts';

beforeEach(() => localStorage.clear());
const ids = (r = {}) => itensAplicaveis(r).map((i) => i.id);

describe('itens do POP', () => {
  it('Formulário A (25 itens e sub-itens) em campo, Formulário B (4) em escritório; cada item cita o número do POP', () => {
    expect(ITENS_POP.filter((i) => i.formulario === 'A' && !i.id.includes('.'))).toHaveLength(25);
    expect(ITENS_POP.filter((i) => i.formulario === 'B')).toHaveLength(4);
    expect(ITENS_POP.every((i) => i.onde === (i.formulario === 'A' ? 'campo' : 'escritorio'))).toBe(true);
    expect(ITENS_POP.find((i) => i.id === 'A-1')!.opcoes!.map((o) => o.texto)).toEqual(['Amazônia', 'Caatinga', 'Cerrado', 'Mata Atlântica', 'Pampa', 'Pantanal']);
    expect(ITENS_POP.find((i) => i.id === 'A-2')!.opcoes).toHaveLength(31); // Tabela 1 do POP (item 4.2.2)
  });
});

describe('desvios do formulário', () => {
  it('sem resposta, todos os itens aparecem', () => {
    expect(ids()).toHaveLength(ITENS_POP.length);
  });

  it('A-15 "Não" pula A-16 e A-17 (siga para 18); "Arraste" segue para A-16', () => {
    expect(ids({ 'A-15': ['Não'] })).not.toContain('A-16');
    expect(ids({ 'A-15': ['Não'] })).not.toContain('A-17');
    expect(ids({ 'A-15': ['Não'] })).toContain('A-18');
    expect(ids({ 'A-15': ['Arraste', 'Uso de fogo para queima de biomassa'] })).toContain('A-16');
  });

  it('A-16: "Não, não houve preparo" pula A-17; "Sim" ou "Não foi possível verificar" vão para A-17', () => {
    expect(ids({ 'A-16': 'Não, não houve preparo' })).not.toContain('A-17');
    expect(ids({ 'A-16': 'Sim, houve preparo' })).toContain('A-17');
    expect(ids({ 'A-16': 'Não foi possível verificar' })).toContain('A-17');
  });

  it('A-19: "Sim" pergunta A-20; "Não" e "Não foi possível verificar" pulam para A-21', () => {
    expect(ids({ 'A-19': 'Sim' })).toContain('A-20');
    expect(ids({ 'A-19': 'Não' })).not.toContain('A-20');
    expect(ids({ 'A-19': 'Não foi possível verificar' })).not.toContain('A-20');
  });

  it('A-12 não tem desvio no formulário (a opção "sem alteração" segue para a próxima pergunta)', () => {
    expect(ids({ 'A-12': 'Não houve alteração perceptível da camada superficial do solo' })).toContain('A-13');
  });

  it('B-1: Público pergunta o domínio (B-2); Privado e Indeterminado pulam para B-3', () => {
    expect(ids({ 'B-1': 'Público' })).toContain('B-2');
    expect(ids({ 'B-1': 'Privado' })).not.toContain('B-2');
    expect(ids({ 'B-1': 'Indeterminado' })).toContain('B-3');
  });
});

describe('itens de campo sem resposta e texto do relatório', () => {
  it('conta só os obrigatórios do Formulário A que se aplicam; desvio tira da conta; resposta também', () => {
    const base = itensDeCampoSemResposta({}).length;
    expect(base).toBeGreaterThan(0);
    expect(itensDeCampoSemResposta({}).every((i) => i.onde === 'campo' && !i.opcional)).toBe(true);
    expect(itensDeCampoSemResposta({ 'A-1': 'Cerrado' })).toHaveLength(base - 1);
    // A-15 "Não" tira A-15 (respondido), A-16 e A-17 (puladas)
    expect(itensDeCampoSemResposta({ 'A-15': ['Não'] })).toHaveLength(base - 3);
  });

  it('texto: só o respondido, na ordem do POP, com várias marcas separadas por ";" e citando o item', () => {
    expect(textoCaracterizacao({})).toBe('');
    const t = textoCaracterizacao({ 'A-10': 'Sim', 'A-1': 'Cerrado', 'A-24': ['Rodovias', 'Outras'], 'A-22': '  ' });
    expect(t.split('\n')).toEqual([
      'Caracterização do dano (POP IBAMA (Portaria Ibama nº 83/2022), Anexo I):',
      'A-1. Bioma: Cerrado',
      'A-10. Houve ocorrência de fogo recente ou indícios?: Sim',
      'A-24. Há ameaças externas, devido à presença ou proximidade da área degradada/alterada com: (pode marcar mais de 1 alternativa): Rodovias; Outras',
    ]);
  });

  it('resposta que o desvio tornou sem efeito não vai no texto', () => {
    expect(textoCaracterizacao({ 'A-15': ['Não'], 'A-16': 'Sim, houve preparo' })).not.toContain('A-16');
  });
});

describe('quando o ponto entra na caracterização', () => {
  it('tipo de dano de supressão, ou nenhuma demanda de embargo ligada', () => {
    expect(possivelSupressao({ tipoDano: 'Desmatamento' }, ['Embargo X'])).toBe(true);
    expect(possivelSupressao({ tipoDano: 'Exploração seletiva' }, ['Embargo X'])).toBe(true);
    expect(possivelSupressao({ tipoDano: 'Queimada' }, ['Embargo X'])).toBe(true);
    expect(possivelSupressao({}, [])).toBe(true);
    expect(possivelSupressao({ tipoDano: 'Cerca' }, ['Vistoria do embargo 12'])).toBe(false);
  });

  it('validação: só ids e opções do POP', () => {
    expect(caracterizacaoValida({ 'A-1': 'Cerrado', 'A-24': ['Rodovias'], 'A-22': 'texto' })).toBe(true);
    expect(caracterizacaoValida({ 'A-1': 'Marte' })).toBe(false);
    expect(caracterizacaoValida({ 'Z-9': 'x' })).toBe(false);
    expect(caracterizacaoValida({ 'A-24': ['Rodovias', 'Rodovias'] })).toBe(false);
    expect(caracterizacaoValida({ 'A-22': 'x'.repeat(501) })).toBe(false);
    expect(caracterizacaoValida({ 'A-24': 'Rodovias' })).toBe(false);
  });
});

const ponto = { coordenada: { lat: -12.1, lon: -58.2 }, municipio: 'Brasnorte', notas: '', demandas: [] as string[], situacao: 'planejado' as const, equipe: 'A', saida: '2026-10-05', retorno: '2026-10-09' };
const EMBARGO: Demanda = {
  id: 'dE', titulo: 'Embargo fictício', descricao: '', responsavel: 'Equipe A', prioridade: 'Alta', status: 'Em Andamento',
  criadaEm: '2026-11-13T09:00:00.000Z', ultimaAcaoRelevante: '2026-11-13T09:00:00.000Z',
};

function montar(pontos: Array<Partial<typeof ponto> & { tipoDano?: string }>) {
  const r = criarOperacao({ nome: 'Brasnorte', inicio: '2026-10-05', fim: '2026-10-12', origem: '' }, '2026-09-01T00:00:00Z');
  if (!r.ok) throw new Error('operação não criada');
  incluirPontos(r.id, pontos.map((p, i) => ({ ...ponto, coordenada: { lat: -12.1 - i, lon: -58.2 }, ...p })));
  const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [EMBARGO] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={() => new Date(2026, 10, 18, 10)} /></ContextoArmazem.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Brasnorte' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expandir todos' }));
  return { id: r.id, pontos: obterOperacoes()[0].pontos };
}

describe('tela do ponto', () => {
  it('o bloco aparece em ponto de possível supressão e não aparece em ponto com demanda de embargo', () => {
    const { pontos } = montar([{ tipoDano: 'Cerca', demandas: ['dE'] }, {}]);
    expect(screen.queryByTestId(`caracterizacao-${pontos[0].id}`)).toBeNull();
    expect(screen.getByTestId(`caracterizacao-${pontos[1].id}`)).toBeInTheDocument();
  });

  it('transcreve respostas (única, múltipla, texto), aplica o desvio e grava no ponto; mostra a fonte e o aviso de CPF', () => {
    const { pontos } = montar([{}]);
    const bloco = screen.getByTestId(`caracterizacao-${pontos[0].id}`);
    expect(within(bloco).getByText(/Fonte: POP IBAMA \(Portaria Ibama nº 83\/2022\), Anexo I/)).toBeInTheDocument();
    expect(within(bloco).getByText(/Não registre CPF, endereço ou nome do autuado/)).toBeInTheDocument();
    fireEvent.change(within(bloco).getByLabelText(/^A-1\. Bioma/), { target: { value: 'Cerrado' } });
    fireEvent.click(within(bloco).getByRole('checkbox', { name: /Arraste/ }));
    fireEvent.change(within(bloco).getByLabelText(/^A-22\./), { target: { value: 'Área prioritária' } });
    expect(obterOperacoes()[0].pontos[0].caracterizacao).toEqual({ 'A-1': 'Cerrado', 'A-15': ['Arraste'], 'A-22': 'Área prioritária' });
    // desvio: "Não" em A-15 pula A-16 e A-17
    fireEvent.click(within(bloco).getByRole('checkbox', { name: /Arraste/ }));
    fireEvent.click(within(bloco).getByRole('checkbox', { name: /^Não \(siga para A-18\)/ }));
    expect(within(bloco).queryByLabelText(/^A-16\./)).toBeNull();
    expect(within(bloco).getByTestId('pop-puladas')).toHaveTextContent('A-16, A-17');
    // limpar a resposta tira a chave
    fireEvent.change(within(bloco).getByLabelText(/^A-1\. Bioma/), { target: { value: '' } });
    expect(obterOperacoes()[0].pontos[0].caracterizacao).not.toHaveProperty('A-1');
  });

  it('dados de campo do roteiro: coordenada aferida, waypoint, fotos, drone e pessoa contatada', () => {
    const { pontos } = montar([{}]);
    const bloco = screen.getByTestId(`caracterizacao-${pontos[0].id}`);
    for (const [rot, v] of [['Coordenada aferida', '-12,1; -58,2'], ['Waypoint', 'WP 14'], ['Fotos', '18'], ['Pessoa contatada (nome e função, sem CPF)', 'Fulano, vaqueiro']] as const) {
      const campo = within(bloco).getByLabelText(rot);
      fireEvent.change(campo, { target: { value: v } });
      fireEvent.blur(campo);
    }
    fireEvent.click(within(bloco).getByRole('checkbox', { name: 'Voou drone' }));
    const arq = within(bloco).getByLabelText('Arquivo do voo');
    fireEvent.change(arq, { target: { value: 'DJI_0042.MP4' } });
    fireEvent.blur(arq);
    expect(obterOperacoes()[0].pontos[0]).toMatchObject({ coordenadaAferida: '-12,1; -58,2', waypoint: 'WP 14', fotos: '18', pessoaContatada: 'Fulano, vaqueiro', drone: { voou: true, arquivo: 'DJI_0042.MP4' } });
    expect(validarListaOperacoes(JSON.parse(JSON.stringify(obterOperacoes())))).toHaveLength(1);
  });

  it('copia o texto de caracterização (só o respondido) para a área de transferência', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
    const { pontos } = montar([{}]);
    const bloco = screen.getByTestId(`caracterizacao-${pontos[0].id}`);
    expect(within(bloco).getByRole('button', { name: 'Copiar texto para o relatório' })).toBeDisabled();
    fireEvent.change(within(bloco).getByLabelText(/^A-10\./), { target: { value: 'Sim' } });
    await act(async () => { fireEvent.click(within(bloco).getByRole('button', { name: 'Copiar texto para o relatório' })); });
    expect(escrever).toHaveBeenCalledWith('Caracterização do dano (POP IBAMA (Portaria Ibama nº 83/2022), Anexo I):\nA-10. Houve ocorrência de fogo recente ou indícios?: Sim');
    expect(within(bloco).getByRole('status')).toHaveTextContent('Texto copiado.');
  });

  it('registrar o relatório mostra quantos itens de campo faltam (não bloqueia); sem falta não pergunta; ponto fora do POP não pergunta', () => {
    const { id, pontos } = montar([{}, { tipoDano: 'Cerca', demandas: ['dE'] }]);
    act(() => { for (const p of pontos) registrarResultado(id, p.id, { resultado: 'sim', motivo: '', protocolo: '', observacao: '', dataVistoria: '' }, '2026-11-15'); });
    const enviar = (n: number) => {
      fireEvent.click(screen.getByRole('button', { name: `Registrar relatório no SIGA do Ponto ${n}` }));
      fireEvent.change(screen.getByLabelText('Data de envio no SIGA-MT'), { target: { value: '2026-11-17' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar envio' }));
    };
    const faltam = itensDeCampoSemResposta({}).length;
    enviar(1);
    expect(screen.getByTestId('confirma-conclusao')).toHaveTextContent(`Há ${faltam} item(ns) de campo do POP sem resposta. Concluir mesmo assim?`);
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(obterOperacoes()[0].pontos[0].relatorio).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar envio' }));
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(obterOperacoes()[0].pontos[0].relatorio?.enviadoEm).toBe('2026-11-17');
    // o outro ponto tem demanda de embargo: grava direto
    enviar(2);
    expect(screen.queryByTestId('confirma-conclusao')).toBeNull();
    expect(obterOperacoes()[0].pontos[1].relatorio?.enviadoEm).toBe('2026-11-17');
  });
});
