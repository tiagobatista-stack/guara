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
- Nome do projeto definido: **GUARÁ** — Gestão Unificada de Análises, Rotinas e Apoio.
