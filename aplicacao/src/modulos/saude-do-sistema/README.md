# Saúde do sistema (seção 9.7)

Exibe catálogo de agentes e habilidades, executa os autotestes e mostra estados OK / ATENÇÃO / FALHA / NÃO TESTADO.

- Entradas: catálogo em `backend/supabase/functions/_compartilhado/` e casos de `dados-ficticios/`.
- Saídas: estados por componente, com detalhe e duração.
- Modo atual: **local** (autotestes rodam no navegador). Sem Supabase, indicadores de banco, execuções reais e gate de 24 h/7 d ficam NÃO TESTADO.
- Regra: nenhum estado OK sem teste executado de fato.
