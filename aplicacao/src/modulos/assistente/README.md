# Assistente

Painel de conversa com o mascote principal. MVP: comandos determinísticos, sem modelo de IA pago. Respostas distinguem fato extraído, inferência e sugestão.

A conversa fica guardada neste navegador em `guara:conversa:v1` (`conversa.ts`, até 60 falas), para não recomeçar a cada abertura da gaveta. Guarda o que a pessoa digitou: por isso, nada de dado real nos testes e nos exemplos. Os atalhos abaixo do campo enviam os comandos "prazos" e "ajuda" com rótulos em linguagem comum.

Notificações: "Ciente" e "adiar" (`lembretes.ts`, `guara:avisos:v1`) só escondem o aviso no assistente. Ciente vale até a demanda mudar de situação (status ou tipo do aviso); adiar vale até as 8h ou 14h seguintes. Dashboard, Alertas e Kanban continuam mostrando a situação real.

Lembretes pessoais ("me lembre de… daqui 20 min", "lembretes", "cancelar lembrete N") ficam em `../lembretes/` (ver o README de lá). A conversa só encaminha o pedido; o aviso com destaque é montado em `Aplicacao`. Respostas prontas viram botões pelo campo opcional `opcoes` da fala.
