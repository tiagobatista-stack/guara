# Evidência — mascote padrão lobo-guará e mascotes convidados (22/11/2026)

**Pedido do responsável:** padrão lobo-guará; mascotes convidados por personalidade em ocasiões pontuais, com interruptor nas Configurações. Branch `melhoria-agenda-intervalo-repeticao`. Decisões em `gestao/decisoes/2026-11-22-mascotes-convidados.md`.

| Mudança | Arquivo |
|---|---|
| Principal padrão = lobo-guará; campo `convidados`; `especiePara`; `definirConvidados` | `aplicacao/src/compartilhado/preferencias-mascote.ts` |
| `personalidade` por espécie; tipo `Ocasiao`; `ESPECIE_DA_OCASIAO` | `aplicacao/src/compartilhado/especies-mascote.ts` |
| Propriedade opcional `ocasiao` | `aplicacao/src/compartilhado/EstadoVazio.tsx` |
| `FalaMascote` usa a ocasião `aviso` | `aplicacao/src/modulos/operacoes/Operacoes.tsx` |
| Interruptor "Mascotes convidados" com explicação | `aplicacao/src/modulos/configuracoes/Configuracoes.tsx` |
| `ocasiao` nos estados vazios de Agenda, Alertas, Atalhos, Contatos, Demandas, Kanban, Mapa, Operações e Painel | respectivos `.tsx` em `aplicacao/src/modulos/` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | `especiePara` (ligado, desligado, sem ocasião), validação de `convidados` (ausente e inválido), gravação | `preferencias-mascote.test.ts` | na suíte | PASSOU |
| 2 | `EstadoVazio` com ocasião mostra o convidado; desligado volta ao principal | `EstadoVazio.test.tsx` | na suíte | PASSOU |
| 3 | Interruptor vem ligado, grava e persiste | `Configuracoes.test.tsx` | na suíte | PASSOU |
| 4 | Testes antigos que supunham capivara como padrão foram ajustados para lobo-guará | 5 arquivos de teste | na suíte | PASSOU |
| 5 | Suíte completa | `npm test` | `Tests 1175 passed (1175)`, 80 arquivos (rodada final) | PASSOU |
| 6 | Tipos e build | `tsc --noEmit`; `npm run build` | sem erros; `✓ built` | PASSOU |

## Limitações

- Teste lento e intermitente: `PainelAssistente.test.tsx > a conversa guardada tem um teto de falas…` estourou o tempo limite em 2 rodadas (5,9 s e 8,1 s) e passou nas rodadas completas. Não verificado se já era lento antes desta mudança.
- `FalaMascote` de Operações com o convidado: sem teste dedicado.
- Telas no navegador (celular e desktop): **NÃO CONFERIDO VISUALMENTE**.
- Não publicado (push exige autorização do responsável).
