# Evidência — mascotes nas Configurações: principal e nomes (14/11/2026)

**Pedido do responsável:** "a escolha do mascote e os nomes devem estar na opção de configurações, para não poluir a tela". Etapa 3 do plano dos mascotes (`gestao/BACKLOG.md`): campo para o analista dar nome a cada mascote, com a espécie como padrão. Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Tela Configurações (nova), com a seção Mascotes: os três rostos, campo de nome e escolha do principal | `aplicacao/src/modulos/configuracoes/Configuracoes.tsx` (novo), `README.md` (novo) |
| Preferências gravadas no localStorage (`guara:mascote:v1`), validadas na leitura e compartilhadas entre as telas | `aplicacao/src/compartilhado/preferencias-mascote.ts` (novo) |
| Painel do assistente sem o seletor: usa o principal e o nome das preferências; com nome próprio, mostra a espécie ao lado | `aplicacao/src/modulos/assistente/PainelAssistente.tsx` |
| Botão "Configurações" do menu, antes desabilitado, abre a tela; módulo registrado | `aplicacao/src/nucleo/Aplicacao.tsx`, `registro-modulos.ts` |
| Leitor de tela anuncia nome e espécie ("Tobias, Lobo-guará (Cerrado), atento") | `aplicacao/src/compartilhado/Mascote.tsx` |
| Estilos da tela | `aplicacao/src/estilos.css` |
| 10 testes novos (6 de preferências, 4 de tela) e 1 reescrito no painel | `preferencias-mascote.test.ts`, `Configuracoes.test.tsx` (novos), `PainelAssistente.test.tsx` |

## Decisões

- **Só preferência visual** (seção 7.3 do planejamento): não muda permissões, dados nem capacidades. A tela diz isso.
- **Nome:** até 20 caracteres, espaços sobrando removidos; vazio mostra a espécie. Grava a cada tecla, sem botão de salvar.
- **Gravação inválida volta ao padrão** parte por parte (principal desconhecido vira capivara; nome que não é texto é ignorado).
- **Armazenamento bloqueado:** as preferências valem até fechar a página, sem erro na tela.
- O mascote da Saúde do sistema continua definido pelo estado (capivara ou lobo-guará), sem nome próprio.

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Suíte completa, com os 10 testes novos | `npm test` | `Test Files 26 passed (26)` · `Tests 261 passed (261)` | PASSOU |
| 2 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ 95 modules transformed`; `✓ built in 135ms` | PASSOU |
| 3 | Servidor local sobe | `npm run dev` | `VITE v8.3.8 ready in 178 ms`, em `http://127.0.0.1:5173/` | PASSOU (só a subida; as telas não foram relatadas) |

Executados pelo responsável no Windows; a saída foi colada na conversa.

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (tela Configurações em celular e tema escuro; painel sem o seletor).
- A navegação até a tela pelo menu não tem teste automatizado.
- Exportar e importar dados (tela Alertas) não leva as preferências do mascote.
- Sem aviso na tela quando o armazenamento está bloqueado e a preferência não persiste.
