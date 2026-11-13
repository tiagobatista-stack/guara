# GUARÁ — Gestão Unificada de Análises, Rotinas e Apoio

O GUARÁ é um estagiário digital mobile first que apoia a análise de processos. A identidade visual é a **Fofofauna** de Mato Grosso: ariranha (Amazônia), lobo-guará (Cerrado) e capivara (Pantanal). O sistema não substitui sistemas institucionais e não decide pelo profissional.

> Projeto didático da oficina **FluxoLab** (SEMA-MT). Usa **somente dados fictícios**. A apostila governa o MVP: localStorage, CRUD, Kanban, alertas, GitHub e Vercel. Plano em [planejamento/PLANO.md](planejamento/PLANO.md).

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

Requisito: **Node.js 20 LTS ou superior**. Ele ainda não está instalado nesta máquina; ver `gestao/STATUS.md`.

```bash
cd aplicacao
npm run instalar-dependencias
npm run dev
```

O `npm run instalar-dependencias` só é necessário na primeira vez: ele resolve as versões e grava `package.json` e `package-lock.json`. Depois, `npm install` basta.

Abra a URL exibida e acesse **Saúde do sistema** no menu.

```bash
npm test
```

```bash
npm run build
```

## Situação

Ver [gestao/STATUS.md](gestao/STATUS.md).
