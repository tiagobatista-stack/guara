# BACKLOG — GUARÁ

**Atualizado em:** 14/11/2026. A situação de cada entrega fica em `STATUS.md`; aqui fica só o que falta fazer, em ordem.

## Próxima sessão (em ordem)

0. **Banco de dados no Supabase (definido pelo responsável em 14/11/2026, depois da coordenada).** Em branch separada (D10), sem tirar o modo local. Antes de criar conta ou projeto, aceitar termos ou configurar qualquer coisa: pedir autorização, com o serviço, a etapa e o link oficial. A `service_role` nunca vai para o navegador, o repositório ou os logs. Primeiro passo sem custo: desenhar as tabelas e a RLS a partir do modelo do `PLANO.md` e da seção 9 do planejamento, em migrações SQL versionadas no repositório.
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
- Aviso nas Configurações quando o navegador não deixa gravar as preferências (319/319).
- Teste da navegação até Configurações pelo menu lateral e pelo "Mais" (321/321).
- Saúde do sistema com o nome dado ao mascote (322/322).
- Etapa 6: estados vazios com o rosto do principal em Demandas, Kanban, Dashboard, Alertas e módulos não implementados (265/265; falta conferir no navegador).
- Preferências do mascote no backup: campo opcional `mascote` em `guara-dados.json` (306/306). O desfazer da importação não restaura a preferência.
- Notificações com "Ciente" (até a demanda mudar de situação), adiar para 8h ou 14h do próximo dia útil (pula fim de semana e feriado), lista dos ocultos e seção recolhível (318/318; falta conferir no celular).
- Da avaliação de UX do chat (14/11/2026): conversa guardada no navegador (`guara:conversa:v1`), gaveta com foco, Esc, toque no fundo e Tab preso; atalhos "Ver prazos" e "O que você faz?"; campo com teclado de enviar (304/304; falta conferir no navegador e com leitor de tela).

**A fazer, em ordem** (uma por vez, com `npm test` e `npm run build` em cada uma):

1. **Ajuste de ritmo**, depois da conferência no navegador: intervalo da piscada, tempos de tédio e sono, altura dos pulos.
2. **Confirmar a ocorrência das espécies nos biomas** antes de tratar a arte como definitiva (seção 7.1 do planejamento).

**Da avaliação de UX do chat (14/11/2026), ainda não feitos, em ordem:**

3. **Campo de texto que promete menos.** Quase todo texto livre falha ("não entendo linguagem livre"). Aceitar sinônimos simples ("prazo", "vencidas", "o que você faz") e dar mais peso aos atalhos.
4. **Resposta de "prazos" com valor próprio.** Hoje repete em IDs os avisos já listados acima; dizer o que vence primeiro e em quantos dias úteis.
5. **Origem uma vez só nas notificações.** As cinco linhas "fato · fonte: demandas deste navegador · data" repetidas; levar para o cabeçalho da seção.
6. **Notificação que abre a demanda.** Tocar no aviso navega para a demanda citada.
7. **Espaço da conversa no desktop.** Com cinco avisos, a conversa vira uma faixa estreita; recolher as notificações depois de lidas ou limitar a três.
8. **Menos rostos.** Tirar o rosto pequeno das notificações (a seção já é do mascote); manter nas falas.
9. **Lembretes: pendências.** `guara:avisos:v1` no backup exportado. Ideias não escolhidas da conversa de 14/11: ciente e adiar de todos de uma vez, horário de silêncio e preferência por tipo nas Configurações, histórico do ciente no detalhe da demanda.
10. **Botão para apagar a conversa** (a função `limparConversa` já existe), conversa no backup exportado e preferência do mascote restaurada pelo "Desfazer última importação".

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
- **Coordenada: o que ficou de fora (14/11/2026).** Link para abrir no mapa (envia a coordenada a um serviço externo: decisão do responsável), UTM (pediria biblioteca de projeção) e extrair a coordenada de um texto colado.
- **Depois do MVP:** importar agenda `.ics` (`agenda_local.py`), histórico das edições dos outros campos guardando só o nome do campo alterado (status e bloqueio já têm histórico desde 14/11/2026), e uma verificação de termos proibidos (`verificar_generico.py`) no gate.
- **Vistoria: o que vem depois (15/11/2026).** Calendário (módulo `agenda`, hoje placeholder) mostrando as vistorias por dia e as demandas de campo ainda não encaixadas; depois, mapa das demandas espacializadas (usa `coordenada`) classificando atendidas e em aberto. A situação "atendida" será derivada (vistoria com data passada e demanda concluída), sem campo novo, salvo decisão em contrário.
- **Operações: o que ficou de fora (15/11/2026).** Ler `.xlsx` direto (feito em 18/11/2026, sem biblioteca; falta só `.xls`/`.ods`); raio de "mesmo local" ajustável na tela (hoje fixo em 200 m); operações no backup JSON; ponto que "vira processo" com número de processo/notificação já preenchidos; aviso de conflito de equipe (descartado por ora: a mesma equipe percorre vários municípios na mesma viagem, como na planilha de exemplo); cadastro de equipes e veículos; rota entre pontos; mapa.
- **Vínculo e exportação: o que ficou de fora (15/11/2026).** Testar o CSV e o GeoJSON no QGIS real (`NÃO TESTADO`); exportar só os pontos filtrados na tela; Shapefile/GeoPackage; calendário mostrando a demanda na janela da operação até haver data específica; ligar o ponto vistoriado à data da vistoria da demanda de forma assistida (hoje só o aviso).