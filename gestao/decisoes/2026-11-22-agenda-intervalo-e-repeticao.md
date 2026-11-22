# Decisão: intervalo de datas e repetição nos compromissos (22/11/2026)

Branch `melhoria-agenda-intervalo-repeticao` (a partir de `operacoes-campo`). Evolui `guara:compromissos:v1` (Item 14) sem backend e sem dependência nova. Os campos novos são opcionais, então os dados antigos continuam válidos.

## Modelo

| Campo | Significado |
|---|---|
| `dataFim` | último dia de um compromisso de vários dias (opcional, não menor que `data`) |
| `repeticao` | `diaria`, `semanal`, `mensal`, `anual`, `dias_uteis` ou `mensal_semana` (opcional) |
| `repetirAte` | último dia em que a série pode começar (opcional; sem ele a série não termina) |
| `concluidasEm` | datas de início das ocorrências já concluídas (a conclusão é por ocorrência) |

## Decisões

1. **Hora com intervalo ou com repetição é permitido. Intervalo de vários dias com hora e repetição ao mesmo tempo é proibido** (a duração de um evento que cruza dias e se repete não tem leitura única).
2. **Dia 31 pula os meses curtos; 29/02 só vale em ano bissexto.** Não "empurramos" para o último dia do mês, para a regra ser previsível.
3. **Semana do mês por faixas**: 1–7, 8–14, 15–21, 22–28 e 29–fim. "1ª segunda" é o ordinal do dia da semana no mês. No `.ics` vira `BYDAY=<n>MO`.
4. **Dias úteis são segunda a sexta, sem feriados.** Feriados exigiriam calendário por UF e município; fica como limitação.
5. **Editar altera a série inteira.** Não há "só esta ocorrência". Concluir e encerrar são por ocorrência (`concluirOcorrencia`, `encerrarSerieAntesDe`).
6. **Resumo**: intervalo `10/12/2026 a 12/12/2026`; um dia mantém o dia da semana.
7. **Conversa**: o mascote só pergunta o que falta (hora, até quando, repetição), no máximo 2 perguntas, com botões e texto livre, e a etapa fica no rascunho. Frase completa (tem hora, `dataFim` ou repetição) e lembretes não geram pergunta. As respostas passam pelo mesmo parser determinístico (frase sintética `"<data> <resposta>"`), sem IA.
8. **Avisos**: varre hoje até 7 dias atrás com `ocorrenciaNoDia` e dá no máximo 1 aviso por compromisso. O texto leva "Dia n de m", a repetição e a semana do mês.
9. **`.ics`**: um VEVENT por compromisso, com a série em `RRULE`. Dia inteiro usa `DTSTART/DTEND;VALUE=DATE` com o fim exclusivo (último dia + 1). Com hora usa horário flutuante de 1 hora. `UNTIL` em `AAAAMMDD` (dia inteiro) ou `AAAAMMDDT235959` (com hora). `EXDATE` para `concluidasEm`. `UID` fixo `compromisso-<id>@guara`, para reimportar atualizar em vez de duplicar. Em dias úteis o `DTSTART` anda para a primeira segunda a sexta.

## Padrões de projeto

Nenhum padrão GoF foi introduzido. A recorrência é um conjunto de funções puras (`recorrencia.ts`) por haver um só algoritmo com variações por valor, sem hierarquia de classes.

## Limitações conhecidas

- Dias úteis ignoram feriados.
- Editar altera a série inteira.
- A semana do mês aparece no cabeçalho do dia da Agenda, no resumo, no formulário e no aviso; saídas e viagens de `operacoes` não a mostram.
- "toda segunda", dito na pergunta de repetição, segue o dia da semana da data já informada.
- O `.ics` não foi importado em Google Agenda ou Outlook reais: os testes conferem o texto, não a leitura pelo aplicativo.

## Aviso de coincidência com operações (22/11/2026)

Compromissos e lembretes que caem no período (`inicio` a `fim`) de uma operação mostram um aviso **informativo, que nunca bloqueia** o salvamento.

- `coincidenciasComOperacoes`, `resumirDias` e `textoDeCoincidencia` (`agenda/regras.ts`): funções puras. Expandem as ocorrências (um dia, intervalo ou série até `repetirAte`; série sem fim, 400 dias) e cruzam com `operacoesNoDia`. Operação sem `inicio` nem `fim` não coincide.
- Formulário: aviso com `role="status"`, borda tracejada e o texto "Atenção:", recalculado ao mudar início, fim, repetição ou "repetir até".
- Agenda: o compromisso do dia escolhido, quando o dia está em operação, traz "Atenção: coincide com a operação …" (texto, não só cor; estilo `.aviso-coincidencia` em `estilos.css`).
- Conversa: o "Vou anotar" ganha a linha "Atenção: Coincide com … Pode confirmar assim mesmo."; o assistente lê as operações de `guara:operacoes:v1` na hora (`obterOperacoes`).
- Limitação: só considera o período da operação, não as saídas dos pontos. Vistorias não entram.
