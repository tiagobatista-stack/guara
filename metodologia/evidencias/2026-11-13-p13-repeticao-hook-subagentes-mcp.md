# Evidência — P13: repetição dos testes da seção 5 (hook, subagentes e MCP), 13/11/2026

**Contexto:** o relatório final deixou três verificações como NÃO TESTADO ou NÃO DEMONSTRADO, porque a sessão anterior foi aberta na pasta pai (`Claude/0`). Esta sessão foi aberta na pasta do projeto (`estagiario-digital-fofofauna/`), e o hook, os subagentes e as ferramentas `guara-dados` estavam carregados desde o início.

**Autorização:** o responsável pediu na conversa "repita os três testes descritos na seção 5 do relatório" e depois "atualize o relatório e as evidências com esses resultados".

## 1. Hook em sessão real (item 10 do relatório)

| # | Comando (ferramenta Bash) | Resultado | Situação |
|---|---|---|---|
| 1 | `echo GUARA_HOOK_TEST_BLOCK` | **Bloqueado pelo hook** (`PreToolUse:Bash`, `verificar_comando.py`): "Comando bloqueado (sentinela GUARA_HOOK_TEST_BLOCK). Exige revisão e autorização humana." O comando não foi executado. | PASSOU |
| 2 | `echo GUARA_OK` | Executado normalmente; saída `GUARA_OK` | PASSOU |

O hook também foi testado nas regras (8/8, `python -m unittest`), conforme `2026-11-13-p10-p11-mcp-hook-plugin.md`. Agora o bloqueio foi comprovado em sessão real.

## 2. Subagentes registrados (item 7 do relatório)

Cada subagente foi chamado pela ferramenta `Agent` com o `subagent_type` registrado, com tarefa somente de leitura (teste de carga). Os três foram encontrados, ao contrário do `Agent type 'arquiteto' not found` da sessão anterior.

| Subagente | Tarefa | Resultado | Situação |
|---|---|---|---|
| `arquiteto` | listar os 5 riscos em aberto da seção 4 do relatório | listou os 5 riscos (linhas 80 a 84). Apontou a importação sem `ficticio` como a mais grave, e declarou que é **inferência dele**, pois o relatório não classifica os riscos. Ferramentas: Read, Glob e Grep. Não alterou nada. | PASSOU |
| `auditor` | reexecutar `npm test` em `aplicacao/` | `Test Files 11 passed (11)`, `Tests 76 passed (76)`, Vitest v5.1.0, 3,76 s. Reconfirma o item 5 do relatório. Ferramentas: Read, Glob, Grep e Bash. Não alterou nada. | PASSOU |
| `implementador` | ler o próprio arquivo de papel e resumir o papel e as restrições | resumiu corretamente o papel (correção pontual com teste, padrão B) e as restrições. Ferramentas declaradas: Read, Glob, Grep, Edit, Write e Bash. **Não editou nem criou arquivos.** | PASSOU |

**Limites desta evidência:**

- É teste de **carga e papel**. A **rodada completa dos padrões A–F com os subagentes registrados continua NÃO DEMONSTRADA** (o item 8 do relatório permanece PARCIAL).
- O `implementador` não executou nenhuma correção real nesta rodada, então a edição com teste não foi demonstrada por ele.
- O `auditor` verificou só a afirmação dos 76 testes. Build, hook 8/8 e URL do Vercel ficaram fora do escopo dele.

## 3. MCP `guara-dados` (item 9 do relatório)

| # | Verificação | Resultado | Situação |
|---|---|---|---|
| 1 | Ferramentas do servidor disponíveis na sessão | `mcp__guara-dados__listar_demandas`, `listar_inativas` e `resumir_demandas` | PASSOU |
| 2 | `resumir_demandas` chamada pelo próprio Claude Code | `total: 5`; Em Andamento 3, Em Validação 1, Concluída 1; Alta 2, Média 2, Baixa 1; `exportadoEm` 2026-11-13T16:35:09.064Z; `ficticio: true`. O total coincide com o JSON exportado (5). | PASSOU |
| 3 | Tela de status `/mcp` | `/mcp` é um comando de interface que o agente não consegue executar. A chamada acima prova que o servidor está conectado e responde, mas **a tela `/mcp` não foi aberta**. | NÃO TESTADO |

## Resumo

| Item do relatório | Antes | Depois |
|---|---|---|
| 7. Subagentes criados e chamados | PARCIAL | PASSOU (chamada real dos três registrados) |
| 9. MCP conectado e ferramenta chamada | PARCIAL | PASSOU (chamada real; só a tela `/mcp` ficou NÃO TESTADA) |
| 10. Hook bloqueando em sessão real | NÃO TESTADO | PASSOU |
| 8. Padrões A–F com os subagentes registrados | PARCIAL | PARCIAL (não repetido) |
