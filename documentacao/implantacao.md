# Implantação

**Situação:** nada foi implantado. Este documento lista a ordem prevista. Cada passo marcado com 🔒 exige ação ou autorização humana (conta, termos, OAuth). Detalhes da hospedagem em `gestao/decisoes/2026-11-13-hospedagem-vercel.md`.

## 1. Pré-requisito: build aprovado

1. Instalar o Node.js LTS.
2. Em `aplicacao/`, rodar:

   ```bash
   npm run instalar-dependencias
   npm test
   npm run build
   ```

   Os três precisam passar, com a evidência registrada em `metodologia/evidencias/`.

## 2. 🔒 GitHub

1. O usuário autentica o `gh` no próprio terminal com `gh auth login`. A senha e o token nunca passam pela conversa.
2. Confirmar a identidade Git local (ver `gestao/STATUS.md`).
3. Criar o repositório **pessoal** em `tiagobatista-stack` e fazer o push da `main`.
4. Convidar o colaborador pelo usuário GitHub dele (Settings → Collaborators).

## 3. 🔒 Vercel

O projeto no Vercel usa **Root Directory = `aplicacao`**, como configurado na importação de 13/11/2026. O arquivo `aplicacao/vercel.json` define:

- instalação: `npm ci`;
- build: `npm run build`;
- saída: `dist`;
- framework: Vite.

O build importa arquivos de fora de `aplicacao/` (`../backend/...` e `../dados-ficticios`). Por isso a opção **"Include files outside the Root Directory"** precisa estar **ativada**, que é o padrão.

Histórico: o 1º deploy falhou com `npm --prefix aplicacao ci` e o 2º com `cd aplicacao`, porque os comandos já rodam dentro de `aplicacao/`. A solução foi validada com npm 10 numa cópia limpa.

1. Entrar em https://vercel.com/new com a conta ligada ao GitHub e importar o repositório, dando à integração acesso **só** a ele.
2. Framework Preset: "Other" (o `vercel.json` já define tudo). Clicar em **Deploy**.
3. Abrir a URL real e conferir:
   - cadastro, Kanban e F5;
   - a tela Saúde do sistema, com "Executar verificação".
4. Lembrar que a URL tem **localStorage próprio**: os dados de `localhost` não aparecem lá. Para levá-los, use exportar e importar JSON.
5. Registrar a URL e a evidência em `metodologia/evidencias/`.

## 4. 🔒 Supabase (backend)

1. Criar o projeto na região `sa-east-1` (https://supabase.com/dashboard). Exige conta e aceite dos termos.
2. Instalar o Supabase CLI, aplicar as migrações de `backend/supabase/migrations/` e publicar as Edge Functions `orquestrador` e `saude`.
3. 🔒 Configurar o Google OAuth: projeto no Google Cloud, tela de consentimento e URLs de retorno do Supabase, incluindo a URL do Vercel.
4. Guardar os segredos **somente** no cofre do Supabase (`supabase secrets set`).
5. No Vercel entram só `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A `service_role` nunca vai para o Vercel.

### 4.1 🔒 Login Google (branch `login-google`)

O código está pronto na branch `login-google` (decisão `gestao/decisoes/2026-11-14-login-google.md`). Sem as variáveis abaixo, o login fica desligado. Cada passo exige conta, termos ou autorização do responsável; **segredos nunca passam pela conversa**. Os nomes dos menus podem mudar: confira na documentação oficial de cada serviço.

**Antes de começar, decida:** contas pessoais ou institucionais; quem pode entrar; aprovação institucional para guardar e-mail e nome no Supabase.

1. **Supabase: projeto.** Em https://supabase.com/dashboard, criar o projeto na região São Paulo (`sa-east-1`). Conferir os limites do plano gratuito em https://supabase.com/pricing.
2. **Supabase: chaves públicas.** Nas configurações de API do projeto, copiar a **Project URL** e a chave **publishable** (ou a `anon` antiga). Não copiar a `service_role`/`sb_secret_`.
3. **Supabase: URLs de retorno.** Em Authentication → URL Configuration:
   - Site URL: `https://guara-lemon.vercel.app`
   - Redirect URLs: `https://guara-lemon.vercel.app/`, `http://127.0.0.1:5173/` e, se for testar na pré-visualização da Vercel, a URL da branch.
4. **Google Cloud: tela de consentimento.** Em https://console.cloud.google.com/, criar um projeto e configurar a tela de consentimento OAuth:
   - tipo **Interno** (só contas da organização) ou **Externo** (qualquer conta Google);
   - escopos: **só** `openid`, `email` e `profile`;
   - status **Testing**, com os usuários de teste cadastrados.
5. **Google Cloud: cliente OAuth.** Em APIs e serviços → Credenciais, criar um "ID do cliente OAuth" do tipo **Aplicativo da Web**:
   - Origens JavaScript autorizadas: `https://guara-lemon.vercel.app` e `http://127.0.0.1:5173`;
   - URI de redirecionamento autorizado: a URL de callback que o Supabase mostra na página do provedor Google (formato `https://<ref-do-projeto>.supabase.co/auth/v1/callback`).
6. **Supabase: provedor Google.** Em Authentication → Providers → Google, ativar e colar o **Client ID** e o **Client Secret**. O segredo fica só ali; não vai para o repositório, para a Vercel nem para a conversa. Guia oficial: https://supabase.com/docs/guides/auth/social-login/auth-google
7. **Teste local.** Copiar `aplicacao/.env.exemplo` para `aplicacao/.env.local` (não versionado), preencher as duas variáveis, rodar `npm run dev` e abrir `http://127.0.0.1:5173`. O rodapé do menu deve mostrar "Entrar com Google".
8. **Vercel (pré-visualização).** Em Settings → Environment Variables (https://vercel.com/docs/environment-variables), cadastrar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` só para **Preview** da branch `login-google`. Produção só depois de aprovar e juntar a branch na `main`.
9. Registrar cada passo em `metodologia/evidencias/` como PASSOU, FALHOU ou NÃO TESTADO.
