# Implantação

**Situação:** nada foi implantado. Este documento lista os passos previstos; cada passo marcado com 🔒 exige autorização humana.

1. Instalar o Node.js LTS no ambiente de desenvolvimento.
2. 🔒 Criar o projeto Supabase na região `sa-east-1` (https://supabase.com/dashboard). Exige conta e aceite dos termos.
3. Instalar o Supabase CLI, aplicar as migrações de `backend/supabase/migrations/` e publicar as Edge Functions `orquestrador` e `saude`.
4. 🔒 Configurar o Google OAuth: projeto no Google Cloud, tela de consentimento e URL de retorno do Supabase.
5. Guardar os segredos **somente** no cofre do Supabase (`supabase secrets set`). No frontend, apenas a URL e a chave `anon`, via variáveis `VITE_*`.
6. Build do frontend (`npm run build`) e hospedagem estática (a definir).
7. 🔒 Criar o repositório remoto no GitHub e convidar o colaborador.
