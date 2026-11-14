# Evidência — preparação do login Google (14/11/2026)

**Pedido do responsável:** "prepare o projeto para utilizar o login google". Decisão em `gestao/decisoes/2026-11-14-login-google.md`. Trabalho na branch local **`login-google`**; a `main` publicada não mudou.

| Mudança | Arquivo |
|---|---|
| Dependência `@supabase/supabase-js` **2.118.0** (versão fixa, MIT, de 15/10/2026); `npm audit --omit=dev`: 0 vulnerabilidades | `aplicacao/package.json`, `package-lock.json` |
| Regras: `lerConfiguracao` (desligado sem as variáveis; recusa URL inválida, http fora da máquina local e chave secreta), `criarClienteAuth` (PKCE; biblioteca carregada sob demanda), `sessaoAtual`, `ouvirSessao`, `entrarComGoogle` (só provedor e volta, sem escopo extra), `sair`; mensagens genéricas | `aplicacao/src/nucleo/autenticacao.ts` (novo) |
| Botão de conta no rodapé do menu: "Sair" desativado (sem configuração), "Login indisponível" (configuração inválida), "Entrar com Google" ou "Sair" | `aplicacao/src/nucleo/Conta.tsx` (novo), `aplicacao/src/nucleo/Aplicacao.tsx`, ícone `entrar` em `aplicacao/src/compartilhado/Icone.tsx` |
| Tipos das variáveis públicas | `aplicacao/src/variaveis-ambiente.d.ts` (novo) |
| Modelo de configuração (só valores públicos, vazio) | `aplicacao/.env.exemplo` (novo; `.env.local` continua ignorado pelo git) |
| Passos 🔒 de configuração | `documentacao/implantacao.md`, seção 4.1 |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 7 testes unitários novos com cliente falso: desligado; variável faltando, URL inválida e http remoto recusados; `sb_secret_` e JWT `service_role` recusados; chave pública aceita; entrar só com provedor e volta, sem "scope"; erro do serviço vira mensagem genérica; sessão e ouvinte com parada | em `testes/unidade/autenticacao.test.ts` | conferidos na suíte | PASSOU |
| 2 | 5 testes de tela com cliente falso: sem configuração ("Sair" desativado); inválida (motivo no título, cliente não carregado); entrar leva ao Google com a volta; com sessão, "Sair da conta …" e volta a "Entrar"; erro genérico | em `aplicacao/src/nucleo/Conta.test.tsx` | conferidos na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 22 passed (22)` · `Tests 219 passed (219)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`. Pacote principal 101,68 kB gzip (antes 95,61 kB); chunk do Supabase 55,14 kB gzip, carregado só com login configurado | PASSOU |
| 5 | `.env.local` ignorado e `.env.exemplo` versionável | `git check-ignore -v` | `.env.*` ignora `.env.local`; `!.env.exemplo` libera o exemplo | PASSOU |
| 6 | Login real com Google | — | sem projeto Supabase nem cliente OAuth (exigem conta e autorização) | NÃO TESTADO |

**Ajuste durante o trabalho:** na primeira versão, a biblioteca entrava no pacote principal (155,9 kB gzip, +60 kB para todos, mesmo sem login). Passou a ser carregada sob demanda.

## Limitações

- **O login real não foi testado.** Depende dos passos 🔒 da seção 4.1 de `documentacao/implantacao.md`.
- **O login não protege dados.** Os dados continuam no localStorage; não há tabela, RLS nem teste com dois usuários (próxima etapa do Prompt 14).
- O botão fica no rodapé do menu; no celular, o menu completo está na gaveta.
- Telas no navegador: **NÃO CONFERIDO VISUALMENTE**.
- Ambiente: Node v26.13.1.
