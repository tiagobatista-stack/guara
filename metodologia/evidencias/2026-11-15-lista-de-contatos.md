# Evidência — lista de contatos na página de atalhos (15/11/2026)

**Pedido do responsável:** "aproveite a sessão de links externos para criar um campo de lista de contatos com campos nome, instituição/empresa, setor/função, e-mail/celular, observações". Branch `main`.

| Mudança | Arquivo |
|---|---|
| Lógica dos contatos: validação, limpeza (e-mail em minúsculas, celular só com dígitos), ordem, busca, incluir, editar, excluir | `aplicacao/src/modulos/atalhos/contatos.ts` (novo) |
| Tela dos contatos: lista com links de e-mail e telefone, busca, edição no cartão, exclusão com confirmação, formulário de inclusão | `aplicacao/src/modulos/atalhos/Contatos.tsx` (novo) |
| Armazém do localStorage extraído, agora comum a atalhos e contatos | `aplicacao/src/modulos/atalhos/lista-local.ts` (novo), `atalhos.ts` |
| Página e menu renomeados para "Atalhos e contatos" (módulo 0.2.0) | `Atalhos.tsx`, `nucleo/registro-modulos.ts` |
| Estilos: um campo por linha no celular, dois a partir do tablet | `aplicacao/src/estilos.css` |

## Decisões

- **Dados pessoais:** a lista começa vazia, fica só no navegador e não entra no backup JSON, no servidor nem em IA (seção 12 e LGPD). A tela avisa e pede para guardar só o necessário. Os testes usam só pessoas fictícias.
- Só o nome é obrigatório. E-mail e celular são conferidos quando preenchidos.
- A extração de `lista-local.ts` resolve uma duplicação concreta (duas listas com o mesmo armazém). É uma função comum, não um padrão GoF.

## Verificações

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Lógica: começa vazia, limpeza dos campos, só nome obrigatório, recusa de e-mail e celular inválidos e textos longos, formatação do celular, editar e excluir, ordem e busca sem acento, limite de 200, gravação corrompida | `npm test` | 9 testes novos | PASSOU |
| 2 | Tela: estado vazio com aviso de dados pessoais, incluir com links `mailto:` e `tel:`, erro de e-mail, editar com celular formatado, excluir só com confirmação, busca | `npm test` | 6 testes novos | PASSOU |
| 3 | Atalhos continuam funcionando depois da extração do armazém | `npm test` | 13 testes dos atalhos | PASSOU |
| 4 | Total | `cd aplicacao && npm test` | 36 arquivos, 385/385 | PASSOU |
| 5 | Build | `cd aplicacao && npm run build` | `tsc` sem erros, `index-gINDOu0P.js` | PASSOU |
| 6 | Tela no navegador e no celular | — | — | NÃO CONFERIDO VISUALMENTE |

## Limitações

- Os contatos não entram no backup: trocar de navegador ou limpar os dados do site apaga a lista.
- Não publicado.
