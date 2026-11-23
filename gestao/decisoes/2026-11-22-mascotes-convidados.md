# Decisão — mascote padrão e mascotes convidados (22/11/2026)

**Pedido do responsável:** o mascote padrão do GUARÁ é o lobo-guará; e outros mascotes podem entrar de forma pontual, conforme a personalidade, voltando ao principal em seguida, com opção de ligar e desligar nas Configurações. Primeiro alcance: `EstadoVazio` e `FalaMascote`.

## Decisões

| # | Decisão | Motivo |
|---|---|---|
| 1 | O principal padrão passa de capivara para **lobo-guará** (`PREFERENCIAS_PADRAO`). Quem já escolheu outro mantém a escolha (localStorage). | Pedido do responsável. |
| 2 | Novo campo `convidados` (boolean, padrão `true`) nas preferências. Valor ausente ou inválido volta ao padrão; backups antigos continuam válidos (`versao: 1`). | Compatibilidade e ligar/desligar. |
| 3 | Mapa ocasião → espécie em `especies-mascote.ts` (`ESPECIE_DA_OCASIAO`): prazo e aviso = lobo-guará (observador, atento); vazio acolhedor e marco = capivara (tranquila, acolhedora); vazio de descoberta = ariranha (curiosa, comunicativa). | Personalidades do planejamento (seção 7, linhas 267-271). Um só lugar para ajustar. |
| 4 | `especiePara(preferencias, ocasiao)` devolve o convidado se ligado e houver ocasião; senão o principal. | Regra pura e testável. |
| 5 | O **rosto do assistente não troca** por navegação; fica o principal. Saúde do sistema continua escolhendo pelo estado. A comemoração do Kanban não troca de rosto nesta etapa. | Pedido do responsável: manter o principal como base. |
| 6 | Só muda rosto e nome. Textos, dados, permissões e capacidades não mudam. | README da Fofofauna e planejamento 7.3: personalidade não altera conteúdo técnico. |

## Padrões de projeto
Nenhum padrão GoF. É um mapa tipado e uma função pura (forma idiomática de TypeScript, sem hierarquia de classes).

## Fora desta etapa
- Frases com tom próprio por mascote (os textos dos módulos ficam iguais).
- Rosto convidado na comemoração do Kanban.
- Teste dedicado da `FalaMascote` de Operações com o convidado.
