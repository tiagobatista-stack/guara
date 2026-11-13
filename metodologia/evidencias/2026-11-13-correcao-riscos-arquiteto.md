# Evidência — correção dos 5 riscos do arquiteto (13/11/2026)

**Pedido do responsável:** "corrija os riscos do arquiteto". Os riscos vieram do relatório do subagente arquiteto (P09, padrão A), registrado em `2026-11-13-p09-orquestracao.md`.

| # | Risco | Correção | Arquivo |
|---|---|---|---|
| 1 | **ALTO:** a importação aceitava arquivo sem a marca de fictício e o gravava como `ficticio: true` | `validarImportacao` recusa o arquivo se `ficticio !== true`: "dados reais não são aceitos". Vale também para o MCP, que usa a mesma função | `aplicacao/src/modulos/alertas/dados-portaveis.ts` |
| 2 | **MÉDIO:** falha parcial na importação deixava os dados trocados e a mensagem dizia "nada foi importado" | Fotografa as 3 chaves (`demandas`, `configuracao`, `backup`) antes de gravar. Em qualquer falha, restaura as três, recarrega e informa "importação desfeita". Se nem a restauração funcionar, a mensagem diz isso | `aplicacao/src/modulos/demandas/armazem.ts` |
| 3 | **MÉDIO:** localStorage bloqueado ou com cota cheia quebrava a abertura do app | Leitura e gravação iniciais em try/catch. `obterArmazenamento` cai para um storage em memória se o localStorage lançar erro. O novo campo `avisoPersistencia` aparece no topo de todas as telas ("As alterações valem só até fechar a página") | `armazem.ts`, `nucleo/Aplicacao.tsx`, `estilos.css` |
| 4 | **MÉDIO:** não havia sincronização entre abas | `escutarOutrasAbas(window)` recarrega o estado no evento `storage` de chaves `guara:*`. Fica ativo no armazém padrão do app | `armazem.ts` |
| 5 | **BAIXO:** a importação não conferia os limites de tamanho | `ehDemandaValida` aplica os mesmos `LIMITES` do formulário (título de 3 a 120 caracteres, descrição até 2000, responsável até 80) | `aplicacao/src/modulos/demandas/regras.ts` |

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 10 testes novos em `testes/unidade/riscos-arquiteto.test.ts`, um ou mais por risco | — | — | escritos |
| 2 | **Os testes novos falham no código anterior** | `git archive HEAD` numa pasta temporária, com o arquivo de testes novo; `npm ci`; `npx vitest run ../testes/unidade/riscos-arquiteto.test.ts` | `Tests 10 failed (10)` | PASSOU (o teste detecta o defeito) |
| 3 | Os mesmos testes passam com as correções; suíte completa | `npx vitest run` | `Test Files 12 passed (12)` · `Tests 86 passed (86)` | PASSOU |
| 4 | Regressão nos fixtures | 3 casos antigos de "importação inválida" ganharam `ficticio: true`, para continuar testando a própria regra (demanda inválida, IDs duplicados, limiar inválido) e não ser recusados antes pela nova regra | 86/86 | PASSOU |
| 5 | Build | `npm run build` | `✓ built`. A 1ª tentativa acusou TS6133 (import sem uso no teste novo), que foi corrigido | PASSOU |
| 6 | MCP continua compatível | `node servidor-mcp/testar-servidor.ts` | "MCP total=5 · JSON no disco=5 · COINCIDEM" | PASSOU |

## Limitações

- O risco 3 foi testado com storage simulado, que lança `QuotaExceededError` e `SecurityError`. Não foi testado em modo privado real do navegador.
- O risco 4 foi testado com `StorageEvent` disparado no jsdom. Duas abas reais do navegador: NÃO TESTADO.
- A correção foi feita pelo Claude principal, e não pelo subagente `implementador` (indisponível nesta sessão). Revisão independente pelo `auditor`: NÃO TESTADO.

## Publicação

| Verificação | Resultado | Situação |
|---|---|---|
| Push do `3d0609f` e deploy no Vercel | status `success`; o site passou a servir `index-BuxkUhiy.js` (antes `index-DKZURviz.js`) | PASSOU |
| Risco 1 na URL pública | importar um JSON sem `ficticio` mostra "Importação recusada: O arquivo não está marcado como fictício…"; total continua 5 | PASSOU |
| Aviso de persistência em navegador normal | não aparece (o localStorage está disponível) | PASSOU |
