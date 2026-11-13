# Decisão: frontend publicado no Vercel a partir do GitHub

- **Data:** 13/11/2026
- **Situação:** aceita. A execução depende de autorização humana (contas e termos).

## Contexto

A apostila FluxoLab (P12, checkpoint C) exige como entrega um repositório GitHub e uma URL pública no Vercel. O planejamento v1.3 cita o GitHub e o Supabase, mas deixou a hospedagem do frontend "a definir".

## Decisão

1. O frontend (`aplicacao/`) é publicado como site estático no **Vercel**, importado do repositório GitHub pessoal de `tiagobatista-stack`.
2. O backend continua no **Supabase** (decisão D1). O Vercel não roda o orquestrador e não guarda segredos.
3. Ordem: build e testes aprovados, depois GitHub, depois Vercel, depois Supabase. Não se publica nada sem build aprovado (padrão F).

## Configuração prevista no Vercel

Importar em https://vercel.com/new com:

| Campo | Valor |
|---|---|
| Framework | Vite |
| Root Directory | `aplicacao` |
| Include files outside the Root Directory | **ativado** (o app importa `../backend/supabase/functions/_compartilhado` e `../dados-ficticios`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

- Não é preciso `vercel.json`: as rotas usam hash (`#/saude-do-sistema`).
- Variáveis de ambiente, quando houver Supabase: só `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A `service_role` **nunca** vai para o Vercel.
- A integração GitHub do Vercel deve ter acesso só a este repositório, nunca à conta ou organização inteira.

## Consequências e riscos

- Os limites do plano gratuito do Vercel devem ser confirmados na página oficial antes do uso.
- Até o Supabase ser configurado, a URL pública roda a tela Saúde do sistema em **modo local** (autotestes no navegador) e sem login. Usar só dados fictícios.
- Se o Vercel falhar, o plano B da apostila é manter o repositório GitHub com build aprovado e registrar a publicação como pendente, sem afirmar que existe uma URL.
