# STATUS — GUARÁ

**Atualizado em:** 14/11/2026.

**Alinhamento (D10):** a Apostila FluxoLab governa o MVP. As fases 0 a 7 do plano aprovado estão feitas. Relatório final em `documentacao/RELATORIO-FINAL.md`: 12 PASSOU e 1 PARCIAL (rodada A–F com os subagentes registrados). Hook, subagentes e MCP foram repetidos em sessão aberta na pasta do projeto (`metodologia/evidencias/2026-11-13-p13-repeticao-hook-subagentes-mcp.md`).

## Checklist da apostila (seção 4)

| Verificação | Evidência mínima | Situação |
|---|---|---|
| Ambiente | `node`, `git`, `claude` | **PASSOU**: Node 26.13.1, npm 11.20.0, Git 2.56, Python 3.12; `npm ci` sem `EBADENGINE` (`2026-11-14-reverificacao-node26.md`) |
| Contexto | `CLAUDE.md` | **PASSOU** |
| MVP | CRUD, Kanban, dashboard, alertas | **PASSOU**: 12/12 cenários (`metodologia/evidencias/ACEITE-MVP.md`) |
| Persistência | F5 preserva os dados | **PASSOU** no navegador real, com eventos de DOM disparados por script |
| Testes | `npm test`, `npm run build` | **PASSOU**: 135/135 testes, build ok e 8/8 testes do hook, repetidos no Node 26 (`2026-11-14-reverificacao-node26.md`) |
| Skills | 3 arquivos e 1 execução real | **PASSOU**: `testar-sistema` invocada pela ferramenta Skill (P08) |
| Agentes | 3 arquivos e 1 chamada real | **PASSOU**: `arquiteto`, `auditor` (76/76 reexecutado) e `implementador` chamados em sessão aberta na pasta do projeto, como teste de carga e papel, sem alterar arquivos (`2026-11-13-p13-repeticao-hook-subagentes-mcp.md`) |
| Orquestração | A–F com evidências honestas | **PARCIAL**: A–F demonstrados pelo fluxo alternativo (`2026-11-13-p09-orquestracao.md`). Rodada com os subagentes registrados: **NÃO DEMONSTRADO** |
| MCP | JSON exportado e chamada real | **PASSOU**: cliente stdio (5 = 5) e `resumir_demandas` chamada pelo próprio Claude Code (total 5). **Repetido no Node 26 em 14/11/2026:** cliente stdio (4 = 4), `resumir_demandas` e `listar_inativas` chamadas nesta sessão (`2026-11-14-mcp-reativado.md`). Tela `/mcp`: **NÃO TESTADO** (comando de interface) |
| Hook | sentinela bloqueada, benigno permitido | **PASSOU**: regras 8/8 e, em sessão real, `GUARA_HOOK_TEST_BLOCK` bloqueado e `GUARA_OK` permitido |
| GitHub | URL e commit | **PASSOU**: https://github.com/tiagobatista-stack/guara (privado), `main` = `37ca679` (`metodologia/evidencias/2026-11-13-p12-github.md`) |
| Vercel | URL aberta e testada | **PASSOU**: https://guara-lemon.vercel.app (cadastro, Kanban, F5 e Saúde do sistema 10/10; `metodologia/evidencias/2026-11-13-p12-vercel.md`) |

## Ponto de retomada

1. **Feito:** MCP, hook e subagentes repetidos em sessão aberta na pasta do projeto. **Falta:** abrir a tela `/mcp` no terminal e fazer a rodada A–F com os subagentes registrados (inclusive uma correção real pelo `implementador`).
2. **Se todas as ferramentas aparecerem bloqueadas no início da sessão**, o hook está falhando. Renomeie `.claude/settings.json` para `.claude/settings.json.desativado` pelo Explorer. O hook roda no Git Bash e foi testado com saída 0 (permite) e 2 (bloqueia).
3. **Publicado:** GitHub https://github.com/tiagobatista-stack/guara (privado) e Vercel https://guara-lemon.vercel.app. Cada push na `main` gera um novo deploy.
4. **Riscos do arquiteto: corrigidos** (10 testes novos, 86/86). Evidência em `metodologia/evidencias/2026-11-13-correcao-riscos-arquiteto.md`. **Revisão independente pelo `auditor` registrado: feita** (padrão C, mesma evidência). Os riscos 1, 2, 4 e 5 e o 3a (o app não quebra com o storage bloqueado) foram **APROVADOS**. O 3b foi **REPROVADO**: o aviso "As alterações valem só até fechar a página" some depois de importar, desfazer ou recarregar, porque `armazem.ts:64` zera o aviso. **O 3b foi corrigido depois pelo subagente `implementador`** (padrão B): o aviso fica ligado até a página fechar. Há 8 testes novos: 7 falham por asserção no código anterior, e o 8º é uma proteção contra regressão. Total 94/94, build ok. **Nova revisão do `auditor`: 3b APROVADO, com ressalvas.** **Risco novo 3c (`restaurarBackup` deixava o armazenamento parcialmente restaurado e dizia "nada foi alterado"): corrigido pelo `implementador`**. Dos 5 testes novos, 4 falham por asserção no código anterior; o 5º é proteção contra regressão. Total 99/99, build ok. **Revisão do `auditor`: 3c APROVADO, com ressalvas** (mensagem pessimista quando tudo falha; backup com estrutura errada dava sucesso falso e apagava o backup, defeito anterior). **Essa ressalva foi corrigida depois pelo `implementador`**: o backup agora tem a forma validada antes de qualquer gravação. Dos 7 testes novos, 6 falham por asserção no código anterior. Total 106/106, build ok. **Revisão do `auditor` desta correção: APROVADO.** **As ressalvas restantes (R1, R3, R4, a importação sem aviso e o backup com demandas inválidas) foram corrigidas pelo `implementador`**. Há 10 testes novos, todos falhando por asserção no código anterior. Total 116/116, build ok. **Revisão do `auditor`: R1, R3, R4 e importação APROVADOS; backup com demandas inválidas APROVADO, com ressalvas** (o conteúdo corrompido fica inacessível pela interface; a confirmação da importação promete uma restauração que pode não ocorrer). Esses commits já foram publicados (`0cf21d5`, deploy `success`). **As ressalvas C e D também foram corrigidas pelo `implementador`**: o conteúdo corrompido do backup pode ser baixado pela tela, o desfazer fica desabilitado nesse caso e a confirmação de importação diz a verdade conforme o estado. Dos 7 testes novos, 3 falham no código anterior por asserção do defeito, 3 só pela ausência do campo novo, e 1 passa antes e depois. Total 123/123, build ok. C foi conferida no navegador local. **Revisão do `auditor`: C e D APROVADOS.** Publicação e D no navegador: NÃO TESTADO. No lote original de `3d0609f` (86/86), metade dos 10 testes novos falhava no código anterior por símbolo ausente, e não pelo defeito.
5. **Prazos em dias úteis (14/11/2026), lógica reescrita a partir do TOCA:** feriados nacionais e texto "faltam N dias úteis" no Dashboard, no Kanban e em Demandas. Foram 12 testes novos; total 135/135, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Ainda não commitado nem publicado. Evidência em `metodologia/evidencias/2026-11-14-prazos-dias-uteis.md`.
6. **Node 26 conferido (14/11/2026):** `npm ci` limpo, 135/135, build ok e hook 8/8. O servidor MCP sobe no Node 26, mas falta exportar `servidor-mcp/dados/guara-dados.json` e reiniciar a sessão para a chamada real. Evidência em `metodologia/evidencias/2026-11-14-reverificacao-node26.md`.
7. **Tempo em andamento (14/11/2026), item 7 das ideias do TOCA:** "em andamento · última ação há N dias" no Kanban e em Demandas, contado de `ultimaAcaoRelevante`. Foram 4 testes novos; total 139/139, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-tempo-em-andamento.md`.
8. **Demanda travada (14/11/2026), item 6 das ideias do TOCA:** campo opcional `bloqueio`, sem migração e sem mudar `versao: 1`; reavaliação pelo alerta de inatividade; regra 1 do PLANO ampliada. Foram 16 testes novos; total 155/155, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-demanda-travada.md`.
9. **Triagem de demanda sem prazo (14/11/2026), item 8 das ideias do TOCA:** seção na tela Alertas com prazo sugerido de 10 dias úteis, gravado só no clique, e aviso no Dashboard. O modelo não mudou. Foram 9 testes novos; total 164/164, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-triagem-sem-prazo.md`.
10. **Aviso de demanda parecida (14/11/2026), item 9 das ideias do TOCA:** no cadastro, aviso antes de gravar quando há demanda em aberto com o mesmo processo, o mesmo título ou o título digitado inteiro no dela. O modelo não mudou. Foram 10 testes novos (um deles achou um defeito na leitura do processo, corrigido); total 174/174, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-demanda-parecida.md`.
11. **Três números por demanda (14/11/2026), item 10 das ideias do TOCA:** campos opcionais `processo`, `simp` e `judicial` (CNJ com mod 97), sem migração e sem mudar `versao: 1`; PLANO atualizado. Foram 11 testes novos; total 185/185, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-tres-numeros.md`.
12. **Tipo campo × gabinete e natureza (14/11/2026), item 11 das ideias do TOCA:** campos opcionais `tipo` e `natureza`, deduzidos do título no cadastro e conferidos pela pessoa, sem migração; PLANO atualizado. Foram 16 testes novos; total 201/201, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-tipo-e-natureza.md`.
13. **Resumo sem dado pessoal (14/11/2026), item 12 das ideias do TOCA:** botão "Tela compartilhada" em Demandas, com resumo por lista branca (sem responsável nem descrição; SIMP e CNJ só como "tem"). O modelo não mudou. Foram 6 testes novos; total 207/207, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-resumo-sem-dado-pessoal.md`.
14. **Publicação (14/11/2026):** os itens 5 e 7 a 13 acima foram publicados. O responsável fez o push (o hook bloqueia o do Claude); `origin/main` = `9e03ff8`, e https://guara-lemon.vercel.app serve o mesmo bundle do build local (`index-BZCS2W7X.js`). Telas: NÃO CONFERIDO VISUALMENTE. Evidência em `metodologia/evidencias/2026-11-14-publicacao-ideias-toca.md`.
15. **Campos essenciais (14/11/2026), item 13 das ideias do TOCA, na `main`:** "Falta: …" por natureza, no detalhe e na lista, e filtro "Preenchimento". O modelo não mudou. Foram 9 testes novos; total 216/216, build ok. Telas: NÃO CONFERIDO VISUALMENTE. **Publicado** (`origin/main` = `9254bf8`, bundle `index-BkBp1oms.js` na URL pública; `metodologia/evidencias/2026-11-14-publicacao-campos-essenciais.md`). Evidência em `metodologia/evidencias/2026-11-14-campos-essenciais.md`.
16. **Feriados locais (14/11/2026), na `main`:** cartão na tela Alertas (chave `guara:feriados:v1`), usado em todas as contas em dias úteis. Foram 13 testes novos; total 229/229, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-feriados-locais.md`.
17. **MCP reativado (14/11/2026):** no Node 26, `testar-servidor.ts` deu 4 = 4 e as chamadas reais `resumir_demandas` e `listar_inativas` passaram. Falta só abrir a tela `/mcp`. Evidência em `metodologia/evidencias/2026-11-14-mcp-reativado.md`.
18. **Mascotes, etapa 1 (14/11/2026):** rosto ilustrado próprio por espécie, três humores mantidos, olhos que acompanham o ponteiro e respeitam "reduzir movimento". Foram 7 testes novos; total 226/226, build ok (executados pelo responsável no Windows, depois de `npm ci`). Telas: NÃO CONFERIDO VISUALMENTE. Feito no branch `login-google` (`3c25ab4`, no GitHub) e trazido para a `main` por cherry-pick (`34c4469`); na `main`, depois de `npm ci`: 241/241 em 24 arquivos, build ok (executados pelo responsável no Windows). Não publicado no site até o push da `main`. Evidência em `metodologia/evidencias/2026-11-14-mascotes-redesenho.md`.
19. **Presença do mascote no assistente (14/11/2026):** 88 px com fundo, olhos abertos no tranquilo, humor conforme avisos e último comando (com o motivo em texto), rosto do mascote em cada fala. Foram 5 testes novos; total 231/231, build ok (executados pelo responsável no Windows). Telas: NÃO CONFERIDO VISUALMENTE. Mesmo commit do item 18. Evidência em `metodologia/evidencias/2026-11-14-mascotes-presenca-no-assistente.md`.
20. **Mascotes: piscar e reação ao toque (14/11/2026), na `main`:** piscada com intervalo por espécie e pulinho ao clique, em CSS, desligados com "reduzir movimento". 3 testes novos (esperado 244). Testes e build: o responsável informou "testado", sem colar a saída. Evidência em `metodologia/evidencias/2026-11-14-mascotes-piscar-e-toque.md`.
21. **Mascotes: tédio, sono, dormir e comemoração (14/11/2026), na `main`:** repouso por tempo sem atividade, com ritmo por espécie, e festa ao concluir demanda no Kanban. Foram 7 testes novos; total 251/251, build ok (executados pelo responsável no Windows, sobre `bfd6808`). Telas: NÃO CONFERIDO VISUALMENTE. Evidência em `metodologia/evidencias/2026-11-14-mascotes-repouso-e-comemoracao.md`.
22. **Mascotes nas Configurações (14/11/2026), na `main`:** tela Configurações nova, com mascote principal e nome de cada um (`guara:mascote:v1`); o painel do assistente perdeu o seletor. Foram 10 testes novos; total 261/261 em 26 arquivos, build ok (executados pelo responsável no Windows). Telas: NÃO CONFERIDO VISUALMENTE. Evidência em `metodologia/evidencias/2026-11-14-mascotes-configuracoes.md`.
23. **Publicação dos mascotes (14/11/2026):** o responsável fez o push; `origin/main` = `e9db6dc`, e a URL pública serve o mesmo bundle do build local (`index-CoUyrRiP.js`). Telas: NÃO CONFERIDO VISUALMENTE. Evidência em `metodologia/evidencias/2026-11-14-publicacao-mascotes.md`.
24. **Mascotes nos estados vazios (14/11/2026), etapa 6, na `main`:** componente `EstadoVazio` com o rosto do principal (decorativo) em Demandas, Kanban, Dashboard, Alertas e módulos não implementados. Foram 4 testes novos; total 265/265 em 27 arquivos, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-mascotes-estados-vazios.md`.
25. **Publicação dos estados vazios (14/11/2026):** push do responsável (`e87f442`); a URL pública serve `index-DWTUf_83.js`, o mesmo bundle do build. Evidência em `metodologia/evidencias/2026-11-14-publicacao-estados-vazios.md`.
26. **Mascote sinaliza o estado do trabalho (14/11/2026), etapa 4, na `main`:** avisos do painel do assistente calculados das demandas deste navegador (vencida, prazo próximo, parada), com origem e data, e humor que os resume. Foram 6 testes novos; total 271/271 em 28 arquivos, build ok. Falta o olhar que aponta para o aviso. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-mascotes-estado-do-trabalho.md`.
27. **Detalhe livre da demanda travada (14/11/2026), pedido do responsável, na `main`:** `bloqueio.detalhe` opcional (até 300 caracteres), sem migração; aparece só no detalhe da demanda. Foram 5 testes novos; total 276/276, build ok, MCP 4 = 4. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-detalhe-do-bloqueio.md`.
28. **Histórico da demanda (14/11/2026), pedido do responsável, na `main`:** `historico` opcional (até 500 eventos) com criação, status e bloqueio, mostrado no detalhe da demanda; corrigido o bloqueio que não se encerrava ao concluir pelo formulário. Foram 11 testes novos; total 287/287, build ok, MCP 4 = 4. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-historico-da-demanda.md`.
29. **Publicação (14/11/2026):** avisos reais no assistente, detalhe do bloqueio e histórico da demanda estão na URL pública (`origin/main` = `b0090e7`, bundle `index-DNRKpTRc.js`). Telas: NÃO CONFERIDO VISUALMENTE. Evidência em `metodologia/evidencias/2026-11-14-publicacao-historico.md`.
30. **Etapa 4 dos mascotes concluída (14/11/2026), na `main`:** o mascote olha para o aviso mais urgente com o ponteiro parado, e "prazos" usa os dados deste navegador. Foram 4 testes novos; total 291/291, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-mascotes-olhar-e-prazos.md`.
31. **Publicação da etapa 4 (14/11/2026):** URL pública com `index-R_LqMmV9.js`, o mesmo bundle de `3da479e`.
32. **Natureza da resposta (14/11/2026), etapa 5 dos mascotes, na `main`:** humores pensativo e cauteloso; cada fala do assistente tem a pose da sua natureza; Saúde do sistema cautelosa quando NÃO TESTADO. Foram 2 testes novos (e os humores novos entraram nos testes de mascote); total 293/293, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-mascotes-natureza-da-resposta.md`.
33. **Publicação da etapa 5 (14/11/2026):** URL pública com `index-BPahiGzq.js`, o mesmo bundle de `c578994`.
34. **Mascote no celular e no tablet (14/11/2026), na `main`:** rosto vivo do principal no botão flutuante e no botão "Assistente", atento com aviso e com o resumo no nome acessível. Foram 2 testes novos; total 295/295, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-mascotes-presenca-no-celular.md`.
35. **Correção da conversa no celular (14/11/2026), relato do responsável, na `main`:** rolagem até a última fala e altura da gaveta corrigida. 1 teste novo (falha sem a correção); total 296/296, build ok. A parte de CSS: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-conversa-no-celular.md`.
36. **Publicação (14/11/2026):** mascote no celular e correção da conversa na URL pública (`origin/main` = `d0c7b2d`, bundle `index-CCt-fixf.js`, CSS da gaveta conferido). No celular: NÃO CONFERIDO VISUALMENTE. Evidência em `metodologia/evidencias/2026-11-14-publicacao-celular.md`.
37. **Ajuste da gaveta (14/11/2026), relato do responsável ("duas divisões de tela"):** uma rolagem só no painel da gaveta, com o campo de digitar preso embaixo. Só CSS; 296/296, build ok. No celular: NÃO TESTADO. **Publicado** (`ee842eb`, `index-BtIoFIcB.css` na URL pública). Detalhes em `metodologia/evidencias/2026-11-14-conversa-no-celular.md`.
38. **Atalhos de comando na conversa (14/11/2026), na `main`:** botões "prazos" e "ajuda" acima do campo de digitar. 1 teste novo; total 297/297, build ok. Telas: NÃO CONFERIDO VISUALMENTE. Não publicado. Evidência em `metodologia/evidencias/2026-11-14-mascotes-atalhos-de-comando.md`.
39. **Próxima sessão:** siga `gestao/BACKLOG.md` (conferir as telas publicadas, abrir `/mcp`, decidir e testar o login Google).

## Comandos

No Git Bash, se `node` não for encontrado, rode antes `export PATH="/c/Program Files/nodejs:$PATH"`.

```bash
cd aplicacao
npm test
npm run build
npm run dev
```

Testes do hook:

```bash
python -m unittest testes/unidade/test_hook_verificar_comando.py
```

Teste do MCP (cliente real):

```bash
node servidor-mcp/testar-servidor.ts
```

## Problemas conhecidos

- Os testes no navegador usaram eventos de DOM disparados por script, porque a janela estava atrás de outra. Cliques físicos: **NÃO TESTADO**.
- Contraste WCAG AA não foi medido. Não há Playwright.
- `extrair-documento` usa texto por página e não lê PDF real.
- O deploy de Edge Functions pode não empacotar `dados-ficticios/`, que fica fora de `functions/`. Verificar quando houver Supabase.
- Hook em Python, e não em Node como diz a apostila. Desvio registrado.

## Identidade Git local

Definida pelo responsável em 13/11/2026, **só neste repositório** (não global):

- `user.name = tiagobatista-stack`
- `user.email = tiagobatista@sema.mt.gov.br`

A autoria dos 14 commits locais anteriores foi reescrita para esse e-mail, antes de qualquer push. O conteúdo foi conferido como idêntico com `git diff`. O branch local `backup-autoria-antiga` guarda a versão anterior e pode ser apagado depois do push.

## Intervenções humanas pendentes

1. Abrir a tela `/mcp` no terminal (único resto do MCP).
2. GitHub: o repositório privado foi criado e o push feito. Falta informar o usuário GitHub do colaborador para o convite.
4. Escolher a demanda piloto. Supabase e Google OAuth (opcional, depois do Vercel).
5. Documento oficial do PDS, se for desejada uma verificação real.
