# Evidências — Fase 3: domínio e CRUD em localStorage (P03 e P04), 13/11/2026

## Arquivos

Em `aplicacao/src/modulos/demandas/`:

- `modelo.ts`: 4 status e 3 prioridades enumerados.
- `regras.ts`: validação, criar, editar, mudar status, filtros.
- `repositorio-local.ts`: chave `guara:demandas:v1`, envelope com versão.
- `armazem.ts`: fonte única de verdade com `useSyncExternalStore`. Grava antes de publicar.
- `exemplos.ts`: deriva os exemplos de `dados-ficticios/demandas.ts`, a mesma fonte dos autotestes.
- `FormularioDemanda.tsx` e `Demandas.tsx`.

**Desvio do plano:** os exemplos do app são **derivados** dos dados fictícios do catálogo, em vez de alterar esses dados. Assim os autotestes das habilidades não mudaram e continuam aprovados.

## Testes automatizados

| # | Item | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Domínio (`testes/unidade/demandas-dominio.test.ts`): criar, listar, recarregar, inválido, editar com e sem mudança, mudar status, excluir, exemplos só na 1ª carga, corrupção preservada e bloqueada, restaurar, filtros, limites | `npm test` | 10/10 | PASSOU |
| 2 | Tela (`Demandas.test.tsx`): criação com sucesso só depois de gravar, erro de validação sem gravar, editar, persistir, excluir com confirmação (cancelar mantém, confirmar remove), filtro por status, aviso de corrupção | `npm test` | 5/5. Na 1ª execução 4 falharam: rótulo que inclui a mensagem de erro, título duplicado no texto `sr-only` e mutações fora do `act()`. Corrigido trocando o `sr-only` por `aria-label` nos botões e ajustando os testes | PASSOU (após correção) |
| 3 | Suíte completa | `npm test` | `Test Files 7 passed (7)`, `Tests 55 passed (55)` | PASSOU |
| 4 | Build | `npm run build` | `✓ built`; JS de 297 kB (89 kB gzip) | PASSOU |

## Navegador real (`http://localhost:5173/#/demandas`)

A janela do app estava atrás de outra e não aceitava cliques físicos. Os passos foram executados com **eventos de DOM disparados por script** na página real. O localStorage e a recarga são reais.

| Passo do roteiro P04 | Resultado | Situação |
|---|---|---|
| Primeira carga | 4 exemplos fictícios gravados em `guara:demandas:v1` | PASSOU |
| Criar "Teste P04 navegador (fictício)" | "Demanda criada e gravada."; total 5 | PASSOU |
| Editar o título | "Alterações gravadas."; o localStorage contém o novo título | PASSOU |
| F5 (navegação de recarga) | a demanda editada continua na lista | PASSOU |
| Excluir e cancelar a confirmação | total continua 5 | PASSOU |
| Excluir e confirmar | "Demanda excluída."; total 4 | PASSOU |
| F5 depois da exclusão | total 4; "Teste P04" não aparece | PASSOU |
| Clique físico do usuário | — | NÃO TESTADO |

## Cenários do PLANO.md cobertos

1, 2, 3, 4, 5, 6 e 8: **PASSOU** (testes e navegador). Os cenários 7 e 9 a 12 ficam para as fases 4 e 5.
