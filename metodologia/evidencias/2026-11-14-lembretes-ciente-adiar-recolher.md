# Evidência — notificações do assistente: ciente, adiar e recolher (14/11/2026)

**Pedido do responsável:** "as notificações do chat não têm a opção de marcar visualizado e ou ciente, faltam opções de prorrogação de notificações para períodos do dia" e, durante a execução, "pode ter também um botão para encolher a aba de notificações ficando apenas o chat". Decisões dele: ciente apaga só o aviso, não a necessidade de lembrar, e o aviso volta quando o processo muda de situação; períodos de 8h e 14h; adiar é só adiar o lembrete. Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Cada aviso ganha `situacao` (tipo do aviso e status da demanda) | `aplicacao/src/modulos/assistente/avisos.ts` |
| Armazém `guara:avisos:v1` com as decisões da pessoa por demanda: `cienteEm` ou `adiadoAte`, sempre com a situação do momento. `separarAvisos` divide em visíveis e ocultos: ciente fica oculto enquanto a situação for a mesma; adiado fica oculto até a hora, depois volta sozinho; situação diferente, volta sempre. Opções de adiamento: as próximas 8h e 14h ("Hoje às 14h", "Amanhã às 8h"). Registros de demandas sem aviso (concluídas, excluídas) são limpos | `aplicacao/src/modulos/assistente/lembretes.ts` (novo) |
| Botões "Ciente", "Hoje/Amanhã às 8h/14h" em cada aviso; linha "N ciente(s) e M adiado(s)" que abre a lista dos ocultos com "Mostrar de novo"; humor do mascote conta só os visíveis e o texto diz quantos estão cientes ou adiados; "prazos" continua listando todos (é fato). Botão no título "Notificações" que recolhe a seção, deixando só a conversa, com contagem dos novos; a escolha fica em `guara:assistente:notificacoes-recolhidas:v1` | `aplicacao/src/modulos/assistente/PainelAssistente.tsx` |
| Botão flutuante (celular) e botão do cabeçalho (tablet) contam só os avisos visíveis. Dashboard, Alertas e Kanban não mudam | `aplicacao/src/nucleo/Aplicacao.tsx` |
| Estilos das ações do aviso, dos ocultos e do título recolhível | `aplicacao/src/estilos.css` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Regras puras: ciente volta ao mudar status ou tipo; adiado volta na hora; opções 8h e 14h em ordem; texto do retorno; limpeza e validação | `lembretes.test.ts` (6 testes) | conferido na suíte | PASSOU |
| 2 | Painel: Ciente esconde e acalma o mascote, volta ao mudar o status; adiar e "Mostrar de novo"; "prazos" lista os cientes; concluída limpa o registro; recolher a seção e manter a escolha ao remontar | `PainelAssistente.test.tsx` (5 testes) | conferido na suíte | PASSOU |
| 3 | Núcleo: aviso ciente sai da contagem do botão flutuante; Dashboard segue contando | `Aplicacao.test.tsx` (1 teste) | conferido na suíte | PASSOU |
| 4 | Suíte completa | `npm test` | `Test Files 31 passed (31)`, `Tests 318 passed (318)` | PASSOU |
| 5 | Build | `npm run build` | `✓ built` | PASSOU |

## Limitações

- O lembrete adiado volta quando a tela é renderizada de novo depois da hora (abrir a gaveta, mudar dados); não há relógio que force a volta no minuto exato com a tela parada.
- As opções 8h e 14h seguem o dia do calendário, não o dia útil: adiar numa sexta à tarde cai no sábado às 8h. Vale decidir se deve pular para segunda.
- `guara:avisos:v1` não entra no backup exportado.
- Telas: NÃO CONFERIDO VISUALMENTE (três botões por aviso no celular podem ficar apertados). Não publicado.
