# Evidência — resumo sem dado pessoal (14/11/2026)

**Pedido do responsável:** "implemente o item 12, resumo sem dado pessoal" (`gestao/BACKLOG.md`, ideias vindas do TOCA). A ideia vem de `resumo.py` do TOCA (lista branca de campos para tela compartilhada). A lógica foi reescrita, sem copiar código.

| Mudança | Arquivo |
|---|---|
| `CAMPOS_DO_RESUMO` (lista branca), `montarResumo` (copia só esses campos antes de montar os textos) e `resumosEmAberto` (abertas, pelo prazo, sem prazo por último) | `aplicacao/src/modulos/demandas/resumo.ts` (novo) |
| Demandas: botão "Tela compartilhada". Nesse modo, só os cartões do resumo e um aviso do que fica de fora; somem os filtros (o de responsável lista nomes), "Nova demanda", detalhes, edição e exclusão. "Sair da tela compartilhada" volta à lista | `aplicacao/src/modulos/demandas/Demandas.tsx` |

## O que entra e o que fica de fora

- **Entra:** título, status, prioridade, prazo (com dias úteis), tipo, natureza, andamento, bloqueio (só a categoria) e processo administrativo.
- **Fica de fora:** responsável e descrição (texto livre, pode ter nomes) e qualquer campo que não esteja na lista branca.
- **Só "tem":** SIMP e processo judicial aparecem como "tem (número fora do resumo)", porque o número pode estar sob sigilo. No TOCA, o resumo também só marca que a demanda é judicial.
- **O título entra**, como no TOCA. É texto livre: o aviso da tela pede para evitar nomes de pessoas nele.

## Decisões

- **A lista branca é aplicada antes dos textos:** `montarResumo` copia só os campos permitidos, e o resto nem chega às funções que montam as linhas. Um teste acrescenta campos desconhecidos (telefone, CPF fictícios) e confere que não aparecem.
- **Concluídas ficam de fora.** O resumo é das demandas em aberto.
- **O modo não fica gravado.** Ao recarregar a página, a tela volta à lista normal.
- O modelo não mudou.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 5 testes unitários novos: linhas do resumo com todos os campos; nada de responsável, descrição, SIMP, CNJ e campos desconhecidos no resultado inteiro; lista branca sem responsável e descrição; resumo mínimo; concluídas fora e ordem pelo prazo | em `testes/unidade/resumo-compartilhado.test.ts` | conferidos na suíte | PASSOU |
| 2 | 1 teste de tela: no modo compartilhado, o texto da página inteira não tem responsável, descrição nem SIMP; filtros, cadastro e edição somem; concluída fora; sair volta à lista com o responsável | em `Demandas.test.tsx` | conferido na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 20 passed (20)` · `Tests 207 passed (207)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom), inclusive em projetor e celular.
- **O título é texto livre** e aparece como foi digitado; o GUARÁ não detecta nomes de pessoas nele.
- O modo existe só na tela Demandas. O Kanban mostra o responsável no cartão e não tem modo compartilhado. O menu lateral continua visível e leva às outras telas.
- Nada impede alguém de sair do modo diante do projetor; o modo protege o que está na tela, não é controle de acesso.
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1.
