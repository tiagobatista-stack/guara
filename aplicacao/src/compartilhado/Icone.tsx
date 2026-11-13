// Ícones próprios e simples (traço), sem material de terceiros.
const CAMINHOS = {
  painel: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  demandas: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  documentos: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  agenda: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  conhecimento: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5',
  saude: 'M3 12h4l2-5 4 10 2-5h6',
  configuracoes: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  conversa: 'M4 5h16v11H9l-5 4z',
  mais: 'M5 12h.01M12 12h.01M19 12h.01',
  fechar: 'M6 6l12 12M18 6L6 18',
  enviar: 'M4 12l16-8-6 16-2-6z',
  busca: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
} as const;

export type NomeIcone = keyof typeof CAMINHOS;

export function Icone({ nome, className = 'icone' }: { nome: NomeIcone; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d={CAMINHOS[nome]} />
    </svg>
  );
}
