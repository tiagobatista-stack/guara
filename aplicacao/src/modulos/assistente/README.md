# Assistente

Painel de conversa com o mascote principal. MVP: comandos determinísticos, sem modelo de IA pago. Respostas distinguem fato extraído, inferência e sugestão.

A conversa fica guardada neste navegador em `guara:conversa:v1` (`conversa.ts`, até 60 falas), para não recomeçar a cada abertura da gaveta. Guarda o que a pessoa digitou: por isso, nada de dado real nos testes e nos exemplos. Os atalhos abaixo do campo enviam os comandos "prazos" e "ajuda" com rótulos em linguagem comum.

Notificações: "Ciente" e "adiar" (`lembretes.ts`, `guara:avisos:v1`) só escondem o aviso no assistente. Ciente vale até a demanda mudar de situação (status ou tipo do aviso); adiar vale por 2 horas ou até as 8h ou 14h seguintes. "Não mostrar para esta demanda" (silenciar) vale até "Mostrar de novo", mesmo que a situação mude. O limite de avisos listados de uma vez (3, 5, 8 ou 10; padrão 5) está em Configurações (`preferencias-avisos.ts`, `guara:assistente:limite-avisos:v1`); o excedente vira "E mais N". Silenciar e o limite não afetam a fila do dia nem o comando "prioridades". Dashboard, Alertas e Kanban continuam mostrando a situação real.

Comandos (etapa 1 da conversa, 20/11/2026): a frase é normalizada (`normalizar.ts`) e comparada, palavra inteira, com os gatilhos da tabela `frases.ts` (`classificar.ts`). Para ensinar um sinônimo, acrescente-o aos `gatilhos`; para um comando novo, acrescente uma intenção: ela aparece sozinha na ajuda. Os testes de `classificar.test.ts` conferem todos os gatilhos.

Prioridades (21/11/2026): o comando "prioridades" ("o que faço primeiro?") usa `priorizar.ts` (pontuação por pesos fixos, com o motivo de cada ponto e uma próxima ação sugerida) e monta a resposta em `respostaPrioridades.ts`: até 5 demandas, como inferência, mais a ação da primeira, como sugestão. Só lê as demandas; não altera nada. Os avisos de prazo e o "Ciente"/"adiar" seguem à parte.
Fila do dia (`FilaDoDia.tsx`): seção do painel, acima das notificações, com as 3 primeiras demandas de `priorizar.ts`. Cada uma abre em "Por que está aqui" (motivos com fato/inferência e pontos) e a sugestão. Só mostra; "Ciente" e "adiar" continuam só nos avisos.
Avisos agregados (passo 4): cada demanda continua com um aviso só, mas o texto junta o prazo e a parada ("vencido há 3 dias úteis; parada há 5 dia(s)…"). O tipo é o do sinal mais urgente; a situação do "Ciente" inclui todos os sinais, então um sinal novo traz o aviso de volta.

Painel em abas (item 11a, 21/11/2026): "Conversa", "Fila (N)" e "Avisos (N)" (`abas.ts`, aba lembrada em `guara:assistente:aba:v1`). A conversa ocupa a altura toda; o campo de mensagem fica sempre visível. Abas no padrão WAI-ARIA (tablist, tab, tabpanel; setas movem o foco). O botão do cabeçalho abre direto em "Avisos" quando há aviso urgente; "Ver a fila do dia" na conversa troca para "Fila".

Texto sem código interno (item 11b): o assistente nunca mostra o identificador interno (UUID) de uma demanda; mostra o código legível (DEM-FIC-nnnn) ou só o título, cortado entre palavras em 45 caracteres (`rotuloDaDemanda.ts`, `encurtarTitulo`). Demanda bloqueada recebe a sugestão pelo motivo do bloqueio (documento, autuado, setor, campo, outro). **Privacidade:** o comentário livre do analista (`detalhe` do bloqueio) nunca entra na fila nem na conversa guardada; para "outro" aparece "Ver o motivo do bloqueio", que abre a demanda.

Sino x aba Avisos: o sino do cabeçalho conta demandas inativas e leva à tela Alertas; a aba Avisos conta vencida, prazo próximo e parada, menos o que recebeu "Ciente" ou adiamento. Os números podem diferir; a decisão foi rotular (título do sino e nota na aba Avisos) em vez de unificar.

Operações (item 10, 21/11/2026): o comando "operações" ("pontos", "campo", "viagens") usa `respostaOperacoes.ts` e responde em três falas: pendências de campo (fato), operações em andamento ou próximas (fato) e sugestões (a decisão é sua). Reaproveita `pendenciasDeCampo` e `progressoDaOperacao`; um teste confere que os números batem com a "Linha do tempo de prazos" do Dashboard. Botões "Abrir Operações" e "Abrir <operação>" (`#/operacoes?abrir=<id>`). Sem operações: "Nenhuma operação cadastrada neste navegador" e botão "Nova operação".

Buscar: "buscar/procurar/achar/cadê <termo>" usa a mesma regra da tela Demandas (título, descrição, processo, SIMP, judicial); "Ver todos" abre a lista com o termo.
