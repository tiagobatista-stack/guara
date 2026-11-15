# Evidência — pose do mascote pela natureza da resposta (etapa 5, 14/11/2026)

**Pedido do responsável:** "vá para o próximo item" (`gestao/BACKLOG.md`, plano dos mascotes, item 1: natureza da resposta no assistente). Feito na `main`. Antes, a publicação de `3da479e` foi conferida: a URL pública serve `index-R_LqMmV9.js`, o mesmo bundle do build.

| Mudança | Arquivo |
|---|---|
| Dois humores novos: **pensativo** (uma sobrancelha erguida, boca de lado, cabeça inclinada) para inferência, e **cauteloso** (sobrancelhas de preocupação, boca ondulada) para o que não foi testado | `aplicacao/src/compartilhado/Mascote.tsx` |
| Assistente: cada fala tem a pose da sua natureza (fato → tranquilo, inferência → pensativo, sugestão → curioso), ao lado do selo de texto, que continua igual. O mascote principal fica pensativo depois de uma inferência, como já ficava curioso depois de uma sugestão | `modulos/assistente/PainelAssistente.tsx` |
| "prazos" responde em duas falas: o **fato** (os avisos agrupados) e uma **inferência** ("Pela ordem das regras, a mais urgente é DEM-…"), com a fonte dizendo que é a ordem das regras e pedindo conferência. Assim a pose pensativa aparece em uso real | `modulos/assistente/PainelAssistente.tsx` |
| Saúde do sistema: com o estado geral NÃO TESTADO, o mascote fica cauteloso (antes, curioso) | `modulos/saude-do-sistema/SaudeDoSistema.tsx` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Os testes de mascote que percorrem todos os humores passaram a incluir pensativo e cauteloso: rótulo para leitor de tela por espécie e desenho diferente de cada humor | em `compartilhado/Mascote.test.tsx` | conferidos na suíte | PASSOU |
| 2 | Assistente: pose e selo de cada fala (fato, inferência, sugestão); mascote pensativo com o motivo em texto; "prazos" com o fato e a inferência | em `PainelAssistente.test.tsx` (1 teste novo, 1 atualizado) | conferidos na suíte | PASSOU |
| 3 | Saúde do sistema: lobo-guará cauteloso antes da verificação; capivara tranquila depois | em `SaudeDoSistema.test.tsx` (1 teste novo) | conferido na suíte | PASSOU |
| 4 | Suíte completa | `npm test` | `Test Files 29 passed (29)` · `Tests 293 passed (293)` | PASSOU |
| 5 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-BPahiGzq.js` | PASSOU |

## Limitações

- O assistente não tem resposta NÃO TESTADO ou NÃO DEMONSTRADO; a pose cautelosa aparece só na Saúde do sistema.
- As poses novas não foram vistas no navegador: **NÃO CONFERIDO VISUALMENTE** (o desenho pode precisar de ajuste).
- Ambiente: Node v26.13.1. Não publicado.
