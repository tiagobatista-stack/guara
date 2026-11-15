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

### Aplicar no projeto de desenvolvimento (SQL Editor)

1. No painel do projeto, SQL Editor: colar `migrations/20261114180000_demandas.sql` e rodar. Esperado: "Success. No rows returned".
2. Colar `testes/verificar-rls-supabase.sql` e rodar. Ele termina **sempre com erro, de propósito**: o erro desfaz tudo, e a mensagem traz o relatório `GUARÁ RLS: N PASSOU, 0 FALHOU`.
3. Se um dia o Supabase CLI for usado: `supabase migration repair --status applied 20261114180000`, para ele não tentar aplicar de novo.

Aplicar no Supabase de verdade (criar o projeto, `supabase link`, `supabase db push`) só depois de autorização do responsável, passo a passo, conforme `documentacao/implantacao.md`.
