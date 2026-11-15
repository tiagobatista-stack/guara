import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { escolherPrincipal, nomearMascote } from '../../compartilhado/preferencias-mascote.ts';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import type { EntradaDemanda } from '../demandas/modelo.ts';
import { PainelAssistente } from './PainelAssistente.tsx';

// Sexta, 13/11/2026.
const AGORA = () => new Date('2026-11-13T12:00:00.000Z');
const entrada = (titulo: string, prazo: string): EntradaDemanda => ({
  titulo, descricao: '', responsavel: 'Equipe (fictícia)', prioridade: 'Média', status: 'A Fazer', prazo,
});

/** Painel com uma demanda que vence hoje (um aviso), salvo se vier outra lista. */
function montar(demandas: EntradaDemanda[] = [entrada('Revisar parecer FIC-0001', '2026-11-13')]) {
  let n = 0;
  const armazem = criarArmazem(localStorage, { gerarId: () => `DEM-${++n}`, exemplos: () => [], agora: AGORA });
  demandas.forEach((d) => armazem.criar(d));
  const tela = render(
    <ContextoArmazem.Provider value={armazem}>
      <PainelAssistente agora={AGORA} />
    </ContextoArmazem.Provider>,
  );
  return { armazem, ...tela };
}

function enviar(comando: string) {
  fireEvent.change(screen.getByLabelText('Mensagem ao assistente'), { target: { value: comando } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
}

beforeEach(() => localStorage.clear());

describe('painel do assistente: mascote', () => {
  it('com demanda que pede atenção, o mascote fica atento e resume os avisos em texto', () => {
    montar();
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), atento' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Atento: 1 com prazo próximo.');
    const aviso = screen.getByTestId('aviso-DEM-1');
    expect(aviso).toHaveTextContent('Capivara: Revisar parecer FIC-0001: vence hoje.');
    expect(aviso).toHaveTextContent('fato · fonte: demandas deste navegador · 13/11/2026');
    expect(aviso.querySelector('svg.mascote[aria-hidden="true"]')).not.toBeNull();
  });

  it('sem nada pedindo atenção, fica tranquilo; o aviso aparece quando os dados mudam', () => {
    const { armazem } = montar([entrada('Atualizar manual (fictício)', '2026-11-30')]);
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), tranquilo' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Tranquilo: nenhuma demanda vencida, com prazo próximo ou parada.');
    expect(screen.getByText('Nenhum aviso.')).toBeInTheDocument();

    act(() => { armazem.criar(entrada('Conferir prazo antigo (fictício)', '2026-11-10')); });
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Atento: 1 vencida.');
    expect(screen.getByTestId('aviso-DEM-2')).toHaveTextContent('vencido há 3 dias úteis.');
  });

  it('mostra no máximo 5 avisos e indica onde ver os demais', () => {
    montar(['10', '11', '12', '13', '16', '17', '18'].map((dia) => entrada(`Demanda ${dia} (fictícia)`, `2026-11-${dia}`)));
    expect(screen.getAllByTestId(/^aviso-/)).toHaveLength(5);
    expect(screen.getByText('E mais 2: veja o Dashboard e a tela Alertas.')).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Atento: 3 vencidas e 4 com prazo próximo.');
  });

  it('comando não reconhecido deixa o mascote curioso; um comando conhecido devolve ao estado dos avisos', () => {
    montar();
    enviar('bom dia');
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), curioso' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Curioso');
    enviar('ajuda');
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), atento' })).toBeInTheDocument();
  });

  it('cada fala do assistente leva o rosto do mascote e o nome para o leitor de tela; a do usuário, não', () => {
    const { container } = montar();
    enviar('ajuda');
    const falas = container.querySelectorAll('.conversa li.fala');
    expect(falas).toHaveLength(2);
    falas.forEach((fala) => {
      expect(fala.querySelector('svg.mascote[aria-hidden="true"]')).not.toBeNull();
      expect(fala).toHaveTextContent('Capivara:');
    });
    const doUsuario = container.querySelector('li.mensagem--usuario')!;
    expect(doUsuario.querySelector('svg')).toBeNull();
    expect(doUsuario).toHaveTextContent('Você: ajuda');
  });

  it('o mascote principal e o nome vêm das preferências; o painel não tem seletor', () => {
    escolherPrincipal('lobo-guara');
    nomearMascote('lobo-guara', 'Tobias');
    const { container } = montar();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('img', { name: 'Tobias, Lobo-guará (Cerrado), atento' })).toBeInTheDocument();
    expect(screen.getByTestId('nome-do-mascote')).toHaveTextContent('Tobias');
    expect(container.querySelector('.conversa li.fala svg')!.getAttribute('data-especie')).toBe('lobo-guara');
    expect(container.querySelector('.conversa li.fala')).toHaveTextContent('Tobias:');
  });
});
