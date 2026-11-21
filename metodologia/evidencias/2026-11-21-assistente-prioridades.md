# Evidência — prioridades do dia no assistente (passos 1 a 5), 21/11/2026

**Pedido do responsável:** dar ao mascote/assistente uma "inteligência" de prioridade, seguindo `documentacao/mapeamento-guarasheduller.md` (passos 1 a 6). Branch `operacoes-campo`. Sem IA e sem serviço externo: regras fixas, com pesos públicos. Nenhum push.

## O que mudou

| Passo | Mudança | Arquivos principais |
|---|---|---|
| 1 | Pontuação por demanda, com motivo de cada ponto e próxima ação sugerida | `assistente/priorizar.ts` (+ teste) |
| 2 | Comando "prioridades" ("o que faço primeiro?"): até 5 demandas (inferência) e a ação da primeira (sugestão) | `respostaPrioridades.ts`, `frases.ts` |
| 3 | "Fila do dia" no painel (3 primeiras, "Por que está aqui") | `FilaDoDia.tsx`, `PainelAssistente.tsx` |
| 4 | Aviso agregado: um por demanda com todos os sinais | `avisos.ts` |
| 5 | "Em 2 horas", "Não mostrar para esta demanda" (silenciar até "Mostrar de novo") e limite de avisos listados (3, 5, 8, 10; padrão 5) em Configurações | `lembretes.ts`, `preferencias-avisos.ts`, `PainelAssistente.tsx`, `Configuracoes.tsx` |

Decisões e limites:
- O limite do passo 5 é de **itens listados de uma vez**, não "por dia": o assistente não emite notificações sozinho.
- Silenciar e o limite não afetam a fila do dia nem o comando "prioridades". O registro de silêncio fica gravado até "Mostrar de novo" (a limpeza automática o preserva).
- O assistente só lê as demandas; nada altera prazo, status ou responsável (pendência P4 do mapeamento: não na 1ª fase).
- Pendências P1–P6 do mapeamento seguem nos padrões recomendados (não confirmados pelo responsável).

## Execução

| # | Verificação | Resultado | Situação |
|---|---|---|---|
| 1 | `npx tsc -b` em `aplicacao/` | sem erros | PASSOU |
| 2 | `npx vitest run` em `aplicacao/` (Windows, cwd com `F:` maiúsculo) | 67 arquivos, 781/781 testes | PASSOU |
| 3 | Testes novos do passo 5: opções de adiamento com "Em 2 horas"; silenciar (some com a situação mudando, sobrevive à limpeza, desfaz); botões "Em 2 horas" e "Não mostrar..." no painel; limite em Configurações (padrão 5, grava, ignora valor inválido) | passam | PASSOU |
| 4 | `npm run build` | não executado nesta rodada (o `tsc -b` passou) | NÃO TESTADO |
| 5 | Telas no navegador (fila do dia, botões novos, seletor do limite) | — | NÃO CONFERIDO VISUALMENTE |
| 6 | URL pública | não publicado | NÃO TESTADO |

Observação: rodar o Vitest com a unidade em minúscula (`/f/...` no Git Bash) falha com "failed to find the runner" (duas cópias de `@vitest/runner`); use `F:` maiúsculo.
