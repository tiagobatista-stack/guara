# Evidência — teste da navegação até Configurações (14/11/2026)

**Pedido do responsável:** "vá para o próximo item" (`gestao/BACKLOG.md`, plano dos mascotes, item 1: teste da navegação até Configurações pelo menu lateral e pelo "Mais" do celular). Feito na `main`. Antes, a publicação de `ff70b1d` foi conferida: a URL pública serve `index-BczTcvUX.js`, o mesmo bundle do build.

Só testes; nenhum código de tela mudou.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Menu lateral → "Configurações": abre a tela (título nível 1), endereço `#/configuracoes` e item marcado como página atual (`aria-current="page"`) | em `nucleo/Aplicacao.test.tsx` | conferido na suíte | PASSOU |
| 2 | Barra inferior → "Mais" abre o diálogo "Menu completo"; "Configurações" leva à tela, endereço `#/configuracoes`, e o diálogo fecha | em `nucleo/Aplicacao.test.tsx` | conferido na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Tests 321 passed (321)` | PASSOU |
| 4 | Build | `npm run build` | `✓ built` | PASSOU |

## Limitações

- O jsdom não aplica as larguras de tela: os dois caminhos são testados no mesmo DOM, sem conferir qual aparece em cada largura.
- Ambiente: Node v26.13.1.
