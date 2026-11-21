# Assistente

Painel de conversa com o mascote principal. MVP: comandos determinísticos, sem modelo de IA pago. Respostas distinguem fato extraído, inferência e sugestão.

A conversa fica guardada neste navegador em `guara:conversa:v1` (`conversa.ts`, até 60 falas), para não recomeçar a cada abertura da gaveta. Guarda o que a pessoa digitou: por isso, nada de dado real nos testes e nos exemplos. Os atalhos abaixo do campo enviam os comandos "prazos" e "ajuda" com rótulos em linguagem comum.

Notificações: "Ciente" e "adiar" (`lembretes.ts`, `guara:avisos:v1`) só escondem o aviso no assistente. Ciente vale até a demanda mudar de situação (status ou tipo do aviso); adiar vale até as 8h ou 14h seguintes. Dashboard, Alertas e Kanban continuam mostrando a situação real.

Comandos (etapa 1 da conversa, 20/11/2026): a frase é normalizada (`normalizar.ts`) e comparada, palavra inteira, com os gatilhos da tabela `frases.ts` (`classificar.ts`). Para ensinar um sinônimo, acrescente-o aos `gatilhos`; para um comando novo, acrescente uma intenção: ela aparece sozinha na ajuda. Os testes de `classificar.test.ts` conferem todos os gatilhos.

Prioridades (21/11/2026): o comando "prioridades" ("o que faço primeiro?") usa `priorizar.ts` (pontuação por pesos fixos, com o motivo de cada ponto e uma próxima ação sugerida) e monta a resposta em `respostaPrioridades.ts`: até 5 demandas, como inferência, mais a ação da primeira, como sugestão. Só lê as demandas; não altera nada. Os avisos de prazo e o "Ciente"/"adiar" seguem à parte.
Fila do dia (`FilaDoDia.tsx`): seção do painel, acima das notificações, com as 3 primeiras demandas de `priorizar.ts`. Cada uma abre em "Por que está aqui" (motivos com fato/inferência e pontos) e a sugestão. Só mostra; "Ciente" e "adiar" continuam só nos avisos.
Avisos agregados (passo 4): cada demanda continua com um aviso só, mas o texto junta o prazo e a parada ("vencido há 3 dias úteis; parada há 5 dia(s)…"). O tipo é o do sinal mais urgente; a situação do "Ciente" inclui todos os sinais, então um sinal novo traz o aviso de volta.
