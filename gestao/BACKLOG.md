# BACKLOG — GUARÁ

**Atualizado em:** 14/11/2026. A situação de cada entrega fica em `STATUS.md`; aqui fica só o que falta fazer, em ordem.

## Próxima sessão (em ordem)

1. **Abrir a tela `/mcp` (P10).** O MCP foi reativado no Node 26 em 14/11/2026 (`2026-11-14-mcp-reativado.md`): teste stdio 4 = 4 e chamadas reais de `resumir_demandas` e `listar_inativas` nesta sessão. Falta só o responsável abrir `/mcp` no terminal e registrar o que aparece.
2. **Conferir no navegador o que foi publicado em 14/11/2026.** Já está na URL pública (`9e03ff8`). Confira em https://guara-lemon.vercel.app, inclusive em tela de celular: dias úteis (Dashboard, Kanban, Demandas), tempo em andamento, demanda travada, triagem sem prazo (Alertas), aviso de demanda parecida, três números, tipo e natureza (seis filtros em Demandas) e a tela compartilhada. Até lá, as telas estão NÃO CONFERIDO VISUALMENTE. Os campos essenciais (item 13) também já estão publicados (`9254bf8`).
3. **Mascotes: conferir no navegador.** Testes e build passaram (261/261), mas nenhuma tela foi conferida. Ver, em tema claro, escuro e de celular: os três rostos no assistente e na Saúde do sistema, os olhos seguindo o ponteiro, piscada, pulinho ao clicar, tédio e sono com a página parada, festa ao concluir demanda no Kanban, a tela Configurações (nome com espaço, troca do principal) e os estados vazios (Kanban vazio, filtros sem resultado, módulo não implementado).

## Mascotes (plano aprovado pelo responsável em 14/11/2026)

**Feito** (evidências em `metodologia/evidencias/2026-11-14-mascotes-*.md`; último total 261/261, build ok):

- Etapa 1: rosto ilustrado por espécie e olhos que seguem o ponteiro.
- Etapa 2: piscar, reação ao toque, tédio, sono, dormir, acordar e comemoração no Kanban.
- Etapa 3: mascote principal e nome de cada um, na tela Configurações.
- Da avaliação de UX: destaque no painel (88 px), reação aos avisos, rosto nas falas e seletor fora do painel.
- Etapa 4: avisos reais no painel com origem e data, humor que os resume, olhar para o aviso mais urgente e "prazos" com os dados deste navegador (291/291; falta conferir no navegador).
- Etapa 5: pose pela natureza da resposta (fato tranquilo, inferência pensativo, sugestão curioso, NÃO TESTADO cauteloso na Saúde do sistema; 293/293, falta conferir no navegador).
- Presença no celular e no tablet: rosto vivo do principal no botão que abre o assistente, atento com aviso (295/295; falta conferir em celular real).
- Atalhos "prazos" e "ajuda" na conversa (297/297; falta conferir no navegador).
- Etapa 6: estados vazios com o rosto do principal em Demandas, Kanban, Dashboard, Alertas e módulos não implementados (265/265; falta conferir no navegador).
- Preferências do mascote no backup: campo opcional `mascote` em `guara-dados.json` (306/306). O desfazer da importação não restaura a preferência.
- Da avaliação de UX do chat (14/11/2026): conversa guardada no navegador (`guara:conversa:v1`), gaveta com foco, Esc, toque no fundo e Tab preso; atalhos "Ver prazos" e "O que você faz?"; campo com teclado de enviar (304/304; falta conferir no navegador e com leitor de tela).

**A fazer, em ordem** (uma por vez, com `npm test` e `npm run build` em cada uma):

1. **Aviso de armazenamento bloqueado nas Configurações.** Hoje a preferência deixa de persistir sem aviso na tela.
2. **Teste da navegação até Configurações** pelo menu lateral e pelo "Mais" do celular.
3. **Saúde do sistema com nome próprio.** O mascote de lá é escolhido pelo estado (capivara ou lobo-guará) e não usa o nome dado pelo analista.
4. **Ajuste de ritmo**, depois da conferência no navegador: intervalo da piscada, tempos de tédio e sono, altura dos pulos.
5. **Confirmar a ocorrência das espécies nos biomas** antes de tratar a arte como definitiva (seção 7.1 do planejamento).

**Da avaliação de UX do chat (14/11/2026), ainda não feitos, em ordem:**

6. **Campo de texto que promete menos.** Quase todo texto livre falha ("não entendo linguagem livre"). Aceitar sinônimos simples ("prazo", "vencidas", "o que você faz") e dar mais peso aos atalhos.
7. **Resposta de "prazos" com valor próprio.** Hoje repete em IDs os avisos já listados acima; dizer o que vence primeiro e em quantos dias úteis.
8. **Origem uma vez só nas notificações.** As cinco linhas "fato · fonte: demandas deste navegador · data" repetidas; levar para o cabeçalho da seção.
9. **Notificação que abre a demanda.** Tocar no aviso navega para a demanda citada.
10. **Espaço da conversa no desktop.** Com cinco avisos, a conversa vira uma faixa estreita; recolher as notificações depois de lidas ou limitar a três.
11. **Menos rostos.** Tirar o rosto pequeno das notificações (a seção já é do mascote); manter nas falas.
12. **Botão para apagar a conversa** (a função `limparConversa` já existe), conversa no backup exportado e preferência do mascote restaurada pelo "Desfazer última importação".

**Fora do plano, por decisão:** pontuação, ranking, medir ou registrar tempo parado, opinar sobre o mérito do processo, interromper com pop-up ou som. Da avaliação inicial, não foram escolhidos: guia de primeiros passos, erros com tom humano, lembrete de decisão humana e convite à pausa.

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
- **Coordenadas da demanda:** campo opcional `coordenada` (sem mudar `versao: 1`), como em `coordenadas.py`. (1) Leitura dos formatos do TOCA: graus decimais, GMS, graus e minutos decimais, os formatos do ArcGIS, «º ´ ´´» e «O» para oeste, gravada em graus decimais. (2) Conferência sem serviço externo, por exemplo se o ponto cai dentro do Brasil. (3) Link para abrir no mapa: envia a coordenada a um serviço externo, então só com decisão do responsável. Pode identificar o imóvel e a pessoa: fica fora da tela compartilhada (lista branca do resumo), e exemplos e testes usam coordenadas fictícias que não coincidam com registros reais (seção 20.9). Geoportal, mapas e roteiro de viagem ficam de fora (dependem de serviços externos).
- **Depois do MVP:** importar agenda `.ics` (`agenda_local.py`), histórico das edições dos outros campos guardando só o nome do campo alterado (status e bloqueio já têm histórico desde 14/11/2026), e uma verificação de termos proibidos (`verificar_generico.py`) no gate.
