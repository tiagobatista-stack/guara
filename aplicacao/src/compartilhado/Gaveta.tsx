// Gaveta modal (assistente no celular e no tablet; menu completo no celular).
// Comporta-se como diálogo de verdade: o foco entra no botão de fechar ao abrir, Esc e o toque
// no fundo escuro fecham, Tab circula só dentro da gaveta e o foco volta para quem abriu ao fechar.

import { useEffect, useRef, type ReactNode } from 'react';
import { Icone } from './Icone.tsx';

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  rotulo: string;
  rotuloFechar: string;
  aoFechar: () => void;
  /** Conteúdo à esquerda do botão de fechar (por exemplo, o título). */
  topo?: ReactNode;
  inferior?: boolean;
  /** Diálogo centrado (480px, com margem de 16px); o corpo rola e o cabeçalho e o rodapé ficam à vista. */
  dialogo?: boolean;
  children: ReactNode;
}

export function Gaveta({ rotulo, rotuloFechar, aoFechar, topo, inferior = false, dialogo = false, children }: Props) {
  const caixa = useRef<HTMLDivElement>(null);
  const botaoFechar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    (caixa.current?.querySelector<HTMLElement>('[data-foco]') ?? botaoFechar.current)?.focus(); // o botão principal do diálogo, se houver
    return () => {
      if (anterior && typeof anterior.focus === 'function' && document.contains(anterior)) anterior.focus();
    };
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        aoFechar();
        return;
      }
      if (e.key !== 'Tab' || !caixa.current) return;
      const focaveis = [...caixa.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const atual = document.activeElement;
      if (e.shiftKey && (atual === primeiro || !caixa.current.contains(atual))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (atual === ultimo || !caixa.current.contains(atual))) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  return (
    <div
      className={dialogo ? 'gaveta-fundo gaveta-fundo--centro' : 'gaveta-fundo'}
      role="dialog"
      aria-modal="true"
      aria-label={rotulo}
      onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}
    >
      <div ref={caixa} className={`gaveta${inferior ? ' gaveta--inferior' : ''}${dialogo ? ' gaveta--dialogo' : ''}`}>
        <div className="gaveta-topo">
          {topo ?? <span />}
          <button ref={botaoFechar} type="button" className="botao-icone" onClick={aoFechar} aria-label={rotuloFechar}>
            <Icone nome="fechar" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
