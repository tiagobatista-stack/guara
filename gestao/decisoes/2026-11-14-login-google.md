# Decisão: login Google pelo Supabase Auth, preparado na branch `login-google`

- **Data:** 14/11/2026
- **Situação:** código preparado e testado com cliente falso. **Nada foi configurado** no Supabase, no Google Cloud nem na Vercel: cada passo exige conta, termos e autorização do responsável (CLAUDE.md, seção 18).

## Contexto

O responsável pediu: "prepare o projeto para utilizar o login google". O planejamento v1.3 (seção 11) prevê login Google por OAuth 2.0 via Supabase Auth. A apostila (D10) tira o login da entrega principal e manda fazer o Supabase depois do Vercel, **em branch separada**, sem substituir a versão que funciona (Prompt opcional 14). O Vercel já está publicado (P12).

## Decisão

1. **Branch `login-google`.** A `main` (publicada) não muda.
2. **Supabase Auth com o provedor Google**, fluxo PKCE, pela biblioteca `@supabase/supabase-js` **2.118.0** (MIT, versão fixa de 15/10/2026, `npm audit` sem vulnerabilidades). A biblioteca só é baixada pelo navegador quando o login está configurado.
3. **Sem configuração, nada muda:** sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, o app funciona como antes e o rodapé do menu mostra o "Sair" desativado.
4. **Só os escopos do login** (openid, email, profile). Drive, Agenda e Gmail não são pedidos (seção 11).
5. **O login só identifica a pessoa.** Os dados continuam no localStorage do navegador. A persistência compartilhada (tabelas, RLS e testes com dois usuários) é a etapa seguinte do Prompt 14 e não foi feita.
6. **No navegador, só valores públicos:** a URL e a chave pública. O código recusa chave secreta (`sb_secret_` ou JWT com papel `service_role`). O segredo do cliente OAuth do Google fica só no painel do Supabase.
7. **Erros do serviço não são exibidos:** a tela mostra mensagem genérica (seção 11).

## Pendências do responsável (antes de configurar)

- **Contas pessoais ou institucionais?** No Google Cloud, o tipo "Interno" aceita só contas da organização (exige Google Workspace institucional); o "Externo" aceita qualquer conta Google. Em "Testing", só os usuários de teste cadastrados entram.
- **Aprovação institucional** para guardar e-mail e nome dos usuários no Supabase (dado pessoal, LGPD; seção 12).
- **Quem pode entrar:** só usuários de teste, ou um domínio de e-mail.

## Consequências

- O app ganha um chunk de ~55 kB (gzip), carregado só com o login configurado. O pacote principal passou de 95,6 kB para 101,7 kB (gzip).
- O Supabase guarda e-mail e nome de quem entrar (`auth.users`).
- O plano gratuito do Supabase pausa projetos parados há cerca de uma semana; confirmar os limites vigentes antes de criar o projeto.
- Os passos de configuração estão em `documentacao/implantacao.md`, seção 4.
