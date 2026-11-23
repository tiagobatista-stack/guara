import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { escolherPrincipal, nomearMascote } from '../../compartilhado/preferencias-mascote.ts';
import { ContextoArmazem, criarArmazem } from '../demandas/armazem.ts';
import type { EntradaDemanda } from '../demandas/modelo.ts';
import { PainelAssistente } from './PainelAssistente.tsx';
import { CHAVE_CONVERSA, limparConversa, MAXIMO_DE_FALAS } from './conversa.ts';
import { definirDemandaEmFoco } from './demanda-em-foco.ts';
import { mostrarDeNovo, obterLembretes } from './lembretes.ts';
import { pedirAba } from './abas.ts';
import { registrarBackup } from '../../compartilhado/ultimo-backup.ts';

// Sexta, 13/11/2026.
const AGORA = () => new Date('2026-11-13T12:00:00.000Z');
const entrada = (titulo: string, prazo: string): EntradaDemanda => ({
  titulo, descricao: '', responsavel: 'Equipe (fictícia)', prioridade: 'Média', status: 'A Fazer', prazo,
});

/** Painel com uma demanda que vence hoje (um aviso), salvo se vier outra lista. */
function montar(demandas: EntradaDemanda[] = [entrada('Revisar parecer FIC-0001', '2026-11-13')], formatarId: (n: number) => string = (n) => `DEM-${n}`) {
  let n = 0;
  const armazem = criarArmazem(localStorage, { gerarId: () => formatarId(++n), exemplos: () => [], agora: AGORA });
  demandas.forEach((d) => armazem.criar(d));
  const tela = render(
    <ContextoArmazem.Provider value={armazem}>
      <PainelAssistente agora={AGORA} />
    </ContextoArmazem.Provider>,
  );
  return { armazem, ...tela };
}

function irParaAba(nome: 'Conversa' | 'Fila' | 'Avisos') {
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(`^${nome}`) }));
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
    expect(screen.getByRole('img', { name: 'Lobo-guará (Cerrado), atento' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Atento: 1 com prazo próximo.');
    const aviso = screen.getByTestId('aviso-DEM-1');
    expect(aviso).toHaveTextContent('Lobo-guará: Revisar parecer FIC-0001: vence hoje.');
    expect(aviso).toHaveTextContent('fato · fonte: demandas deste navegador · 13/11/2026');
    expect(aviso.querySelector('svg.mascote[aria-hidden="true"]')).not.toBeNull();
  });

  it('sem nada pedindo atenção, fica tranquilo; o aviso aparece quando os dados mudam', () => {
    const { armazem } = montar([entrada('Atualizar manual (fictício)', '2026-11-30')]);
    expect(screen.getByRole('img', { name: 'Lobo-guará (Cerrado), tranquilo' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Tranquilo: nenhuma demanda vencida, com prazo próximo ou parada.');
    expect(screen.getByText('Nenhum aviso.')).toBeInTheDocument();

    act(() => { armazem.criar(entrada('Conferir prazo antigo (fictício)', '2026-11-10')); });
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Atento: 1 vencida.');
    expect(screen.getByTestId('aviso-DEM-2')).toHaveTextContent('vencido há 3 dias úteis.');
    // vencido há N dias úteis é fato (conta sobre o prazo gravado); só "parada" é inferência
    expect(screen.getByTestId('aviso-DEM-2').querySelector('.mensagem-meta')).toHaveTextContent(/^fato · fonte:/);
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

  it('a fila do dia fica na aba Fila, com o motivo e a sugestão', () => {
    montar([entrada('Prazo antigo (fictício)', '2026-11-10')]);
    irParaAba('Fila');
    const fila = screen.getByRole('tabpanel', { name: /^Fila/ });
    expect(fila).toHaveTextContent('Prazo antigo (fictício)');
    expect(fila).toHaveTextContent('prazo: vencido há 3 dias úteis');
    expect(fila).toHaveTextContent('Decidir: prorrogar o prazo ou concluir.');
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
    expect(sugestao).toHaveTextContent('DEM-2 → decidir: prorrogar o prazo ou concluir.');
    expect(sugestao).toHaveTextContent('sugestão');
  });

  it('cada natureza de resposta tem sua pose, junto com o selo de texto; inferência deixa o mascote pensativo', () => {
    const { container } = montar();
    enviar('ajuda');
    enviar('prazos');
    enviar('xyz');
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
    expect(screen.getByRole('img', { name: 'Lobo-guará (Cerrado), pensativo' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Pensativo: a última resposta é uma inferência; confira antes de agir.');
  });

  it('a cada envio, a conversa rola até a última fala', () => {
    const rolar = vi.fn();
    Element.prototype.scrollIntoView = rolar;
    montar();
    enviar('ajuda');
    const ultima = rolar.mock.contexts.at(-1) as Element;
    expect(ultima).toHaveTextContent('Comandos disponíveis: "prazos"');
    enviar('xyz');
    expect(rolar.mock.contexts.at(-1)).toHaveTextContent('Ainda não entendi essa frase');
    expect(rolar).toHaveBeenLastCalledWith({ block: 'nearest' });
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it('a ajuda entende frases comuns e lista um comando por linha, sem repetir botões de comandos que já têm botão', () => {
    const { container } = montar();
    enviar('me ajuda');
    const fala = container.querySelectorAll('.conversa li.fala')[1] as HTMLElement;
    expect(fala).toHaveTextContent('Comandos disponíveis: "prazos", "prioridades", "demanda", "lembrar", "prorrogar", "buscar", "operações", "anotar compromisso", "agenda" e "ajuda".');
    expect(fala.querySelector('.mensagem-texto')?.textContent).toContain('\n• prazos — lista as demandas vencidas');
    // "lembrar" não está nos atalhos fixos: só eles ganham botão na resposta.
    expect(fala).toHaveTextContent('Toque num comando abaixo para usá-lo.');
    expect(within(fala).queryAllByRole('button').map((x) => x.textContent)).toEqual(['Criar um lembrete', 'Prorrogar um prazo', 'Buscar uma demanda', 'Ver operações']);
  });

  it('sinônimos chegam ao mesmo comando ("o que tá vencido?" = "prazos")', () => {
    const { container } = montar();
    enviar('o que tá vencido?');
    expect(container.querySelectorAll('.conversa li.fala')[1]).toHaveTextContent('Prazo próximo: DEM-1');
  });

  it('"não entendi" oferece "Ver prazos", "O que faço primeiro?" e "O que você faz?"', () => {
    const { container } = montar();
    enviar('xyz');
    const fala = container.querySelectorAll('.conversa li.fala')[1] as HTMLElement;
    expect(fala).toHaveTextContent('Ainda não entendi essa frase');
    expect(within(fala).getAllByRole('button').map((x) => x.textContent)).toEqual(['Ver prazos', 'O que faço primeiro?', 'O que você faz?']);
    fireEvent.click(within(fala).getByRole('button', { name: 'O que você faz?' }));
    expect(container.querySelectorAll('.conversa li.fala')[2]).toHaveTextContent('Comandos disponíveis');
  });

  it('não há fileira fixa de atalhos; a abertura já traz botões e eles enviam o comando sem digitar', () => {
    const { container } = montar();
    expect(screen.queryByRole('group', { name: 'Atalhos de comando' })).toBeNull();
    expect(container.querySelector('.atalhos-conversa')).toBeNull();
    const abertura = container.querySelectorAll('.conversa li.fala')[0] as HTMLElement;
    expect(within(abertura).getAllByRole('button').map((x) => x.textContent)).toEqual(['O que faço primeiro?', 'Ver prazos', 'O que você faz?']);
    fireEvent.change(screen.getByLabelText('Mensagem ao assistente'), { target: { value: 'rascunho' } });
    fireEvent.click(within(abertura).getByRole('button', { name: 'O que você faz?' }));
    expect(container.querySelector('.conversa li.mensagem--usuario')).toHaveTextContent('Você: ajuda');
    expect(container.querySelectorAll('.conversa li.fala')[1]).toHaveTextContent('Comandos disponíveis: "prazos"');
    expect(screen.getByLabelText('Mensagem ao assistente')).toHaveValue('rascunho');
    expect(screen.getByPlaceholderText('Ex.: "prazos"')).toBeInTheDocument();
  });

  it('toda resposta do assistente termina com 2 a 4 botões', () => {
    const { container } = montar();
    for (const frase of ['ola', 'ajuda', 'prioridades', 'prazos', 'demanda', 'DEM-1', 'lembrar DEM-1 amanhã', 'prorrogar DEM-1', 'xyz', 'DEM-1 xyz']) {
      enviar(frase);
      const falas = container.querySelectorAll('.conversa li.fala');
      const ultima = falas[falas.length - 1] as HTMLElement;
      const n = within(ultima).queryAllByRole('button').length;
      expect(n, frase).toBeGreaterThanOrEqual(2);
      expect(n, frase).toBeLessThanOrEqual(4);
    }
  });

  it('"Sobre a demanda aberta" só aparece quando há demanda aberta na tela Demandas', () => {
    const { container } = montar();
    enviar('xyz');
    expect(screen.queryByRole('button', { name: 'Sobre a demanda aberta' })).toBeNull();
    act(() => definirDemandaEmFoco('DEM-1'));
    enviar('xyz');
    const falas = container.querySelectorAll('.conversa li.fala');
    expect(within(falas[falas.length - 1] as HTMLElement).getByRole('button', { name: 'Sobre a demanda aberta' })).toBeInTheDocument();
    act(() => definirDemandaEmFoco(null));
  });

  it('só os botões da última fala ficam ativos; os anteriores seguem no histórico, desativados', () => {
    const { container } = montar();
    enviar('xyz');
    const antes = container.querySelectorAll('.conversa li.fala')[1] as HTMLElement;
    fireEvent.click(within(antes).getByRole('button', { name: 'Ver prazos' }));
    const falas = container.querySelectorAll('.conversa li.fala');
    const total = falas.length;
    expect(total).toBeGreaterThan(2);
    // Fala antiga: aria-disabled e clique sem efeito.
    within(antes).getAllByRole('button').forEach((b) => expect(b).toHaveAttribute('aria-disabled', 'true'));
    fireEvent.click(within(antes).getByRole('button', { name: 'O que você faz?' }));
    expect(container.querySelectorAll('.conversa li.fala')).toHaveLength(total);
    // Abertura também fica desativada.
    within(falas[0] as HTMLElement).getAllByRole('button').forEach((b) => expect(b).toHaveAttribute('aria-disabled', 'true'));
    // Última fala: ativa.
    within(falas[total - 1] as HTMLElement).getAllByRole('button').forEach((b) => expect(b).not.toHaveAttribute('aria-disabled'));
  });

  describe('buscar', () => {
    const titulos = ['Licença A (fictícia)', 'Licença B (fictícia)', 'Parecer C (fictícia)'].map((t) => entrada(t, '2026-12-20'));

    it('com termo: lista os achados e o botão "Ver todos em Demandas" leva à tela com o termo', () => {
      const { container } = montar(titulos);
      enviar('cadê a licença?');
      const fala = container.querySelectorAll('.conversa li.fala')[1] as HTMLElement;
      expect(fala).toHaveTextContent("Achei 2 demandas com 'licença'");
      expect(fala).toHaveTextContent('DEM-1 — Licença A (fictícia) (A Fazer)');
      expect(fala).toHaveTextContent('fato · fonte: demandas deste navegador · busca por título, descrição ou número');
      const assign = vi.fn();
      vi.stubGlobal('location', { ...window.location, assign });
      fireEvent.click(within(fala).getByRole('button', { name: 'Ver todos em Demandas' }));
      expect(assign).toHaveBeenCalledWith('#/demandas?texto=licen%C3%A7a');
      vi.unstubAllGlobals();
    });

    it('sem termo pergunta o que buscar; sem resultado diz que não achou; os dois oferecem os botões de ajuda', () => {
      const { container } = montar(titulos);
      for (const [frase, trecho] of [['buscar', 'O que você quer buscar?'], ['procurar zzz', "Não achei demanda com 'zzz'."]]) {
        enviar(frase);
        const falas = container.querySelectorAll('.conversa li.fala');
        const ultima = falas[falas.length - 1] as HTMLElement;
        expect(ultima).toHaveTextContent(trecho);
        expect(within(ultima).getAllByRole('button').map((b) => b.textContent)).toEqual(['Ver prazos', 'O que faço primeiro?', 'O que você faz?']);
      }
    });

    it('"cadê DEM-FIC-0001" (só o código) vira o resumo da demanda', () => {
      const { container } = montar(titulos, (n) => `DEM-FIC-${String(n).padStart(4, '0')}`);
      enviar('cadê DEM-FIC-0001');
      expect(container.querySelectorAll('.conversa li.fala')[1]).not.toHaveTextContent('Achei');
    });
  });

  it('mostra no máximo 5 avisos e indica onde ver os demais', () => {
    montar(['10', '11', '12', '13', '16', '17', '18'].map((dia) => entrada(`Demanda ${dia} (fictícia)`, `2026-11-${dia}`)));
    expect(screen.getAllByTestId(/^aviso-/)).toHaveLength(5);
    expect(screen.getByText('E mais 2: veja o Dashboard e a tela Alertas.')).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Atento: 3 vencidas e 4 com prazo próximo.');
  });

  it('comando não reconhecido deixa o mascote curioso; um comando conhecido devolve ao estado dos avisos', () => {
    montar();
    enviar('xyz');
    expect(screen.getByRole('img', { name: 'Lobo-guará (Cerrado), curioso' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Curioso');
    enviar('ajuda');
    expect(screen.getByRole('img', { name: 'Lobo-guará (Cerrado), atento' })).toBeInTheDocument();
  });

  it('cada fala do assistente leva o rosto do mascote e o nome para o leitor de tela; a do usuário, não', () => {
    const { container } = montar();
    enviar('ajuda');
    const falas = container.querySelectorAll('.conversa li.fala');
    expect(falas).toHaveLength(2);
    falas.forEach((fala) => {
      expect(fala.querySelector('svg.mascote[aria-hidden="true"]')).not.toBeNull();
      expect(fala).toHaveTextContent('Lobo-guará:');
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
    irParaAba('Avisos');
    fireEvent.click(within(screen.getByRole('group', { name: 'Lembrete de DEM-1' })).getByRole('button', { name: 'Ciente' }));
    expect(screen.queryByTestId('aviso-DEM-1')).toBeNull();
    expect(screen.getByText('Nenhum aviso novo.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Lobo-guará (Cerrado), tranquilo' })).toBeInTheDocument();
    expect(screen.getByTestId('humor-do-mascote')).toHaveTextContent('Tranquilo: 1 aviso ciente ou adiado');

    fireEvent.click(screen.getByRole('button', { name: '1 ciente e 0 adiados' }));
    expect(screen.getByTestId('oculto-DEM-1')).toHaveTextContent('(ciente)');

    act(() => { armazem.mudarStatus('DEM-1', 'Em Andamento'); });
    expect(screen.getByTestId('aviso-DEM-1')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Lobo-guará (Cerrado), atento' })).toBeInTheDocument();
  });

  it('adiar esconde o lembrete até a hora escolhida; "Mostrar de novo" desfaz', () => {
    montar();
    irParaAba('Avisos');
    const acoes = within(screen.getByRole('group', { name: 'Lembrete de DEM-1' }));
    const opcoes = acoes.getAllByRole('button', { name: /às (8|14)h$/ });
    expect(opcoes).toHaveLength(2);
    fireEvent.click(opcoes[0]);
    expect(screen.queryByTestId('aviso-DEM-1')).toBeNull();
    expect(new Date(obterLembretes()['DEM-1'].adiadoAte!).getTime()).toBeGreaterThan(AGORA().getTime());

    fireEvent.click(screen.getByRole('button', { name: '0 cientes e 1 adiado' }));
    expect(screen.getByTestId('oculto-DEM-1')).toHaveTextContent(/adiado até (hoje|amanhã) às (8|14)h/);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar de novo' }));
    expect(screen.getByTestId('aviso-DEM-1')).toBeInTheDocument();
    expect(obterLembretes()).toEqual({});
  });

  it('"Em 2 horas" esconde o lembrete por 2 horas exatas', () => {
    montar();
    irParaAba('Avisos');
    fireEvent.click(within(screen.getByRole('group', { name: 'Lembrete de DEM-1' })).getByRole('button', { name: 'Em 2 horas' }));
    expect(screen.queryByTestId('aviso-DEM-1')).toBeNull();
    expect(new Date(obterLembretes()['DEM-1'].adiadoAte!).getTime()).toBe(AGORA().getTime() + 2 * 3_600_000);
  });

  it('"Não mostrar para esta demanda" silencia o aviso até "Mostrar de novo"', () => {
    montar();
    irParaAba('Avisos');
    fireEvent.click(screen.getByRole('button', { name: 'Não mostrar para esta demanda' }));
    expect(screen.queryByTestId('aviso-DEM-1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /1 silenciada$/ }));
    expect(screen.getByTestId('oculto-DEM-1')).toHaveTextContent('(silenciada)');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar de novo' }));
    expect(screen.getByTestId('aviso-DEM-1')).toBeInTheDocument();
    expect(obterLembretes()).toEqual({});
  });

  it('código de demanda na frase: resume aquela demanda, sem depender da demanda aberta', () => {
    montar([entrada('Revisar parecer FIC-0001', '2026-11-13'), entrada('Outra demanda fictícia', '2026-12-30')], (n) => `DEM-FIC-${String(n).padStart(4, '0')}`);
    ['DEM-FIC-0002', 'me fala da dem fic 2', 'dem-fic-0002 ?'].forEach((frase, i) => {
      enviar(frase);
      expect(screen.getAllByText(/DEM-FIC-0002 · Outra demanda fictícia/)).toHaveLength(i + 1);
    });
    expect(screen.queryByText(/Ainda não entendo/)).toBeNull();
  });

  it('código com verbo desconhecido: diz o que reconheceu e oferece resumo, lembrar e abrir demanda', () => {
    const { container } = montar([entrada('Revisar parecer FIC-0001', '2026-11-13')], (n) => `DEM-FIC-${String(n).padStart(4, '0')}`);
    enviar('DEM-FIC-0001 xyz');
    const fala = container.querySelectorAll('.conversa li.fala')[1] as HTMLElement;
    expect(fala).toHaveTextContent('Reconheci DEM-FIC-0001, mas não entendi o restante. Para essa demanda posso: resumo, lembrete, abrir para prorrogar.');
    expect(within(fala).getAllByRole('button').map((b) => b.textContent)).toEqual(['Resumo de DEM-FIC-0001', 'Lembrar', 'Abrir demanda']);
  });

  it('botões que mandam comando por texto funcionam no clique real: Lembrar, opção de horário e Resumo', () => {
    montar([entrada('Revisar parecer FIC-0001', '2026-11-13')], (n) => `DEM-FIC-${String(n).padStart(4, '0')}`);
    enviar('DEM-FIC-0001 xyz');
    fireEvent.click(screen.getByRole('button', { name: 'Lembrar' }));
    const opcao = screen.getAllByRole('button', { name: /^(Amanhã|Em 2 horas|Segunda|Terça|Quarta|Quinta|Sexta)/ }).pop()!;
    fireEvent.click(opcao);
    expect(screen.getByText(/Tirei o aviso de DEM-FIC-0001 da lista; ele volta/)).toBeInTheDocument();
    enviar('DEM-FIC-0001 xyz');
    fireEvent.click(screen.getAllByRole('button', { name: 'Resumo de DEM-FIC-0001' }).pop()!);
    expect(screen.getAllByText(/DEM-FIC-0001 · Revisar parecer FIC-0001/).length).toBeGreaterThan(0);
  });

  it('"Abrir demanda" navega para a rota com o parâmetro', () => {
    montar([entrada('Revisar parecer FIC-0001', '2026-11-13')], (n) => `DEM-FIC-${String(n).padStart(4, '0')}`);
    enviar('prorrogar DEM-FIC-0001');
    const botao = screen.getByRole('button', { name: 'Abrir demanda DEM-FIC-0001, no campo Prazo' });
    fireEvent.click(botao);
    expect(window.location.hash).toBe('#/demandas?abrir=DEM-FIC-0001&campo=prazo');
    window.location.hash = '';
  });

  it('código inexistente: diz que não encontrou, sem inventar', () => {
    montar([entrada('Revisar parecer FIC-0001', '2026-11-13')], (n) => `DEM-FIC-${String(n).padStart(4, '0')}`);
    enviar('DEM-FIC-0099');
    expect(screen.getByText('Não encontrei DEM-FIC-0099 nas demandas deste navegador. Nada foi alterado.')).toBeInTheDocument();
  });

  it('cumprimento: responde "fato · fonte: sistema" com atalhos; "bom dia, prioridades" responde a fila', () => {
    const { container } = montar();
    enviar('ola');
    const falas = container.querySelectorAll('.conversa li.fala');
    const ultima = falas[falas.length - 1];
    expect(ultima).toHaveTextContent(/Olá! Posso mostrar prazos/);
    expect(ultima.querySelector('.mensagem-meta')).toHaveTextContent(/^fato · fonte: sistema/);
    expect(within(ultima as HTMLElement).getByRole('button', { name: 'O que faço primeiro?' })).toBeInTheDocument();
    enviar('bom dia, prioridades');
    expect(screen.getAllByText(/pede(m)? atenção/).length).toBeGreaterThan(0);
  });

  it('o comando "prazos" continua listando também os avisos cientes (é um fato, não um lembrete)', () => {
    montar();
    irParaAba('Avisos');
    fireEvent.click(screen.getByRole('button', { name: 'Ciente' }));
    irParaAba('Conversa');
    enviar('prazos');
    expect(screen.getByText(/Prazo próximo: DEM-1/)).toBeInTheDocument();
  });

  it('demanda concluída limpa o registro de ciente', () => {
    const { armazem } = montar();
    irParaAba('Avisos');
    fireEvent.click(screen.getByRole('button', { name: 'Ciente' }));
    expect(Object.keys(obterLembretes())).toEqual(['DEM-1']);
    act(() => { armazem.mudarStatus('DEM-1', 'Concluída'); });
    expect(obterLembretes()).toEqual({});
  });

  describe('abas (item 11a)', () => {
    it('abre em Conversa; o nome acessível das abas leva o número', () => {
      montar();
      const abas = screen.getAllByRole('tab');
      expect(abas.map((x) => x.textContent)).toEqual(['Conversa', 'Fila (1)', 'Avisos (1)']);
      expect(abas.map((x) => x.getAttribute('aria-label'))).toEqual(['Conversa', 'Fila, 1 item', 'Avisos, 1 item']);
      expect(screen.getByRole('tab', { name: 'Conversa' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel', { name: 'Conversa' })).toBeVisible();
      expect(screen.getByLabelText('Mensagem ao assistente')).toBeVisible();
      expect(screen.getByTestId('aviso-DEM-1')).not.toBeVisible();
    });

    it('o número da Fila é o da fila do dia, não o total de demandas abertas', () => {
      montar([{ ...entrada('Pronta (fictícia)', '2026-11-10'), status: 'Concluída' }, entrada('Vencida (fictícia)', '2026-11-10')]);
      expect(screen.getByRole('tab', { name: 'Fila, 1 item' })).toBeInTheDocument();
    });

    it('setas, Home e End trocam de aba e movem o foco; só a aba ativa entra na sequência do Tab', () => {
      montar();
      const conversa = screen.getByRole('tab', { name: 'Conversa' });
      conversa.focus();
      fireEvent.keyDown(conversa, { key: 'ArrowRight' });
      const fila = screen.getByRole('tab', { name: /^Fila/ });
      expect(fila).toHaveAttribute('aria-selected', 'true');
      expect(fila).toHaveFocus();
      expect(conversa).toHaveAttribute('tabindex', '-1');
      fireEvent.keyDown(fila, { key: 'End' });
      const avisos = screen.getByRole('tab', { name: /^Avisos/ });
      expect(avisos).toHaveFocus();
      fireEvent.keyDown(avisos, { key: 'ArrowRight' });
      expect(conversa).toHaveFocus();
      fireEvent.keyDown(conversa, { key: 'ArrowLeft' });
      expect(avisos).toHaveFocus();
      fireEvent.keyDown(avisos, { key: 'Home' });
      expect(conversa).toHaveAttribute('aria-selected', 'true');
    });

    it('a última aba escolhida vale ao reabrir o painel', () => {
      const primeira = montar();
      irParaAba('Fila');
      expect(localStorage.getItem('guara:assistente:aba:v1')).toBe('fila');
      primeira.unmount();
      montar([]);
      expect(screen.getByRole('tab', { name: /^Fila/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('tabpanel', { name: /^Fila/ })).toBeVisible();
    });

    it('gravação inválida ou armazenamento bloqueado: abre em Conversa', () => {
      localStorage.setItem('guara:assistente:aba:v1', 'qualquer');
      const primeira = montar();
      expect(screen.getByRole('tab', { name: 'Conversa' })).toHaveAttribute('aria-selected', 'true');
      primeira.unmount();
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
      montar([]);
      expect(screen.getByRole('tab', { name: 'Conversa' })).toHaveAttribute('aria-selected', 'true');
    });

    it('aba vazia mostra mensagem curta', () => {
      montar([]);
      irParaAba('Fila');
      expect(screen.getByTestId('fila-vazia')).toHaveTextContent('Nenhuma demanda na fila. Tudo em dia.');
    });

    it('aviso urgente: o painel aberto pelo cabeçalho começa em Avisos e volta à aba anterior quando o aviso é dispensado', () => {
      localStorage.setItem('guara:assistente:aba:v1', 'fila');
      pedirAba('avisos');
      montar([entrada('Vencida (fictícia)', '2026-11-10')]);
      expect(screen.getByRole('tab', { name: /^Avisos/ })).toHaveAttribute('aria-selected', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Ciente' }));
      expect(screen.getByRole('tab', { name: /^Fila/ })).toHaveAttribute('aria-selected', 'true');
      expect(localStorage.getItem('guara:assistente:aba:v1')).toBe('fila');
      pedirAba(null);
    });

    it('depois de "prioridades", o botão "Ver a fila do dia" abre a aba Fila', () => {
      const { container } = montar([entrada('Vencida (fictícia)', '2026-11-10')]);
      enviar('prioridades');
      const falas = container.querySelectorAll('.conversa li.fala');
      fireEvent.click(within(falas[falas.length - 1] as HTMLElement).getByRole('button', { name: 'Ver a fila do dia' }));
      expect(screen.getByRole('tab', { name: /^Fila/ })).toHaveAttribute('aria-selected', 'true');
    });
  });
});

describe('aba Avisos: lembrete de backup', () => {
  it('o lembrete de backup aparece na aba Avisos, com natureza "fato"', () => {
    registrarBackup(new Date('2026-11-01T12:00:00.000Z')); // 12 dias antes de AGORA
    montar([entrada('Atualizar manual (fictício)', '2026-11-30')]);
    irParaAba('Avisos');
    const aviso = screen.getByTestId('aviso-backup');
    expect(aviso).toBeVisible();
    expect(aviso).toHaveTextContent('O último backup tem 12 dias. Em Configurações, use "Exportar backup".');
    expect(aviso).toHaveTextContent('fato · fonte:');
  });
});
