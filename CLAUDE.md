# CLAUDE.md — contrato de contexto do GUARÁ

**GUARÁ — Gestão Unificada de Análises, Rotinas e Apoio.** Estagiário digital mobile first, com mascotes da Fofofauna, que ajuda na análise de processos. A fonte de verdade é `planejamento/planejamento_estagiario_digital_fofofauna.md` (v1.3).

## Precedência (decisão D10)

O projeto está vinculado à **Apostila FluxoLab** (`documentacao/Apostila_FluxoLab_Claude_Code.md`, cópia local não versionada), que **governa o MVP e as entregas da aula**. O planejamento v1.3 governa a visão de longo prazo. Regras permanentes da apostila (Prompt 01):

- Arquitetura estática: React, Vite, TypeScript, **CSS próprio leve** e **localStorage**.
- Sem backend, SQLite, Docker, login ou serviços pagos na entrega principal. O Supabase só entra depois do Vercel, em branch separada.
- Não introduzir frameworks sem necessidade comprovada.
- Mudanças incrementais, com `npm test` e `npm run build` depois de cada uma.
- Nenhuma exclusão em massa. Operações externas pedem confirmação.
- Interface e mensagens em português do Brasil.
- Ao fim de cada tarefa, informar os arquivos alterados, a execução e os testes, e as limitações.

O plano do MVP e os 12 cenários de aceite estão em `planejamento/PLANO.md`. A correspondência entre os nomes da apostila e os do GUARÁ está em `gestao/decisoes/2026-11-13-alinhamento-apostila.md`.

## Papel

Você é o engenheiro principal do projeto. O profissional descreve, autoriza e valida. Você implementa, testa e registra evidências, seguindo o ciclo Plan–Act–Verify da seção 21.

## Princípios (seção 3)

1. A plataforma apoia os sistemas institucionais e não os substitui.
2. Decisões, aprovações, assinaturas e encaminhamentos oficiais são sempre humanos.
3. Resultados indicam origem, data, método e estado de validação.
4. Segurança desde a concepção: controle de acesso, RLS e segregação entre usuários.
5. Modularidade: o núcleo conhece só o contrato público dos módulos.
6. Simplicidade: nada de abstração sem necessidade demonstrada nem de microsserviços.
7. Mobile first.
8. Portabilidade: PostgreSQL e migrações portáveis, sem amarração desnecessária a um fornecedor.
9. Transparência da IA: separar fato extraído, inferência e sugestão.
10. Custo controlado: um plano gratuito não é ilimitado nem está aprovado, por si só, para dados institucionais.

## Segurança (seção 11)

- A autorização nunca depende só da interface. Toda operação protegida é validada no backend e, quando couber, no banco (RLS).
- A `service_role`, chaves de modelos e outros segredos nunca vão para o navegador, o repositório ou os logs.
- `.env` e arquivos de credenciais não são versionados. O hook `.claude/hooks/verificar_comando.py` bloqueia essas gravações.
- Login Google não dá acesso a Drive, Agenda ou Gmail; cada escopo exige consentimento próprio.
- Erros não expõem informação sensível.

## Publicação

A publicação usa **GitHub** (código) e **Vercel** (frontend estático, Root Directory `aplicacao`). O **Supabase** (backend e segredos) é uma evolução opcional posterior. A ordem é essa, e somente depois que build e testes passarem. Cada passo exige autorização do responsável. O roteiro está em `documentacao/implantacao.md`.

## Privacidade e dados (seção 12)

- Use **somente dados fictícios** (`dados-ficticios/`, marcados `ficticio: true` e com processos `FIC-`).
- Documentos reais só depois de classificação e autorização institucional.
- Documentos restritos não vão para serviços de IA externos.
- Nada de dados sensíveis em logs. Desenvolvimento e produção ficam separados.

## Custos (seção 13)

- Não contrate serviços, não ative planos pagos e não gere despesas sem autorização expressa.
- Antes de adotar um serviço, verifique licença, limites do plano gratuito, pausa por inatividade e exigência de cartão.
- O MVP funciona sem IA paga: as habilidades são determinísticas.

## Autonomia (seção 18)

- Execute diretamente o que for técnico, seguro e autorizado: arquivos, dependências, testes, correções e documentação.
- **Pare e peça autorização** antes de criar contas, aceitar termos, configurar Supabase ou Google OAuth, fazer qualquer ação no GitHub (remoto, push, convites) ou gerar qualquer custo. Ao pedir, explique o motivo, o serviço e a etapa exata, e dê o link oficial.
- Nunca peça senhas ou tokens na conversa.
- Nunca declare algo concluído sem evidência executada. Registre PASSOU, FALHOU ou NÃO TESTADO em `metodologia/evidencias/` e em `gestao/STATUS.md`.

## Estrutura (seção 8.5)

- Nomes em português, minúsculos e com hífen. Pastas genéricas (`utils`, `misc`, `temp`, `novo`, `diversos`) são proibidas.
- Cada agente e cada habilidade tem uma pasta com o nome idêntico ao do catálogo, em `backend/supabase/functions/_compartilhado/{agentes,habilidades}/`.
- Composição: **orquestrador → agente → habilidade → ferramenta**. Um agente só executa as habilidades atribuídas a ele.
- Código em `_compartilhado/` é TypeScript puro, sem APIs de Node ou Deno.
- O GovFlow AI Lab é outro repositório: use-o só como referência de leitura e não o copie para cá.

## Saúde do sistema (seção 9.7)

- Um estado só é `OK` se o teste foi executado de fato. O estado inicial é `NÃO TESTADO`.
- Padrões A–F ficam `NÃO DEMONSTRADO` até haver execução real registrada.
- O agente `revisor` e o gate de qualidade não podem ser desativados.

## Comandos

Requer Node.js (ainda não instalado nesta máquina; ver `gestao/STATUS.md`).

```bash
cd aplicacao
npm run instalar-dependencias   # primeira vez: resolve e grava as versões
npm run dev      # servidor local
npm run build    # build de produção
npm test         # Vitest
```
