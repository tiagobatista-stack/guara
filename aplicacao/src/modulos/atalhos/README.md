# Atalhos e contatos

Página "Atalhos e contatos" do menu, com duas seções editáveis.

## Sistemas externos (`atalhos.ts`, `Atalhos.tsx`)

Começa com SIGPAS, SIGADOC e Portal SEMA. O analista inclui, edita e exclui.

- O GUARÁ só abre o endereço numa aba nova (`target="_blank"`, `rel="noopener noreferrer"`). Não faz login, não guarda senha e não lê nada do sistema externo (princípio 1).
- Só endereços `https://` ou `http://`; `javascript:`, `data:` e outros esquemas são recusados. Nome até 40 caracteres, endereço até 500, no máximo 30 atalhos.
- Com a lista vazia, há o botão "Restaurar os atalhos iniciais". Chave `guara:atalhos:v1`.

## Contatos (`contatos.ts`, `Contatos.tsx`)

Nome (obrigatório), instituição/empresa, setor/função, e-mail, celular e observações. Busca sem diferenciar acentos, ordem alfabética, e-mail e celular viram links `mailto:` e `tel:`.

- **São dados pessoais (LGPD).** Começam vazios, ficam só neste navegador (chave `guara:contatos:v1`) e não entram no backup JSON, no servidor nem em IA. A tela pede para guardar só o necessário.
- Celular guardado só com dígitos e DDD (10 ou 11), mostrado como `(65) 99999-1234`. No máximo 200 contatos; observações até 500 caracteres.

## Comum

- Excluir pede confirmação e remove um item por vez.
- `lista-local.ts`: o armazém no localStorage usado pelas duas listas. Gravação corrompida volta ao padrão; com o armazenamento bloqueado, vale só até fechar a página, e a tela avisa.
