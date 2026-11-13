# Metodologia e técnicas de prompting (seção 21)

## Método: prompting orientado a evidências

O profissional descreve, autoriza e valida. O Claude Code escreve o código, configura as ferramentas e executa os testes. Nenhuma etapa é considerada concluída por afirmação do modelo, somente por evidência verificável: arquivo, teste executado, registro de ferramenta ou demonstração no navegador.

Ciclo **Plan–Act–Verify**:

1. **Planejar:** objetivo, limites e critérios de aceite.
2. **Agir:** implementação incremental.
3. **Verificar:** testes, build e conferência das evidências (`metodologia/evidencias/`).
4. **Criticar e revisar:** auditar falhas, corrigir e repetir a regressão.

## Técnicas e onde aparecem

| Técnica | Aplicação na proposta | Onde aparece no sistema |
|---|---|---|
| Role prompting | Claude Code como engenheiro principal | Campo `papel` de cada agente (`_compartilhado/agentes/*`) |
| Engenharia de contexto | Planejamento + `CLAUDE.md` | `CLAUDE.md`; contexto restrito à demanda em curso |
| Zero-shot | Primeira versão do plano | Classificação inicial (`classificar-demanda`) |
| Decomposição / prompt chaining | Etapas e MVP-0/MVP-1 | Fluxo sequencial (seção 9.4) |
| Specification / contract prompting | Critérios de aceite | `contrato.ts` de cada habilidade (entrada, saída, critérios) |
| Few-shot | Imagem de referência de layout | `identidade-visual/referencias/`; exemplos de checklist |
| Plan–Act–Verify | Planejamento antes de editar | Gate de qualidade |
| Critique–Revise | Revisão v1.1 → v1.2 | Agente `revisor`; subagente `auditor` |
| Delegation prompting | Delegação a subagentes | `.claude/agents/` (arquiteto, implementador, auditor) |
| Tool-grounded prompting | Conferência nos arquivos reais do laboratório | Autotestes realmente executados na tela Saúde do sistema |
| Guardrails | Segurança, custo, dados fictícios | Hook `verificar_comando.py`, permissões mínimas, aprovação humana |

## Distinções

- **Prompt:** instrução pontual.
- **`CLAUDE.md`:** contexto persistente.
- **Skill:** procedimento reutilizável.
- **Agente:** executor especializado.
- **MCP:** interface de ferramentas e dados.
- **Hook:** reação programática a um evento real.
- **Plugin:** pacote de extensões.

Um texto afirmando que uma ferramenta foi consultada não prova que ela foi chamada.
