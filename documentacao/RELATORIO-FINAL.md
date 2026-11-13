# RELATÓRIO FINAL — GUARÁ (P13 da Apostila FluxoLab), 13/11/2026

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
| 5 | Testes executados e falhas reais | `npm test`: **11 arquivos, 76/76**. Hook: **8/8**. Falhas reais registradas e corrigidas (seção 3) | **PASSOU** |
| 6 | Skills criadas e ao menos uma execução real | 3 `SKILL.md`; `testar-sistema` invocada pela ferramenta Skill — `2026-11-13-p08-skill-testar-sistema.md` | **PASSOU** |
| 7 | Subagentes criados e delegações demonstradas | 3 arquivos em `.claude/agents/`. Os **subagentes registrados não carregaram** nesta sessão (`Agent type 'arquiteto' not found`). Houve delegação real alternativa (agentes genéricos seguindo os arquivos de papel) — `2026-11-13-p09-orquestracao.md` | **PARCIAL** |
| 8 | Seis padrões de orquestração | A, B, C, D, E e F com registro de agente, entrada, saída e evidência (fluxo alternativo); no produto, o fluxo determinístico da tela Saúde do sistema cobre A, B, C, E e F | **PARCIAL**: com os subagentes registrados, NÃO DEMONSTRADO |
| 9 | MCP conectado e ferramenta realmente chamada | `node servidor-mcp/testar-servidor.ts`: cliente MCP real (stdio), 3 ferramentas `readOnly`; `resumir_demandas` total 5 = JSON exportado (5). Conexão em `/mcp` no Claude Code: **NÃO TESTADO** | **PARCIAL** |
| 10 | Hook sentinela realmente bloqueado | Regras: 8/8 testes (sentinela bloqueada e `GUARA_OK` permitido). Em sessão real, `echo GUARA_HOOK_TEST_BLOCK` **não foi bloqueado**, porque o `settings.json` do projeto não foi carregado | **NÃO TESTADO** em sessão real |
| 11 | GitHub: URL real e teste de acesso | repositório privado criado; `git ls-remote` = commit local — `2026-11-13-p12-github.md` | **PASSOU** |
| 12 | Vercel: URL real e teste de acesso | `https://guara-lemon.vercel.app`: HTTP 200; cadastro, Kanban, F5 e Saúde 10/10 na URL pública — `2026-11-13-p12-vercel.md` | **PASSOU** |
| 13 | Diferencial: tela Saúde do sistema | 6 agentes e 10 habilidades com autoteste real; estado inicial NÃO TESTADO; "Executar verificação" dá 10/10 OK (local e na URL pública); testes provam que uma habilidade quebrada vira FALHA | **PASSOU** |

**Resumo:** 9 PASSOU · 3 PARCIAL · 1 NÃO TESTADO · 0 FALHOU em aberto.

> Os itens 7 a 10 têm a **mesma causa**: a sessão foi aberta na pasta pai (`Claude/0`), e o Claude Code só carrega o `.claude/` (hook, subagentes) e o `.mcp.json` de um projeto ao **abrir uma sessão na pasta dele**. O roteiro para fechá-los está na seção 5.

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
- Riscos levantados pelo arquiteto e **ainda em aberto**:
  - importação aceita arquivo sem a marca `ficticio`;
  - falha parcial na importação;
  - erro de localStorage na inicialização não é tratado;
  - não há sincronização entre abas;
  - importação não confere os limites de tamanho.

## 5. Próximos passos

1. **Abrir uma sessão do Claude Code em `estagiario-digital-fofofauna/`** e, nela:
   - aprovar o MCP `guara-dados`, conferir com `/mcp` e chamar `resumir_demandas`;
   - testar `echo GUARA_HOOK_TEST_BLOCK` (deve ser bloqueado pelo hook) e `echo GUARA_OK`;
   - invocar os subagentes `arquiteto`, `implementador` e `auditor` (rodada A–F).
2. Corrigir os 5 riscos do arquiteto. O risco **alto** é a marca `ficticio` na importação.
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
| 1:45–2:00 | GitHub (último commit) e `RELATORIO-FINAL.md` | "Código no GitHub, 76 testes passando, evidências registradas. O que não foi comprovado está marcado como parcial ou não testado. Para produção faltam backend, autenticação e RLS." |
