import { render, screen } from '@testing-library/react';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { ENTRADA_VAZIA } from '../demandas/FormularioDemanda.tsx';
import { Mapa } from './Mapa.tsx';
import { corDaSituacao, estadoDaFonte, itensDoMapa, legenda, limitesDosItens } from './regras.ts';
import type { Operacao } from '../operacoes/modelo.ts';

// O Leaflet precisa de layout real; aqui basta saber quantos itens a tela entrega ao mapa.
vi.mock('./MapaLeaflet.tsx', () => ({ MapaLeaflet: ({ itens }: { itens: unknown[] }) => <div data-testid="mapa-falso">{itens.length}</div> }));

const op: Operacao = {
  id: 'o1', nome: 'Op', criadaEm: '2026-11-01T00:00:00Z',
  viagens: [{ id: 'v1', equipe: 'A', integrantes: [], veiculos: [], saida: '2026-10-19', retorno: '2026-10-23', notas: '' }],
  pontos: [
    { id: 'p1', numero: 1, coordenada: { lat: -11.5, lon: -58.8 }, municipio: 'Juína', viagem: 'v1', notas: '', demandas: [], situacao: 'planejado' },
    { id: 'p2', numero: 2, coordenada: { lat: -12.2, lon: -57.7 }, municipio: 'Brasnorte', notas: '', demandas: [], situacao: 'vistoriado' },
  ],
};
const d = (id: string, coordenada: unknown, status = 'A Fazer') => ({ id, titulo: `T${id}`, status, prazo: '2026-12-01', coordenada }) as never;

describe('regras do mapa', () => {
  it('separa demanda com coordenada, sem coordenada e com coordenada inválida; inclui os pontos', () => {
    const { noMapa, semLocal } = itensDoMapa([d('1', { lat: -12, lon: -56 }), d('2', undefined), d('3', { lat: 99, lon: 0 })], [op]);
    expect(noMapa.map((i) => i.id)).toEqual(['1', 'p1', 'p2']);
    expect(semLocal.map((i) => i.id)).toEqual(['2', '3']);
    expect(noMapa[1]).toMatchObject({ tipo: 'ponto', municipio: 'Juína', quando: '19/10/2026 a 23/10/2026' });
  });

  it('legenda conta por tipo e situação; situação desconhecida é cinza', () => {
    const { noMapa } = itensDoMapa([d('1', { lat: -12, lon: -56 })], [op]);
    expect(legenda(noMapa)).toEqual([
      { tipo: 'demanda', situacao: 'A Fazer', n: 1 },
      { tipo: 'ponto', situacao: 'planejado', n: 1 },
      { tipo: 'ponto', situacao: 'vistoriado', n: 1 },
    ]);
    expect(corDaSituacao('outra')).toBe('#6b7280');
  });

  it('enquadramento: vazio, um item e vários', () => {
    const { noMapa } = itensDoMapa([], [op]);
    expect(limitesDosItens([])).toBeNull();
    expect(limitesDosItens([noMapa[0]])).toEqual([[-11.5, -58.8], [-11.5, -58.8]]);
    expect(limitesDosItens(noMapa)).toEqual([[-12.2, -58.8], [-11.5, -57.7]]);
  });
});

describe('tela Mapa', () => {
  it('lista as demandas sem localização com a contagem e entrega os itens ao mapa', () => {
    localStorage.clear();
    localStorage.setItem('guara:operacoes:v1', JSON.stringify([op]));
    const armazem = criarArmazem(localStorage, { gerarId: () => 'x', exemplos: () => [] });
    armazem.criar({ ...ENTRADA_VAZIA, titulo: 'Sem coordenada' });
    render(<ContextoArmazem.Provider value={armazem}><Mapa /></ContextoArmazem.Provider>);
    expect(screen.getByTestId('mapa-falso')).toHaveTextContent('2');
    expect(screen.getByTestId('titulo-sem-local')).toHaveTextContent('Sem localização (1)');
    expect(screen.getByTestId('sem-local')).toHaveTextContent('Sem coordenada');
  });
});

describe('estado da fonte de imagens', () => {
  it('só erros: indisponível a partir de 3; antes disso, normal', () => {
    expect(estadoDaFonte(2, 0)).toBe('normal');
    expect(estadoDaFonte(3, 0)).toBe('indisponivel');
  });
  it('erros depois de cargas: devagar, nunca indisponível', () => {
    expect(estadoDaFonte(1, 1)).toBe('devagar');
    expect(estadoDaFonte(20, 5)).toBe('devagar');
  });
  it('nenhum erro: normal', () => {
    expect(estadoDaFonte(0, 0)).toBe('normal');
    expect(estadoDaFonte(0, 7)).toBe('normal');
  });
});
