// Card da operação: "Gerar roteiro" some em operação passada; com cronograma antigo abre o aviso próprio, sem bloquear.

import { fireEvent, render, screen } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Operacoes } from './Operacoes.tsx';
import { CHAVE_OPERACOES } from './modelo.ts';
import { conferirCronograma, criarOperacao, criarViagem, incluirPontos, obterOperacoes } from './armazem.ts';

const ponto = { coordenada: { lat: -11.5, lon: -58.5 }, municipio: 'Juína', notas: '', demandas: [] as string[], situacao: 'planejado' as const };
const AGORA = () => new Date(2026, 10, 19, 10);
const viagem = { equipe: 'A', integrantes: ['x', 'y'], veiculos: ['v'], saida: '2026-12-01', retorno: '2026-12-01', notas: '' };

function montar() {
  const armazem = criarArmazem(localStorage, { gerarId: () => 'id', exemplos: () => [] });
  render(<ContextoArmazem.Provider value={armazem}><Operacoes agora={AGORA} /></ContextoArmazem.Provider>);
}
const nova = (nome: string, inicio: string) => (criarOperacao({ nome, inicio, fim: inicio, origem: '' }, '2026-11-01T00:00:00Z') as { id: string }).id;
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

it('esconde o botão em operação com início passado', () => {
  nova('Passada', '2026-11-10');
  montar();
  expect(screen.queryByRole('button', { name: /Gerar roteiro/ })).toBeNull();
});

it('cronograma antigo: ⚠, diálogo com contagens e as três saídas; "está certo" grava e fecha o aviso', async () => {
  const id = nova('Futura', '2026-12-01');
  criarViagem(id, viagem);
  await new Promise((ok) => setTimeout(ok, 5)); // carimbos em milissegundos: o ponto vem depois da viagem
  incluirPontos(id, [{ ...ponto }]);
  vi.spyOn(window, 'open').mockReturnValue(null);
  montar();
  const botao = screen.getByRole('button', { name: /Gerar roteiro de Futura/ });
  expect(botao.textContent).toContain('⚠');
  expect(botao.getAttribute('title')).toMatch(/^Cronograma não atualizado desde \d\d\/\d\d\/\d{4}$/);
  fireEvent.click(botao);
  expect(screen.getByText(/O cronograma não foi atualizado/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Atualizar cronograma' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Gerar mesmo assim' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'O cronograma está certo' }));
  expect(obterOperacoes()[0].cronogramaAtualizadoEm! >= obterOperacoes()[0].operacaoAlteradaEm!).toBe(true);
});

it('cronograma em dia e sem pendências gera direto, sem diálogo', async () => {
  const id = nova('Em dia', '2026-12-01');
  criarViagem(id, viagem);
  incluirPontos(id, [{ ...ponto }]);
  conferirCronograma(id);
  const aberta = vi.spyOn(window, 'open').mockReturnValue(null);
  URL.createObjectURL = () => 'blob:x';
  montar();
  fireEvent.click(screen.getByRole('button', { name: /Gerar roteiro de Em dia/ }));
  expect(screen.queryByRole('dialog')).toBeNull();
  await vi.waitFor(() => expect(aberta).toHaveBeenCalled());
});

it('abrir e voltar da operação não grava nada: continua desatualizada', async () => {
  const id = nova('Futura', '2026-12-01');
  criarViagem(id, viagem);
  await new Promise((ok) => setTimeout(ok, 5));
  incluirPontos(id, [{ ...ponto }]);
  const antes = localStorage.getItem(CHAVE_OPERACOES);
  montar();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir Futura' }));
  expect(screen.getByTestId('viagens')).toBeTruthy(); // a seção de viagens montou
  fireEvent.click(screen.getByRole('button', { name: 'Voltar às operações' }));
  expect(localStorage.getItem(CHAVE_OPERACOES)).toBe(antes);
  expect(screen.getByRole('button', { name: /Gerar roteiro de Futura/ }).textContent).toContain('⚠');
});

it('"Gerar mesmo assim" gera sem gravar nada; Enter no diálogo gera (o foco começa no botão principal)', async () => {
  const id = nova('Futura', '2026-12-01');
  criarViagem(id, viagem);
  await new Promise((ok) => setTimeout(ok, 5));
  incluirPontos(id, [{ ...ponto }]);
  const antes = localStorage.getItem(CHAVE_OPERACOES);
  const aberta = vi.spyOn(window, 'open').mockReturnValue(null);
  URL.createObjectURL = () => 'blob:x';
  montar();
  fireEvent.click(screen.getByRole('button', { name: /Gerar roteiro de Futura/ }));
  expect(document.activeElement?.textContent).toBe('Gerar mesmo assim');
  fireEvent.click(screen.getByRole('button', { name: 'Gerar mesmo assim' }));
  await vi.waitFor(() => expect(aberta).toHaveBeenCalled());
  expect(localStorage.getItem(CHAVE_OPERACOES)).toBe(antes);
});

it('várias viagens: o seletor traz equipe, período e nº de pontos, e gera a viagem escolhida', async () => {
  const id = nova('Duas', '2026-12-01');
  criarViagem(id, viagem);
  criarViagem(id, { ...viagem, equipe: 'Equipe B' });
  conferirCronograma(id);
  let blob: Blob | undefined;
  vi.spyOn(window, 'open').mockReturnValue(null);
  URL.createObjectURL = (b) => { blob = b as Blob; return 'blob:x'; };
  montar();
  fireEvent.click(screen.getByRole('button', { name: /Gerar roteiro de Duas/ }));
  const opcoes = screen.getAllByRole('option').map((o) => o.textContent);
  expect(opcoes).toEqual(['A · 01/12/2026 a 01/12/2026 · 0 pontos', 'Equipe B · 01/12/2026 a 01/12/2026 · 0 pontos']);
  fireEvent.change(screen.getByLabelText('Viagem'), { target: { value: obterOperacoes()[0].viagens[1].id } });
  fireEvent.click(screen.getByRole('button', { name: 'Gerar roteiro' }));
  await vi.waitFor(() => expect(blob).toBeDefined());
  expect(await blob!.text()).toContain('Equipe B');
});
