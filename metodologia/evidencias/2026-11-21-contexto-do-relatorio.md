# Texto "Contexto do processo" para o relatório (21/11/2026)

Pedido do responsável: montar, no detalhe da demanda, um texto para colar no relatório com o contexto do processo, usando o que o GUARÁ já tem. Não commitado, sem push nem PR.

## Decisões do responsável (21/11/2026)

1. Dado que falta vira **marcador entre colchetes** (ex.: `[data da vistoria]`), não é omitido.
2. **SIMP e processo judicial entram com o número completo**: o relatório é a resposta ao pedido.
3. **Anotações ficam de fora.**
4. Com ponto de operação ligado, entram a **caracterização POP** (texto de `textoCaracterizacao`) e a **Equipe Técnica** (integrantes da viagem do ponto).
5. Redação no modelo "Trata-se do Processo Administrativo nº …", similar à usada na unidade.

## O que foi feito

- `aplicacao/src/modulos/demandas/contexto-relatorio.ts` (novo): função pura `contextoDoRelatorio(demanda, vinculo?)` → `{ texto, faltam }`. Lista branca `CAMPOS_DO_CONTEXTO` (título, descrição, processo, SIMP, judicial, tipo, criação, prazo, coordenada, vistoria). **Não lê** status, prioridade, responsável, bloqueio (nem o detalhe livre), anotações e histórico. `escolherVinculo` prefere o ponto vistoriado quando há vários.
  - 1º parágrafo: processo, "em atendimento ao SIMP nº … e ao Processo Judicial nº …", título, objeto (descrição), recebimento e prazo; "e exige vistoria em campo" quando é de campo ou está ligada a ponto.
  - 2º parágrafo (campo ou ponto ligado): data da vistoria (a da demanda vence a do ponto), município, imóvel, CAR (ou "sem inscrição no CAR"), área, coordenadas GMS (SIRGAS 2000), tipo de dano, equipe técnica.
  - 3º bloco: caracterização POP quando o bloco está ativo ou já preenchido; vazio vira marcador.
- `aplicacao/src/modulos/demandas/ContextoDoRelatorio.tsx` (novo): seção "Texto para o relatório" no detalhe da demanda: prévia somente leitura, aviso do que falta, aviso quando há vários pontos, botão "Copiar texto para o relatório" (área de transferência, com alternativa de seleção manual).
- `aplicacao/src/modulos/demandas/Demandas.tsx`: importa e mostra a seção logo depois de "Operação" (2 linhas).
- `aplicacao/src/modulos/demandas/contexto-relatorio.test.ts` (novo): 6 testes (gabinete com SIMP/judicial e campos proibidos ausentes; campo sem operação com os 8 marcadores; campo com ponto completo, equipe e POP; data da demanda × ponto, sem CAR e POP vazio; sigla no título; escolha do vínculo).

## Verificação

| Verificação | Resultado |
|---|---|
| Checagem de tipos de `contexto-relatorio.ts` e do teste (tsc 7.0.2, `strict`, `noUnused*`, fora da pasta) | PASSOU |
| 6 testes de `contexto-relatorio.test.ts` (Node 22 com `--experimental-strip-types` e `expect` mínimo, TZ America/Cuiaba) | PASSOU: 6/6 |
| `npm test` completo (Vitest) | NÃO TESTADO: o `node_modules` da pasta é do Windows e o ambiente usado não tinha acesso ao registro npm |
| `npm run build` / `tsc --noEmit` do projeto (inclui `ContextoDoRelatorio.tsx` e `Demandas.tsx`) | NÃO TESTADO (mesmo motivo) |
| Tela no navegador, cópia real, 375 px e desktop | NÃO TESTADO |

Rodar no PowerShell, em `aplicacao/`: `npm test` e `npm run build`.

## Limitações

- O texto usa o primeiro ponto vistoriado (ou o primeiro da lista); com vários pontos, a tela avisa.
- A data de recebimento é a data de criação da demanda no GUARÁ, não a do protocolo.
- Não há teste de tela para a seção nova (só a função pura).
