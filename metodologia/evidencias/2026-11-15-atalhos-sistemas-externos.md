# Evidência — Atalhos para sistemas externos (15/11/2026)

**Pedido do responsável:** "incluir no projeto uma sessão de atalho para sistemas externos", "editável e permite incluir e excluir links". Escolhas dele: item próprio no menu; atalhos iniciais SIGPAS, SIGADOC e Portal SEMA. Branch `main`.

| Mudança | Arquivo |
|---|---|
| Lógica: validação (só http/https), incluir, editar, excluir, restaurar, localStorage tolerante | `aplicacao/src/modulos/atalhos/atalhos.ts` (novo) |
| Tela: lista, edição no próprio cartão, exclusão com confirmação, formulário de inclusão, estado vazio | `aplicacao/src/modulos/atalhos/Atalhos.tsx` (novo) |
| Módulo no menu, rota e ícone `link` | `nucleo/registro-modulos.ts`, `nucleo/Aplicacao.tsx`, `compartilhado/Icone.tsx` |
| Estilos mobile first | `aplicacao/src/estilos.css` |

## Verificações

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Lógica: padrão com os três, incluir, editar, excluir, limite de 30, recusa de `javascript:`, `data:`, `ftp:` e endereço sem protocolo, gravação corrompida | `npm test` | 7 testes novos | PASSOU |
| 2 | Tela: links em nova aba com `rel` seguro, incluir, erro com `role="alert"`, editar e cancelar, excluir só com confirmação, estado vazio e restaurar | `npm test` | 6 testes novos | PASSOU |
| 3 | Navegação pelo menu lateral até Atalhos | `npm test` | 1 teste novo | PASSOU |
| 4 | Total | `cd aplicacao && npm test` | 34 arquivos, 370/370 | PASSOU |
| 5 | Build | `cd aplicacao && npm run build` | `tsc` sem erros, `index-96UqUKWJ.js` | PASSOU |
| 6 | Tela no navegador e no celular | — | — | NÃO CONFERIDO VISUALMENTE |

## Correção durante a execução

O primeiro nome acessível do link saía "SIGPAS(abre em nova aba)", sem espaço, porque o texto vinha de um `span` escondido. Trocado por `aria-label` explícito; os testes acusaram e depois passaram.

## Limitações

- Os atalhos não entram no backup JSON; ficam só neste navegador.
- Os endereços não foram abertos para conferir se respondem (o GUARÁ não acessa sistemas externos).
- Não publicado.
