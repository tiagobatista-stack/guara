import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { comemorarMascotes, Mascote, MASCOTES, type EspecieMascote, type HumorMascote } from './Mascote.tsx';

const ESPECIES = Object.keys(MASCOTES) as EspecieMascote[];
const HUMORES: HumorMascote[] = ['tranquilo', 'atento', 'curioso'];

function moverPonteiro(x: number, y: number) {
  // O jsdom não tem PointerEvent; um MouseEvent com o mesmo tipo carrega clientX e clientY.
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }));
}

function darCaixa(svg: Element) {
  svg.getBoundingClientRect = () =>
    ({ left: 100, top: 100, width: 56, height: 56, right: 156, bottom: 156, x: 100, y: 100, toJSON: () => ({}) }) as DOMRect;
}

// Lê o deslocamento do olhar gravado nas variáveis CSS do SVG ('' quando está no centro).
function olhar(svg: SVGSVGElement) {
  return { x: svg.style.getPropertyValue('--olhar-x'), y: svg.style.getPropertyValue('--olhar-y') };
}

// Faz o quadro de animação rodar na hora, para o teste não depender do relógio do ambiente.
function quadroImediato() {
  vi.stubGlobal('requestAnimationFrame', (aviso: FrameRequestCallback) => {
    aviso(0);
    return 0;
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Mascote', () => {
  it('anuncia espécie, bioma e humor para leitores de tela', () => {
    for (const especie of ESPECIES) {
      for (const humor of HUMORES) {
        const { unmount } = render(<Mascote especie={especie} humor={humor} />);
        const m = MASCOTES[especie];
        expect(screen.getByRole('img', { name: `${m.nome} (${m.bioma}), ${humor}` })).toBeInTheDocument();
        unmount();
      }
    }
  });

  it('cada espécie tem desenho próprio', () => {
    const desenhos = ESPECIES.map((especie) => {
      const { container, unmount } = render(<Mascote especie={especie} humor="tranquilo" />);
      const html = container.querySelector('svg')!.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(desenhos).size).toBe(ESPECIES.length);
  });

  it('cada humor muda o desenho da mesma espécie', () => {
    const desenhos = HUMORES.map((humor) => {
      const { container, unmount } = render(<Mascote especie="capivara" humor={humor} />);
      const html = container.querySelector('svg')!.innerHTML;
      unmount();
      return html;
    });
    expect(new Set(desenhos).size).toBe(HUMORES.length);
  });

  it('tem duas pupilas e respeita o tamanho pedido', () => {
    const { container } = render(<Mascote especie="ariranha" humor="atento" tamanho={64} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('64');
    expect(svg.querySelectorAll('.mascote-pupila')).toHaveLength(2);
  });

  it('o olhar acompanha o ponteiro, dentro do limite, e volta ao centro depois de um tempo parado', () => {
    vi.useFakeTimers();
    quadroImediato();
    const { container } = render(<Mascote especie="lobo-guara" humor="atento" />);
    const svg = container.querySelector('svg')!;
    darCaixa(svg);

    act(() => moverPonteiro(1000, 128));
    const direita = olhar(svg);
    expect(parseFloat(direita.x)).toBeGreaterThan(0);
    expect(parseFloat(direita.x)).toBeLessThanOrEqual(2.6);
    expect(Math.abs(parseFloat(direita.y))).toBeLessThan(0.1);

    act(() => moverPonteiro(128, -900));
    const acima = olhar(svg);
    expect(parseFloat(acima.y)).toBeLessThan(0);
    expect(Math.abs(parseFloat(acima.x))).toBeLessThan(0.1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(olhar(svg)).toEqual({ x: '', y: '' });
  });

  it('com alvo, olha para ele quando o ponteiro está parado; o ponteiro tem prioridade; sem alvo, volta ao centro', () => {
    vi.useFakeTimers();
    quadroImediato();
    const alvo = document.createElement('div');
    alvo.getBoundingClientRect = () =>
      ({ left: 0, top: 600, width: 256, height: 40, right: 256, bottom: 640, x: 0, y: 600, toJSON: () => ({}) }) as DOMRect;
    // A caixa do SVG precisa existir antes do primeiro olhar.
    const caixa = vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue(
      { left: 100, top: 100, width: 56, height: 56, right: 156, bottom: 156, x: 100, y: 100, toJSON: () => ({}) } as DOMRect,
    );
    const { container, rerender } = render(<Mascote especie="capivara" humor="atento" alvo={alvo} />);
    const svg = container.querySelector('svg')!;
    expect(parseFloat(olhar(svg).y)).toBeGreaterThan(0);

    act(() => moverPonteiro(128, -900));
    expect(parseFloat(olhar(svg).y)).toBeLessThan(0);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(parseFloat(olhar(svg).y)).toBeGreaterThan(0);

    rerender(<Mascote especie="capivara" humor="atento" alvo={null} />);
    expect(olhar(svg)).toEqual({ x: '', y: '' });
    caixa.mockRestore();
  });

  it('com "reduzir movimento" ativado, os olhos ficam parados', () => {
    quadroImediato();
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('prefers-reduced-motion'), media: consulta }));
    const { container } = render(<Mascote especie="capivara" humor="tranquilo" />);
    const svg = container.querySelector('svg')!;
    darCaixa(svg);
    act(() => moverPonteiro(1000, 128));
    expect(olhar(svg)).toEqual({ x: '', y: '' });
  });

  it('decorativo: fica fora do leitor de tela e não acompanha o ponteiro', () => {
    quadroImediato();
    const { container } = render(<Mascote especie="ariranha" humor="tranquilo" tamanho={28} decorativo />);
    const svg = container.querySelector('svg')!;
    expect(screen.queryByRole('img')).toBeNull();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    darCaixa(svg);
    act(() => moverPonteiro(1000, 128));
    expect(olhar(svg)).toEqual({ x: '', y: '' });
  });

  it('pisca: os dois olhos levam a animação, com intervalo próprio da espécie; o decorativo não pisca', () => {
    const { container, unmount } = render(<Mascote especie="capivara" humor="tranquilo" />);
    const svg = container.querySelector('svg')!;
    expect(svg.querySelectorAll('.mascote-olho')).toHaveLength(2);
    expect(svg.style.getPropertyValue('--piscada')).toBe('6.7s');
    unmount();
    const decorativo = render(<Mascote especie="capivara" humor="tranquilo" decorativo />);
    expect(decorativo.container.querySelectorAll('.mascote-olho')).toHaveLength(0);
  });

  it('reage ao clique com um pulinho curto, que termina sozinho', () => {
    vi.useFakeTimers();
    const { container } = render(<Mascote especie="ariranha" humor="tranquilo" />);
    const svg = container.querySelector('svg')!;
    expect(svg).not.toHaveClass('mascote--reagindo');
    fireEvent.click(svg);
    expect(svg).toHaveClass('mascote--reagindo');
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(svg).not.toHaveClass('mascote--reagindo');
    // o humor e o rótulo não mudam com o clique
    expect(svg.getAttribute('aria-label')).toBe('Ariranha (Amazônia), tranquilo');
  });

  it('o decorativo não reage ao clique', () => {
    const { container } = render(<Mascote especie="ariranha" humor="tranquilo" decorativo />);
    const svg = container.querySelector('svg')!;
    fireEvent.click(svg);
    expect(svg).not.toHaveClass('mascote--reagindo');
  });

  it('sem atividade, fica entediado, sonolento e dorme; ao mexer, acorda com um pulinho', () => {
    vi.useFakeTimers();
    quadroImediato();
    const { container } = render(<Mascote especie="ariranha" humor="tranquilo" />);
    const svg = container.querySelector('svg')!;
    const passar = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

    passar(55_000);
    expect(svg.getAttribute('data-repouso')).toBe('acordado');
    passar(10_000);
    expect(svg.getAttribute('data-repouso')).toBe('entediado');
    expect(svg).toHaveClass('mascote--entediado');
    passar(120_000);
    expect(svg.getAttribute('data-repouso')).toBe('sonolento');
    passar(180_000);
    expect(svg.getAttribute('data-repouso')).toBe('dormindo');
    expect(svg.querySelector('.mascote-z')).not.toBeNull();
    expect(svg.querySelectorAll('.mascote-pupila')).toHaveLength(0);
    // dormir não muda o que o leitor de tela anuncia
    expect(svg.getAttribute('aria-label')).toBe('Ariranha (Amazônia), tranquilo');

    act(() => moverPonteiro(10, 10));
    expect(svg.getAttribute('data-repouso')).toBe('acordado');
    expect(svg).toHaveClass('mascote--reagindo');
    expect(svg.querySelector('.mascote-z')).toBeNull();
    expect(svg.querySelectorAll('.mascote-pupila')).toHaveLength(2);
  });

  it('cada espécie tem seu ritmo: a capivara se entedia antes do lobo-guará, que dorme de olho meio aberto', () => {
    vi.useFakeTimers();
    const capivara = render(<Mascote especie="capivara" humor="tranquilo" />).container.querySelector('svg')!;
    const lobo = render(<Mascote especie="lobo-guara" humor="tranquilo" />).container.querySelector('svg')!;
    const passar = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

    passar(50_000);
    expect(capivara.getAttribute('data-repouso')).toBe('entediado');
    expect(lobo.getAttribute('data-repouso')).toBe('acordado');
    passar(30_000);
    expect(lobo.getAttribute('data-repouso')).toBe('entediado');
    passar(380_000);
    expect(capivara.getAttribute('data-repouso')).toBe('dormindo');
    expect(lobo.getAttribute('data-repouso')).toBe('dormindo');
    expect(capivara.querySelectorAll('.mascote-pupila')).toHaveLength(0);
    expect(lobo.querySelectorAll('.mascote-pupila')).toHaveLength(1);
  });

  it('uma mudança de humor acorda o mascote', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(<Mascote especie="capivara" humor="tranquilo" />);
    const svg = container.querySelector('svg')!;
    act(() => { vi.advanceTimersByTime(50_000); });
    expect(svg.getAttribute('data-repouso')).toBe('entediado');
    rerender(<Mascote especie="capivara" humor="atento" />);
    expect(svg.getAttribute('data-repouso')).toBe('acordado');
  });

  it('o decorativo não se entedia nem dorme', () => {
    vi.useFakeTimers();
    const { container } = render(<Mascote especie="capivara" humor="tranquilo" decorativo />);
    act(() => { vi.advanceTimersByTime(400_000); });
    expect(container.querySelector('svg')!.getAttribute('data-repouso')).toBe('acordado');
  });

  it('comemora quando o aplicativo pede: festa pequena dura menos que a grande', () => {
    vi.useFakeTimers();
    const { container } = render(<Mascote especie="lobo-guara" humor="atento" />);
    const svg = container.querySelector('svg')!;
    const passar = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

    act(() => comemorarMascotes());
    expect(svg).toHaveClass('mascote--comemorando');
    expect(svg).not.toHaveClass('mascote--festa-grande');
    expect(svg.querySelectorAll('.mascote-pupila')).toHaveLength(0); // olhos de riso
    passar(1300);
    expect(svg).not.toHaveClass('mascote--comemorando');
    expect(svg.querySelectorAll('.mascote-pupila')).toHaveLength(2);

    act(() => comemorarMascotes('grande'));
    expect(svg).toHaveClass('mascote--comemorando', 'mascote--festa-grande');
    passar(1300);
    expect(svg).toHaveClass('mascote--comemorando');
    passar(1200);
    expect(svg).not.toHaveClass('mascote--comemorando');
    // a festa não muda o humor anunciado
    expect(svg.getAttribute('aria-label')).toBe('Lobo-guará (Cerrado), atento');
  });

  it('comemorar acorda quem estava dormindo', () => {
    vi.useFakeTimers();
    const { container } = render(<Mascote especie="capivara" humor="tranquilo" />);
    const svg = container.querySelector('svg')!;
    act(() => { vi.advanceTimersByTime(300_000); });
    expect(svg.getAttribute('data-repouso')).toBe('dormindo');
    act(() => comemorarMascotes());
    expect(svg.getAttribute('data-repouso')).toBe('acordado');
    expect(svg).toHaveClass('mascote--comemorando');
  });

  it('para de ouvir o ponteiro quando sai da tela', () => {
    const remover = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<Mascote especie="capivara" humor="tranquilo" />);
    unmount();
    expect(remover.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['pointermove', 'pointerdown']));
    remover.mockRestore();
  });
});
