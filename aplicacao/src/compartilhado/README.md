# Compartilhado (frontend)

Componentes de interface reutilizáveis (selo de estado, cartões, mascote) e estilos comuns.

`Mascote.tsx`: rosto ilustrado das três espécies da Fofofauna, em três humores. O deslocamento do olhar vai nas variáveis CSS `--olhar-x` e `--olhar-y` do SVG. Sem atividade na página, o mascote fica entediado, sonolento e dorme; `comemorarMascotes()` e `acordarMascotes()` são chamados pelo aplicativo. As pupilas acompanham o ponteiro ou o último toque por um único ouvinte compartilhado, voltam ao centro após 4 s e ficam paradas com "reduzir movimento" ativado.
