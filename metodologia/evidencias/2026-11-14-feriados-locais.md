# Evidência — feriados locais (14/11/2026)

**Pedido do responsável:** "implemente o item feriados locais" (`gestao/BACKLOG.md`, ideias vindas do TOCA: uma tela para `extras` e `remover`, persistida no localStorage). Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Regras puras: `validarFeriados`, `lerNovoFeriado` (data, nome até 60 caracteres, repetido, limite de 100), `paraAjuste` (feriados anuais valem do ano anterior a três à frente; 29/02 só nos bissextos) e `nacionaisComNome` | `aplicacao/src/modulos/alertas/feriados-locais.ts` (novo) |
| Armazém: `feriados` e `feriadosIlegiveis` no estado, lidos da chave `guara:feriados:v1` (também ao mudar em outra aba), `definirFeriados` (valida antes de gravar) e o hook `useAjusteFeriados` | `aplicacao/src/modulos/demandas/armazem.ts` |
| Tela "Feriados locais" na página Alertas: acrescentar (data, nome, "Repete todo ano"), remover com confirmação, ligar Carnaval e Corpus Christi, e desmarcar feriados nacionais do ano que não valem | `aplicacao/src/modulos/alertas/FeriadosLocais.tsx` (novo), `Alertas.tsx`, `estilos.css` (`.campo-grupo--linha`) |
| As contas em dias úteis passam a usar os feriados locais: prazos no Dashboard, Kanban e Demandas; demanda travada; prazo sugerido na triagem; tela compartilhada | `Painel.tsx`, `Kanban.tsx`, `Demandas.tsx`, `Alertas.tsx`, `demandas/resumo.ts` |

## Decisões

- **Chave própria (`guara:feriados:v1`), fora da configuração exportada.** O formato do JSON portável (`versao: 1`), o backup da importação e o MCP não mudaram.
- **Gravação ilegível não é apagada:** a tela avisa, as contas usam só os nacionais e o conteúdo fica até a pessoa gravar de novo.
- **A regra de "vencida" não mudou** (prazo antes de hoje). Os feriados mudam só os textos em dias úteis e a sugestão da triagem.
- Os nomes dos feriados não são dado pessoal; nenhum dado de demanda foi tocado.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 11 testes unitários novos: formulário (aceita, data inválida, nome vazio e longo, repetido simples e anual, limite), validação da gravação, expansão dos anuais e 29/02, contagem com feriado local (13/11 → 23/11: 5 → 4), com 20/11 removido (6) e com Carnaval (3 → 1), nacionais de 2026 com nome, armazém (grava, relê, recusa inválida sem gravar, gravação ilegível) | em `testes/unidade/feriados-locais.test.ts` | conferidos na suíte | PASSOU |
| 2 | 2 testes de tela em Alertas: acrescentar 17/11 anual muda a sugestão da triagem de 30/11 para 01/12; desmarcar 20/11 volta a 30/11; remover pede confirmação (cancelar não remove); nome vazio recusado sem gravar | em `Alertas.test.tsx` | conferidos na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 22 passed (22)` · `Tests 229 passed (229)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

## Limitações

- **Os feriados locais não vão no JSON exportado** nem no backup da importação: ao levar os dados para outro navegador, é preciso cadastrá-los de novo.
- A lista de nacionais para desmarcar mostra só o ano atual; uma data removida vale só para aquele ano.
- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom).
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1.
