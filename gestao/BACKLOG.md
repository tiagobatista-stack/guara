# BACKLOG — GUARÁ

**Atualizado em:** 14/11/2026. A situação de cada entrega fica em `STATUS.md`; aqui fica só o que falta fazer, em ordem.

## Próxima sessão (em ordem)

1. **Abrir a tela `/mcp` (P10).** O MCP foi reativado no Node 26 em 14/11/2026 (`2026-11-14-mcp-reativado.md`): teste stdio 4 = 4 e chamadas reais de `resumir_demandas` e `listar_inativas` nesta sessão. Falta só o responsável abrir `/mcp` no terminal e registrar o que aparece.
2. **Conferir no navegador o que foi publicado em 14/11/2026.** Já está na URL pública (`9e03ff8`). Confira em https://guara-lemon.vercel.app, inclusive em tela de celular: dias úteis (Dashboard, Kanban, Demandas), tempo em andamento, demanda travada, triagem sem prazo (Alertas), aviso de demanda parecida, três números, tipo e natureza (seis filtros em Demandas) e a tela compartilhada. Até lá, as telas estão NÃO CONFERIDO VISUALMENTE. Os campos essenciais (item 13) também já estão publicados (`9254bf8`).
3. **Mascotes: rodar os testes na `main` e conferir no navegador.** No branch `login-google` passaram (231/231); na `main` o commit veio por cherry-pick e ainda não foi testado (`2026-11-14-mascotes-redesenho.md`). Depois, ver os três rostos no assistente e na Saúde do sistema, em tela clara, escura e de celular, e os olhos acompanhando o ponteiro.

## Mascotes (plano aprovado pelo responsável em 14/11/2026)

Etapa 1 (redesenho ilustrado e olhos que seguem o ponteiro) feita. Também feitos, por ordem da avaliação de UX: destaque no painel, reação a avisos e rosto nas falas (`2026-11-14-mascotes-presenca-no-assistente.md`, 231/231; falta conferir no navegador). Da avaliação, ficam para depois: tirar o seletor do topo, presença fora do painel (celular) e sugestões de comando na área vazia da conversa. Faltam, em ordem, uma por vez:

2. **Expressões e animações:** piscar; tédio (cerca de 1 min parado), sono (3 min) e dormir (6 min), com jeito próprio por espécie; acordar ao mexer; comemoração ao concluir etapa e ao zerar pendências; reação ao clique ou toque. Sem texto, som ou cobrança. Alertas acordam o mascote. Com "reduzir movimento", só fecha os olhos.
3. **Nome e escolha salvos:** campo de nome por mascote (até cerca de 20 caracteres; vazio mostra a espécie), seletor com prévia visual, tudo no `localStorage`; o leitor de tela anuncia nome e espécie.
4. **Sinalizar o estado do trabalho:** expressão que resume as demandas do dia, olhar que aponta para o que pede atenção, avisos como fala curta com origem e data.
5. **Natureza da resposta no assistente:** pose para fato, inferência e sugestão, e outra para NÃO TESTADO; reforça o selo de texto, não substitui.
6. **Estados vazios:** mascote com frase onde hoje há tela em branco.

Fora do plano, por decisão: pontuação, ranking, medir tempo parado, opinar sobre o mérito do processo e interromper com pop-up ou som.

## Pendências da apostila

- **Hook em Node.js (P11).** O hook está em Python (`.claude/hooks/verificar_comando.py`, 8/8 testes). A decisão de alinhamento previa portar para Node quando houvesse Node. Porte, mantendo os mesmos casos de teste e a sentinela `GUARA_HOOK_TEST_BLOCK`/`GUARA_OK`, e repita o teste em sessão real.
- **Orquestração A–F com os subagentes registrados (P09): PARCIAL.** B e C já foram feitos de verdade (ver o ponto de retomada do STATUS). Faltam A, D (paralelo real), E e F com os registrados. Depois disso, atualize a linha "Orquestração" do STATUS, que ainda diz NÃO DEMONSTRADO.

## Ideias vindas do TOCA (`F:\claude\toca`; lógica reescrita, sem copiar código, GPL-3)

- **Origem judicial ou do MP:** campo `origem` com prioridade e destaque, como em `judicial_modulo.py`. Muda o modelo da apostila: confirme com o responsável e faça migração do formato `versao: 1`, com backup antes.
- **Migrações versionadas:** lista de passos, como em `migracoes.py`. Necessária na primeira mudança de modelo que não for só um campo opcional novo (o bloqueio da demanda travada não precisou).
- **Prazo escrito em português:** "prazo 10 dias úteis", "sexta que vem", "22/12 a 29/12", como em `prazo.py:extrair`. No formulário, a data entra só como sugestão e a pessoa confirma.
- **Extrair os três números do texto colado:** preencher processo, SIMP e CNJ a partir da descrição, como em `identificadores.py:extrair`; a pessoa confere antes de gravar.
- **Tela compartilhada no Kanban:** o cartão mostra o responsável; um modo como o da tela Demandas, com o mesmo resumo por lista branca.
- **Feriados locais no JSON portável:** exportar e importar `guara:feriados:v1` junto com a configuração (campo opcional, sem mudar `versao: 1`), incluindo o backup da importação.
- **Depois do MVP:** importar agenda `.ics` (`agenda_local.py`), histórico que guarda só o nome dos campos alterados, e uma verificação de termos proibidos (`verificar_generico.py`) no gate.
