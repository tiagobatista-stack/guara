# Evidência — presença do mascote no assistente (14/11/2026)

**Pedido do responsável:** depois de ver a tela ("o mascote ficou bem pequeno, poderia destacar melhor"), pediu uma avaliação de UX e aprovou a ordem proposta: "faça na ordem, o tamanho ficou bom agora". Ordem: olhos abertos no humor tranquilo; mascote reagindo aos avisos; ligação do mascote com as falas.

| Mudança | Arquivo |
|---|---|
| Mascote do painel de 56 para 88 px, sobre fundo circular (`.mascote-palco`) | `PainelAssistente.tsx`, `estilos.css` |
| Humor tranquilo com olhos abertos (a pálpebra a meio lia como sono; fica reservada para o tédio) | `Mascote.tsx`, SVGs de `identidade-visual/fofofauna/` |
| Humor do painel deixa de ser fixo: `atento` com aviso pendente, `curioso` depois de comando não reconhecido, `tranquilo` sem aviso; o motivo aparece em texto ao lado do mascote | `PainelAssistente.tsx` |
| Cada fala do assistente leva um rosto de 28 px do mascote escolhido; o nome do autor vai para o leitor de tela ("Capivara:", "Você:") | `PainelAssistente.tsx`, `estilos.css` |
| Opção `decorativo` no componente: fora do leitor de tela e sem acompanhar o ponteiro | `Mascote.tsx` |
| 5 testes novos (1 em `Mascote.test.tsx`, 4 em `PainelAssistente.test.tsx`, novo) | — |

## Decisões

- **O humor reflete só o estado da tela** (avisos e último comando), nunca o conteúdo ou o mérito de uma demanda.
- **A expressão nunca é o único sinal:** o motivo vem escrito ("Atento: 1 aviso abaixo.").
- O aviso do painel continua sendo o texto fixo e fictício do MVP; só passou para uma lista (`NOTIFICACOES`).
- Os rostos das falas não acompanham o ponteiro, para não multiplicar cálculos por mensagem.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Suíte completa, com os 5 testes novos | `npm test` | `Test Files 24 passed (24)` · `Tests 231 passed (231)` | PASSOU |
| 2 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ 137 modules transformed`; `✓ built in 159ms` | PASSOU |

Os dois comandos foram executados pelo responsável no Windows (PowerShell), e a saída foi colada na conversa.

### Na `main` (cherry-pick `34c4469`)

O trabalho foi feito no branch `login-google` por engano de branch ativo e trazido para a `main` por cherry-pick. O código entrou sem conflito; `STATUS.md`, `BACKLOG.md` e `CHANGELOG.md` foram conciliados à mão.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 3 | Instalação limpa na `main` | `npm ci` | 1ª tentativa: `EPERM` ao apagar o binário do Rolldown (arquivo em uso); 2ª: `added 97 packages`, `found 0 vulnerabilities` | PASSOU na 2ª tentativa |
| 4 | Suíte completa na `main` | `npm test` | `Test Files 24 passed (24)` · `Tests 241 passed (241)` | PASSOU |
| 5 | Build na `main` | `npm run build` | `tsc --noEmit` sem erros; `✓ 93 modules transformed`; `✓ built in 161ms` | PASSOU |

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE**, inclusive tema escuro e celular. O tamanho de 88 px foi aprovado pelo responsável pela tela; as demais mudanças vieram depois.
- Seletor e rótulo "Mascote principal" continuam no topo (itens 5 a 7 da avaliação de UX ficam para depois).
- Publicação no site: NÃO TESTADO (depende do push da `main`).
