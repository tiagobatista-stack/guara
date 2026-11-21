// Item 11b (21/11/2026): o identificador interno (UUID) das demandas criadas no app nunca aparece ao
// usuário: nem na Fila, nem nos Avisos, nem nas respostas da conversa, nem nos nomes acessíveis.

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import type { EntradaDemanda } from '../demandas/modelo.ts';
import { parametrosDaRota, rotaParaAbrirDemanda } from '../../nucleo/registro-modulos.ts';
import { PainelAssistente } from './PainelAssistente.tsx';
import { CHAVE_CONVERSA, limparConversa, validarConversa } from './conversa.ts';
import { mostrarDeNovo } from './lembretes.ts';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const AGORA = () => new Date('2026-11-13T12:00:00.000Z');
const entrada = (titulo: string, prazo: string): EntradaDemanda => ({
  titulo, descricao: '', responsavel: 'Equipe (fictícia)', prioridade: 'Média', status: 'A Fazer', prazo,
});

beforeEach(() => { localStorage.clear(); limparConversa(); mostrarDeNovo('x'); localStorage.clear(); });

function montarComUuid() {
  // Sem gerarId: o armazém usa crypto.randomUUID(), como no app de verdade.
  const armazem = criarArmazem(localStorage, { exemplos: () => [], agora: AGORA });
  armazem.criar(entrada('Renovação de licença de operação da estação de tratamento de efluentes do distrito industrial de Rio Claro (FICTÍCIA)', '2026-11-10'));
  armazem.criar(entrada('Fazenda Sobral (fictícia)', '2026-11-13'));
  armazem.criar(entrada('Parecer do embargo remoto (fictício)', '2026-11-10'));
  const [primeira, , terceira] = armazem.obter().demandas;
  armazem.travar(primeira.id, 'outro', 'Comentário SIGILOSO do analista');
  armazem.travar(terceira.id, 'setor', '');
  const tela = render(
    <ContextoArmazem.Provider value={armazem}>
      <PainelAssistente agora={AGORA} />
    </ContextoArmazem.Provider>,
  );
  return { armazem, ...tela };
}

const enviar = (comando: string) => {
  fireEvent.change(screen.getByLabelText('Mensagem ao assistente'), { target: { value: comando } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
};

const textoVisivelEAcessivel = (container: HTMLElement) => {
  const nomes = Array.from(container.querySelectorAll('[aria-label], [title]')).map((e) => `${e.getAttribute('aria-label') ?? ''} ${e.getAttribute('title') ?? ''}`);
  return `${container.textContent} ${nomes.join(' ')}`;
};

describe('sem UUID na tela do assistente', () => {
  it('as demandas do teste têm mesmo identificador interno (confere a premissa)', () => {
    const { armazem } = montarComUuid();
    expect(armazem.obter().demandas.every((d) => UUID.test(d.id))).toBe(true);
  });

  it('Fila e Avisos (todas as abas) mostram o título, não o UUID', () => {
    const { container } = montarComUuid();
    const texto = textoVisivelEAcessivel(container);
    expect(texto).not.toMatch(UUID);
    fireEvent.click(screen.getByRole('tab', { name: /^Fila/ }));
    expect(screen.getByTestId('fila-do-dia')).toHaveTextContent('Fazenda Sobral (fictícia)');
  });

  it('as respostas dos comandos prazos, prioridades, buscar e demanda também não mostram UUID', () => {
    const { container } = montarComUuid();
    for (const frase of ['prazos', 'prioridades', 'buscar fazenda', 'buscar licença', 'ajuda']) {
      enviar(frase);
      expect(textoVisivelEAcessivel(container), frase).not.toMatch(UUID);
    }
    expect(container).toHaveTextContent('Fazenda Sobral (fictícia)');
  });

  it('o título longo aparece cortado entre palavras, com o sufixo (FICTÍCIA)', () => {
    const { container } = montarComUuid();
    enviar('prioridades');
    expect(container).toHaveTextContent('Renovação de licença … Rio Claro (FICTÍCIA)');
  });

  it('demanda travada por "outro": sugere ver o motivo, nunca "Cobrar o retorno: outro motivo"; o comentário do analista não aparece', () => {
    const { container } = montarComUuid();
    fireEvent.click(screen.getByRole('tab', { name: /^Fila/ }));
    const fila = screen.getByTestId('fila-do-dia');
    expect(fila).toHaveTextContent('Ver o motivo do bloqueio.');
    expect(fila.querySelector('a[href*="campo=bloqueio"]')).not.toBeNull();
    expect(container.textContent).not.toMatch(/outro motivo|SIGILOSO/);
    fireEvent.click(screen.getByRole('tab', { name: 'Conversa' }));
    enviar('prioridades');
    expect(container.textContent).not.toMatch(/Cobrar o retorno: outro|SIGILOSO/);
    // A conversa gravada (e qualquer registro do assistente) nunca leva o texto livre do analista.
    const conversaGravada = localStorage.getItem(CHAVE_CONVERSA);
    expect(conversaGravada).not.toBeNull();
    expect(conversaGravada).not.toContain('SIGILOSO');
  });

  it('a rota "ver o motivo do bloqueio" com UUID passa pela validação da conversa gravada', () => {
    const id = '4d17a4eb-0f62-4c1e-9a53-0d8c2f7b9e11';
    const rota = rotaParaAbrirDemanda(id, 'bloqueio');
    expect(parametrosDaRota(rota).get('campo')).toBe('bloqueio');
    const [m] = validarConversa([{ autor: 'assistente', texto: 'x', acoes: [{ rotulo: 'Ver o motivo do bloqueio', comando: `abrir ${id}`, rota }, { rotulo: 'Mau', comando: 'y', rota: '#/demandas?abrir=<script>&campo=bloqueio' }] }]);
    expect(m.acoes?.[0].rota).toBe(rota);
    expect(m.acoes?.[1].rota).toBeUndefined();
  });

  it('sino × Avisos: a aba Avisos explica que o sino conta demandas inativas', () => {
    montarComUuid();
    fireEvent.click(screen.getByRole('tab', { name: /^Avisos/ }));
    expect(screen.getByTestId('nota-sino')).toHaveTextContent('O número do sino, no cabeçalho, conta só demandas inativas');
  });
});
