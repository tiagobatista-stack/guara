# CHANGELOG

## [0.1.0] — 13/11/2026

### Adicionado

- Estrutura semântica de pastas (seção 8.5), com READMEs de domínio.
- `CLAUDE.md`, `ARQUITETURA.md` (decisões D1 a D8), `STATUS.md`, `equipe.md` e `tecnicas.md`.
- Catálogo tipado com 6 agentes e 10 habilidades determinísticas, cada uma com contrato, implementação e autoteste sobre dados fictícios.
- Validador de esquema, verificação de saúde, fluxo padrão (seção 9.4) com gate de qualidade e quadro dos padrões A–F.
- Aplicação React/Vite/Tailwind com layout em três áreas e as telas Painel, Demandas, Assistente e Saúde do sistema.
- Testes Vitest. **Ainda não executados:** o Node.js não está instalado.
- `.claude/`: skills `testar-sistema`, `revisar-interface` e `validar-pds` (didática); subagentes `arquiteto`, `implementador` e `auditor`; hook PreToolUse `verificar_comando.py`, com 7 testes Python aprovados.
- O gate de qualidade passa a usar autor e revisor tirados do registro de etapas.
- `dados-ficticios/entregas.ts` para o autoteste de `validar-pds`.
- Decisão D9: frontend no Vercel, importado do GitHub. Ordem de publicação GitHub → Vercel → Supabase, conforme a apostila P12.
- Decisão D10: a Apostila FluxoLab governa o MVP. CSS próprio no lugar do Tailwind; localStorage agora e Supabase opcional depois do Vercel. Novo `planejamento/PLANO.md` com modelo de dados, regras e 12 cenários de aceite.
- Node.js v26.13.1 instalado. Dependências resolvidas sem Tailwind. Correções para TypeScript 7 (`baseUrl` removido; genéricos sem uso em `ContratoHabilidade`). 40/40 testes e build aprovados; o app abre no navegador.
- Fase 2: Tailwind substituído por CSS próprio (`estilos.css`, paleta Fofofauna, claro e escuro, breakpoints em 768, 1024 e 1280 px). Layout conferido em desktop, tablet e smartphone.
- Fase 3: CRUD de demandas em localStorage (modelo da apostila, regras puras, repositório, armazém único, lista com pesquisa e filtros, formulário validado, detalhe, exclusão com confirmação, aviso de corrupção). 55/55 testes.
- Fase 4: Kanban com 4 colunas e menu "Mover para"; Dashboard com total, contagem por status, vencidas e inativas; regra pura de inatividade. 63/63 testes.
- Fase 5: alertas locais com limiar persistido (padrão 3 dias), sino no cabeçalho, exportação e importação de `guara-dados.json` com validação, confirmação e backup, desfazer importação e restaurar exemplos. ACEITE-MVP (P07): 12/12 cenários. 75/75 testes.
- Fase 6 (P08 a P11):
  - skill `testar-sistema` invocada de verdade;
  - padrões A–F por delegação real alternativa (os subagentes registrados não carregaram nesta sessão);
  - correção de `Alertas.tsx` (desfazer importação atualiza o limiar) feita pelo implementador e aprovada pelo auditor;
  - servidor MCP local `guara-dados` (stdio, somente leitura, 3 ferramentas) testado com cliente real;
  - sentinela `GUARA_HOOK_TEST_BLOCK` no hook;
  - inspeção de plugins. 76/76 testes.
- Nome do projeto definido: **GUARÁ** — Gestão Unificada de Análises, Rotinas e Apoio.
