// Sinais do aviso fora do balão: som curto, notificação do navegador, vibração e título piscando.
// Tudo é opcional e protegido: navegador sem suporte, permissão negada ou som bloqueado não
// derrubam o aviso, que continua no balão.
// Privacidade: a notificação do sistema pode aparecer na tela de bloqueio, por isso leva só a hora,
// nunca o texto do lembrete.

type ContextoDeAudio = { new (): AudioContext };

let audio: AudioContext | null = null;

/** Bipe curto (Web Audio, sem arquivo). `vezes` = quantos bipes. */
export function tocarSom(vezes = 1) {
  try {
    const Classe = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: ContextoDeAudio }).webkitAudioContext) as ContextoDeAudio | undefined;
    if (!Classe) return;
    audio ??= new Classe();
    if (audio.state === 'suspended') void audio.resume();
    for (let i = 0; i < vezes; i++) {
      const inicio = audio.currentTime + i * 0.35;
      const osc = audio.createOscillator();
      const volume = audio.createGain();
      osc.frequency.value = 880;
      volume.gain.setValueAtTime(0.0001, inicio);
      volume.gain.exponentialRampToValueAtTime(0.2, inicio + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.25);
      osc.connect(volume).connect(audio.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.3);
    }
  } catch {
    // Sem som: o balão e o mascote continuam.
  }
}

export type EstadoNotificacoes = 'indisponivel' | 'permitidas' | 'negadas' | 'perguntar';

export function estadoNotificacoes(): EstadoNotificacoes {
  try {
    if (typeof Notification === 'undefined') return 'indisponivel';
    if (Notification.permission === 'granted') return 'permitidas';
    if (Notification.permission === 'denied') return 'negadas';
    return 'perguntar';
  } catch {
    return 'indisponivel';
  }
}

/** Pede a permissão. Precisa vir de um clique (o navegador recusa pedido sem gesto da pessoa). */
export function pedirNotificacoes(): Promise<EstadoNotificacoes> {
  try {
    if (typeof Notification === 'undefined') return Promise.resolve('indisponivel');
    return Promise.resolve(Notification.requestPermission()).then(() => estadoNotificacoes(), () => estadoNotificacoes());
  } catch {
    return Promise.resolve(estadoNotificacoes());
  }
}

/** Notificação do sistema, só com a hora. Devolve false quando não deu. */
export function notificar(hora: string): boolean {
  if (estadoNotificacoes() !== 'permitidas') return false;
  try {
    const n = new Notification('GUARÁ', { body: `Lembrete das ${hora}`, tag: 'guara-lembrete' });
    n.onclick = () => { window.focus(); n.close(); };
    return true;
  } catch {
    return false;
  }
}

export function vibrar() {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Sem vibração.
  }
}

const TITULO_AVISO = '⏰ Lembrete · GUARÁ';

/** Alterna o título da aba enquanto ligado; devolve a função que para e restaura o título. */
export function piscarTitulo(ligar: boolean): () => void {
  if (!ligar) return () => {};
  const original = document.title;
  let alternar = false;
  const id = setInterval(() => {
    alternar = !alternar;
    document.title = alternar ? TITULO_AVISO : original;
  }, 1000);
  return () => {
    clearInterval(id);
    document.title = original;
  };
}

// ---------- Digitando ----------

let ultimaDigitacao = 0;
let ouvindo = false;

function aoDigitar(e: Event) {
  const alvo = e.target as HTMLElement | null;
  if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA')) ultimaDigitacao = Date.now();
}

/** Começa a ouvir a digitação (uma vez por página). */
export function ouvirDigitacao() {
  if (ouvindo) return;
  ouvindo = true;
  document.addEventListener('input', aoDigitar, true);
}

/** A pessoa está escrevendo agora: campo de texto em foco, com texto, digitado há menos de `ms`. */
export function estaDigitando(ms = 20_000): boolean {
  const ativo = document.activeElement as HTMLInputElement | null;
  const emCampo = Boolean(ativo && (ativo.tagName === 'INPUT' || ativo.tagName === 'TEXTAREA') && ativo.value);
  return emCampo && Date.now() - ultimaDigitacao < ms;
}
