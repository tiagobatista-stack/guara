# Evidência — triagem de demanda sem prazo (14/11/2026)

**Pedido do responsável:** "implemente o item 8, triagem de demanda sem prazo" (`gestao/BACKLOG.md`, ideias vindas do TOCA). A ideia vem da triagem da entrada do TOCA ("nada fica na entrada sem uma decisão", `prazo_sugerido = "10 dias úteis"`). A lógica foi reescrita, sem copiar código.

| Mudança | Arquivo |
|---|---|
| Regras puras: `listarSemPrazo` (abertas sem prazo, da mais antiga para a mais nova) e `sugerirPrazo` (10 dias úteis a partir de hoje, com os feriados pulados) | `aplicacao/src/modulos/alertas/triagem.ts` (novo) |
| Alertas: seção "Triagem: demandas sem prazo (N)", com a sugestão explicada, um campo de data já preenchido e "Gravar prazo" por demanda | `aplicacao/src/modulos/alertas/Alertas.tsx` |
| Dashboard: aviso "N demandas em aberto estão sem prazo. Faça a triagem na tela Alertas." | `aplicacao/src/modulos/painel/Painel.tsx` |

## Decisões

- **A pessoa confirma.** A data sugerida aparece no campo e só é gravada no clique em "Gravar prazo". A pessoa pode trocar a data antes. Data inválida ou vazia é recusada sem gravar.
- **Sem mudança de modelo.** O prazo é gravado pela edição que já existe (`armazem.editar`), com a mesma validação. Gravar o prazo conta como ação relevante (regra 1 do PLANO: edição de fato).
- **A sugestão é de 10 dias úteis**, o padrão do TOCA, contada a partir de hoje e sem contar hoje. Ainda não há tela para configurá-la.
- **A contagem do menu (ícone de Alertas) não mudou.** Ela continua sendo só a de demandas inativas.
- Do TOCA, não foram trazidas as outras decisões da triagem: feito, aguardando, campo, excluir e pular. A triagem do GUARÁ decide só o prazo.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 6 testes unitários novos: quais demandas entram e em que ordem, a lista recebida não é alterada, 10 dias úteis, 13/11/2026 → 30/11/2026 pulando 20/11, sem feriado no caminho, virada do ano pulando 25/12 e 01/01 | em `testes/unidade/triagem.test.ts` | conferidos na suíte | PASSOU |
| 2 | 2 testes de tela em Alertas: sugestão exibida, nada gravado antes do clique, gravação no localStorage e saída da lista; data trocada pela pessoa; data vazia recusada sem gravar | em `Alertas.test.tsx` | conferidos na suíte | PASSOU |
| 3 | 1 teste de tela no Dashboard: o aviso conta só as abertas sem prazo | em `Kanban.test.tsx` | conferido na suíte | PASSOU |
| 4 | Suíte completa | `npm test` | `Test Files 16 passed (16)` · `Tests 164 passed (164)` | PASSOU |
| 5 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom), inclusive o campo de data em tela de celular.
- O prazo sugerido é fixo (10 dias úteis) e usa só os feriados nacionais.
- A data escolhida e não gravada se perde ao sair da tela Alertas.
- Os testes novos não foram executados contra o código anterior. O módulo não existia, então falhariam por ausência, e não por defeito.
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1.
