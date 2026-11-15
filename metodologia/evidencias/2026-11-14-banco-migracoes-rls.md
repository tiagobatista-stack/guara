# Evidência — migrações do banco e RLS testadas localmente (14/11/2026)

**Pedido do responsável:** "vá para o próximo item" (banco de dados no Supabase, definido como próximo depois da coordenada). Feito na branch `supabase-banco`, criada da `main` (`f308b06`). Decisões em `gestao/decisoes/2026-11-14-banco-supabase.md`.

Nenhuma conta foi criada, nenhum termo aceito e nada foi enviado ao Supabase.

| Mudança | Arquivo |
|---|---|
| Migração: `demandas`, `eventos_demanda` e `configuracoes`, com restrições do modelo, RLS por dono e nenhum acesso anônimo | `backend/supabase/migrations/20261114180000_demandas.sql` (novo) |
| Teste: PGlite (PostgreSQL no Node), imitação do `auth` e dos papéis do Supabase, dois usuários fictícios | `backend/supabase/testes/testar-migracoes.ts` (novo) |
| Dependência de desenvolvimento, versão fixa: `@electric-sql/pglite` 0.5.14 (Apache-2.0, publicada em 31/10/2026) | `backend/supabase/package.json`, `package-lock.json` |
| Como rodar e o que falta | `backend/README.md` |

## Verificações

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Migração aplicada num PostgreSQL de verdade | `cd backend/supabase && npm run testar` | `PASSOU · migração aplicada: 20261114180000_demandas.sql` | PASSOU |
| 2 | Isolamento entre usuários: Beto não vê, não altera, não apaga e não grava em nome da Ana (demandas, histórico e configuração) | idem | 8 verificações PASSOU (RLS: "new row violates row-level security policy") | PASSOU |
| 3 | Anônimo não lê nem grava | idem | "permission denied for table demandas" | PASSOU |
| 4 | Regras no banco: não fictício, título curto, status fora da lista, coordenada pela metade, detalhe sem bloqueio, concluída travada, limiar fora de 1 a 365 | idem | 7 recusas por restrição | PASSOU |
| 5 | Histórico só acrescenta; excluir a demanda leva o histórico | idem | update e delete: "permission denied"; cascata ok | PASSOU |
| 6 | Total | idem | 23 verificações, "TODAS AS VERIFICAÇÕES PASSARAM" | PASSOU |
| 7 | **Contraprova:** sem `enable row level security` em `demandas`, o teste acusa? | idem, com a linha comentada e depois restaurada | 4 FALHOU ("Beto não vê…", "não altera", "não apaga", "não grava em nome da Ana"); restaurada: todas passaram | PASSOU |

## Limitações

- **Não aplicado no Supabase:** não há projeto. O `auth.uid()` do teste imita o do Supabase (lê `request.jwt.claim.sub`); a conferência no Supabase real fica para depois da autorização.
- O app ainda não usa o banco: não há código de leitura nem gravação no Supabase.
- As permissões padrão do Supabase no esquema `public` são revogadas explicitamente na migração; isso só foi testado contra a imitação.
- Ambiente: Node v26.13.1, PGlite 0.5.14.
