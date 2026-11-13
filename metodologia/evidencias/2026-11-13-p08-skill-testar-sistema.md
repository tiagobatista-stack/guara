# Evidência — P08: invocação real da skill `testar-sistema` (13/11/2026)

## Prova da invocação

- **Ferramenta:** chamada à ferramenta `Skill` do Claude Code com `skill: "testar-sistema"`.
- **Retorno:** "Launching skill: testar-sistema".
- **Arquivo carregado:** `C:\Users\edila\Documents\Claude\0\estagiario-digital-fofofauna\.claude\skills\testar-sistema\SKILL.md`. O harness informou o "Base directory for this skill" e injetou as 7 instruções do arquivo.
- **Descoberta:** as três skills do projeto (`testar-sistema`, `revisar-interface`, `validar-pds`) aparecem na lista de skills disponíveis da sessão, com a origem `estagiario-digital-fofofauna/.claude/skills`. Também podem ser invocadas pelo usuário como `/testar-sistema`, `/revisar-interface` e `/validar-pds`.

## Relatório produzido pela skill

| Passo | Comando exato | Saída relevante | Situação |
|---|---|---|---|
| 1 | `node -v`; `npm -v`; `python --version` | v26.13.1; 11.20.0; Python 3.12.10 | PASSOU |
| 2 | `npm test` (em `aplicacao/`) | `Test Files 11 passed (11)`, `Tests 75 passed (75)` | PASSOU |
| 3 | `npm run build` (em `aplicacao/`) | `✓ built in 458ms` | PASSOU |
| 4 | `python -m unittest testes/unidade/test_hook_verificar_comando.py -v` | `Ran 8 tests ... OK` (inclui a sentinela `GUARA_HOOK_TEST_BLOCK`) | PASSOU |

## Itens não cobertos pela skill

| Item | Situação |
|---|---|
| Hook acionado pelo Claude Code em sessão real | NÃO TESTADO: nesta sessão `echo GUARA_HOOK_TEST_BLOCK` **não foi bloqueado**. O `.claude/settings.json` do projeto não foi carregado, porque a sessão começou na pasta pai. É preciso abrir uma nova sessão em `estagiario-digital-fofofauna/` e repetir. |
| `revisar-interface` e `validar-pds` invocadas | NÃO TESTADO (a apostila exige pelo menos uma invocação real, já feita acima) |
