# Mapeamento: guarasheduller × código atual

Compara o prompt [guarasheduller.md](guarasheduller.md) com o que o GUARÁ já tem (21/11/2026). Objetivo: dar ao mascote uma **lógica de apoio à decisão do analista**, sem refazer o que existe.

## 1. Divergências de premissa

| O prompt diz | O código real | Efeito |
|---|---|---|
| Next.js, `/components/mascot/` | React + Vite, `aplicacao/src/` | Os arquivos propostos viram módulos existentes (seção 3). |
| Mascote novo (lobo-guará) | Três espécies (ariranha, lobo-guará, capivara); o analista escolhe o principal e dá nomes | Não criar `GuaraMascot`. A lógica serve ao mascote escolhido. |
| KPIs: 4 total, 2 vencidas, 3 inativas | Dados reais vêm do `localStorage` de cada navegador | Os números do prompt não valem como referência de teste. |
| Vence em ≤ 2 dias úteis | `DIAS_PRAZO_PROXIMO = 3` (`assistente/avisos.ts`) | Decidir qual vale (pendência P1). |
| Inativo = 3 dias **úteis** | Inativa = mais de N dias **corridos**, N configurável (padrão 3) (`alertas/inatividade.ts`) | Decidir se muda (pendência P2). |
| Lottie, telemetria, A/B | Sem backend; SVG próprio; decisão D10 proíbe serviços extras | Telemetria só local e opcional. |
| Reunião (regras 4 e 5) | Não há reunião. Há **vistoria** da demanda e **saída** de ponto de operação (`agenda/regras.ts`) | Trocar "reunião" por vistoria/saída (pendência P3). |
| Ações: Concluir, Prorrogar, Reatribuir, Reativar, Arquivar | Assistente só lê; "Ciente" e "adiar" só escondem o aviso | Ações de 1 clique alteram demandas (pendência P4). |

## 2. Regra por regra

| # | Regra do prompt | Situação | Onde está |
|---|---|---|---|
| 1 | Vencido | **Existe** | `avisosDoDia` → `situacaoDaDemanda` (dias úteis com feriados nacionais e locais) |
| 2 | Vence em ≤ 2 dias úteis | **Existe, com 3 dias** | `DIAS_PRAZO_PROXIMO` |
| 3 | Inativo ≥ limiar | **Existe, em dias corridos** | `estaInativa`, `diasParado` |
| 4 | Cruzamento (vencido + inativo + reunião) | **Não existe.** Hoje cada demanda gera **um** aviso, o mais urgente | `avisos.ts` descarta os sinais menos urgentes |
| 5 | Reunião em ≤ 2h | **Não existe.** A agenda é por dia, sem hora | `agenda/regras.ts` |
| 6 | Conclusão (toast) | **Não existe** | — |
| 7 | Erro em ação | **Não se aplica** (o assistente não executa ações) | — |
| 8 | Resumo diário | **Existe em parte**: `resumoDosAvisos` e o humor do mascote; falta o "primeiro acesso do dia" | `avisos.ts`, `PainelAssistente.tsx` |

## 3. Anti-fadiga: o que já cobre

| Requisito | Situação |
|---|---|
| Nunca modal, sempre dispensável | **Existe.** Gaveta recolhível; avisos sem bloqueio. |
| `maxAlertsPerDay` | **Parcial.** Limite de 5 avisos **na tela** (`MAXIMO_DE_AVISOS`), não por dia; o excedente vira "E mais N". |
| Agregação | **Parcial.** Só o resumo textual ("1 vencida, 2 paradas"). |
| Quiet hours | **Não existe.** |
| Snooze | **Existe**, mas só "até as 8h ou 14h seguintes, em dia útil" (`opcoesDeAdiamento`). Faltam "2 h" e "não mostrar para esta demanda". |
| Dismissal por demanda e tipo até mudar o estado | **Existe.** "Ciente" vale até mudar o tipo do aviso ou o status (`situacao = tipo|status`). |
| Mascote `idle` quando não há aviso | **Existe** (humor tranquilo; dorme sem atividade). |
| `prefers-reduced-motion` | **Existe** no `Mascote.tsx`. |
| `aria-live`, ícone + texto | **Existe** na conversa; os avisos têm texto e selo. |
| Microcopy ≤ 140 caracteres, dado concreto | **Parcial.** O texto do aviso é `título: prazo.texto`; o título pode estourar. |

## 4. O que falta para ser "inteligência de apoio ao analista"

Hoje o assistente **informa** (o que está vencido). O prompt pede que ele **priorize** e **sugira o próximo passo**. A lacuna é essa; o resto é acabamento.

Dados que já existem e o assistente ainda não usa:

- `prioridade` da demanda (Alta, Média, Baixa).
- `bloqueio` com motivo e "desde quando". Um bloqueio externo muda a ação certa: cobrar o setor ou o autuado, não "retomar".
- `camposQueFaltam` (campos essenciais) e `anotacoes`.
- `tipo` campo/gabinete e `vistoria` (agendada, aberta, não informada), além de pontos de operação ligados (`vinculosDasDemandas`).
- Prazo de elaboração do relatório nas Operações (`prazoDaElaboracao`, `pontoVencido`).
- `historico` da demanda e `parecida.ts` (demanda parecida).
- Demandas sem prazo (`listarSemPrazo`, `sugerirPrazo`).

## 5. Proposta de desenho (sem implementar)

Um módulo puro novo, **`aplicacao/src/modulos/assistente/priorizar.ts`**, ao lado de `avisos.ts`. Sem IA, sem armazenamento próprio, testável como `avisos.test`.

1. **Sinais por demanda** (fatos): vencida (dias úteis de atraso), prazo próximo, parada (dias), bloqueada (motivo e dias), sem prazo, campo essencial faltando, vistoria próxima, ponto de operação ligado.
2. **Pontuação explicável:** soma de pesos fixos e visíveis (por exemplo, vencida + alta prioridade + parada > só parada). Cada ponto da pontuação carrega o **motivo em texto**, para o analista conferir e discordar.
3. **Próxima ação sugerida** por tabela de decisão, que fica na seção 3 de [arvore-de-decisao.md](arvore-de-decisao.md) como extensão:
   - vencida e bloqueada → "cobrar: {motivo do bloqueio}"
   - vencida sem bloqueio → "decidir: prorrogar prazo ou concluir"
   - parada e em andamento → "registrar a última ação ou travar com motivo"
   - sem prazo → "definir prazo (sugestão: 10 dias úteis)"
   - faltam campos essenciais → "preencher {campos}"
4. **Fila do dia:** as N primeiras por pontuação, com "por que está aqui". Substitui a lista cronológica de avisos, mas **mantém "Ciente" e "adiar"**.
5. **Rotulagem:** cada resposta sai como fato, inferência ou sugestão, com fonte e método determinístico, como o `sobre-demanda.ts` já faz. A decisão fica com o analista.
6. **Ações de 1 clique:** só **navegar** ou **abrir a demanda** na primeira fase. Alterar prazo, status ou responsável exige autorização do analista a cada clique e entra depois.
7. **Comando novo** no `frases.ts` ("o que faço primeiro?", "prioridades"): aparece sozinho na ajuda.

## 6. Pendências de decisão (do responsável)

| # | Pergunta | Recomendação |
|---|---|---|
| P1 | Prazo próximo: 2 ou 3 dias úteis? | Manter 3 até medir. |
| P2 | Inatividade em dias úteis ou corridos? | Manter corridos; já está no backup e na tela Alertas. |
| P3 | "Reunião" vira vistoria e saída de ponto? | Sim, sem hora no começo (aviso no dia). |
| P4 | O mascote pode **alterar** a demanda (prorrogar, concluir) com 1 clique? | Não na 1ª fase; só abrir a demanda. |
| P5 | Quiet hours e limite diário entram? | Só o limite por dia, como opção em Configurações; quiet hours depois. |
| P6 | Telemetria (`alert_shown` etc.) entra? | Só local, desligada por padrão, e fora do backup. |

## 7. Ordem sugerida

1. `priorizar.ts` com sinais, pontuação e motivos, mais testes (nenhuma tela muda).
2. Comando "prioridades" no assistente, usando o módulo.
3. Fila do dia no painel, com "por que está aqui".
4. Agregação do aviso (um por demanda com todos os sinais), em lugar de só o mais urgente.
5. Snooze de 2 h e "não mostrar para esta demanda"; limite por dia.
6. Evidência em `metodologia/evidencias/` e atualização de `gestao/STATUS.md`.
