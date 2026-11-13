# Decisão: orquestrador em Supabase Edge Functions

- **Data:** 13/11/2026
- **Situação:** aceita, reversível

## Contexto

A seção 8.4 do planejamento exige que o frontend seja estático, sem segredos, e que o orquestrador rode no servidor.

## Opções

1. **Supabase Edge Functions** (Deno): segredos no cofre do Supabase, acesso ao banco sujeito a RLS e nenhum servidor próprio para manter.
2. **Backend próprio em FastAPI:** mais liberdade para bibliotecas de PDF e geoprocessamento, mas exige hospedagem e operação próprias.

## Decisão

Opção 1. O código de agentes e habilidades é escrito em TypeScript puro, para rodar tanto no Deno quanto no navegador (modo local da tela Saúde do sistema).

## Consequências

- Se a extração de PDF não couber nas Edge Functions, a habilidade `extrair-documento` poderá migrar para um serviço FastAPI sem mudar seu contrato.
- Depende da criação do projeto Supabase, que ainda está pendente de autorização.
