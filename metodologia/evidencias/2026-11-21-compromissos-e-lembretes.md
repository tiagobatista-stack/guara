# Item 14: compromissos e lembretes próprios (21/11/2026)

Branch `operacoes-campo`. Não commitado, sem push nem PR. Substitui o item 8 do BACKLOG ("Lembretes próprios").

## O que foi feito

- Armazém `guara:compromissos:v1` (`agenda/compromissos.ts`): tipos reunião, palestra, curso, compromisso e lembrete; data AAAA-MM-DD; hora opcional; assunto; demanda opcional `DEM-FIC-…`; `concluido` opcional. Validação ao ler (descarta lixo e id repetido) e fallback em memória quando o navegador não grava. Rascunho da confirmação em `guara:compromissos:rascunho:v1`.
- Interpretação da frase por regras, sem IA (`assistente/interpretarCompromisso.ts`): tipo por palavra, data (dd/mm, dd/mm/aaaa, "dia 10", hoje, amanhã, dia da semana; sem ano = próxima ocorrência), hora opcional, assunto depois de sobre/de/para, vínculo com a demanda. Data inválida, passada ou ausente vira pergunta.
- Confirmação antes de gravar (`assistente/compromissoPelaConversa.ts`): "Vou anotar: …", natureza inferência, fonte "interpretação da frase por regras; confira", botões Confirmar, Corrigir (abre o formulário preenchido) e Cancelar.
- Precedência: "lembrar DEM-FIC-… + quando" com aviso ativo continua sendo a soneca (item 3). Sem aviso ativo, cria lembrete próprio (corrige a limitação registrada no item 3).
- Agenda: compromissos na lista do dia e no chip do calendário, formulário para criar, editar e excluir (confirmação, um por vez), Concluir/Reabrir, e no arquivo `.ics`.
- Aviso em destaque, cor própria (`--lembrete-*`, claro e escuro): às 8h do dia e na hora marcada, com Ciente, Concluído e "Em 2 horas". Entra na contagem da aba Avisos e no rosto atento. Tolerância de 7 dias para o que passou sem tratamento.
- Comandos "agenda", "compromissos" e "o que tenho hoje|amanhã|semana".

## Verificação automática

| Verificação | Resultado |
|---|---|
| `npm test` completo (PowerShell, em `aplicacao/`) | PASSOU: 78 arquivos, 1034 testes (linha de base anterior: 920) |
| `npx tsc --noEmit` | PASSOU (depois de corrigir um tipo em `compromissoPelaConversa.test.ts`) |
| `npm run build` | PASSOU (só o aviso normal de tamanho de chunk) |

Testes novos: `interpretarCompromisso.test.ts` (57), `compromissos.test.ts` (armazém, validação, agenda, `.ics`, avisos), `compromissoPelaConversa.test.ts` (20), `compromissosTela.test.tsx` (11: Agenda, formulário, exclusão com `window.confirm` simulado, "Corrigir", conversa até a gravação, aviso às 8h e na hora com `vi.useFakeTimers`).

## Defeito do botão Confirmar (achado no navegador pelo responsável) e correção

- **Sintoma relatado:** pedir "reunião dia 10/12 sobre licenciamento" e clicar em Confirmar não gravava; a Agenda de 10/12/2026 seguia vazia. Causa: o botão reenviava o comando como TEXTO ("confirmar compromisso") ao classificador, e o texto podia cair em outro comando (a normalização reduz letras repetidas: "compromisso" vira "compromiso"). Ação que grava dependia da interpretação de uma frase.
- **Correção:** `AcaoDaFala` ganhou `acao` (ação direta: `confirmar-compromisso` com os dados, ou `cancelar-compromisso`). O painel executa direto (`executarAcao`), sem classificador, e registra o rótulo como fala da pessoa. A ação guardada na conversa é validada ao reler (`validarAcaoDireta`: tipo conhecido e dados que passam em `problemaDoCompromisso`); data 31/02 ou tipo desconhecido são descartados. O caminho digitado ("confirmar compromisso", "sim", "não") continua e usa as mesmas funções. Botões que só navegam (rota, aba) ou só enviam comando de consulta continuam como estavam.
- **Revisão dos botões dos itens 3, 4, 7, 9, 10 e 14:** nenhum outro grava ou descarta pelo classificador. As opções de horário do "lembrar" (`lembrar ID <opção>`) gravam via texto; mantidas e agora cobertas por teste de clique real (`PainelAssistente.test.tsx`).
- **Testes de tela com clique real** (`compromissosTela.test.tsx`, 13): Confirmar grava em `guara:compromissos:v1` e a Agenda de 10/12/2026 mostra o compromisso; Cancelar não grava e limpa o rascunho; Corrigir abre o formulário preenchido (2026-12-10, 09:00, licenciamento).
- **RESSALVA HONESTA:** não consegui reproduzir o sintoma original no jsdom com o código antigo; a frase caía no comando certo. A prova de que o teste detecta o defeito foi por **mutação**: com a palavra-gatilho trocada para simular o sintoma e o `onClick` antigo (reenvio de texto), 3 testes falham (Confirmar grava; Confirmar não depende do texto; Cancelar não grava). Com a correção e o mesmo sintoma simulado, 13/13 passam. Os arquivos foram restaurados depois. Confirmar no navegador real: NÃO TESTADO.

## Backup com compromissos

- `guara-dados.json` ganhou o campo opcional `compromissos` (`versao: 1` mantida). Exportar leva a agenda; importar valida a lista inteira (máximo 2000, sem id repetido, cada item pela mesma regra do armazém) e recusa o arquivo todo se algo estiver inválido.
- Importar com o campo substitui a agenda e guarda a anterior em `guara:compromissos:backup-antes-importacao:v1`; "Desfazer última importação" restaura as demandas e a agenda ("Agenda anterior restaurada."). Importar sem o campo não mexe na agenda e descarta backup de agenda mais velho (para o desfazer não trazer uma agenda que não é a anterior).
- Testes (`backupCompromissos.test.tsx`, 7): exportação leva os compromissos; arquivo antigo válido; compromisso inválido, id repetido e tipo errado recusados; ida e volta pela tela (exporta num navegador, importa em outro com agenda diferente, desfazer restaura a anterior); arquivo antigo preserva a agenda; lista vazia limpa e o desfazer traz de volta; a chave do armazém é a documentada.
- Limitação: o rascunho de confirmação (`guara:compromissos:rascunho:v1`) não vai no backup (é transitório).

## Não testado

| Item | Situação |
|---|---|
| Formulário e aviso em 375 px e desktop, tema claro e escuro (`/revisar-interface`) | NÃO TESTADO (sem navegador neste ambiente) |
| Contraste real das cores `--lembrete-*` | NÃO TESTADO (escolhidas por tokens, não medidas) |
| Roteiro manual com cliques físicos | NÃO TESTADO |
| Aviso com a página aberta por horas (tique de 30 s em tempo real) | NÃO TESTADO; coberto só com relógio simulado |

## Limitações e decisões

- 10/12/2026 é **quinta-feira**; o exemplo da especificação dizia "quarta". O texto mostra o dia calculado.
- "Ciente" vale até o próximo horário de aviso (sem hora: pelo dia). "Em 2 horas" esconde até a hora marcada.
- Audiência vira o tipo "compromisso". "agenda" sem período mostra os próximos 7 dias (máximo de 14 linhas).
- Código de demanda inexistente: avisa e grava sem vínculo.
- Backup: ver a seção "Backup com compromissos". Ao importar um arquivo SEM o campo `compromissos` (exportado antes desta mudança), a agenda atual fica intacta.
- O formulário não pede aviso antecipado (só 8h e a hora marcada) nem repetição.

## Evolução: intervalo, repetição, semana do mês e `.ics` com séries (22/11/2026)

Branch `melhoria-agenda-intervalo-repeticao`, 9 etapas, um commit por etapa (`08f3501`, `e1ab742`, `2dcc02d`, `bbe3231`, `1c466c9`, `807d15a`, `a77ba40`, `bc09e9a` e o da etapa 9). Decisões em `gestao/decisoes/2026-11-22-agenda-intervalo-e-repeticao.md`. Esta seção substitui a última linha de "Limitações" acima (o formulário agora pede intervalo e repetição).

| Verificação (PowerShell) | Resultado |
|---|---|
| `npx tsc --noEmit` | PASSOU (saída 0) |
| `npm test` | PASSOU: 80 arquivos, 1159 testes |
| `npm run build` | PASSOU (só o aviso de chunk grande) |
| Agenda + assistente, 3 repetições seguidas | PASSOU: 22 arquivos, 479 testes nas 3 vezes; sem falha intermitente |
| `.ics` (13 testes novos) | PASSOU: strings exatas de `RRULE`, `DTEND` exclusivo, `UNTIL`, `EXDATE`, UID por id e dobra em 75 caracteres |

Observação: o `vitest` pelo Bash falhou em massa neste ambiente; pelo PowerShell passa. Os números acima são do PowerShell.

### Não testado

- Importar o `.ics` no Google Agenda ou Outlook reais: NÃO TESTADO (só o texto do arquivo foi conferido).
- Formulário e conversa em 375 px e desktop, tema claro e escuro: NÃO TESTADO (sem navegador).
- Roteiro manual com cliques físicos: NÃO TESTADO.
- Push e publicação: não feitos (exigem autorização).

### Aviso de coincidência com operações (22/11/2026)

`npx tsc --noEmit` PASSOU; `npm test` PASSOU (80 arquivos, 1169 testes); `npm run build` PASSOU; Agenda + assistente repetidos 3 vezes: 22 arquivos, 489 testes, sem falha intermitente. Testes novos (10): função pura (1 dia, intervalo, série, fora do período, só um lado, texto), formulário (aviso muda com as datas e a repetição; salva mesmo assim), Agenda (aviso no dia em operação e ausente fora) e conversa (aviso no "Vou anotar"; Confirmar grava). Visual em 375 px e claro/escuro: NÃO TESTADO (sem navegador).
