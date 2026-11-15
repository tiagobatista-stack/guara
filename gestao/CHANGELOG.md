# CHANGELOG

## [Não lançado]

### Adicionado

- Prazo em dias úteis com feriados nacionais (Páscoa calculada, sem rede) em `alertas/dias-uteis.ts`, com a lógica reescrita a partir do TOCA. O Dashboard, o Kanban e Demandas mostram "faltam N dias úteis" ou "vencido há N dias úteis". A regra de vencida não mudou. 135/135 testes.
- Tempo em andamento, ideia vinda do TOCA: demandas "Em Andamento" mostram "em andamento · última ação há N dias" no Kanban e em Demandas, contados da última ação relevante. O modelo não mudou. 139/139 testes.
- Demanda travada, ideia vinda do TOCA: campo opcional `bloqueio` (motivo por categoria e data), botões no detalhe, linha no Kanban e na lista, filtro "Bloqueio" e reavaliação ("Ainda travada" ou "Destravou") no alerta de inatividade. Formato `versao: 1` mantido; dados antigos continuam válidos. 155/155 testes.
- Triagem de demanda sem prazo, ideia vinda do TOCA: a tela Alertas lista as demandas abertas sem prazo e sugere 10 dias úteis a partir de hoje; a pessoa confere ou troca a data e grava com um clique. O Dashboard avisa quantas estão sem prazo. O modelo não mudou. 164/164 testes.
- Aviso de demanda parecida, ideia vinda do TOCA: no cadastro, uma demanda em aberto com o mesmo processo, o mesmo título ou com todas as palavras do título digitado faz perguntar antes de gravar ("Criar mesmo assim", "Ver a existente", "Continuar editando"). O modelo não mudou. 174/174 testes.
- Três números por demanda, ideia vinda do TOCA: campos opcionais de processo administrativo, SIMP e processo judicial (CNJ, com dígitos verificadores conferidos), normalizados ao gravar, na lista, no detalhe, na pesquisa e no aviso de demanda parecida. Os exemplos levam o número `FIC-` no campo próprio. Formato `versao: 1` mantido. 185/185 testes.
- Tipo (campo × gabinete) e natureza (demanda × tarefa comum), ideia vinda do TOCA: deduzidos do título no cadastro com o porquê à vista, a pessoa confere ou troca; na edição, só sugestão. Filtros, detalhe, lista e Kanban. Formato `versao: 1` mantido. 201/201 testes.
- Tela compartilhada na tela Demandas, ideia vinda do TOCA: resumo das demandas em aberto por lista branca de campos, sem responsável nem descrição; SIMP e processo judicial só como "tem". O modelo não mudou. 207/207 testes.
- Campos essenciais, ideia vinda do TOCA: "Falta: tipo, prazo." na lista e no detalhe de Demandas, conforme a natureza, e filtro "Preenchimento". Só avisa; nada virou obrigatório. 216/216 testes.
- Feriados locais, ideia vinda do TOCA: cartão na tela Alertas para acrescentar feriados estaduais, municipais e recessos (inclusive anuais), desmarcar nacionais que não valem e contar Carnaval e Corpus Christi. Todas as contas em dias úteis passam a usá-los. 229/229 testes.
- Mascotes redesenhados (etapa 1): rosto ilustrado próprio para lobo-guará, ariranha e capivara, nos três humores atuais, com olhos que acompanham o ponteiro ou o toque e respeitam "reduzir movimento". SVGs de consulta em `identidade-visual/fofofauna/`. 226/226 testes.
- Mascote no assistente: maior (88 px, com fundo), atento quando há aviso e curioso depois de comando não reconhecido, com o motivo em texto; cada fala do assistente leva o rosto do mascote. Humor tranquilo de olhos abertos. 231/231 testes.
- Mascotes piscam e dão um pulinho ao clique ou toque (CSS, desligado com "reduzir movimento").
- Mascotes ficam entediados, sonolentos e dormem quando a página fica parada (cada espécie no seu ritmo), acordam com qualquer atividade e comemoram quando uma demanda vai para "Concluída" no Kanban. Nada é medido nem guardado. 251/251 testes.
- Tela Configurações, com a seção Mascotes: escolha do mascote principal e nome para cada um (até 20 caracteres; vazio mostra a espécie), gravados neste navegador. O painel do assistente não tem mais o seletor. 261/261 testes.
- Mascote nos estados vazios: Demandas, Kanban, Dashboard, Alertas e módulos ainda não implementados mostram o rosto do mascote principal com a frase e, quando há, a dica do próximo passo. 265/265 testes.
- Assistente com avisos reais: as demandas vencidas, com prazo em até 3 dias úteis ou paradas viram falas curtas do mascote, com origem e data; o humor resume a situação ("Atento: 1 vencida e 2 com prazo próximo."). O aviso fixo e fictício saiu. 271/271 testes.
- Demanda travada com detalhe livre (opcional, até 300 caracteres) além do motivo; aparece só no detalhe da demanda, não na tela compartilhada, no Kanban nem no MCP. 276/276 testes.
- Histórico da demanda: criação, cada mudança de status e cada ação do bloqueio (com motivo e detalhe) viram eventos, mostrados no detalhe da demanda. Concluir pelo formulário de edição agora também encerra o bloqueio. 287/287 testes.
- Mascote olha para o aviso mais urgente quando o ponteiro está parado, e o comando "prazos" usa os mesmos dados dos avisos (antes usava os fictícios fixos). Etapa 4 concluída. 291/291 testes.
- Mascote com pose pela natureza da resposta: tranquilo para fato, pensativo para inferência, curioso para sugestão e cauteloso para o que não foi testado (Saúde do sistema). "prazos" agora traz também a inferência de qual é a mais urgente. 293/293 testes.
- Mascote no celular e no tablet: o rosto do mascote principal fica no botão que abre o assistente, atento quando há aviso, com a contagem e o resumo no nome acessível; também comemora com o painel fechado. 295/295 testes.
- Correção: no celular, a conversa do assistente agora rola até a última fala, e a gaveta não passa mais da altura da tela (depois ajustada para uma rolagem só, com o campo de digitar preso embaixo). 296/296 testes.
- Atalhos "prazos" e "ajuda" na conversa do assistente: tocar envia o comando sem digitar. 297/297 testes.

## [0.1.0] — 13/11/2026

### Adicionado

- Estrutura semântica de pastas (seção 8.5), com READMEs de domínio.
- `CLAUDE.md`, `ARQUITETURA.md` (decisões D1 a D8), `STATUS.md`, `equipe.md` e `tecnicas.md`.
- Catálogo tipado com 6 agentes e 10 habilidades determinísticas, cada uma com contrato, implementação e autoteste sobre dados fictícios.
- Validador de esquema, verificação de saúde, fluxo padrão (seção 9.4) com gate de qualidade e quadro dos padrões A–F.
- Aplicação React/Vite/Tailwind com layout em três áreas e as telas Painel, Demandas, Assistente e Saúde do sistema.
- Testes Vitest. **Ainda não executados:** o Node.js não está instalado.
- `.claude/`: skills `testar-sistema`, `revisar-interface` e `validar-pds` (didática); subagentes `arquiteto`, `implementador` e `auditor`; hook PreToolUse `verificar_comando.py`, com 7 testes Python aprovados.
- O gate de qualidade passa a usar autor e revisor tirados do registro de etapas.
- `dados-ficticios/entregas.ts` para o autoteste de `validar-pds`.
- Decisão D9: frontend no Vercel, importado do GitHub. Ordem de publicação GitHub → Vercel → Supabase, conforme a apostila P12.
- Decisão D10: a Apostila FluxoLab governa o MVP. CSS próprio no lugar do Tailwind; localStorage agora e Supabase opcional depois do Vercel. Novo `planejamento/PLANO.md` com modelo de dados, regras e 12 cenários de aceite.
- Node.js v26.13.1 instalado. Dependências resolvidas sem Tailwind. Correções para TypeScript 7 (`baseUrl` removido; genéricos sem uso em `ContratoHabilidade`). 40/40 testes e build aprovados; o app abre no navegador.
- Fase 2: Tailwind substituído por CSS próprio (`estilos.css`, paleta Fofofauna, claro e escuro, breakpoints em 768, 1024 e 1280 px). Layout conferido em desktop, tablet e smartphone.
- Fase 3: CRUD de demandas em localStorage (modelo da apostila, regras puras, repositório, armazém único, lista com pesquisa e filtros, formulário validado, detalhe, exclusão com confirmação, aviso de corrupção). 55/55 testes.
- Fase 4: Kanban com 4 colunas e menu "Mover para"; Dashboard com total, contagem por status, vencidas e inativas; regra pura de inatividade. 63/63 testes.
- Fase 5: alertas locais com limiar persistido (padrão 3 dias), sino no cabeçalho, exportação e importação de `guara-dados.json` com validação, confirmação e backup, desfazer importação e restaurar exemplos. ACEITE-MVP (P07): 12/12 cenários. 75/75 testes.
- Fase 6 (P08 a P11):
  - skill `testar-sistema` invocada de verdade;
  - padrões A–F por delegação real alternativa (os subagentes registrados não carregaram nesta sessão);
  - correção de `Alertas.tsx` (desfazer importação atualiza o limiar) feita pelo implementador e aprovada pelo auditor;
  - servidor MCP local `guara-dados` (stdio, somente leitura, 3 ferramentas) testado com cliente real;
  - sentinela `GUARA_HOOK_TEST_BLOCK` no hook;
  - inspeção de plugins. 76/76 testes.
- Fase 7:
  - repositório GitHub privado `guara`;
  - deploy no Vercel (https://guara-lemon.vercel.app) depois de 2 correções no `vercel.json`;
  - `documentacao/RELATORIO-FINAL.md` com a auditoria do P13 e o roteiro de apresentação de 2 minutos.
- Repetição dos testes da seção 5 do relatório em sessão aberta na pasta do projeto (`metodologia/evidencias/2026-11-13-p13-repeticao-hook-subagentes-mcp.md`):
  - hook bloqueou `GUARA_HOOK_TEST_BLOCK` e permitiu `GUARA_OK`;
  - `arquiteto`, `auditor` (76/76) e `implementador` foram chamados;
  - `resumir_demandas` chamada pelo Claude Code (total 5);
  - relatório: de 9 PASSOU, 3 PARCIAL e 1 NÃO TESTADO para 12 PASSOU e 1 PARCIAL. Tela `/mcp` e rodada A–F com os registrados seguem pendentes.
- Correção dos 5 riscos do arquiteto:
  - importação exige `ficticio: true`;
  - importação reverte as 3 chaves se uma gravação falhar;
  - localStorage bloqueado: armazenamento em memória e aviso no topo;
  - sincronização entre abas pelo evento `storage`;
  - limites de tamanho na validação.
  10 testes novos (falham no código anterior), total 86/86.
- Nome do projeto definido: **GUARÁ** — Gestão Unificada de Análises, Rotinas e Apoio.
