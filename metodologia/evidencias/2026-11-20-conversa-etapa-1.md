# Evidência — conversa do assistente, etapa 1 (20/11/2026)

**Pedido do responsável:** fazer o assistente entender frases comuns (não só o começo exato do comando) e implementar uma ajuda que mostre os comandos-chave. Branch `operacoes-campo`, sem commit. Nenhum serviço externo foi acionado. Sem IA: regras fixas.

## O que mudou

| Arquivo | Mudança |
|---|---|
| `aplicacao/src/modulos/assistente/normalizar.ts` (novo) | Minúsculas, sem acentos e pontuação, letras repetidas reduzidas ("naoo" → "nao") e abreviações ("vc", "oq", "tá"). |
| `aplicacao/src/modulos/assistente/frases.ts` (novo) | Tabela de intenções (`prazos`, `demanda`, `ajuda`): comando, rótulo, descrição, exemplo e gatilhos. Fonte única do classificador e da ajuda. |
| `aplicacao/src/modulos/assistente/classificar.ts` (novo) | Procura os gatilhos como sequência de palavras inteiras; vence o mais longo, desempate pela ordem da tabela; "?" sozinho = ajuda. |
| `aplicacao/src/modulos/assistente/PainelAssistente.tsx` | `responder()` usa o classificador no lugar de `startsWith`; ajuda gerada da tabela, um comando por linha, com botões; "não entendi" oferece "Ver o que eu sei fazer". |
| `aplicacao/src/modulos/assistente/conversa.ts` | Campo opcional `acoes` na fala (botões), validado na leitura (até 8, rótulo e comando não vazios). Sem migração: falas antigas continuam válidas. |
| `aplicacao/src/estilos.css` | `.mensagem-texto { white-space: pre-line; }` para a lista da ajuda. |
| Testes novos | `classificar.test.ts` (normalização, 20 frases → comando, 7 frases que não devem casar, todos os gatilhos da tabela), `conversa.test.ts` (validação das ações) e 3 casos em `PainelAssistente.test.tsx` (ajuda com botões, sinônimo, "não entendi" com botão). |

Os textos que os testes anteriores conferem foram mantidos ("Comandos disponíveis: \"prazos\"", "Ainda não entendo linguagem livre"); "bom dia" continua não reconhecido (a conversa social é a etapa 2).

## Execução

| # | Verificação | Onde | Resultado | Situação |
|---|---|---|---|---|
| 1 | Tipos de `normalizar.ts`, `frases.ts` e `classificar.ts` (`tsc --strict`, `noUnusedLocals`) | ambiente do Claude (TypeScript 7.0.2) | sem erros | PASSOU |
| 2 | Tipos de `conversa.ts` (com tipo mínimo de `react` só para `useSyncExternalStore`) | ambiente do Claude | sem erros | PASSOU |
| 3 | Mesmos casos de `classificar.test.ts`, rodados com Node (`--experimental-strip-types`) fora do Vitest | ambiente do Claude (Node 22.23) | 90/90 verificações | PASSOU |
| 4 | `npm test` (Vitest, inclusive `PainelAssistente.test.tsx`) | — | os `node_modules` são do Windows (sem binding Linux do rolldown) e a rede para instalar estava bloqueada | NÃO TESTADO |
| 5 | `npm run build` (inclui `tsc --noEmit` do projeto inteiro e `PainelAssistente.tsx`) | — | mesmo motivo | NÃO TESTADO |
| 6 | Telas | — | — | NÃO CONFERIDO VISUALMENTE |

**Para fechar:** no Windows, `cd aplicacao && npm test && npm run build`, e conferir no navegador: digitar "me ajuda", "o que tá vencido?" e "bom dia".

## Limitações

- Sem tratamento de negação ("não quero ver prazos" → prazos). Ainda não há comando destrutivo pelo chat, então não há risco hoje; entra junto com a confirmação (etapa 3).
- "prazo da demanda" vai para `prazos` (empate de uma palavra, vence a ordem da tabela).
- A redução de letras repetidas vale para os dois lados ("processo" → "proceso"); não afeta o resultado, mas aparece em `normalizar()`.

## Ajuste depois da conferência na tela (20/11/2026, 21h)

O responsável viu a ajuda funcionando no navegador e aprovou três ajustes:

1. A ajuda não repete como botão o comando que já está nos atalhos fixos (antes eram seis botões para três comandos). A resposta saiu do painel para `ajuda.ts`, com `ajuda.test.ts` (3 casos).
2. Atalhos abaixo da conversa com `botao--pequeno` e espaçamento menor, para caberem dois ou três por linha.
3. Texto mais curto: `• prazos — … (ou "o que tá vencido?")`; a frase "Toque num comando abaixo" só aparece quando há botão.

| Verificação | Resultado | Situação |
|---|---|---|
| Tipos de `ajuda.ts` (`tsc --strict`) | sem erros | PASSOU |
| Saída de `respostaDeAjuda` com e sem comando fora dos atalhos (Node) | conforme os casos de `ajuda.test.ts` | PASSOU |
| `npm test` e `npm run build` | — | NÃO TESTADO |
| Telas | — | NÃO CONFERIDO VISUALMENTE |
