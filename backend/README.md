# Backend

Opção padrão (seção 8.4): Supabase Edge Functions (Deno). Supabase **ainda não configurado** — exige autorização (conta, termos, região sa-east-1).

## Banco de dados (branch `supabase-banco`)

- `supabase/migrations/`: migrações SQL versionadas, no formato do Supabase CLI (`AAAAMMDDHHMMSS_nome.sql`). PostgreSQL comum; só `auth.uid()` e os papéis `anon` e `authenticated` são do Supabase.
- `20261114180000_demandas.sql`: tabelas `demandas`, `eventos_demanda` (histórico, só acrescenta) e `configuracoes`, todas com RLS por dono. Anônimo não tem acesso. `ficticio` é obrigatoriamente verdadeiro até haver autorização institucional (seção 12).
- `supabase/testes/testar-migracoes.ts`: aplica as migrações num PostgreSQL local (PGlite, dentro do Node, sem servidor, conta ou Docker) e confere a RLS com dois usuários fictícios.

```bash
cd backend/supabase
npm ci          # primeira vez
npm run testar  # aplica as migrações e roda as verificações
```

Aplicar no Supabase de verdade (criar o projeto, `supabase link`, `supabase db push`) só depois de autorização do responsável, passo a passo, conforme `documentacao/implantacao.md`.
