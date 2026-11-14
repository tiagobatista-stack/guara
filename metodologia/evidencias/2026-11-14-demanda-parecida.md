# Evidência — aviso de demanda parecida (14/11/2026)

**Pedido do responsável:** "implemente o item 9, aviso de demanda parecida" (`gestao/BACKLOG.md`, ideias vindas do TOCA). A ideia vem de `_parecida` em `comandos_extras_modulo.py` do TOCA. A lógica foi reescrita, sem copiar código.

| Mudança | Arquivo |
|---|---|
| Regra pura `acharParecida`, na ordem do TOCA: (1) mesmo número de processo no título ou na descrição de UMA demanda em aberto; (2) mesmo título, sem diferença de acento, maiúsculas ou espaços; (3) todas as palavras do título digitado (2 ou mais, fora conectivos) inteiras no título de UMA demanda. Também `processosNoTexto` e `textoMotivo` | `aplicacao/src/modulos/demandas/parecida.ts` (novo) |
| Formulário: ao salvar um cadastro válido, mostra o aviso com "Criar mesmo assim", "Ver a existente (descarta este cadastro)" e "Continuar editando". Mexer em qualquer campo retira o aviso | `aplicacao/src/modulos/demandas/FormularioDemanda.tsx` |
| Demandas: liga o aviso só no cadastro (a edição não avisa) | `aplicacao/src/modulos/demandas/Demandas.tsx` |

## Decisões

- **Só avisa, não bloqueia.** Quem decide criar outra mesmo assim é a pessoa. Nada é gravado antes de "Criar mesmo assim".
- **Demandas concluídas não contam.** Como no TOCA, a comparação é só com as abertas.
- **Número de processo genérico, sem nome de órgão no código:** SIGLA-… com pelo menos 3 dígitos (`FIC-2026-0001`, `SEMA-PRO-2024/12345`) ou nº/ano (`213456/2022`). "COVID-19" não conta.
- **Na dúvida, não avisa.** Duas candidatas pelo mesmo critério não geram aviso, como no TOCA.
- **Erro de validação vem antes do aviso.** O aviso só aparece para um cadastro que poderia ser gravado.
- O modelo não mudou.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 7 testes unitários novos: processo reconhecido e "COVID-19" ignorado; mesmo processo; processo de concluída não conta; mesmo título com acento, maiúsculas e espaços diferentes; palavras contidas; uma palavra, "lote C" e duas candidatas não avisam; título novo não avisa | em `testes/unidade/demanda-parecida.test.ts` | 1ª execução: 6 passaram e 1 falhou porque "SEMA-PRO-2024/12345" era lido como "PRO-2024/12345". A expressão foi corrigida; o teste não foi alterado. | PASSOU após correção |
| 2 | 3 testes de tela: aviso antes de gravar e "Criar mesmo assim" grava; "Ver a existente" abre o detalhe sem gravar e mexer no título retira o aviso; título inválido mostra o erro e não o aviso; a edição não avisa | em `Demandas.test.tsx` | conferidos na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 17 passed (17)` · `Tests 174 passed (174)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom), inclusive o aviso em tela de celular.
- A comparação de títulos é por palavras inteiras. Erro de digitação ("relatorio mensl") não é reconhecido.
- "Ver a existente" descarta o cadastro em andamento; o botão diz isso.
- A edição não procura duplicatas. Duas demandas podem ficar iguais por edição.
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1.
