# Arquitetura — GUARÁ

Registro das decisões da Etapa 1 (seção 16). As decisões ficam detalhadas, uma por arquivo, em `gestao/decisoes/`.

## 1. Diagnóstico do ambiente (13/11/2026)

| Ferramenta | Situação | Impacto |
|---|---|---|
| Windows 11 Home 10.0.26200, PowerShell 5.1, Git Bash | disponível | — |
| Git 2.56.0 | disponível | versionamento local OK |
| Python 3.12.10 | disponível | usado pelo hook de desenvolvimento |
| GitHub CLI 2.103.3 | instalado (autenticação não verificada) | nenhuma ação no GitHub sem autorização |
| winget 1.29 | disponível | pode instalar o Node.js, se autorizado |
| **Node.js / npm / npx** | **ausente** | **impede instalar dependências, build, testes e rodar o app** |
| Supabase CLI | ausente | migrações e Edge Functions locais não executáveis |
| Deno | ausente | Edge Functions não executáveis localmente |

## 2. Arquitetura recomendada

Camadas (seção 8.2): interface (PWA React), núcleo, orquestração, módulos de domínio, adaptadores de integração e persistência (PostgreSQL).

```
Navegador (React/Vite, estático, sem segredos)
   │  sessão Supabase Auth (Google OAuth) — pendente
   ▼
Edge Function orquestrador ── valida sessão, permissões, fluxo
   │
   ├─ agentes/ (triagem, documental, analista, prazos, redator, revisor)
   │     └─ habilidades/ (10, determinísticas no MVP; contrato + autoteste)
   │           └─ ferramentas/ (banco com RLS, arquivos, MCP)
   ├─ gate-de-qualidade/ (esquema, fontes, revisão; até 2 tentativas)
   └─ saude/ (verificação da seção 9.7 → verificacoes_saude)
```

## 3. Decisões registradas

| # | Decisão | Situação |
|---|---|---|
| D1 | **Na evolução depois do Vercel** (ver D10), o orquestrador roda em **Supabase Edge Functions**, com segredos no cofre do Supabase. A alternativa FastAPI fica reservada a processamento documental que não caiba nas Edge Functions. | decidido para a evolução (reversível) |
| D2 | Stack do frontend: React + TypeScript + Vite + **CSS próprio leve** (o Tailwind foi substituído em 13/11/2026 por exigência da apostila), com testes em Vitest. | decidido |
| D3 | O código do catálogo (`backend/supabase/functions/_compartilhado/`) é TypeScript puro, sem APIs de Node ou Deno, e é **o mesmo** carregado pela tela Saúde do sistema (Vite), pelos testes (Vitest) e, no futuro, pela Edge Function `saude` (Deno). Assim não há duas versões do catálogo. | decidido |
| D4 | Os dados fictícios ficam em módulos `.ts` (`dados-ficticios/*.ts`), não em JSON. Isso evita a diferença de import de JSON entre Vite e Deno (`with { type: "json" }`). | decidido |
| D5 | Enquanto não houver Supabase, a tela Saúde do sistema roda os autotestes **no navegador** e mostra a faixa "Modo local — sem Supabase". Indicadores que dependem de banco aparecem como NÃO TESTADO ou "sem dados". | decidido |
| D6 | O MVP não usa IA paga: todas as habilidades são `deterministico`. | decidido |
| D7 | Repositório Git local. Remoto no GitHub (`tiagobatista-stack`) só com autorização. | decidido |
| D8 | O GovFlow AI Lab é um repositório separado e não é dependência em tempo de execução. | decidido |
| D9 | O frontend estático é publicado no **Vercel**, importado do repositório GitHub. Origem: entrega obrigatória da apostila FluxoLab (P12). O Vercel serve só o build estático (`aplicacao/dist`): o orquestrador e os segredos ficam no Supabase. Ordem de publicação: build aprovado, depois GitHub, depois Vercel, depois Supabase. Detalhes em `gestao/decisoes/2026-11-13-hospedagem-vercel.md`. | decidido (exige contas: autorização humana) |
| D10 | **A Apostila FluxoLab governa o MVP e as entregas da aula.** Arquitetura: React + Vite + TS, CSS próprio, **localStorage** (sem backend, login ou banco na entrega principal), Vitest, GitHub e Vercel. Funcionalidades: CRUD, Kanban de 4 status, dashboard, filtros, alertas locais de inatividade, exportação e importação JSON, MCP local e hook com sentinela. O Supabase é **evolução opcional depois do Vercel**, em branch separada. O planejamento v1.3 continua valendo como visão de longo prazo (mascotes, agentes, tela Saúde do sistema). Detalhes em `gestao/decisoes/2026-11-13-alinhamento-apostila.md`. | decidido pelo usuário em 13/11/2026 |

## 4. Decisões em aberto

- **Demanda piloto do MVP** (seção 4): a escolher. Os dados fictícios usam por enquanto "licenciamento — renovação de licença" só como exemplo.
- **Contas Google pessoais ou institucionais** e aprovação institucional para usar o Supabase.
- **Contexto institucional** (SEMA-MT): a confirmar.
- **Ocorrência das espécies** dos mascotes nos biomas: a confirmar.
- **Documento oficial do PDS:** não fornecido. A skill `validar-pds` é apenas didática.

## 5. Stack e dependências

| Dependência | Motivo | Licença |
|---|---|---|
| React, React DOM | interface componentizada | MIT |
| TypeScript | tipagem | Apache-2.0 |
| Vite + @vitejs/plugin-react | desenvolvimento e build rápidos | MIT |
| ~~Tailwind CSS~~ | removido (D2/D10): estilo em CSS próprio, sem dependência | — |
| Vitest + Testing Library + jsdom | testes de lógica e componentes | MIT |

As versões serão resolvidas pelo `npm install` quando o Node.js estiver disponível. Nenhuma versão foi validada ainda.

## 6. Custos, limites e riscos

- O plano gratuito do Supabase pausa o projeto após cerca de 7 dias sem uso, tem cotas reduzidas e não oferece PITR. Os valores devem ser confirmados na página oficial de preços. Região prevista: `sa-east-1`.
- O Vercel exige uma conta ligada ao GitHub, com acesso da integração só a este repositório. Os limites do plano gratuito devem ser confirmados na página oficial. O Vercel serve arquivos estáticos e não tem banco; o `localStorage` não é sincronizado entre navegadores.
- Google OAuth exige um projeto no Google Cloud e uma tela de consentimento, com intervenção humana.
- **Risco atual:** sem Node.js não há como provar que o app compila nem que os testes passam.
- Risco de confundir dados reais com fictícios: mitigado com a marcação `ficticio` e o prefixo `FIC-`.

## 7. O que é automatizável e o que exige intervenção humana

| Automatizável pelo Claude Code | Exige intervenção humana |
|---|---|
| Código, testes, documentação, migrações em SQL e hooks | Instalar o Node.js (ou autorizar o winget) |
| Build e testes locais (com Node) | Criar a conta e o projeto Supabase e aceitar os termos |
| Commits locais | Criar o projeto Google Cloud e o OAuth |
| | Criar o repositório GitHub (`gh auth login`), fazer push e convidar o colaborador |
| Preparar o build para o Vercel (Root Directory `aplicacao`) | Criar a conta no Vercel e importar o repositório |
| | Escolher a demanda piloto e obter aprovação institucional |

## 8. Escopo e critérios de aceite do MVP

Ver as seções 16 (MVP-0 e MVP-1) e 17 do planejamento. Critério antecipado nesta etapa: a tela Saúde do sistema exibe todos os agentes e habilidades, e "Executar verificação" produz estados reais.
