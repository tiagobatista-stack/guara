# Evidência — avaliação e preparo da migração para o Supabase de desenvolvimento (15/11/2026)

**Pedido do responsável:** "avalie a aplicação da migração para o supabase". Método escolhido pelo responsável: **SQL Editor** do painel (sem CLI e sem token na máquina). Branch `supabase-banco`.

Nada foi enviado ao Supabase nesta etapa. A aplicação no projeto real é feita pelo responsável.

## Avaliação da migração `20261114180000_demandas.sql`

- **Pronta para aplicar.** RLS nas três tabelas, políticas com `(select auth.uid())`, `revoke` explícito dos privilégios padrão do Supabase para `anon` e `authenticated`, histórico só com leitura e inclusão, `ficticio` obrigatório, nenhum dado inserido. Cabe no plano Free.
- **O que o teste local não provava:** o `auth.uid()` real lê `request.jwt.claims` (JSON), o `auth.users` real tem mais colunas e o Supabase concede privilégios padrão no esquema `public`. O roteiro novo cobre os três pontos.
- **Pontos menores:** `configuracoes.atualizado_em` não se atualiza sozinho (sem gatilho); a migração não é idempotente (rodar duas vezes falha sem alterar nada); pelo SQL Editor ela não entra no histórico do CLI. Se o CLI vier depois: `supabase migration repair --status applied 20261114180000`.
- **Pendente do responsável:** confirmar região `sa-east-1` e plano Free sem cartão.

## Roteiro para o SQL Editor

`backend/supabase/testes/verificar-rls-supabase.sql`: um único bloco que cria Ana e Beto (fictícios) em `auth.users`, confere estrutura, privilégios e comportamento, e termina com um **erro proposital** que desfaz tudo. A mensagem do erro é o relatório.

## Verificações

| # | Verificação | Como | Resultado | Situação |
|---|---|---|---|---|
| 1 | Roteiro num PostgreSQL local com `auth.uid()` igual ao do Supabase (lê `request.jwt.claims`) e privilégios padrão concedidos a `anon` e `authenticated` | PGlite 0.5.14, ensaio fora do repositório | "GUARÁ RLS: 34 PASSOU, 0 FALHOU" | PASSOU |
| 2 | O roteiro não deixa rastro | contagem depois do erro proposital | usuários 0, demandas 0, eventos 0 | PASSOU |
| 3 | **Contraprova:** sem `enable row level security` em `demandas` | mesmo ensaio | 5 FALHOU (RLS ligada, Beto vê, altera, apaga e grava em nome da Ana) | PASSOU |
| 4 | Teste local da migração continua | `cd backend/supabase && npm run testar` | "TODAS AS VERIFICAÇÕES PASSARAM" (23) | PASSOU |
| 5 | Migração aplicada no projeto Supabase de desenvolvimento | SQL Editor, pelo responsável | — | NÃO TESTADO |
| 6 | Roteiro rodado no Supabase real | SQL Editor, pelo responsável | — | NÃO TESTADO |

## Limitações

- Os itens 5 e 6 dependem do responsável. Se a inserção em `auth.users` for recusada por permissão, o roteiro avisa logo no começo; a saída é criar Ana e Beto em Authentication → Add user e trocar os UUIDs.
- O app continua sem usar o banco.
