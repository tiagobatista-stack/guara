# STATUS — GUARÁ

**Atualizado em:** 13/11/2026
**Etapa atual:** 1 (diagnóstico e desenho) concluída em documentação. Etapa 2 (fundação técnica) com código escrito, mas **não executado**.
**Alinhamento (D10):** a Apostila FluxoLab governa o MVP. O plano aprovado tem as fases 0 a 7: as fases 0 (documentação), 1 (Node, build e testes) 2 (CSS próprio, conferido em 3 larguras) 3 (CRUD), 4 (Kanban e Dashboard) e 5 (alertas e JSON; 75/75 testes; ACEITE-MVP com os 12 cenários PASSOU) estão feitas. Próxima: fase 6 (P08 a P11: skills, subagentes A–F, MCP local e hook com sentinela). O plano do MVP está em `planejamento/PLANO.md`.

## Checklist da apostila (seção 4) — painel de pendências

| Verificação | Evidência mínima | Situação |
|---|---|---|
| Ambiente | `node`, `git`, `claude` disponíveis | PASSOU: Node v26.13.1 instalado em 13/11 |
| Contexto | `CLAUDE.md` criado | PASSOU (arquivo existe) |
| MVP | CRUD, Kanban, dashboard, alertas | PASSOU: 12/12 cenários (`metodologia/evidencias/ACEITE-MVP.md`) |
| Persistência | F5 preserva os dados no navegador | PASSOU: criar, editar, F5 e excluir no navegador real (`metodologia/evidencias/2026-11-13-fase-3-crud-localstorage.md`) |
| Testes | `npm run test`, `npm run build` | PASSOU: 75/75 testes e build ok (`metodologia/evidencias/2026-11-13-fase-1-node-build-testes.md`) |
| Skills | 3 arquivos e 1 execução real | 3 arquivos criados; execução NÃO TESTADO |
| Agentes | 3 arquivos e 1 chamada real | 3 arquivos criados; chamada NÃO TESTADO |
| Orquestração | padrões A–F com evidências honestas | NÃO TESTADO |
| MCP | JSON exportado e chamada real | NÃO TESTADO (fase 6) |
| Hook | sentinela bloqueada, comando benigno permitido | regras testadas (7/7 em Python); sentinela `GUARA_HOOK_TEST_BLOCK` ainda não existe |
| GitHub | URL e commit existente | NÃO TESTADO (exige autorização) |
| Vercel | URL aberta e testada | NÃO TESTADO (exige autorização) |

## ▶ Ponto de retomada (próxima sessão)

Seguir o plano aprovado (fases 0 a 7) descrito em `gestao/decisoes/2026-11-13-alinhamento-apostila.md` e em `planejamento/PLANO.md`. Depois do Node, a ordem é:

2. Fase 6: P08 (invocar a skill), P09 (subagentes A–F), P10 (MCP local com `guara-dados.json`), P11 (sentinela do hook).
3. Fase 6: demonstrações P08 a P11.
4. Fase 7: GitHub, Vercel e relatório final.

Passos imediatos:

0. **Se todas as ferramentas aparecerem bloqueadas no início da sessão**, o hook está falhando. Renomeie `.claude/settings.json` para `.claude/settings.json.desativado` pelo Explorer e investigue. O hook roda no Git Bash (`"shell": "bash"`). Testado: no bash o código de saída é 0 para permitir e 2 para bloquear. No cmd a mesma string falha com código 2, e por isso não deve ser usada.
1. ~~O Node.js não estava instalado~~. **Resolvido:** v26.13.1 em `C:/Program Files/nodejs`. No Git Bash, se `node` não for encontrado, rode `export PATH="/c/Program Files/nodejs:$PATH"`.
2. Com o Node disponível:

   ```bash
   cd aplicacao
   npm run instalar-dependencias
   npm test
   npm run build
   ```

   O primeiro comando resolve as versões; nenhuma foi fixada à mão.
3. Corrigir o que falhar. O código **nunca foi compilado**, então espere ajustes de tipos e configuração do Vitest (`test.dir`, `setupFiles`, aliases `@catalogo` e `@dados`).
4. Abrir `npm run dev`, conferir o layout no desktop, no tablet e no smartphone e conferir a tela Saúde do sistema. Registrar a evidência em `metodologia/evidencias/`.
5. Demonstrar os padrões A–F com os subagentes (`arquiteto`, `implementador`, `auditor`) e registrar a evidência.
6. Atualizar este arquivo e `CHANGELOG.md`, e fazer o commit local.
7. Publicar, com autorização, nesta ordem: **GitHub → Vercel**. O Supabase é opcional e vem depois (D10). O roteiro está em `documentacao/implantacao.md`, e a decisão D9 em `gestao/decisoes/2026-11-13-hospedagem-vercel.md`. A apostila (P12) exige o repositório GitHub e uma URL Vercel real.

## O que foi feito

| Item | Situação | Evidência |
|---|---|---|
| Diagnóstico do ambiente | PASSOU (executado) | `documentacao/ARQUITETURA.md` §1 |
| Estrutura semântica de pastas (8.5 e 9.5) | PASSOU (criada) | árvore do repositório |
| Referência de layout copiada | PASSOU | `identidade-visual/referencias/layout_dashboard_referencia.webp` (110 390 bytes, igual à origem) |
| `CLAUDE.md`, `ARQUITETURA.md`, `equipe.md`, `tecnicas.md`, decisão D1 | escritos | arquivos |
| Git local (`main`), sem remoto | PASSOU | `git log` |
| Catálogo: 6 agentes e 10 habilidades com contrato, implementação e autoteste | escrito, **NÃO TESTADO** | `backend/supabase/functions/_compartilhado/` |
| Verificação de saúde, fluxo padrão 9.4, gate e padrões A–F | escrito, **NÃO TESTADO** | idem |
| Testes Vitest (autotestes, falhas, regras, fluxo, tela) | escritos, **NÃO TESTADO** | `testes/`, `aplicacao/src/**/*.test.tsx` |
| App React (layout em três áreas, Painel, Demandas, Assistente, Saúde do sistema) | escrito, **NÃO TESTADO** | `aplicacao/src/` |
| `npm run build` | **PASSOU** (depois de 2 correções) | evidência da fase 1 |
| `npm test` | **PASSOU**: 40/40 | evidência da fase 1 |
| App abre localmente; Saúde do sistema executa a verificação | **PASSOU**: 10/10 habilidades e 6/6 agentes OK no navegador | evidência da fase 1 |
| Skills, subagentes e hook em `.claude/` | ver a próxima seção | — |

## Ferramentas de desenvolvimento (`.claude/`)

| Item | Situação |
|---|---|
| Skills `testar-sistema`, `revisar-interface` e `validar-pds` (didática) | criadas |
| Subagentes `arquiteto`, `implementador` e `auditor` | criados; rodada A–F **NÃO TESTADO** |
| Hook `verificar_comando.py` (Bash, PowerShell, Write e Edit) | **PASSOU**: 7/7 testes Python |
| Hook acionado pelo Claude Code numa sessão real | **NÃO TESTADO** (vale a partir de uma nova sessão aberta na pasta do projeto) |

Detalhes em `metodologia/evidencias/2026-11-13-etapa-1-2.md`.

## Problemas conhecidos e riscos

- O código TypeScript nunca foi compilado nem executado.
- `fluxo-padrao.ts` e os autotestes importam `dados-ficticios/`, que fica fora de `backend/supabase/functions/`. O deploy de Edge Functions pode não empacotar arquivos fora dessa pasta; isso precisa ser verificado quando houver Supabase CLI.
- `extrair-documento` usa texto por página e não lê PDF real.
- O padrão D (paralelo) não é demonstrável no modo local, e por isso fica NÃO DEMONSTRADO.
- A coluna de desenvolvimento dos padrões A–F (subagentes reais) ainda não foi demonstrada.

## Identidade Git local (a confirmar)

Os commits locais usam uma configuração **só deste repositório** (não global):

- `user.name = tiagobatista-stack`
- `user.email = tiagobatista-stack@users.noreply.github.com` (endereço "noreply" presumido, ainda não confirmado)

Antes de qualquer push, o responsável deve confirmar ou ajustar esses valores (`git config user.email ...` e, se quiser, `git commit --amend --reset-author`).

## Intervenções humanas pendentes

1. Instalar o Node.js ou autorizar a instalação.
2. Escolher a demanda piloto do MVP.
3. GitHub: rodar `gh auth login` no próprio terminal e autorizar a criação do repositório pessoal e o push. Informar o usuário GitHub do colaborador para o convite.
4. Vercel: criar ou entrar na conta ligada ao GitHub e importar o repositório (Root Directory `aplicacao`).
5. Supabase (opcional, depois do Vercel): autorizar a criação do projeto (`sa-east-1`) e do Google OAuth.
6. Durante a fase 6 (MCP): exportar `guara-dados.json` pela interface e salvá-lo na pasta que for indicada.
7. Fornecer o documento oficial do PDS, se for desejada uma verificação real.
