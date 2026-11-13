# Decisão: alinhar o GUARÁ à Apostila FluxoLab

- **Data:** 13/11/2026
- **Situação:** aceita (decisão do usuário)

## Contexto

O planejamento do GUARÁ está vinculado à `Apostila_FluxoLab_Claude_Code.md` (oficina SEMA-MT de 13/11/2026). A apostila define as entregas que serão avaliadas:

- **Obrigatórias:** app React funcional; CRUD; Kanban; indicadores; alertas locais; testes; GitHub; URL pública no Vercel.
- **Avançadas:** `CLAUDE.md`; 3 skills; 3 subagentes; 6 padrões de orquestração; servidor MCP local; hook; inspeção de plugins.
- **Arquitetura obrigatória:** React + Vite + TypeScript, CSS próprio leve, localStorage, Vitest, Git e GitHub, Vercel. Evitar backend e excesso de dependências.
- **Opcional, depois do Vercel:** Supabase com autenticação, PostgreSQL e RLS.

## Decisões

1. A apostila governa o MVP e as entregas da aula. O planejamento v1.3 governa a visão de longo prazo.
2. O Tailwind é substituído por **CSS próprio**.
3. Persistência em **localStorage** agora. O **Supabase** vem só depois do GitHub e do Vercel, em branch separada, sem substituir a versão estática.
4. A tela **Saúde do sistema** e o catálogo de agentes e habilidades continuam como diferencial avaliado.

## Correspondência apostila × GUARÁ

| Apostila (FluxoLab) | GUARÁ |
|---|---|
| `docs/PLANO.md` (P02) | `planejamento/PLANO.md` |
| `docs/ACEITE-MVP.md` (P07) | `metodologia/evidencias/ACEITE-MVP.md` |
| `docs/RELATORIO-FINAL.md` (P13) | `documentacao/RELATORIO-FINAL.md` |
| `fluxolab-dados.json` | `guara-dados.json` |
| Navegação Dashboard, Demandas, Kanban, Alertas | Dashboard, Demandas, Kanban, Alertas e Saúde do sistema |
| skill `testar-fluxolab` | `testar-sistema` |
| skill `revisar-interface` | `revisar-interface` |
| skill `validar-pds` | `validar-pds` |
| `arquiteto-fluxolab`, `implementador-fluxolab`, `auditor-fluxolab` | `arquiteto`, `implementador`, `auditor` |
| sentinela `FLUXOLAB_HOOK_TEST_BLOCK` / `FLUXOLAB_OK` | `GUARA_HOOK_TEST_BLOCK` / `GUARA_OK` |
| hook em Node.js | hook em Python hoje; portar para Node quando houver Node (P11) |
| MCP local lendo o JSON exportado | `servidor-mcp/` (a criar, P10) |
| 4 status: A Fazer, Em Andamento, Em Validação, Concluída | mesmos 4 status (substituem `aberta`, `em-analise`, `aguardando-revisao` e `concluida`) |

## Consequências

- A Etapa 2 do planejamento deixa de incluir o Supabase. Login, RLS e o orquestrador em Edge Functions passam para depois do Vercel.
- O modelo de demanda e os dados fictícios passam para o modelo da apostila. Os autotestes afetados precisam ser ajustados, com teste executado.
- Nada disso pode ser verificado enquanto o Node.js não estiver instalado.
