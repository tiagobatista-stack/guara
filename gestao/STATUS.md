# STATUS — GUARÁ

**Atualizado em:** 13/11/2026
**Etapa atual:** 1 (diagnóstico e desenho) concluída em documentação. Etapa 2 (fundação técnica) com código escrito, mas **não executado**.

## ▶ Ponto de retomada (próxima sessão)

0. **Se todas as ferramentas aparecerem bloqueadas no início da sessão**, o hook está falhando. Renomeie `.claude/settings.json` para `.claude/settings.json.desativado` pelo Explorer e investigue. O hook roda no Git Bash (`"shell": "bash"`). Testado: no bash o código de saída é 0 para permitir e 2 para bloquear. No cmd a mesma string falha com código 2, e por isso não deve ser usada.
1. **Bloqueio principal:** o Node.js não está instalado. Pedir autorização para `winget install OpenJS.NodeJS.LTS` ou que o usuário instale pelo site oficial (https://nodejs.org).
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
7. Publicar, com autorização, nesta ordem: **GitHub → Vercel → Supabase**. O roteiro está em `documentacao/implantacao.md`, e a decisão D9 em `gestao/decisoes/2026-11-13-hospedagem-vercel.md`. A apostila (P12) exige o repositório GitHub e uma URL Vercel real.

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
| `npm run build` | **NÃO TESTADO** (sem Node) | — |
| `npm test` | **NÃO TESTADO** (sem Node) | — |
| App abre localmente | **NÃO TESTADO** (sem Node) | — |
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
5. Supabase: autorizar a criação do projeto (`sa-east-1`) e do Google OAuth.
6. Fornecer o documento oficial do PDS, se for desejada uma verificação real.
