# Evidência — três números por demanda (14/11/2026)

**Pedido do responsável:** "implemente o item 10, três números por demanda" (`gestao/BACKLOG.md`, ideias vindas do TOCA). O BACKLOG pedia confirmação por mudar o modelo; o pedido explícito do responsável vale como essa confirmação. A ideia vem de `identificadores.py` e `processos.py` do TOCA. A lógica foi reescrita, sem copiar código.

| Mudança | Arquivo |
|---|---|
| Leitura e normalização: processo administrativo (formato livre, com ao menos um número, até 60 caracteres, em maiúsculas), SIMP (`NNNNNN-NNN/AAAA`, aceita "SIMP" antes) e CNJ (`NNNNNNN-DD.AAAA.J.TR.OOOO` ou 20 dígitos, com os dígitos verificadores conferidos por mod 97) | `aplicacao/src/modulos/demandas/identificadores.ts` (novo) |
| Campos opcionais `processo`, `simp` e `judicial` na demanda e na entrada | `aplicacao/src/modulos/demandas/modelo.ts` |
| Validação por campo, gravação normalizada, campo esvaziado sai da demanda, edição compara os números, pesquisa pelos números, validação do que está gravado | `aplicacao/src/modulos/demandas/regras.ts` |
| Formulário: grupo "Números (opcionais)" com os três campos e o erro em cada um | `aplicacao/src/modulos/demandas/FormularioDemanda.tsx` |
| Demandas: números no detalhe ("—" quando vazio) e na lista (só os preenchidos); pesquisa "Título, descrição ou número" | `aplicacao/src/modulos/demandas/Demandas.tsx` |
| Aviso de demanda parecida: os três números entram na comparação, e o aviso diz o tipo ("mesmo SIMP …", "mesmo processo judicial …") | `aplicacao/src/modulos/demandas/parecida.ts` |
| Exemplos fictícios: o número `FIC-` vai para o campo `processo` e sai da descrição | `aplicacao/src/modulos/demandas/exemplos.ts` |
| Modelo atualizado | `planejamento/PLANO.md` |

## Decisões

- **Sem migração e sem mudar `versao: 1`.** Os três campos são opcionais e só acrescentam; dados antigos continuam válidos (há teste).
- **Um número de cada tipo.** No TOCA, SIMP e judicial são listas; aqui é um de cada, como o item foi descrito.
- **CNJ com dígito errado é recusado.** O objetivo é pegar erro de digitação. No TOCA, o campo rotulado aceitava sem conferir.
- **Números de teste fictícios:** CNJ e SIMP com ano 2099 e órgão 0000, que não existem em registros reais. Os exemplos do app só usam `FIC-`.
- **A extração dos números do texto (colar o texto e preencher os campos) não foi feita.** O aviso de parecida continua achando processo no título e na descrição.
- O primeiro teste antigo que falhou mostrou que eu tinha trocado o texto "mesmo processo" por "mesmo número" sem necessidade. O texto original voltou, e o aviso passou a dizer o tipo do número. O teste antigo não foi alterado.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 10 testes unitários novos: leitura dos três números, CNJ (dígitos certos, 20 dígitos, dígito errado, mod 97 = 1), validação por campo, gravação normalizada, campo esvaziado, edição sem mudança, dados antigos válidos, número gravado fora da forma recusado, pesquisa, parecida por SIMP e CNJ, exemplos | em `testes/unidade/tres-numeros.test.ts` | conferidos na suíte | PASSOU |
| 2 | 1 teste de tela: erro no campo SIMP sem gravar, gravação normalizada, número na lista, "—" no detalhe | em `Demandas.test.tsx` | 1ª execução falhou porque o teste procurava o campo pelo nome exato, que inclui a mensagem de erro; a busca foi ajustada (`/^SIMP/`), como nos testes antigos | PASSOU após ajuste do teste |
| 3 | Suíte completa | `npm test` | `Test Files 18 passed (18)` · `Tests 185 passed (185)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built` | PASSOU |

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom), inclusive os três campos em tela de celular.
- Quem já tem os exemplos gravados no navegador continua com o número na descrição; o campo novo só vem em "Restaurar exemplos" ou num navegador novo.
- O MCP local não mostra os três números.
- Sem extração automática dos números a partir do texto colado.
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1.
