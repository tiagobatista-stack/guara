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
