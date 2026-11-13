# STATUS — GUARÁ

**Atualizado em:** 13/11/2026.

**Alinhamento (D10):** a Apostila FluxoLab governa o MVP. As fases 0 a 6 do plano aprovado estão feitas. Falta a fase 7 (GitHub, Vercel e relatório final), que exige a sua autorização.

## Checklist da apostila (seção 4)

| Verificação | Evidência mínima | Situação |
|---|---|---|
| Ambiente | `node`, `git`, `claude` | **PASSOU**: Node 26.13.1, npm 11.20.0, Git 2.56, Python 3.12 |
| Contexto | `CLAUDE.md` | **PASSOU** |
| MVP | CRUD, Kanban, dashboard, alertas | **PASSOU**: 12/12 cenários (`metodologia/evidencias/ACEITE-MVP.md`) |
| Persistência | F5 preserva os dados | **PASSOU** no navegador real, com eventos de DOM disparados por script |
| Testes | `npm test`, `npm run build` | **PASSOU**: 76/76 testes, build ok e 8/8 testes do hook (`2026-11-13-p08-skill-testar-sistema.md`) |
| Skills | 3 arquivos e 1 execução real | **PASSOU**: `testar-sistema` invocada pela ferramenta Skill (P08) |
| Agentes | 3 arquivos e 1 chamada real | **PARCIAL**. Os 3 arquivos existem, mas os subagentes registrados estão **NÃO DEMONSTRADO** (não carregaram nesta sessão). Houve delegação real alternativa a agentes genéricos seguindo os arquivos de papel. |
| Orquestração | A–F com evidências honestas | **PARCIAL**: A, B, C, D, E e F foram demonstrados pelo fluxo alternativo (`2026-11-13-p09-orquestracao.md`) |
| MCP | JSON exportado e chamada real | **PASSOU** com um cliente MCP real via stdio (total 5 = 5). Registro em `/mcp` nesta sessão: **NÃO TESTADO** |
| Hook | sentinela bloqueada, benigno permitido | Regras: **PASSOU** (8/8). Bloqueio em sessão real: **NÃO TESTADO** (`settings.json` do projeto não carregado nesta sessão) |
| GitHub | URL e commit | **PASSOU**: https://github.com/tiagobatista-stack/guara (privado), `main` = `37ca679` (`metodologia/evidencias/2026-11-13-p12-github.md`) |
| Vercel | URL aberta e testada | **NÃO TESTADO**: aguarda a importação feita pelo responsável em vercel.com/new |

## Ponto de retomada

1. **Abrir uma nova sessão do Claude Code na pasta `estagiario-digital-fofofauna/`.** Ela carrega o hook, os subagentes e o MCP do projeto. Nela:
   - aprovar o MCP `guara-dados` e chamar `resumir_demandas`;
   - testar `echo GUARA_HOOK_TEST_BLOCK` (deve ser bloqueado) e `echo GUARA_OK`;
   - invocar `arquiteto`, `implementador` e `auditor`.

   Roteiro completo em `metodologia/evidencias/2026-11-13-p10-p11-mcp-hook-plugin.md`.
2. **Se todas as ferramentas aparecerem bloqueadas no início da sessão**, o hook está falhando. Renomeie `.claude/settings.json` para `.claude/settings.json.desativado` pelo Explorer. O hook roda no Git Bash e foi testado com saída 0 (permite) e 2 (bloqueia).
3. **Fase 7 (com autorização):** GitHub (`gh auth login` feito por você), depois Vercel (Root Directory `aplicacao`), depois `documentacao/RELATORIO-FINAL.md`. Roteiro em `documentacao/implantacao.md`.
4. **Riscos do arquiteto ainda em aberto:**
   - importação aceita arquivo sem a marca `ficticio`;
   - falha parcial na importação deixa os dados trocados;
   - erro de localStorage na inicialização não é tratado;
   - não há sincronização entre abas;
   - importação não confere os limites de tamanho.

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

1. Abrir uma nova sessão na pasta do projeto (hook, subagentes e MCP).
2. GitHub: o repositório privado foi criado e o push feito. Falta informar o usuário GitHub do colaborador para o convite.
3. Vercel: conta ligada ao GitHub e importação do repositório.
4. Escolher a demanda piloto. Supabase e Google OAuth (opcional, depois do Vercel).
5. Documento oficial do PDS, se for desejada uma verificação real.
