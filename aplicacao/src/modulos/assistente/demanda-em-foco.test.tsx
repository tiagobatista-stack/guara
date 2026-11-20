import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import { Demandas } from '../demandas/Demandas.tsx';
import { PainelAssistente } from './PainelAssistente.tsx';
import { limparConversa } from './conversa.ts';
import { definirDemandaEmFoco, obterDemandaEmFoco } from './demanda-em-foco.ts';
import { exportarDados, validarImportacao } from '../alertas/dados-portaveis.ts';

const AGORA = () => new Date('2026-11-13T12:00:00.000Z');

function montar() {
  const armazem = criarArmazem(localStorage, { gerarId: () => 'DEM-1', exemplos: () => [], agora: AGORA });
  armazem.criar({ titulo: 'Revisar parecer FIC-0001', descricao: '', responsavel: '', prioridade: 'Média', status: 'A Fazer', prazo: '2026-11-13' });
  render(
    <ContextoArmazem.Provider value={armazem}>
      <Demandas agora={AGORA} />
      <PainelAssistente agora={AGORA} />
    </ContextoArmazem.Provider>,
  );
  return armazem;
}
const perguntar = () => {
  fireEvent.change(screen.getByLabelText('Mensagem ao assistente'), { target: { value: 'demanda' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
};

beforeEach(() => { localStorage.clear(); limparConversa(); definirDemandaEmFoco(null); });
afterEach(() => vi.restoreAllMocks());

describe('assistente conectado à demanda escolhida', () => {
  it('VÁLIDO: com o detalhe aberto, responde fato, inferência e sugestão, com o método determinístico', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Revisar parecer FIC-0001' }));
    expect(obterDemandaEmFoco()).toBe('DEM-1');
    perguntar();
    const fala = screen.getByText(/DEM-1 · Revisar parecer FIC-0001 — situação A Fazer/);
    expect(fala.closest('.mensagem')).toHaveTextContent('método: determinístico (regras locais, sem modelo de IA)');
    expect(screen.getByText(/Pelas regras: prazo: vence hoje/)).toBeInTheDocument();
    expect(screen.getByText(/Falta preencher:/)).toBeInTheDocument();
  });

  it('NEGADO: sem demanda aberta, não inventa uma; orienta a abrir uma', () => {
    montar();
    perguntar();
    expect(screen.getByText(/Abra uma demanda na tela Demandas/)).toBeInTheDocument();
    expect(screen.queryByText(/DEM-1 ·/)).toBeNull();
  });

  it('FALHA: demanda em foco que sumiu dos dados é dita como não encontrada, sem alterar nada', () => {
    const armazem = montar();
    act(() => definirDemandaEmFoco('DEM-9'));
    perguntar();
    expect(screen.getByText(/Não encontrei a demanda DEM-9/)).toBeInTheDocument();
    expect(armazem.obter().demandas).toHaveLength(1);
  });

  it('ao sair do detalhe, o foco some', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Detalhes de Revisar parecer FIC-0001' }));
    fireEvent.click(screen.getByRole('button', { name: 'Voltar à lista' }));
    expect(obterDemandaEmFoco()).toBeNull();
  });
});

describe('exportação rastreável', () => {
  const agora = new Date('2026-11-13T12:00:00.000Z');
  it('registra aplicação, método e demanda em foco, e a importação preserva o rastro', () => {
    const texto = exportarDados([], 3, agora, undefined, undefined, 'DEM-1');
    const json = JSON.parse(texto);
    expect(json.origem).toMatchObject({ aplicacao: 'GUARÁ', tela: 'Alertas', demandaEmFoco: 'DEM-1' });
    expect(json.origem.metodo).toMatch(/determinística/);
    const r = validarImportacao(texto);
    expect(r.ok && r.dados.origem?.demandaEmFoco).toBe('DEM-1');
  });
  it('sem demanda em foco, o campo não aparece; arquivo antigo sem origem continua válido', () => {
    expect(JSON.parse(exportarDados([], 3, agora)).origem.demandaEmFoco).toBeUndefined();
    const antigo = JSON.stringify({ formato: 'guara-dados', versao: 1, ficticio: true, exportadoEm: '', configuracao: { diasInatividade: 3 }, demandas: [] });
    const r = validarImportacao(antigo);
    expect(r.ok && r.dados.origem).toBeUndefined();
  });
});
