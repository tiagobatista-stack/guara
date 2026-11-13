# GUARÁ — Gestão Unificada de Análises, Rotinas e Apoio

O GUARÁ é um estagiário digital mobile first que apoia a análise de processos. A identidade visual é a **Fofofauna** de Mato Grosso: ariranha (Amazônia), lobo-guará (Cerrado) e capivara (Pantanal). O sistema não substitui sistemas institucionais e não decide pelo profissional.

> Projeto didático. Usa **somente dados fictícios**.

## Mapa do repositório

| Pasta | Conteúdo |
|---|---|
| `aplicacao/` | Frontend React + TypeScript + Vite + Tailwind |
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
npm install
npm run dev
```

Abra a URL exibida e acesse **Saúde do sistema** no menu.

```bash
npm test
```

```bash
npm run build
```

## Situação

Ver [gestao/STATUS.md](gestao/STATUS.md).
