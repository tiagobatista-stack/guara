import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { escolherPrincipal, nomearMascote } from '../../compartilhado/preferencias-mascote.ts';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import type { EntradaDemanda } from '../demandas/modelo.ts';
import { PainelAssistente } from './PainelAssistente.tsx';
import { CHAVE_CONVERSA, limparConversa, MAXIMO_DE_FALAS } from './conversa.ts';
import { mostrarDeNovo, obterLembretes } from './lembretes.ts';

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

beforeEach(() => { localStorage.clear(); limparConversa(); mostrarDeNovo('x'); localStorage.clear(); });
afterEach(() => vi.restoreAllMocks());

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

  it('com aviso, o mascote olha para o primeiro aviso', () => {
    const caixa = (top: number) => ({ left: 0, top, width: 88, height: 88, right: 88, bottom: top + 88, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue(caixa(0));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(caixa(500));
    const { container } = montar();
    const mascote = container.querySelector<SVGSVGElement>('svg.mascote--vivo')!;
    expect(parseFloat(mascote.style.getPropertyValue('--olhar-y'))).toBeGreaterThan(0);
  });

  it('sem aviso, o olhar fica no centro', () => {
    vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue(
      { left: 0, top: 0, width: 88, height: 88, right: 88, bottom: 88, x: 0, y: 0, toJSON: () => ({}) } as DOMRect,
    );
    const { container } = montar([entrada('Prazo distante (fictício)', '2026-11-30')]);
    expect(container.querySelector<SVGSVGElement>('svg.mascote--vivo')!.style.getPropertyValue('--olhar-y')).toBe('');
  });

  it('o comando "prazos" responde com os mesmos dados dos avisos, com origem e data', () => {
    montar([
      entrada('Prazo antigo (fictício)', '2026-11-10'),
      entrada('Vence hoje (fictício)', '2026-11-13'),
      entrada('Prazo distante (fictício)', '2026-11-30'),
    ]);
    enviar('prazos');
    const falas = document.querySelectorAll('.conversa li.fala');
    const [fato, inferencia] = [falas[falas.length - 2], falas[falas.length - 1]];
    expect(fato).toHaveTextContent('Vencidas: DEM-1. Prazo próximo: DEM-2. Paradas: nenhuma.');
    expect(fato).toHaveTextContent('fato · fonte: demandas deste navegador · 13/11/2026');
    expect(inferencia).toHaveTextContent('Pela ordem das regras, a mais urgente é DEM-1 (Prazo antigo (fictício): vencido há 3 dias úteis.)');
    expect(inferencia).toHaveTextContent('inferência · fonte: ordem dos avisos');
  });

  it('a fila do dia aparece no painel, acima das notificações, com o motivo e a sugestão', () => {
    montar([entrada('Prazo antigo (fictício)', '2026-11-10')]);
    const fila = screen.getByRole('region', { name: 'Fila do dia' });
    expect(fila).toHaveTextContent('Prazo antigo (fictício)');
    expect(fila).toHaveTextContent('prazo: vencido há 3 dias úteis');
    expect(fila).toHaveTextContent('Decidir: prorrogar o prazo ou concluir.');
    expect(fila.compareDocumentPosition(screen.getByRole('region', { name: 'Notificações' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('o comando "prioridades" ordena a fila com motivo, e a próxima ação vem como sugestão', () => {
    montar([
      entrada('Vence hoje (fictício)', '2026-11-13'),
      entrada('Prazo antigo (fictício)', '2026-11-10'),
    ]);
    enviar('o que faço primeiro?');
    const falas = document.querySelectorAll('.conversa li.fala');
    const [fila, sugestao] = [falas[falas.length - 2], falas[falas.length - 1]];
    expect(fila).toHaveTextContent('2 demandas pedem atenção');
    expect(fila).toHaveTextContent('1. DEM-2');
    expect(fila).toHaveTextContent('prazo: vencido há 3 dias úteis');
    expect(fila).toHaveTextContent('inferência · fonte: demandas deste navegador');
    expect(sugestao).toHaveTextContent('Para DEM-2: Decidir: prorrogar o prazo ou concluir.');
    expect(sugestao).toHaveTextContent('sugestão');
  });

  it('cada natureza de resposta tem sua pose, junto com o selo de texto; inferência deixa o mascote pensativo', () => {
    const { container } = montar();
    enviar('ajuda');
    enviar('prazos');
    enviar('bom dia');
    const poses = [...container.querySelectorAll('.conversa li.fala')].map((fala) => [
      fala.querySelector('svg')!.getAttribute('data-humor'),
      fala.querySelector('.mensagem-meta')?.textContent?.split(' · ')[0] ?? null,
    ]);
    expect(poses).toEqual([
      ['tranquilo', 'fato'], // saudação
      ['tranquilo', 'fato'], // ajuda
      ['tranquilo', 'fato'], // prazos
      ['pensativo', 'inferência'],
      ['curioso', 'sugestão'],
    ]);
    enviar('prazos');
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), pensativo' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Pensativo: a última resposta é uma inferência; confira antes de agir.');
  });

  it('a cada envio, a conversa rola até a última fala', () => {
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    montar();
    enviar('ajuda');
    const ultima = rolar.mock.contexts.at(-1) as Element;
    expect(ultima).toHaveTextContent('Comandos disponíveis: "prazos"');
    enviar('bom dia');
    expect(rolar.mock.contexts.at(-1)).toHaveTextContent('Ainda não entendo linguagem livre');
    expect(rolar).toHaveBeenLastCalledWith({ block: 'nearest' });
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('a ajuda entende frases comuns e lista um comando por linha, sem repetir os botões dos atalhos', () => {
    const { container } = montar();
    enviar('me ajuda');
    const fala = container.querySelectorAll('.conversa li.fala')[1] as HTMLElement;
    expect(fala).toHaveTextContent('Comandos disponíveis: "prazos", "prioridades", "demanda" e "ajuda".');
    expect(fala.querySelector('.mensagem-texto')?.textContent).toContain('\n• prazos — lista as demandas vencidas');
    expect(fala).toHaveTextContent('Os atalhos abaixo enviam esses comandos.');
    expect(within(fala).queryByRole('group', { name: 'Comandos sugeridos' })).toBeNull();
    expect(within(fala).queryAllByRole('button')).toHaveLength(0);
  });

  it('sinônimos chegam ao mesmo comando ("o que tá vencido?" = "prazos")', () => {
    const { container } = montar();
    enviar('o que tá vencido?');
    expect(container.querySelectorAll('.conversa li.fala')[1]).toHaveTextContent('Prazo próximo: DEM-1');
  });

  it('"não entendi" oferece o botão para ver o que o mascote sabe fazer', () => {
    const { container } = montar();
    enviar('bom dia');
    const fala = container.querySelectorAll('.conversa li.fala')[1] as HTMLElement;
    expect(fala).toHaveTextContent('Ainda não entendo linguagem livre');
    fireEvent.click(within(fala).getByRole('button', { name: 'Ver o que eu sei fazer' }));
    expect(container.querySelectorAll('.conversa li.fala')[2]).toHaveTextContent('Comandos disponíveis');
  });

  it('atalhos "Ver prazos" e "O que você faz?" enviam o comando sem digitar, e o campo continua como estava', () => {
    const { container } = montar();
    const atalhos = screen.getByRole('group', { name: 'Atalhos de comando' });
    fireEvent.change(screen.getByLabelText('Mensagem ao assistente'), { target: { value: 'rascunho' } });
    fireEvent.click(within(atalhos).getByRole('button', { name: 'O que você faz?' }));
    expect(container.querySelector('.conversa li.mensagem--usuario')).toHaveTextContent('Você: ajuda');
    expect(container.querySelectorAll('.conversa li.fala')[1]).toHaveTextContent('Comandos disponíveis: "prazos"');
    expect(screen.getByLabelText('Mensagem ao assistente')).toHaveValue('rascunho');

    fireEvent.click(within(atalhos).getByRole('button', { name: 'Ver prazos' }));
    expect(container.querySelectorAll('.conversa li.mensagem--usuario')[1]).toHaveTextContent('Você: prazos');
    expect(screen.getByText(/Prazo próximo: DEM-1/)).toBeInTheDocument();
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

  it('a conversa fica guardada: fechar e reabrir o painel (ou recarregar) mantém as falas depois da saudação', () => {
    const primeira = montar();
    enviar('ajuda');
    primeira.unmount();

    const { container } = montar();
    const itens = container.querySelectorAll('.conversa li');
    expect(itens).toHaveLength(3);
    expect(itens[0]).toHaveTextContent('Olá! Trabalho só com dados fictícios');
    expect(itens[1]).toHaveTextContent('Você: ajuda');
    expect(itens[2]).toHaveTextContent('Comandos disponíveis');
    expect(JSON.parse(localStorage.getItem(CHAVE_CONVERSA)!)).toHaveLength(2);
  });

  it('a conversa guardada tem um teto de falas e descarta gravação inválida', () => {
    localStorage.setItem(CHAVE_CONVERSA, JSON.stringify([{ autor: 'robô', texto: 'x' }, { autor: 'usuario', texto: 'prazos' }, 'lixo']));
    const { container, unmount } = montar();
    expect(container.querySelectorAll('.conversa li')).toHaveLength(2);
    expect(container.querySelectorAll('.conversa li')[1]).toHaveTextContent('Você: prazos');
    unmount();

    localStorage.setItem(CHAVE_CONVERSA, '{nada');
    const segunda = montar();
    expect(segunda.container.querySelectorAll('.conversa li')).toHaveLength(1);
    for (let i = 0; i < MAXIMO_DE_FALAS; i++) enviar('ajuda');
    expect(JSON.parse(localStorage.getItem(CHAVE_CONVERSA)!)).toHaveLength(MAXIMO_DE_FALAS);
  });

  it('o campo de digitar pede o teclado de "enviar" no celular e não sugere textos antigos', () => {
    montar();
    const campo = screen.getByLabelText('Mensagem ao assistente');
    expect(campo).toHaveAttribute('enterkeyhint', 'send');
    expect(campo).toHaveAttribute('autocomplete', 'off');
  });

  it('"Ciente" esconde o aviso e acalma o mascote; o aviso volta quando a demanda muda de status', () => {
    const { armazem } = montar();
    fireEvent.click(within(screen.getByRole('group', { name: 'Lembrete de DEM-1' })).getByRole('button', { name: 'Ciente' }));
    expect(screen.queryByTestId('aviso-DEM-1')).toBeNull();
    expect(screen.getByText('Nenhum aviso novo.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), tranquilo' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Tranquilo: 1 aviso(s) ciente(s) ou adiado(s)');

    fireEvent.click(screen.getByRole('button', { name: '1 ciente(s) e 0 adiado(s)' }));
    expect(screen.getByTestId('oculto-DEM-1')).toHaveTextContent('(ciente)');

    act(() => { armazem.mudarStatus('DEM-1', 'Em Andamento'); });
    expect(screen.getByTestId('aviso-DEM-1')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Capivara (Pantanal), atento' })).toBeInTheDocument();
  });

  it('adiar esconde o lembrete até a hora escolhida; "Mostrar de novo" desfaz', () => {
    montar();
    const acoes = within(screen.getByRole('group', { name: 'Lembrete de DEM-1' }));
    const opcoes = acoes.getAllByRole('button', { name: /às (8|14)h$/ });
    expect(opcoes).toHaveLength(2);
    fireEvent.click(opcoes[0]);
    expect(screen.queryByTestId('aviso-DEM-1')).toBeNull();
    expect(new Date(obterLembretes()['DEM-1'].adiadoAte!).getTime()).toBeGreaterThan(AGORA().getTime());

    fireEvent.click(screen.getByRole('button', { name: '0 ciente(s) e 1 adiado(s)' }));
    expect(screen.getByTestId('oculto-DEM-1')).toHaveTextContent(/adiado até (hoje|amanhã) às (8|14)h/);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar de novo' }));
    expect(screen.getByTestId('aviso-DEM-1')).toBeInTheDocument();
    expect(obterLembretes()).toEqual({});
  });

  it('"Em 2 horas" esconde o lembrete por 2 horas exatas', () => {
    montar();
    fireEvent.click(within(screen.getByRole('group', { name: 'Lembrete de DEM-1' })).getByRole('button', { name: 'Em 2 horas' }));
    expect(screen.queryByTestId('aviso-DEM-1')).toBeNull();
    expect(new Date(obterLembretes()['DEM-1'].adiadoAte!).getTime()).toBe(AGORA().getTime() + 2 * 3_600_000);
  });

  it('"Não mostrar para esta demanda" silencia o aviso até "Mostrar de novo"', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Não mostrar para esta demanda' }));
    expect(screen.queryByTestId('aviso-DEM-1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /1 silenciada\(s\)$/ }));
    expect(screen.getByTestId('oculto-DEM-1')).toHaveTextContent('(silenciada)');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar de novo' }));
    expect(screen.getByTestId('aviso-DEM-1')).toBeInTheDocument();
    expect(obterLembretes()).toEqual({});
  });

  it('o comando "prazos" continua listando também os avisos cientes (é um fato, não um lembrete)', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Ciente' }));
    enviar('prazos');
    expect(screen.getByText(/Prazo próximo: DEM-1/)).toBeInTheDocument();
  });

  it('demanda concluída limpa o registro de ciente', () => {
    const { armazem } = montar();
    fireEvent.click(screen.getByRole('button', { name: 'Ciente' }));
    expect(Object.keys(obterLembretes())).toEqual(['DEM-1']);
    act(() => { armazem.mudarStatus('DEM-1', 'Concluída'); });
    expect(obterLembretes()).toEqual({});
  });

  it('a seção de notificações pode ser recolhida, fica só a conversa, e a escolha vale ao remontar o painel', () => {
    const primeira = montar();
    const recolher = screen.getByRole('button', { name: /Notificações.*recolher/ });
    expect(recolher).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(recolher);
    expect(screen.getByTestId('aviso-DEM-1')).not.toBeVisible();
    expect(screen.getByRole('button', { name: /1 novo\(s\), recolhidas; mostrar/ })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Mensagem ao assistente')).toBeInTheDocument();
    primeira.unmount();

    montar([]); // a demanda DEM-1 já está no localStorage
    expect(screen.getByTestId('aviso-DEM-1')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Notificações/ }));
    expect(screen.getByTestId('aviso-DEM-1')).toBeInTheDocument();
  });
});
