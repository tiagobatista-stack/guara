# Alertas locais

Alertas de inatividade avaliados **no navegador** quando o app está aberto. Não há e-mail, scheduler nem execução com o navegador fechado.

- `inatividade.ts`: regra pura. A demanda é inativa quando não está concluída e a última ação relevante tem mais de N dias corridos (padrão 3).
- A mesma regra será usada pelo MCP local (P10).
- `dias-uteis.ts`: regra pura de prazo em dias úteis com feriados nacionais (Páscoa calculada, sem rede) e ajuste local por `extras` e `remover`. Só muda o texto exibido ("faltam 4 dias úteis"); a regra de vencida continua em dias corridos.
- O limiar configurável, o painel de alertas e o sino chegam na fase 5.
