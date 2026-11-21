# MASCOTE GUARÁ — PROMPT DE IMPLEMENTAÇÃO (1 PÁGINA)

**Contexto**: Dashboard de demandas ambientais em https://guara-lemon.vercel.app/ (Next.js/React, dados em `localStorage`, sem backend). KPIs atuais: Total 4, Vencidas 2, Inativas 3, Concluídas 1. Domínio: licenciamento ambiental e fiscalização. Tom profissional.

**Objetivo**: Implementar o mascote **Guará** (lobo-guará) como **copiloto de priorização** — não como decoração. Ele aparece só em momentos de decisão, fala com dados concretos e oferece ação de 1 clique.

## Princípios invioláveis
- ❌ Nunca onipresente, nunca modal bloqueante, nunca mensagem genérica.
- ✅ Sempre com ação de 1 clique, sempre dispensável/silenciável, sempre com telemetria.
- ✅ Texto claro + ícone (não depender só de cor/emoji).

## Estrutura
/components/mascot/
GuaraMascot.tsx # SVG/Lottie (idle, alert, success, error, sleeping)
GuaraBubble.tsx # Balão com mensagem + ações
GuaraProvider.tsx # Estado global + fila de alertas
GuaraScheduler.ts # Motor de regras determinísticas
GuaraPreferences.tsx # Painel de configurações
GuaraTelemetry.ts # Eventos: shown, action, dismissed, snoozed

text

## Regras do scheduler (determinísticas, sem IA)
1. **Vencido** (`dueDate < hoje`) → critical → ações: Concluir / Prorrogar / Reatribuir.
2. **Vence em ≤2 dias úteis** → medium → ações: Concluir / Prorrogar.
3. **Inativo ≥ limiar** (default 3 dias úteis, já usado no dashboard) → medium/critical → ações: Comentar / Reativar / Arquivar.
4. **Cruzamento** (vencido + inativo + reunião próxima) → critical → ações: Ver demanda / Ver pauta.
5. **Reunião em ≤2h** → medium → ações: Ver pauta / Abrir demandas.
6. **Conclusão** → low → toast auto-dismiss 5s.
7. **Erro em ação** → critical → inline: Tentar novamente / Ver detalhes.
8. **Resumo diário** (1º acesso após quiet hours) → low → painel lateral recolhível.

Reutilizar `calcBusinessDays` existente (com feriados). Fora desses momentos: mascote `idle` discreto no canto, sem balão.

## Anti-fadiga (obrigatório)
- `maxAlertsPerDay` (default 3); excedente vai para painel lateral (não proativo).
- Agregação: "2 prazos e 1 reunião hoje" em vez de 3 pop-ups.
- Quiet hours (default 18:00–08:00 + fins de semana); exceção: critical de vencimento no mesmo dia.
- Snooze: "2h", "hoje", "não mostrar para esta demanda".
- Dismissal persistente por `demandId + type` até mudança de estado.

## Microcopy (regras)
Frase única ≤140 caracteres, dado concreto, sem exclamações. Exemplos:
- `"Renovação de licença — Piscicultura Rio Claro" venceu há 1 dia útil.`
- `"Denúncia de desmate" venceu, está parada há 4 dias e tem reunião às 14h.`
- `Hoje: 2 vencidas, 3 inativas, 1 reunião às 14h.`

## Acessibilidade e design
- `aria-live="polite"` no balão; mascote ilustrativo com `aria-hidden="true"`.
- Contraste ≥4.5:1; severidade por ícone + texto + cor.
- `Esc` fecha; ações focáveis; respeitar `prefers-reduced-motion`.
- Mobile: ícone fixo no canto → bottom sheet. Desktop: balão lateral.
- SVG ≤30KB ou Lottie ≤50KB, lazy-load, não bloquear LCP. Bundle ≤+60KB gzip.

## Telemetria e métricas
Eventos: `alert_shown`, `alert_action`, `alert_dismissed`, `alert_snoozed`, `preferences_changed`.
Metas: taxa de ação pós-alerta >40%; taxa de dispensa <20%; redução de 50% em itens que passam de "vence em 3 dias" para vencidos. Botão "Isso foi útil?" (👍/👎) no balão.

## Fases
1. **MVP (1–2 sem)**: regras 1, 2, 6; badge + banner; preferências básicas; telemetria em `localStorage`; testes unitários das regras.
2. **Contextual (2–3 sem)**: regra 3; snooze/dismissal; agregação + quiet hours; estados success/error; acessibilidade completa.
3. **Cruzamento (2–3 sem)**: regra 4; integração de agenda (regra 5); painel lateral agregado; perfil analista vs. gestor; dashboard de métricas.
4. **Evolução**: canais externos (requer backend); A/B de microcopy.

## Critérios de aceite
1. Nenhum alerta fora dos momentos mapeados.
2. 100% dos alertas com ≥1 ação de 1 clique.
3. `maxAlertsPerDay` e `quietHours` respeitados (teste automatizado).
4. Dismissal persistente funciona por `demandId + type`.
5. axe-core sem violações críticas.
6. LCP não bloqueado; bundle ≤+60KB gzip.
7. Telemetria registra os 4 eventos.
8. Taxa de ação >40% em piloto de 2 semanas com 5 usuários.
9. Nenhuma mensagem genérica (revisão de microcopy).
10. Funciona em mobile e desktop.

## Restrições
- Sem backend/IA no MVP; regras determinísticas apenas.
- Não quebrar KPIs, listas e timeline existentes.
- Chrome/Edge/Firefox/Safari (últimas 2 versões) + mobile iOS/Android.
- Reutilizar lógica de dias úteis/feriados do dashboard.

## Entregáveis
Código em `/components/mascot/` com testes; `/docs/guara-microcopy.md`; painel de preferências; debug via `?debug=guara`; relatório axe-core + Lighthouse; README.

## Instrução final
Antes de codar, responda por escrito: (1) onde aparece em cada cenário, (2) qual ação oferece, (3) como evita ruído, (4) como mediremos sucesso. Se qualquer resposta for "para deixar bonito", **pare e revise o escopo**. Sucesso = mais ações em menos tempo sobre demandas críticas, com menos alertas — não mais aparições.