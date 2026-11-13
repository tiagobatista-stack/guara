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
- A correção foi feita pelo Claude principal, e não pelo subagente `implementador` (indisponível nesta sessão). Revisão independente pelo `auditor` registrado: **feita em 13/11/2026** (seção abaixo). Resultado: 4 riscos APROVADOS e o risco 3 aprovado em parte, porque o item 3b foi REPROVADO.

## Publicação

| Verificação | Resultado | Situação |
|---|---|---|
| Push do `3d0609f` e deploy no Vercel | status `success`; o site passou a servir `index-BuxkUhiy.js` (antes `index-DKZURviz.js`) | PASSOU |
| Risco 1 na URL pública | importar um JSON sem `ficticio` mostra "Importação recusada: O arquivo não está marcado como fictício…"; total continua 5 | PASSOU |
| Aviso de persistência em navegador normal | não aparece (o localStorage está disponível) | PASSOU |

## Revisão independente (auditor registrado)

**Data:** 13/11/2026. **Padrão C:** subagente registrado `auditor` (`.claude/agents/`), chamado com `subagent_type: "auditor"` numa sessão aberta na pasta do projeto. O auditor só leu arquivos e rodou testes. `git status` ficou limpo antes e depois da revisão. O código de `aplicacao/src` e `testes` é idêntico em `3d0609f` e `HEAD`. O texto abaixo transcreve o resultado do auditor sem mudar o sentido. **Os itens reprovados não foram corrigidos nesta sessão**: eles só foram registrados, para decisão do responsável.

**Resumo do auditor:** 4 riscos APROVADOS. O risco 3 foi aprovado só em parte: o app não quebra com o localStorage bloqueado (3a), mas o aviso "As alterações valem só até fechar a página" some depois de uma importação (3b). Isso contradiz a tabela acima, que diz que o aviso "aparece no topo de todas as telas".

| # | Risco | Veredito | Correção (arquivo:linha) | Teste (arquivo:linha) | Justificativa |
|---|---|---|---|---|---|
| 1 | ALTO: importação aceitava arquivo sem `ficticio` | **APROVADO** | `aplicacao/src/modulos/alertas/dados-portaveis.ts:53` | `testes/unidade/riscos-arquiteto.test.ts:37-48` | No código anterior o teste falha por asserção (`expected true to be false`), ou seja, pelo próprio defeito. O MCP usa a mesma função (`servidor-mcp/consultas.ts:33`) |
| 2 | MÉDIO: falha parcial na importação deixava os dados trocados | **APROVADO** | `aplicacao/src/modulos/demandas/armazem.ts:166-198` (fotografia em :168, reversão em :180-197) | `riscos-arquiteto.test.ts:50-84` | O teste do repositório falha no código anterior por símbolo ausente (`criarArmazenamentoEmMemoria is not a function`). Numa variante do auditor, com storage em memória local, ele falha pelo defeito: a mensagem antiga é "nada foi importado". O teste do repositório só cobre a falha na 2ª gravação. A troca real de dados acontece na falha da 3ª gravação, e o auditor a cobriu com um teste suplementar |
| 3a | MÉDIO: localStorage bloqueado ou com cota cheia quebrava a abertura | **APROVADO** | `armazem.ts:60-79` (try/catch), `armazem.ts:258-269` (`obterArmazenamento`), `armazem.ts:274-281` | `riscos-arquiteto.test.ts:86-108` | Na variante, o código anterior lança `QuotaExceededError` e `SecurityError` simulados de verdade. O teste de `obterArmazenamento` (:100) só pode falhar por ausência, porque a função não existia |
| 3b | MÉDIO: "o aviso aparece no topo de todas as telas" | **REPROVADO** | `armazem.ts:64` (`avisoPersistencia: null` em toda leitura bem-sucedida) | nenhum no repositório; teste do auditor, fora do repositório | No modo em memória, `carregar()` zera o aviso. Ele some depois de importar (:190/:199), desfazer (:216), `recarregar` (:221) ou evento `storage` (:234). O teste do auditor confirmou: `expected null not to be null` depois de `importar` com `ok: true`. A renderização em `aplicacao/src/nucleo/Aplicacao.tsx:112` não tem teste (NÃO TESTADO) |
| 4 | MÉDIO: sem sincronização entre abas | **APROVADO** (só em nível de unidade) | `armazem.ts:230-240`; ligação em `armazem.ts:279` | `riscos-arquiteto.test.ts:110-129` | O teste confere a recarga com chave `guara:*` e também que uma chave externa não dispara recarga. No código anterior ele só pode falhar por ausência (`escutarOutrasAbas is not a function`). A ligação em `armazemPadrao()` foi conferida só por leitura. Duas abas reais: NÃO TESTADO |
| 5 | BAIXO: importação não conferia os limites | **APROVADO** | `aplicacao/src/modulos/demandas/regras.ts:107-109` | `riscos-arquiteto.test.ts:131-141` | No código anterior os 4 casos falham por asserção, ou seja, pelo defeito. Os limites batem com `validarEntrada` (`regras.ts:16-20`) e `LIMITES` (`modelo.ts:34`) |

Conferência do Claude principal: a linha `armazem.ts:64` foi lida e grava `avisoPersistencia: null` sempre que a leitura dá certo. Isso confirma o mecanismo do item 3b.

### Comandos executados pelo auditor (Git Bash, com `/c/Program Files/nodejs` no PATH)

| Comando | Onde | Resultado real | Situação |
|---|---|---|---|
| `npx vitest run` | repositório, `aplicacao/` | `Test Files 12 passed (12)` · `Tests 86 passed (86)` (vitest v5.1.0) | PASSOU |
| `npm run build` | repositório, `aplicacao/` | `tsc --noEmit` sem erros; `✓ 83 modules transformed`; `dist/assets/index-BuxkUhiy.js 310.87 kB`; `✓ built in 190ms` | PASSOU |
| `npx vitest run ../testes/unidade/riscos-arquiteto.test.ts` | cópia de `3d0609f^` | `Tests 10 failed (10)` | confirma a linha 2 dos Testes, com a ressalva abaixo |
| variante com storage em memória local, `-t "risco 2\|risco 3"` | cópia de `3d0609f^` | `4 failed \| 6 skipped (10)` | defeito reproduzido |
| teste suplementar de reversão (falha na gravação 1, 2 e 3) | cópia de `3d0609f^` | `2 failed \| 1 passed (3)` | defeito reproduzido |
| o mesmo teste suplementar | cópia de `3d0609f` | `3 passed (3)` | PASSOU |
| teste do aviso após importação em modo memória | cópia de `3d0609f` | `1 failed (1)`: `expected null not to be null` | FALHOU (item 3b) |
| `node servidor-mcp/testar-servidor.ts` | — | não executado pelo auditor | NÃO TESTADO |
| publicação (Vercel, risco 1 na URL, aviso no navegador) | — | não verificada pelo auditor. Indício: o build local gerou o mesmo `index-BuxkUhiy.js` | NÃO VERIFICÁVEL |

### Ressalva sobre "os testes novos falham no código anterior"

Os 10 de 10 testes falham no código anterior, mas por motivos diferentes:

- **5 falham por asserção, isto é, pelo defeito:** o risco 1 e os 4 casos do risco 5.
- **5 falham por símbolo ausente** (`TypeError ... is not a function`): o risco 2, os 3 testes do risco 3 e o risco 4. Isso não mostra o defeito em si.

Com uma variante e um teste suplementar, o auditor reproduziu pelo comportamento os defeitos dos riscos 2 e 3a. Os riscos 3 (`obterArmazenamento`) e 4 eram falta de recurso, então só podem falhar por ausência. A frase "o teste detecta o defeito", na linha 2 dos Testes, vale de verdade só para metade dos testes do repositório.

### Lacunas e problemas residuais apontados pelo auditor (não corrigidos)

- **Risco 3b (defeito):** o aviso de persistência some depois de importar, desfazer, `recarregar` ou evento `storage`, porque `carregar()` grava `avisoPersistencia: null` (`armazem.ts:64`). Os dados continuam sem persistência. Nenhum teste renderiza o aviso em `Aplicacao.tsx:112`.
- **Risco 2:** o ramo "não foi possível desfazer tudo" (`revertido = false`) não tem teste.
- **`desfazer` (`armazem.ts:~205-218`):** tem o mesmo padrão de várias gravações sem reversão. Se a 2ª gravação falhar, a mensagem "Backup ilegível; nada foi alterado." é falsa. Ficou fora do escopo dos 5 riscos, mas é análogo ao risco 2.
- **Efeito colateral do risco 5:** `ehDemandaValida` também é usada em `aplicacao/src/modulos/demandas/repositorio-local.ts:39`. Dados já gravados que estejam fora dos limites agora carregam como "corrompido". Não há testes exatamente nos limites (3, 120, 2000 e 80 caracteres).
- **Risco 1:** a marca `ficticio` é declarada pelo próprio arquivo. Não há checagem de processos `FIC-` nem de conteúdo. Arquivos exportados por versões que não gravavam `ficticio` seriam recusados; o `exportarDados` atual grava a marca (`dados-portaveis.ts:25`).
- **Risco 4:** a ligação em `armazemPadrao()` e o comportamento com duas abas reais não foram testados.
- **Documentação:**
  - `gestao/STATUS.md` (linha Testes) aponta `2026-11-13-p08-skill-testar-sistema.md`, e não esta evidência;
  - `RELATORIO-FINAL.md` e `gestao/CHANGELOG.md` dizem "10 testes novos, que falham no código anterior" sem a ressalva acima;
  - o CHANGELOG diz "aviso no topo", o que é contradito pelo item 3b.
- **Segredos e dados reais:** no diff de `3d0609f`, o auditor procurou token, senha, chave, `service_role`, e-mails e padrão de CPF, e não achou nada. Os dados de teste são fictícios.

## Correção do risco 3b (subagente `implementador`, padrão B)

**Pedido do responsável:** "corrija o risco 3b com o implementador". A correção foi feita pelo subagente registrado `implementador` (`subagent_type: "implementador"`). O Claude principal conferiu o diff e reexecutou a suíte e o build.

| Item | Detalhe |
|---|---|
| Correção | `aplicacao/src/modulos/demandas/armazem.ts`: marca `let semPersistencia = false` (:50-51), que fica ligada até a página fechar. `carregar()` (:66) passa a gravar `avisoPersistencia: semPersistencia ? AVISO_SEM_GRAVACAO : null`. A marca é ligada nos 4 pontos que já mostravam o aviso: leitura bloqueada (:70), falha ao gravar os exemplos (:80), falha em `gravar()` (:105) e `marcarSemPersistencia()` (:231) |
| Testes novos | `testes/unidade/riscos-arquiteto.test.ts:143-193`, `describe('risco 3b')`, com 7 casos: importar, desfazer, `recarregar` e evento `storage` no fallback em memória; falha de gravação e depois recarregar; importação recusada; e uma proteção contra regressão sem aviso. Também `aplicacao/src/nucleo/Aplicacao.test.tsx` (novo), que renderiza a tela e confere que o texto do aviso continua depois de importar. Isso cobre `Aplicacao.tsx:112`, antes NÃO TESTADO |

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Os testes novos falham no código anterior, **por asserção** | `npx vitest run testes/unidade/riscos-arquiteto.test.ts aplicacao/src/nucleo/Aplicacao.test.tsx`, com o `armazem.ts` original (implementador, via `git stash`) | `Tests 7 failed \| 11 passed (18)`: `expected null not to be null` (:165, :176, :184) e `Unable to find an element with the text: /As alterações valem só até fechar a página/` (`Aplicacao.test.tsx:22`). O teste de regressão sem aviso já passava antes, como esperado | PASSOU (o teste detecta o defeito) |
| 2 | Suíte completa com a correção | `npx vitest run` (reexecutado pelo Claude principal) | `Test Files 13 passed (13)` · `Tests 94 passed (94)` | PASSOU |
| 3 | Build | `npm run build` (reexecutado pelo Claude principal) | `tsc --noEmit` sem erros; `index-Di1FOTGA.js 310.90 kB`; `✓ built` | PASSOU |
| 4 | Navegador real com localStorage bloqueado | — | — | NÃO TESTADO |

**Limitações** (relatadas pelo implementador):

- O aviso nunca sai antes de a página fechar. No fallback em memória isso é o correto. Mas, se a cota encher só por um momento e uma gravação seguinte der certo, o aviso continua na tela. Tirá-lo nesse caso exigiria separar o fallback da falha de gravação: fica para decisão do responsável.
- Algumas falhas de gravação não ligam a marca: as que caem no `catch` de `importar` (que reverte os dados), de `restaurarExemplos` e de `definirDiasInatividade`. Esse comportamento é anterior e não foi alterado. Se o aviso já estava ativo, ele continua (testado). Se for a primeira falha da sessão, o aviso não aparece.
- As demais lacunas do auditor continuam abertas: o ramo `revertido = false`, o `desfazer` sem reversão, os limites exatos do risco 5 e duas abas reais.
- Revisão independente pelo `auditor`: feita (seção abaixo). Push e deploy: NÃO TESTADO.

## Revisão independente do risco 3b (auditor registrado, padrão C)

**Data:** 13/11/2026. **Commit revisado:** `1939f25`. O `auditor` só leu arquivos e rodou testes. `git status` ficou limpo ao final.

**Veredito: APROVADO, com ressalvas.** O defeito está corrigido: `carregar()` não grava mais `null` fixo (`armazem.ts:66`). Os testes novos exercitam o defeito por asserção, e o caminho com armazenamento persistente não mostrou regressão.

| Verificação | Método e resultado | Situação |
|---|---|---|
| Os testes novos falham no código anterior | O auditor extraiu `1939f25` com `git archive` e trocou só o `armazem.ts` pelo de `1939f25^` (é o único arquivo de código alterado; o `diff` confirmou que a cópia é idêntica). Resultado: `Tests 7 failed \| 11 passed (18)`. Das falhas, **7 de 8 são por asserção** e nenhuma por símbolo ausente: `:165` (4 casos), `:176`, `:184` e `Aplicacao.test.tsx:22` (a linha 17 passou: o aviso aparece e some depois de importar). O 8º teste é proteção contra regressão e já passava antes | PASSOU |
| Todas as chamadas a `carregar()` | `:90`, `:195`, `:204`, `:221`, `:226` e `:240` passam pela linha 66. Com a marca desligada, o aviso continua `null` | conferido por leitura |
| Teste suplementar do auditor (fora do repositório, não durável) | `Tests 10 passed (10)` com o código de `1939f25`. Sem regressão com armazenamento normal: criar, importar, desfazer, recarregar, evento `storage`, `restaurarExemplos` e `definirDiasInatividade`. Armazenamento corrompido não liga o aviso. Instâncias diferentes não compartilham a marca. As limitações declaradas foram reproduzidas | PASSOU |
| Suíte completa | `npx vitest run`: `Test Files 13 passed (13)` · `Tests 94 passed (94)` | PASSOU |
| Build | `tsc --noEmit` sem erros; `index-Di1FOTGA.js 310.90 kB`; `✓ built in 211ms` | PASSOU |
| Segredos e dados reais no diff | Nada encontrado | PASSOU |

**Documentação.** O auditor **reprovou a redação** "8 testes novos, que falham por asserção", que aparecia no `STATUS.md`, no `RELATORIO-FINAL.md` e na mensagem do commit `1939f25`: são 7 de 8. O `STATUS.md` e o `RELATORIO-FINAL.md` foram corrigidos; a mensagem do commit continua como está. Também foram ajustados nesta evidência o intervalo `:143-193` e a citação de `:184`. O `gestao/CHANGELOG.md` não tem entrada do 3b e mantém "aviso no topo" e "10 testes novos (falham no código anterior)" sem a ressalva. Ele não foi alterado. Nenhum documento declara PASSOU sem execução.

**Lacunas residuais** (não corrigidas; nenhuma contradiz a correção):

1. Uma falha em `restaurarBackup` não liga a marca. Isso não estava entre as limitações declaradas.
2. **Risco novo, anterior ao 3b:** em `restaurarBackup` (`armazem.ts:212-219`), se o `setItem` da configuração falhar depois que as demandas já foram regravadas, o armazenamento fica com as demandas de antes da importação. Mesmo assim, a mensagem diz "Backup ilegível; nada foi alterado.", e a memória continua com os dados importados. O auditor reproduziu isso num teste suplementar.
3. A ligação `armazemPadrao()` → `marcarSemPersistencia()` (`:280-285`) não foi testada.
4. Navegador real com localStorage bloqueado, duas abas reais, push e deploy: NÃO TESTADO.
5. Continuam abertos o ramo `revertido = false` e os limites exatos do risco 5.
