# STATUS — GUARÁ

**Atualizado em:** 13/11/2026.

**Alinhamento (D10):** a Apostila FluxoLab governa o MVP. As fases 0 a 7 do plano aprovado estão feitas. Relatório final em `documentacao/RELATORIO-FINAL.md`: 12 PASSOU e 1 PARCIAL (rodada A–F com os subagentes registrados). Hook, subagentes e MCP foram repetidos em sessão aberta na pasta do projeto (`metodologia/evidencias/2026-11-13-p13-repeticao-hook-subagentes-mcp.md`).

## Checklist da apostila (seção 4)

| Verificação | Evidência mínima | Situação |
|---|---|---|
| Ambiente | `node`, `git`, `claude` | **PASSOU**: Node 26.13.1, npm 11.20.0, Git 2.56, Python 3.12 |
| Contexto | `CLAUDE.md` | **PASSOU** |
| MVP | CRUD, Kanban, dashboard, alertas | **PASSOU**: 12/12 cenários (`metodologia/evidencias/ACEITE-MVP.md`) |
| Persistência | F5 preserva os dados | **PASSOU** no navegador real, com eventos de DOM disparados por script |
| Testes | `npm test`, `npm run build` | **PASSOU**: 123/123 testes e build ok (`2026-11-13-correcao-riscos-arquiteto.md`); 8/8 testes do hook (`2026-11-13-p08-skill-testar-sistema.md`) |
| Skills | 3 arquivos e 1 execução real | **PASSOU**: `testar-sistema` invocada pela ferramenta Skill (P08) |
| Agentes | 3 arquivos e 1 chamada real | **PASSOU**: `arquiteto`, `auditor` (76/76 reexecutado) e `implementador` chamados em sessão aberta na pasta do projeto, como teste de carga e papel, sem alterar arquivos (`2026-11-13-p13-repeticao-hook-subagentes-mcp.md`) |
| Orquestração | A–F com evidências honestas | **PARCIAL**: A–F demonstrados pelo fluxo alternativo (`2026-11-13-p09-orquestracao.md`). Rodada com os subagentes registrados: **NÃO DEMONSTRADO** |
| MCP | JSON exportado e chamada real | **PASSOU**: cliente stdio (5 = 5) e `resumir_demandas` chamada pelo próprio Claude Code (total 5). Tela `/mcp`: **NÃO TESTADO** (comando de interface) |
| Hook | sentinela bloqueada, benigno permitido | **PASSOU**: regras 8/8 e, em sessão real, `GUARA_HOOK_TEST_BLOCK` bloqueado e `GUARA_OK` permitido |
| GitHub | URL e commit | **PASSOU**: https://github.com/tiagobatista-stack/guara (privado), `main` = `37ca679` (`metodologia/evidencias/2026-11-13-p12-github.md`) |
| Vercel | URL aberta e testada | **PASSOU**: https://guara-lemon.vercel.app (cadastro, Kanban, F5 e Saúde do sistema 10/10; `metodologia/evidencias/2026-11-13-p12-vercel.md`) |

## Ponto de retomada

1. **Feito:** MCP, hook e subagentes repetidos em sessão aberta na pasta do projeto. **Falta:** abrir a tela `/mcp` no terminal e fazer a rodada A–F com os subagentes registrados (inclusive uma correção real pelo `implementador`).
2. **Se todas as ferramentas aparecerem bloqueadas no início da sessão**, o hook está falhando. Renomeie `.claude/settings.json` para `.claude/settings.json.desativado` pelo Explorer. O hook roda no Git Bash e foi testado com saída 0 (permite) e 2 (bloqueia).
3. **Publicado:** GitHub https://github.com/tiagobatista-stack/guara (privado) e Vercel https://guara-lemon.vercel.app. Cada push na `main` gera um novo deploy.
4. **Riscos do arquiteto: corrigidos** (10 testes novos, 86/86). Evidência em `metodologia/evidencias/2026-11-13-correcao-riscos-arquiteto.md`. **Revisão independente pelo `auditor` registrado: feita** (padrão C, mesma evidência). Os riscos 1, 2, 4 e 5 e o 3a (o app não quebra com o storage bloqueado) foram **APROVADOS**. O 3b foi **REPROVADO**: o aviso "As alterações valem só até fechar a página" some depois de importar, desfazer ou recarregar, porque `armazem.ts:64` zera o aviso. **O 3b foi corrigido depois pelo subagente `implementador`** (padrão B): o aviso fica ligado até a página fechar. Há 8 testes novos: 7 falham por asserção no código anterior, e o 8º é uma proteção contra regressão. Total 94/94, build ok. **Nova revisão do `auditor`: 3b APROVADO, com ressalvas.** **Risco novo 3c (`restaurarBackup` deixava o armazenamento parcialmente restaurado e dizia "nada foi alterado"): corrigido pelo `implementador`**. Dos 5 testes novos, 4 falham por asserção no código anterior; o 5º é proteção contra regressão. Total 99/99, build ok. **Revisão do `auditor`: 3c APROVADO, com ressalvas** (mensagem pessimista quando tudo falha; backup com estrutura errada dava sucesso falso e apagava o backup, defeito anterior). **Essa ressalva foi corrigida depois pelo `implementador`**: o backup agora tem a forma validada antes de qualquer gravação. Dos 7 testes novos, 6 falham por asserção no código anterior. Total 106/106, build ok. **Revisão do `auditor` desta correção: APROVADO.** **As ressalvas restantes (R1, R3, R4, a importação sem aviso e o backup com demandas inválidas) foram corrigidas pelo `implementador`**. Há 10 testes novos, todos falhando por asserção no código anterior. Total 116/116, build ok. **Revisão do `auditor`: R1, R3, R4 e importação APROVADOS; backup com demandas inválidas APROVADO, com ressalvas** (o conteúdo corrompido fica inacessível pela interface; a confirmação da importação promete uma restauração que pode não ocorrer). Esses commits já foram publicados (`0cf21d5`, deploy `success`). **As ressalvas C e D também foram corrigidas pelo `implementador`**: o conteúdo corrompido do backup pode ser baixado pela tela, o desfazer fica desabilitado nesse caso e a confirmação de importação diz a verdade conforme o estado. Dos 7 testes novos, 3 falham no código anterior por asserção do defeito, 3 só pela ausência do campo novo, e 1 passa antes e depois. Total 123/123, build ok. C foi conferida no navegador local. **Revisão do `auditor`: C e D APROVADOS.** Publicação e D no navegador: NÃO TESTADO. No lote original de `3d0609f` (86/86), metade dos 10 testes novos falhava no código anterior por símbolo ausente, e não pelo defeito.

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
