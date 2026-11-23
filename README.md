# GUARÁ — Gestão Unificada de Análises, Rotinas e Apoio

O GUARÁ é um estagiário digital mobile first que apoia a análise de processos. A identidade visual é a **Fofofauna** de Mato Grosso: ariranha (Amazônia), lobo-guará (Cerrado) e capivara (Pantanal). O sistema não substitui sistemas institucionais e não decide pelo profissional.

> Projeto didático da oficina **FluxoLab** (SEMA-MT). Usa **somente dados fictícios**. A apostila governa o MVP: localStorage, CRUD, Kanban, alertas, GitHub e Vercel. Plano em [planejamento/PLANO.md](planejamento/PLANO.md).

**Versão publicada:** https://guara-lemon.vercel.app (estática; cada navegador tem dados próprios no localStorage).

## Mapa do repositório

| Pasta | Conteúdo |
|---|---|
| `aplicacao/` | Frontend React + TypeScript + Vite + CSS próprio |
| `backend/supabase/functions/_compartilhado/` | Catálogo de **agentes** e **habilidades**: contratos, implementações e autotestes |
| `dados-ficticios/` | Demandas e documentos de exemplo, todos marcados como FICTÍCIO |
| `testes/` | Unidade, integração, interface, autotestes e avaliações de IA |
| `gestao/` | STATUS, CHANGELOG, equipe e decisões |
| `metodologia/` | Técnicas, prompts e evidências (PASSOU, FALHOU ou NÃO TESTADO) |
| `documentacao/` | Arquitetura, implantação e backup |
| `identidade-visual/` | Mascotes e referências de layout |
| `.claude/` | Skills, subagentes e hook usados no desenvolvimento |

## Como iniciar

Requisito: **Node.js 22.12 ou superior** (`engines` de `aplicacao/package.json`); o servidor MCP local exige **Node 23.6 ou superior**, que roda TypeScript nativamente. Testado com Node 26.13.1 e npm 11.20.0 (`npm ci` sem `EBADENGINE`).

```bash
cd aplicacao
npm run instalar-dependencias
npm run dev
```

Com o repositório clonado, `npm ci` (ou `npm install`) instala as versões já gravadas em `package-lock.json`. O `npm run instalar-dependencias` é o roteiro da primeira montagem do projeto e não é necessário num clone.

Abra a URL exibida e acesse **Saúde do sistema** no menu.

```bash
npm test
```

```bash
npm run build
```

## O que foi testado, e o que está publicado

Em 20/11/2026, na branch `operacoes-campo`, a partir do commit `2fd98ad` (mais o `5553c9a` do STATUS), descrito em `metodologia/evidencias/2026-11-20-recomendacoes-relatorio.md`:

- **Testado localmente:** `npm test` (684/684 em 59 arquivos), `npm run build` ok, hook 8/8 (`python -m unittest testes/unidade/test_hook_verificar_comando.py`) e cliente MCP (`node servidor-mcp/testar-servidor.ts`).
- **Commit:** `2fd98ad`, mesclado na `main` pela PR #7 (`b6970c5`).
- **Versão publicada:** `main` `b6970c5`, deploy `success`. A URL serve `index-D807sqTy.js` e `index-B3S3-AIP.css`, iguais aos de um build local da mesma árvore (`metodologia/evidencias/2026-11-20-publicacao-recomendacoes.md`). O roteiro de uso na URL pública (teclado, celular) ainda não foi repetido.
- Teste local, commit e versão publicada são três coisas diferentes; aqui os três foram feitos, mas sem conferência visual.

## Situação

Ver [gestao/STATUS.md](gestao/STATUS.md).
