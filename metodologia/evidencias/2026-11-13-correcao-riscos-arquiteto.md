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

1. Uma falha em `restaurarBackup` não liga a marca. Isso não estava entre as limitações declaradas. *(Atualização: depois do 3c, a falha de gravação liga a marca (:243). A leitura bloqueada ainda não liga.)*
2. **Risco novo, anterior ao 3b (depois chamado 3c e corrigido; ver a seção seguinte):** em `restaurarBackup` (`armazem.ts:212-219`), se o `setItem` da configuração falhar depois que as demandas já foram regravadas, o armazenamento fica com as demandas de antes da importação. Mesmo assim, a mensagem diz "Backup ilegível; nada foi alterado.", e a memória continua com os dados importados. O auditor reproduziu isso num teste suplementar.
3. A ligação `armazemPadrao()` → `marcarSemPersistencia()` (`:280-285`) não foi testada.
4. Navegador real com localStorage bloqueado, duas abas reais, push e deploy: NÃO TESTADO.
5. Continuam abertos o ramo `revertido = false` e os limites exatos do risco 5.

## Correção do risco 3c: `restaurarBackup` parcial (subagente `implementador`, padrão B)

**Pedido do responsável:** "Sim, corrigir", em resposta a "Corrijo o risco novo do restaurarBackup com o implementador?". O Claude principal conferiu o diff e reexecutou a suíte e o build.

**Correção** em `aplicacao/src/modulos/demandas/armazem.ts`, `restaurarBackup` (:209-256). Segue o mesmo padrão do `importar`:

1. Fotografa as 3 chaves (demandas, configuração e backup) antes de gravar.
2. Se o JSON do backup não puder ser lido, devolve "Backup ilegível; nada foi alterado." sem gravar nada.
3. Se qualquer gravação falhar, repõe as três chaves e liga `semPersistencia` (:243). Depois chama `carregar()`, avisa os ouvintes e mostra uma mensagem que diz o que de fato aconteceu:
   - "o desfazer foi cancelado e os dados importados foram mantidos", quando a reversão é completa;
   - "não foi possível reverter tudo; confira os dados", quando não é.

**Testes novos** em `testes/unidade/riscos-arquiteto.test.ts`, no bloco `describe('risco 3c')` (:195):
- falha na 1ª, na 2ª e na 3ª gravação (`it.each`, :234);
- falha também na reversão (:259);
- backup corrompido (:277), que serve de proteção contra regressão.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Os testes novos falham no código anterior, por asserção | O implementador reverteu a correção com `git apply -R` e rodou `npx vitest run ../testes/unidade/riscos-arquiteto.test.ts` | `4 failed \| 18 passed (22)`, todas por `AssertionError`. Falha na 2ª gravação: as demandas já estavam regravadas e a configuração e o backup não (o estado parcial). Falha na 3ª: o backup continuava gravado. Falha também na reversão: a memória era `[imp1, imp2]`, mas o gravado era `[original]`. Falha na 1ª: a mensagem dizia "Backup ilegível" numa falha de gravação. O teste do backup corrompido já passava antes, como esperado | PASSOU (o teste detecta o defeito) |
| 2 | Suíte completa com a correção | `npx vitest run` (reexecutado pelo Claude principal) | `Test Files 13 passed (13)` · `Tests 99 passed (99)` | PASSOU |
| 3 | Build | `npm run build` (reexecutado pelo Claude principal) | `tsc --noEmit` sem erros; `✓ built` | PASSOU |
| 4 | Mensagens novas na interface (`Alertas.tsx`) | — | — | NÃO TESTADO |
| 5 | Revisão independente pelo `auditor` desta correção | ver a seção seguinte | APROVADO, com ressalvas | feita |

**Limitações** (relatadas pelo implementador):

- O caminho de falha do `importar` continua sem ligar `semPersistencia`. Agora ele destoa de `restaurarBackup` e de `gravar`.
- Um backup que é JSON válido, mas com a estrutura errada (por exemplo `{}`), ainda grava `"undefined"` nas demandas. Esse comportamento é anterior e não foi alterado.
- Se a leitura das chaves for bloqueada, `restaurarBackup` agora devolve uma mensagem em vez de lançar exceção. Esse caso não tem teste específico.
- Navegador real, push e deploy: NÃO TESTADO.

## Revisão independente do risco 3c (auditor registrado, padrão C)

**Data:** 13/11/2026. **Commit revisado:** `9d0a22b`. O `auditor` só leu arquivos e rodou testes. `git status` ficou vazio ao final.

**Veredito: APROVADO, com ressalvas.** O defeito foi corrigido: o estado parcial no armazenamento, a mensagem "Backup ilegível; nada foi alterado." numa falha de gravação e a memória diferente do armazenamento. Não houve regressão.

| Verificação | Método e resultado | Situação |
|---|---|---|
| Os testes novos falham no código anterior | `git archive 9d0a22b`, trocando só o `armazem.ts` pelo de `9d0a22b^`, que é o único arquivo de código alterado. Resultado: `Tests 4 failed \| 18 passed (22)`, igual ao declarado. As 4 falhas são `AssertionError` (:251, :245, :245, :268); nenhuma por símbolo ausente. O teste do backup ilegível (:277) passa, porque é proteção contra regressão. **São 4 de 5** | PASSOU |
| Desfazer com sucesso, sem regressão | Coberto por `dados-portaveis.test.ts:48`, `riscos-arquiteto.test.ts:152` e `Alertas.test.tsx:85`, que passam. A sonda do auditor confirmou o resultado `{ok:true}`, a memória `[original]`, 5 dias, sem backup e sem aviso. Um segundo desfazer responde "Não há backup" | PASSOU |
| Interação com o 3b | Depois de uma falha, um desfazer bem-sucedido restaura os dados, e o aviso continua ligado, como manda a regra "até fechar a página" | PASSOU (sonda) |
| Leitura bloqueada | Responde "não permitiu ler…; nada foi alterado", sem nenhuma gravação; armazenamento e memória ficam intactos | PASSOU na sonda; sem teste no repositório |
| Suíte completa | `npx vitest run`: `Test Files 13 passed (13)` · `Tests 99 passed (99)` | PASSOU |
| Build | `tsc --noEmit` sem erros; `index-Bt1U1Gq2.js 311.46 kB`; `✓ built in 169ms` | PASSOU |

As sondas do auditor ficaram fora do repositório e não são evidência durável.

**Ressalvas** (não corrigidas):

1. **Mensagem pessimista quando todas as gravações falham.** Nesse caso nada muda, e o armazenamento fica intacto. Mesmo assim, a reversão também falha e a mensagem diz "não foi possível reverter tudo" (`armazem.ts:233-250`). O texto é impreciso, mas não esconde perda de dados. O mesmo padrão existe no `importar` (:185-201).
2. **Backup em JSON válido com a estrutura errada é mais grave do que a limitação declarada.** *(Corrigido depois; ver a seção "Correção da ressalva 2 do 3c".)* A guarda em `armazem.ts:223` aceita `{}`, `[]` e `{"conteudo":5}`. Nesses três casos, a sonda mostrou o mesmo efeito:
   - `{ok:true}`, e a interface mostra "Dados anteriores à importação restaurados.";
   - as demandas ficam como `"undefined"`, e o app entra em `erroArmazenamento`;
   - a configuração vira `{}`;
   - **o backup é removido**.

   Esse comportamento é anterior à correção, não é regressão. O backup só é gravado pelo próprio app, então o problema exige adulteração ou incompatibilidade de versão.
3. **O campo de dias pode ficar desatualizado depois de uma reversão.** `Alertas.tsx:68` só chama `setDias` quando o desfazer dá certo. Verificado só por leitura do código: NÃO TESTADO.
4. **A leitura bloqueada em `restaurarBackup` (:215-216) não liga `semPersistencia`**, ao contrário de `carregar()` (:70). Verificado só por leitura do código.
5. **O cenário da 3ª gravação é sintético.** Em navegadores reais, `removeItem` normalmente não lança erro por cota.

**Documentação.** O auditor apontou redação imprecisa, que foi corrigida nesta atualização:
- intervalo `:209-256`;
- "4 de 5" no `STATUS.md` e no `RELATORIO-FINAL.md`;
- lacuna 1 do 3b, que estava desatualizada.

Nenhum documento declarava PASSOU sem execução. Não há segredos nem dados que pareçam reais nos arquivos do commit.

**NÃO TESTADO:** as mensagens novas na interface no caminho de falha, a notificação dos ouvintes na falha (verificada só na sonda), o navegador real com cota cheia ou armazenamento bloqueado, o push e o deploy.

## Correção da ressalva 2 do 3c: backup com estrutura errada (subagente `implementador`, padrão B)

**Pedido do responsável:** "Sim, corrigir", em resposta a "Corrijo a ressalva do backup com estrutura errada com o implementador?". O Claude principal conferiu o diff e reexecutou a suíte e o build.

**Correção:** `aplicacao/src/modulos/demandas/armazem.ts:223-227`. Antes de qualquer gravação, `restaurarBackup` agora recusa um backup que:
- seja uma lista;
- tenha `conteudo` diferente de string ou `null`;
- tenha `diasInatividade` que não passe em `diasValidos`, ou seja, fora dos inteiros de 1 a 365. É a mesma função usada por `lerDias`, `definirDiasInatividade` e pela importação (`dados-portaveis.ts:35`).

Nesses casos o erro cai no `catch` que já existia: "Backup ilegível; nada foi alterado.", sem nenhuma gravação.

**Testes:** `testes/unidade/riscos-arquiteto.test.ts:292-342`.
- Seis casos (`it.each`): `{}`, `[]`, `{"conteudo":5}`, `diasInatividade` ausente, `'x'` e `0`. Cada um exige `ok:false`, a mensagem exata, as 3 chaves iguais à fotografia (inclusive o backup), a memória inalterada e nenhum `erroArmazenamento`.
- Um caso válido, com `conteudo: null`, que deve continuar funcionando.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Os testes novos falham no código anterior, por asserção | `npx vitest run ../testes/unidade/riscos-arquiteto.test.ts`, com o código original (implementador) | `6 failed \| 23 passed (29)`: `AssertionError: expected true to be false` (:320), porque a função devolvia `ok:true`. O caso válido já passava antes, como esperado. **São 6 de 7** | PASSOU (o teste detecta o defeito) |
| 2 | Suíte completa | `npx vitest run` (reexecutado pelo Claude principal) | `Test Files 13 passed (13)` · `Tests 106 passed (106)` | PASSOU |
| 3 | Build | `npm run build` (reexecutado pelo Claude principal) | `tsc --noEmit` sem erros; `✓ built` | PASSOU |
| 4 | Revisão independente pelo `auditor` desta correção | ver a seção seguinte | APROVADO | feita |

**Limitações:**
- Se `conteudo` for uma string que não é JSON de demandas válido, ela ainda é gravada. A função devolve `ok:true` e a tela mostra "Dados anteriores à importação restaurados.". Depois o app mostra o aviso de armazenamento corrompido que já existia, e o backup é removido.
- Navegador real, push e deploy: NÃO TESTADO.
- As outras ressalvas do 3c continuam abertas: as 1, 3, 4 e 5.

## Revisão independente da ressalva 2 do 3c (auditor registrado, padrão C)

**Data:** 13/11/2026. **Commit revisado:** `f14473c`. O `auditor` só leu arquivos e rodou testes. `git status` ficou limpo.

**Veredito: APROVADO**, com duas imprecisões menores na evidência, já corrigidas acima: o intervalo `:292-342` e a limitação do `conteudo` string, que agora fica completa.

| Verificação | Método e resultado | Situação |
|---|---|---|
| Os testes novos falham no código anterior | `git archive f14473c`, trocando só o `armazem.ts` pelo de `f14473c^`, que é o único arquivo de código alterado. Resultado: `6 failed \| 23 passed (29)`, igual ao declarado. Todas as falhas são `AssertionError: expected true to be false` (:320), ou seja, por asserção. O 7º teste (`conteudo: null` válido) passa, porque é proteção contra regressão | PASSOU |
| Backups legítimos não passam a ser recusados (análise do código) | O backup só é gravado em `armazem.ts:181`. O valor de `diasInatividade` vem só de `lerDias` (:53-60), `definirDiasInatividade` (:160) ou `validarImportacao` (`dados-portaveis.ts:59-60`), e os três passam por `diasValidos`. Essa função não muda desde `957020a`, o commit que criou o backup. Logo, nenhum backup gerado pelo app fica fora de 1–365, e isso vale também para os legados | conferido |
| Backups legítimos (sonda do auditor, fora do repositório) | `Tests 9 passed (9)`. A sonda cobriu os limites 1↔365, a configuração ausente ou corrompida (que vira 3), `conteudo: null`, a importação sem `configuracao` e duas importações seguidas | PASSOU (sonda, não durável) |
| Suíte completa | `npx vitest run`: `Test Files 13 passed (13)` · `Tests 106 passed (106)` | PASSOU |
| Build | `tsc --noEmit && vite build`: `✓ built in 368ms`, saída 0 | PASSOU |

**Limitação confirmada pela sonda.** Um backup `{conteudo:'lixo{', diasInatividade:3}` ainda produz este efeito:
- devolve `ok:true` e aplica o conteúdo;
- o app entra em `erroArmazenamento`;
- o backup é removido.

A gravidade é baixa: isso só acontece com um backup adulterado, ou quando as demandas já estavam corrompidas antes de importar. Nesse segundo caso, a restauração reproduz fielmente o estado anterior.

**Documentação:** nenhum PASSOU sem execução. Não há segredos no diff, e os dados dos testes são fictícios.

**NÃO TESTADO:** navegador real (o botão "Desfazer última importação" com um backup adulterado), push e deploy. Continuam abertas as ressalvas 1, 3, 4 e 5 do 3c e o caso do `conteudo` string inválido. *(O push e o deploy foram feitos depois; ver a seção seguinte.)*

## Publicação das correções 3b, 3c e da ressalva 2 (13/11/2026)

| Verificação | Resultado | Situação |
|---|---|---|
| Envio ao GitHub | Feito pelo responsável no terminal. O hook do projeto bloqueou o envio pelo Claude, como previsto. Ao final, `origin/main` = `004be7e` e nenhum commit local ficou pendente | PASSOU |
| Deploy no Vercel | Status do commit `004be7e` no GitHub: `Vercel success — Deployment has completed` | PASSOU |
| Bundle publicado | https://guara-lemon.vercel.app serve `index-CSMJPeam.js`, o mesmo nome do build local (`aplicacao/dist/assets/index-CSMJPeam.js`). Antes servia `index-BuxkUhiy.js` | PASSOU |
| Comportamento das correções na URL pública (aviso com storage bloqueado, desfazer com falha de gravação, backup adulterado) | Esses casos exigem bloquear ou adulterar o localStorage no navegador | NÃO TESTADO |
