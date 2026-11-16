import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContextoArmazem, criarArmazem, type Armazem } from '../demandas/armazem.ts';
import type { EntradaDemanda } from '../demandas/modelo.ts';
import { AvisosLembretes } from './AvisosLembretes.tsx';
import { criarLembrete, limparLembretesPessoais, obterLembretesPessoais } from './armazem.ts';
import { interpretarLembrete, type PedidoLembrete } from './interpretar.ts';

// Segunda, 16/11/2026; os lembretes são criados às 8h e tocam às 9h.
const CRIACAO = new Date(2026, 10, 16, 8, 0);
const as = (h: number, m = 0) => new Date(2026, 10, 16, h, m);
let agora = as(9);
const relogio = () => agora;

function pedido(frase: string): PedidoLembrete {
  const r = interpretarLembrete(frase, CRIACAO);
  if (r.tipo !== 'lembrete') throw new Error(`esperava lembrete: ${frase}`);
  return r.pedido;
}

const arvore = (armazem: Armazem) => (
  <ContextoArmazem.Provider value={armazem}>
    <AvisosLembretes agora={relogio} tiqueMs={3_600_000} />
  </ContextoArmazem.Provider>
);

function montar(demandas: EntradaDemanda[] = []) {
  let n = 0;
  const armazem = criarArmazem(localStorage, { gerarId: () => `DEM-${++n}`, exemplos: () => [], agora: relogio });
  demandas.forEach((d) => armazem.criar(d));
  const tela = render(arvore(armazem));
  return { armazem, ...tela, atualizar: () => tela.rerender(arvore(armazem)) };
}

beforeEach(() => { localStorage.clear(); limparLembretesPessoais(); agora = as(9); });

describe('aviso de lembrete pessoal', () => {
  it('sem lembrete na hora, não mostra nada', () => {
    criarLembrete(pedido('me lembre de ligar para a gráfica (fictícia) às 10h'), CRIACAO);
    const { container } = montar();
    expect(container).toBeEmptyDOMElement();
  });

  it('na hora, aparece com destaque (faixa, mascote, texto) e "Feito" encerra o lembrete único', () => {
    criarLembrete(pedido('me lembre de ligar para a gráfica (fictícia) às 9h'), CRIACAO);
    montar();
    const aviso = screen.getByTestId('aviso-lembrete');
    expect(aviso).toHaveAttribute('data-nivel', '1');
    expect(aviso).toHaveAttribute('data-tipo', 'geral');
    expect(within(aviso).getByRole('alert')).toHaveTextContent('ligar para a gráfica (fictícia)');
    expect(aviso).toHaveTextContent('9h');
    expect(aviso.querySelector('svg.mascote')).not.toBeNull();

    fireEvent.click(within(aviso).getByRole('button', { name: 'Feito' }));
    expect(screen.queryByTestId('aviso-lembrete')).toBeNull();
    expect(obterLembretesPessoais()[0].estado).toBe('encerrado');
  });

  it('sem resposta: insiste no nível 2 depois de 10 min e vira o selo ⚠️ depois de 30 min', () => {
    criarLembrete(pedido('me lembre de enviar o ofício (fictício) às 9h'), CRIACAO);
    const { atualizar } = montar();
    agora = as(9, 11);
    atualizar();
    expect(screen.getByTestId('aviso-lembrete')).toHaveAttribute('data-nivel', '2');
    expect(screen.getByTestId('aviso-lembrete')).toHaveTextContent('insistindo');

    agora = as(9, 31);
    atualizar();
    expect(screen.queryByTestId('aviso-lembrete')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '1 lembrete(s) sem resposta; mostrar' }));
    expect(screen.getByTestId('aviso-lembrete')).toHaveTextContent('enviar o ofício (fictício)');
  });

  it('remédio: mostra a dose, "Tomei" e "Pular esta dose"; "Mais 10 min" esconde até lá', () => {
    criarLembrete(pedido('me lembre de tomar antibiótico (fictício) 3x ao dia começando às 9h por 7 dias'), CRIACAO);
    const { atualizar } = montar();
    const aviso = screen.getByTestId('aviso-lembrete');
    expect(aviso).toHaveAttribute('data-tipo', 'remedio');
    expect(aviso).toHaveTextContent('tomar antibiótico (fictício) (dose 1 de 21)');
    expect(within(aviso).getByRole('button', { name: 'Tomei' })).toBeInTheDocument();
    expect(within(aviso).getByRole('button', { name: 'Pular esta dose' })).toBeInTheDocument();

    fireEvent.click(within(aviso).getByRole('button', { name: 'Mais 10 min' }));
    expect(screen.queryByTestId('aviso-lembrete')).toBeNull();
    agora = as(9, 10);
    atualizar();
    expect(screen.getByTestId('aviso-lembrete')).toHaveTextContent('(dose 1 de 21)');
  });

  it('lembrete ligado a demanda mostra a demanda e é cancelado quando ela é concluída', () => {
    const { armazem } = montar([{ titulo: 'Vistoria (fictícia)', descricao: '', responsavel: 'Equipe (fictícia)', prioridade: 'Média', status: 'A Fazer', prazo: '2026-11-30' }]);
    act(() => { criarLembrete(pedido('ligar para o proprietário (fictício) às 9h'), CRIACAO, { id: 'DEM-1', titulo: 'Vistoria (fictícia)' }); });
    const aviso = screen.getByTestId('aviso-lembrete');
    expect(aviso).toHaveAttribute('data-tipo', 'demanda');
    expect(aviso).toHaveTextContent('Demanda: Vistoria (fictícia)');

    act(() => { armazem.mudarStatus('DEM-1', 'Concluída'); });
    expect(obterLembretesPessoais()[0].estado).toBe('cancelado');
    expect(screen.queryByTestId('aviso-lembrete')).toBeNull();
  });
});
