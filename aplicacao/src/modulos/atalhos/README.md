# Atalhos

Links para os sistemas externos do dia a dia, que o analista inclui, edita e exclui. Começa com SIGPAS, SIGADOC e Portal SEMA.

- O GUARÁ só abre o endereço numa aba nova (`target="_blank"`, `rel="noopener noreferrer"`). Não faz login, não guarda senha e não lê nada do sistema externo (princípio 1).
- Só endereços `https://` ou `http://`; `javascript:`, `data:` e outros esquemas são recusados. Nome até 40 caracteres, endereço até 500, no máximo 30 atalhos.
- Excluir pede confirmação e remove um atalho por vez. Com a lista vazia, há o botão "Restaurar os atalhos iniciais".
- Fica no localStorage (`guara:atalhos:v1`), em `atalhos.ts`. Com o armazenamento bloqueado, vale só até fechar a página, e a tela avisa.
- Ainda não entra no backup JSON da tela Alertas.
