# ACEITE-MVP — auditoria funcional do GUARÁ (P07 da apostila), 13/11/2026

Auditoria dos critérios de `planejamento/PLANO.md` contra arquivos, testes e execuções reais. A regra é: nada marcado como PASSOU sem execução.

## Comandos executados

| Comando | Resultado |
|---|---|
| `npm test` (em `aplicacao/`) | `Test Files 11 passed (11)` · `Tests 75 passed (75)` |
| `npm run build` | `✓ built in 542ms` (tsc sem erros) |
| `python -m unittest testes/unidade/test_hook_verificar_comando.py` | `Ran 7 tests ... OK` |

## Os 12 cenários de aceite

| # | Cenário | Teste automatizado | Navegador real (eventos de DOM via script) | Situação |
|---|---|---|---|---|
| 1 | Criar e dar F5: a demanda continua | `demandas-dominio` e `Demandas.test` | criada, F5, presente (fase 3) | **PASSOU** |
| 2 | Título inválido não grava | `demandas-dominio` e `Demandas.test` | — | **PASSOU** |
| 3 | Editar e dar F5: persiste e atualiza a última ação | `demandas-dominio` e `Demandas.test` | editada, F5, presente (fase 3) | **PASSOU** |
| 4 | Abrir o detalhe não muda a última ação | `demandas-dominio` (edição sem mudança) | — | **PASSOU** |
| 5 | Excluir e cancelar: a demanda permanece | `Demandas.test` | cancelado, total igual (fase 3) | **PASSOU** |
| 6 | Excluir, confirmar e dar F5: a demanda some | `demandas-dominio` e `Demandas.test` | excluída, F5, ausente (fase 3) | **PASSOU** |
| 7 | Mover no Kanban e dar F5: coluna e contagens atualizadas | `Kanban.test` | movida, F5, Dashboard conferido (fase 4) | **PASSOU** |
| 8 | Filtros combinados | `demandas-dominio` e `Demandas.test` | — | **PASSOU** |
| 9 | Vencida (prazo de ontem; concluída não conta) | `metricas-inatividade` | Dashboard: 0 vencidas, coerente com os dados | **PASSOU** |
| 10 | Limiar 3 e última ação há 5 dias geram alerta; uma ação remove o alerta | `metricas-inatividade` e `Alertas.test` | alerta "há 5 dia(s)"; movida no Kanban; alerta some; sino de 2 para 1 | **PASSOU** |
| 11 | Exportar e importar: contagens iguais, backup gravado | `dados-portaveis` e `Alertas.test` | exportadas 5 → importadas 5, com confirmação e backup | **PASSOU** |
| 12 | JSON inválido recusado sem alterar dados | `dados-portaveis` (6 casos) e `Alertas.test` | "Importação recusada…"; total continua 5 | **PASSOU** |

## Outros itens do P07

| Item | Situação | Observação |
|---|---|---|
| Validação de entradas | PASSOU | limites de tamanho, enumerações, data válida |
| Estados vazios | PASSOU | "Nenhuma demanda cadastrada", "Nenhuma demanda inativa" e colunas vazias no Kanban |
| Responsividade | PASSOU | estilos computados em 1366, 800 e 375 px (fase 2) |
| Restaurar exemplos com confirmação | PARCIAL | testado no armazém (`demandas-dominio.test`); não foi executado no navegador. Corrigido após auditoria (P09-D) |
| Desfazer importação (backup) | PASSOU | `dados-portaveis.test` |
| Armazenamento corrompido | PASSOU | aviso, sem apagar e sem gravar por cima |
| Cliques físicos do usuário | NÃO TESTADO | a janela do app estava atrás de outra; os passos usaram eventos de DOM em script |
| Contraste WCAG AA medido | NÃO TESTADO | sem ferramenta de medição |
| Testes de interface com Playwright | NÃO TESTADO | fora do escopo desta rodada; a apostila aceita "ferramentas disponíveis" |

## Defeitos encontrados e corrigidos (Critique–Revise)

1. `baseUrl` removido no TypeScript 7 → retirado do tsconfig (fase 1).
2. Genéricos sem uso em `ContratoHabilidade` → removidos (fase 1).
3. Botões da lista com nome acessível ambíguo (texto `sr-only`) → trocado por `aria-label` (fase 3).

Não há defeito P0 em aberto.

## Limitações declaradas

- Os dados ficam no localStorage **deste navegador e desta origem**. Não é multiusuário, e a URL do Vercel terá dados próprios.
- Os alertas só são avaliados com o app aberto. Não há e-mail, SMTP nem scheduler.
- Não há login, backend nem banco. O Supabase é uma evolução opcional depois do Vercel (D10).
