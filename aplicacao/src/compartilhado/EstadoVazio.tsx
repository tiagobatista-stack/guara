// Estado vazio com o mascote principal (etapa 6 do plano dos mascotes).
// A frase é que informa; o rosto é decorativo (escondido do leitor de tela e com os olhos parados),
// porque uma tela pode ter vários estados vazios ao mesmo tempo (as colunas do Kanban, por exemplo).

import { Mascote } from './Mascote.tsx';
import { usePreferenciasMascote } from './preferencias-mascote.ts';

export function EstadoVazio({
  texto,
  dica,
  compacto = false,
  cartao = false,
}: {
  texto: string;
  /** Próximo passo possível, em uma frase curta. */
  dica?: string;
  /** Versão menor, para espaços estreitos como a coluna do Kanban. */
  compacto?: boolean;
  /** Mostra o estado vazio dentro de um cartão próprio (quando não há cartão em volta). */
  cartao?: boolean;
}) {
  const { principal } = usePreferenciasMascote();
  const classes = ['estado-vazio', compacto ? 'estado-vazio--compacto' : '', cartao ? 'cartao' : ''].filter(Boolean).join(' ');
  return (
    <div className={classes} data-testid="estado-vazio" data-especie={principal}>
      <Mascote especie={principal} humor="tranquilo" tamanho={compacto ? 32 : 48} decorativo />
      <div>
        <p className={compacto ? 'texto-pequeno texto-suave' : 'texto-suave texto-medio'}>{texto}</p>
        {dica && <p className="texto-pequeno texto-suave">{dica}</p>}
      </div>
    </div>
  );
}
