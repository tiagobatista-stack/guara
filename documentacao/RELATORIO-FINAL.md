# RELATÓRIO FINAL — GUARÁ (P13 da Apostila FluxoLab), 13/11/2026, atualizado em 19/11/2026

**GUARÁ — Gestão Unificada de Análises, Rotinas e Apoio.** Estagiário digital Fofofauna, com **dados fictícios**.

- **Repositório:** https://github.com/tiagobatista-stack/guara (privado)
- **Versão publicada:** https://guara-lemon.vercel.app (estática)

Auditoria final feita sem recomeçar o projeto. Regra: **nada marcado como PASSOU sem execução**. Todas as evidências estão em `metodologia/evidencias/`.

## 1. Auditoria final

| # | Item do P13 | Evidência (comando / registro) | Situação |
|---|---|---|---|
| 1 | React, Vite, TypeScript e build | `npm run build` (tsc + Vite 8): `✓ built` | **PASSOU** |
| 2 | CRUD e persistência no mesmo navegador | 12 cenários de aceite e roteiro P04 (criar, editar, F5, excluir) — `ACEITE-MVP.md` | **PASSOU** |
| 3 | Kanban, filtros, indicadores e alertas locais | `Kanban.test`, `metricas-inatividade.test`, `Alertas.test` e checkpoints P05 e P06 no navegador | **PASSOU** |
| 4 | Exportação e importação JSON | `dados-portaveis.test` (válido, 6 inválidos, backup); exportar e importar no navegador | **PASSOU** |
| 5 | Testes executados e falhas reais | `npm test`: **11 arquivos, 76/76**. Hook: **8/8**. Depois da correção dos riscos: **12 arquivos, 86/86**. Falhas reais registradas e corrigidas (seção 3). **Em 19/11/2026:** **44 arquivos, 540/540**, build ok; depois do merge da `origin/main` (Roteiro, mapa e agenda): **58 arquivos, 672/672**, build ok (`2026-11-19-orquestracao-a-d-e-f.md`) | **PASSOU** |
| 6 | Skills criadas e ao menos uma execução real | 3 `SKILL.md`; `testar-sistema` invocada pela ferramenta Skill — `2026-11-13-p08-skill-testar-sistema.md` | **PASSOU** |
| 7 | Subagentes criados e delegações demonstradas | 3 arquivos em `.claude/agents/`. Na 1ª sessão não carregaram (`Agent type 'arquiteto' not found`). **Repetido em sessão aberta na pasta do projeto:** `arquiteto`, `auditor` (reexecutou `npm test`: 76/76) e `implementador` foram chamados e responderam, sem alterar arquivos. Delegação alternativa anterior em `2026-11-13-p09-orquestracao.md` | **PASSOU** (teste de carga e papel) — `2026-11-13-p13-repeticao-hook-subagentes-mcp.md`. **Em 19/11/2026:** os três trabalharam de verdade na rodada A–F (item 8) |
| 8 | Seis padrões de orquestração | **Rodada de 19/11/2026 com os subagentes registrados** (`2026-11-19-orquestracao-a-d-e-f.md`):<br>• **A:** `arquiteto` avaliou os riscos do módulo Operações.<br>• **B:** a recomendação do `arquiteto` foi corrigida pelo `implementador` (número da linha na importação do CSV). O teste falhou antes e passou depois; 528/528, build ok.<br>• **C:** o `auditor`, que não fez a correção, reproduziu a falha anterior numa cópia e deu **APROVADO COM RESSALVAS**. R1 e R3 foram corrigidos depois (540/540); R2, um defeito antigo, continua em aberto.<br>• **D:** `arquiteto` e `auditor` foram disparados na mesma mensagem e rodaram ao mesmo tempo (início com 1 ms de diferença; captura `2026-11-19-orquestracao-disparo.png`).<br>• **E:** o Claude principal consolidou os relatórios e apontou divergências.<br>• **F:** gate `npm test` e `npm run build` antes e depois.<br>A rodada anterior, de 13/11, usou o fluxo alternativo (`2026-11-13-p09-orquestracao.md`). | **PASSOU** |
| 9 | MCP conectado e ferramenta realmente chamada | `node servidor-mcp/testar-servidor.ts` (cliente MCP real, 3 ferramentas `readOnly`). **Repetido:** `mcp__guara-dados__resumir_demandas` chamada pelo próprio Claude Code, total 5 = JSON exportado (5). **Tela `/mcp` aberta em 19/11/2026:** `guara-dados` conectado com 3 tools (`2026-11-19-tela-mcp.md` e `.png`) | **PASSOU** |
| 10 | Hook sentinela realmente bloqueado | Regras: 8/8 testes. **Repetido em sessão real:** `echo GUARA_HOOK_TEST_BLOCK` bloqueado pelo hook e `echo GUARA_OK` permitido | **PASSOU** |
| 11 | GitHub: URL real e teste de acesso | repositório privado criado; `git ls-remote` = commit local — `2026-11-13-p12-github.md` | **PASSOU** |
| 12 | Vercel: URL real e teste de acesso | `https://guara-lemon.vercel.app`: HTTP 200; cadastro, Kanban, F5 e Saúde 10/10 na URL pública — `2026-11-13-p12-vercel.md`. **Versão final (19/11/2026):** PR #3 mesclada na `main` (`3666d55`), deploy do Vercel com estado `success`, a URL serve o mesmo bundle do build local (`index-BFR3kueV.js` e `index-B3S3-AIP.css`). O roteiro na URL pública foi repetido: abrir, cadastrar (4 → 5 demandas), Kanban (A Fazer → Em Andamento), F5 (dados preservados) e Saúde do sistema (10/10 habilidades e 6/6 agentes) — `2026-11-19-roteiro-url-publica.md`. Limitações: parte das ações foi disparada por script na página (`requestSubmit` e o clique do menu), com janela emulada de 1280×800. Cliques físicos e celular: **NÃO TESTADO** | **PASSOU** (versão final `3666d55`) |
| 13 | Diferencial: tela Saúde do sistema | 6 agentes e 10 habilidades com autoteste real; estado inicial NÃO TESTADO; "Executar verificação" dá 10/10 OK (local e na URL pública); testes provam que uma habilidade quebrada vira FALHA | **PASSOU** |

**Resumo (19/11/2026):** 13 PASSOU · 0 PARCIAL · 0 FALHOU em aberto. Versão final `3666d55` publicada e roteiro repetido na URL pública (item 12; ações por script, cliques físicos e celular NÃO TESTADO).

**Fora dos 13 itens:** o `/plugin` foi aberto em 19/11/2026, sem instalar nada. O menu mostrou as abas Discover, Installed, Marketplaces, Errors e Stats (`2026-11-19-inspecao-plugins.md` e `2026-11-19-tela-plugin.png`). A captura mostra só a aba Discover. A afirmação "nada instalado" fica **PARCIAL** até haver uma captura da aba Installed.

> **Atualização (19/11/2026):** ficaram fechados os três pontos que estavam em aberto: a rodada A–F com os subagentes registrados, a tela `/mcp` e uma correção real feita pelo `implementador`. Antes: 12 PASSOU · 1 PARCIAL.

> **Atualização (13/11/2026, 2ª sessão):** os itens 7, 9 e 10 tinham a mesma causa: a 1ª sessão foi aberta na pasta pai (`Claude/0`), e o Claude Code só carrega o `.claude/` (hook, subagentes) e o `.mcp.json` de um projeto ao abrir uma sessão na pasta dele. Repetidos numa sessão aberta em `estagiario-digital-fofofauna/`, passaram. Antes: 9 PASSOU · 3 PARCIAL · 1 NÃO TESTADO. Evidência: `metodologia/evidencias/2026-11-13-p13-repeticao-hook-subagentes-mcp.md`.
>
> **Em aberto em 13/11, fechado em 19/11:** a rodada A–F com os subagentes registrados (item 8), a tela `/mcp` (comando de interface, que o agente não executa) e uma correção real feita pelo `implementador`.

## 2. Comandos de verificação

```bash
cd aplicacao
npm test
npm run build
```

```bash
python -m unittest testes/unidade/test_hook_verificar_comando.py
```

```bash
node servidor-mcp/testar-servidor.ts
```

```bash
curl -I https://guara-lemon.vercel.app
```

Os testes no navegador usaram **eventos de DOM disparados por script** na página real, porque a janela do app estava atrás de outra. O localStorage e as recargas (F5) foram reais. **Cliques físicos: NÃO TESTADO.**

## 3. Falhas reais encontradas e corrigidas

1. **Node.js ausente** no início: instalado com autorização (v26.13.1).
2. **TypeScript 7:** `baseUrl` removido do tsconfig; genéricos sem uso em `ContratoHabilidade` também removidos.
3. **Testes de tela:**
   - 4 falhas na 1ª execução (rótulo com a mensagem de erro, nome acessível ambíguo, mutações fora do `act`);
   - corrigido com `aria-label` explícito, o que também melhorou a acessibilidade.
4. **Hook no Windows:** `UnicodeDecodeError` em cp1252, corrigido com UTF-8. O comando do hook foi fixado em `shell: bash`, porque no cmd ele retornaria 2 e bloquearia tudo.
5. **Padrão B (P09):** desfazer a importação não atualizava o campo do limiar.
   - O teste falhou antes ("Expected 3, Received 10") e passou depois.
   - Correção revisada pelo auditor.
6. **Vercel:**
   - 2 deploys falharam (`--prefix aplicacao` e `cd aplicacao`), porque o projeto usa Root Directory = `aplicacao`;
   - corrigido com `aplicacao/vercel.json`, validado com npm 10 numa cópia limpa;
   - o 3º deploy passou.

## 4. Limitações declaradas

- **Não há** backend, banco compartilhado, autenticação nem envio de e-mail ou SMTP nesta versão.
- Os dados ficam no **localStorage de cada navegador e origem**: o que existe no `localhost` não aparece na URL do Vercel. Para levar os dados, use exportar e importar JSON.
- Os alertas são **locais**: só são avaliados com o app aberto, sem scheduler.
- O MCP lê **o arquivo exportado**. Ele não sincroniza sozinho com o navegador.
- A tela Saúde do sistema roda em **modo local**: indicadores de banco, execuções persistidas e gate de 24 h e 7 dias ficam como NÃO TESTADO.
- O hook está em Python, e não em Node como sugere a apostila (desvio registrado).
- Contraste WCAG AA não foi medido. Não há testes Playwright.
- Os **5 riscos do arquiteto foram corrigidos** em 13/11/2026: arquivo sem marca de fictício é recusado, falha parcial de importação é revertida, localStorage bloqueado não quebra o app, há sincronização entre abas e a importação confere os limites. São 10 testes novos, que falham no código anterior; total 86/86. Evidência em `metodologia/evidencias/2026-11-13-correcao-riscos-arquiteto.md`.

## 5. Próximos passos

1. **Concluído em sessão aberta na pasta do projeto** (`2026-11-13-p13-repeticao-hook-subagentes-mcp.md`):
   - MCP: `resumir_demandas` chamada com sucesso (total 5);
   - hook: `GUARA_HOOK_TEST_BLOCK` bloqueado e `GUARA_OK` permitido;
   - subagentes `arquiteto`, `implementador` e `auditor` chamados.

   ~~**Falta:** conferir a tela `/mcp` no terminal e fazer a rodada A–F com os subagentes registrados.~~ **Feito em 19/11/2026** (itens 8 e 9).

   **Falta:**
   - ~~publicar a versão final~~ (feito: PR #3, `3666d55`, bundle conferido); ~~repetir o roteiro funcional na URL pública~~ (feito: `2026-11-19-roteiro-url-publica.md`); clique físico e celular continuam NÃO TESTADO;
   - capturar a aba Installed do `/plugin`;
   - corrigir o R2, a detecção do separador quando há linhas em branco antes do cabeçalho;
   - decidir sobre os dados de teste sem o prefixo `FIC-` e sobre a planilha no histórico do git (`80de2b7`).
2. ~~Corrigir os 5 riscos do arquiteto~~: feito (86/86 testes). **Revisado pelo subagente `auditor` registrado** (padrão C):
   - **APROVADOS:** os riscos 1, 2, 4 e 5, e o 3a (o app não quebra com o storage bloqueado).
   - **REPROVADO, o 3b:** o aviso de persistência sumia depois de importar, desfazer ou recarregar (`armazem.ts:64`).
     - **Corrigido pelo subagente `implementador`** (padrão B), com 8 testes novos: 7 falham por asserção no código anterior, e o 8º é uma proteção contra regressão. Total 94/94, build ok. **Nova revisão do `auditor`: APROVADO, com ressalvas.**
     - Ainda NÃO TESTADO: navegador real.
   - **Risco novo 3c**, apontado pelo auditor: `restaurarBackup` deixava o armazenamento parcialmente restaurado e dizia "nada foi alterado". **Corrigido pelo `implementador`**, com 5 testes novos: 4 falham por asserção no código anterior, e o 5º é proteção contra regressão. Total 99/99, build ok. **Revisão do `auditor`: APROVADO, com ressalvas.** A ressalva principal era um defeito anterior: um backup com estrutura errada dava sucesso falso e apagava o backup. **Corrigida depois pelo `implementador`**: dos 7 testes novos, 6 falham por asserção no código anterior. Total 106/106, build ok. **Revisão do `auditor`: APROVADO.** **As ressalvas restantes do 3c também foram corrigidas pelo `implementador`**, com 10 testes novos que falham por asserção no código anterior. Total 116/116, build ok. **Revisão do `auditor`: APROVADO** (o backup com demandas inválidas foi aprovado com ressalvas: o conteúdo corrompido fica inacessível pela interface, e a confirmação da importação promete demais). **C e D foram corrigidas depois pelo `implementador`** (123/123, build ok; C conferida no navegador local). **Revisão do `auditor`: C e D APROVADOS.**
   - No lote original de `3d0609f`, 5 dos 10 testes novos falham no código anterior por símbolo ausente, e não pelo defeito.

   Detalhes e lacunas em `metodologia/evidencias/2026-11-13-correcao-riscos-arquiteto.md`.
3. Convidar o colaborador (falta o usuário GitHub dele).
4. **Para produção multiusuário** (fora do escopo da oficina): backend e banco (Supabase, em branch separada, Prompt 14), autenticação Google, RLS testada com dois usuários, logs e monitoramento no servidor, e escolha da demanda piloto.

## 6. Roteiro de apresentação (2 minutos)

| Tempo | O que mostrar | O que dizer |
|---|---|---|
| 0:00–0:15 | Abrir **https://guara-lemon.vercel.app** | "O GUARÁ é o estagiário digital da Fofofauna. Esta é a versão publicada: uma aplicação estática, com dados fictícios." |
| 0:15–0:45 | **Demandas** → Nova demanda → salvar; **Kanban** → "Mover para"; **Dashboard** → F5 | "Cadastro, Kanban e indicadores usam a mesma fonte de dados. Depois do F5, tudo continua, porque está no localStorage deste navegador." |
| 0:45–1:00 | **Alertas** (sino) | "Demandas paradas há mais de 3 dias geram alerta local, só com o app aberto, sem e-mail." |
| 1:00–1:25 | **Saúde do sistema** → Executar verificação | "Aqui ficam o backend em agentes e habilidades: 6 agentes e 10 habilidades com autoteste real. Começa tudo NÃO TESTADO; nada fica OK por suposição. Agora: 10 de 10." |
| 1:25–1:45 | Exportar JSON → terminal com `node servidor-mcp/testar-servidor.ts` | "O JSON exportado alimenta um servidor MCP local, somente leitura. O total devolvido pela ferramenta bate com o arquivo." |
| 1:45–2:00 | GitHub (último commit) e `RELATORIO-FINAL.md` | "Código no GitHub, 672 testes passando, A–F demonstrados com subagentes reais, evidências registradas. O que não foi comprovado está marcado como parcial ou não testado. Para produção faltam backend, autenticação e RLS." |
