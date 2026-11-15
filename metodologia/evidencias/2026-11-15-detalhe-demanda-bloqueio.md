# Evidência — reorganização do bloco de bloqueio no detalhe da demanda (15/11/2026)

**Pedido do responsável:** os campos do detalhe da demanda estavam desorganizados, a caixa de detalhe do bloqueio deveria ficar em branco depois do envio e os botões apareciam de forma estranha. Branch `supabase-banco`. Nenhum serviço externo foi acionado e nada foi instalado.

## Causa encontrada

- O formulário de bloqueio usava a classe `.filtros`, que é a grade de 4 colunas (2fr 1fr 1fr 1fr) da barra de filtros. Com isso, o select ficava esticado, a caixa de texto ia para a 2ª coluna e os botões eram espremidos e empilhados na 3ª.
- A caixa de texto não tinha `campo--area` e ficava sem espaçamento vertical.
- A caixa de texto era preenchida com o detalhe gravado e nunca era limpa.

## Mudança

- `aplicacao/src/modulos/demandas/Demandas.tsx`:
  - O bloqueio tem agora uma seção própria, "Bloqueio", com os campos empilhados.
  - Demanda travada: **Destravou** (primário) e **Ainda travada** no topo; **Atualizar bloqueio** e **Apagar detalhe** depois do formulário (o segundo só aparece se houver detalhe gravado).
  - Demanda livre: só **Marcar como travada** (primário).
  - A caixa de detalhe abre em branco e é limpa depois de cada envio bem-sucedido.
  - Bloqueio, Histórico e o rodapé de ações ficam separados por uma linha.
- **Mudança de comportamento:** na demanda já travada, a caixa em branco **mantém** o detalhe gravado (a dica avisa). Para apagar o detalhe, use o botão explícito **Apagar detalhe**. Antes, enviar a caixa vazia apagava o detalhe. Com a caixa sempre em branco, isso apagaria o detalhe a cada troca de motivo.
- `aplicacao/src/estilos.css`: classes `.bloco-detalhe`, `.titulo-secao--bloco`, `.acoes--sem-margem`, `.acoes--rodape` e `.campo-grupo--curto`.
- `Demandas.test.tsx`: o teste "detalhe livre do bloqueio" confere que a caixa fica vazia depois do envio, que trocar o motivo com a caixa em branco mantém o detalhe e que **Apagar detalhe** remove o detalhe.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Testes da aplicação | `cd aplicacao && npm test` (executado pelo responsável, Windows) | 32 arquivos, 356/356 | PASSOU |
| 2 | Build de produção | `cd aplicacao && npm run build` (executado pelo responsável) | `tsc` sem erros; `index-BW16yQuP.js` (379,19 kB) e `index-3m-hZoxH.css` (17,10 kB) | PASSOU |
| 3 | Conferência visual da tela | — | — | NÃO TESTADO |

## Limitações

- Nenhum teste novo foi criado: o teste existente foi ampliado. O layout (CSS) não é coberto pelo Vitest/jsdom.
- Não commitado nem publicado.
