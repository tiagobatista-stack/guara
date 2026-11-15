# Decisão — banco de dados no Supabase: primeiro as migrações, testadas localmente (14/11/2026)

**Pedido do responsável:** "a próxima etapa após a criação do campo coordenadas é a criação do banco de dados no Supabase".

## Decisões

1. **Branch separada `supabase-banco`**, criada a partir da `main` (decisão D10: o Supabase entra depois do Vercel, fora da entrega principal). O app continua 100% local até a integração ser decidida.
2. **Primeiro passo sem custo nem conta:** as tabelas e a RLS em migrações SQL versionadas (`backend/supabase/migrations/`), no formato do Supabase CLI.
3. **Teste num PostgreSQL de verdade, sem Docker:** PGlite 0.5.14 (Apache-2.0), dependência só de desenvolvimento em `backend/supabase/package.json`, fora do app. O teste imita o esquema `auth` e os papéis `anon` e `authenticated` do Supabase.
4. **Modelo:** espelha o do app (`planejamento/PLANO.md` §2). Chave `(dono, id)`, para o mesmo id do app existir para pessoas diferentes. Bloqueio e coordenada em colunas (não JSON), com restrições que repetem as regras do app (concluída não fica travada; coordenada completa). Histórico em tabela própria, só com leitura e inclusão.
5. **Dados fictícios obrigatórios no banco** (`ficticio` precisa ser verdadeiro), reforçando a seção 12 até haver autorização institucional.

## Plano: só o gratuito (decisão do responsável, 14/11/2026)

"O banco de dados será no limite do plano gratuito." Limites do plano Free conferidos em https://supabase.com/pricing em 14/11/2026 (mudam com o tempo; conferir de novo antes de criar o projeto):

| Limite | Plano Free | O que muda no GUARÁ |
|---|---|---|
| Banco | 500 MB por projeto | Folga grande: as demandas são texto curto e o histórico tem teto de 500 eventos por demanda. Documentos não vão para o banco. |
| Projetos ativos | 2 | Um para desenvolvimento e um para produção (seção 12: ambientes separados). Não sobra um terceiro. |
| Pausa | após 1 semana sem uso | O app precisa continuar funcionando só com o local quando o projeto estiver pausado; reativar é manual, no painel. |
| Backups automáticos | não incluídos | O JSON exportado pela tela Alertas continua sendo o backup. Vale exportar com frequência. |
| Arquivos (Storage) | 1 GB | Sem uso previsto agora. |
| Tráfego de saída | 5 GB (mais 5 GB em cache) | Folga grande para texto. |
| Usuários ativos por mês | 50.000 | Folga grande. |
| Edge Functions | 500.000 chamadas | Folga grande para o orquestrador. |
| Cartão de crédito | a página não informa | Conferir na criação da conta; **não cadastrar cartão** nem ativar plano pago sem autorização expressa. |

Consequência para o código: nada pode depender de recurso pago (backups gerenciados, réplicas, add-ons), e o app não pode quebrar com o banco pausado.

## Ainda não decidido

- Criar a conta e o projeto no Supabase (região, plano gratuito e seus limites, pausa por inatividade): **pede autorização**.
- Como o app passa a usar o banco: sincronização com o localStorage, ou o banco como fonte e o local como cópia. Depende do login (branch `login-google`, que precisa ser trazida para cá).
- Tabelas de rastreabilidade da seção 9.5 (`execucoes`, `etapas_execucao`, `evidencias`, `revisoes`): ficam para quando o orquestrador rodar no servidor.
