# Evidência — redesenho dos mascotes, etapa 1 (14/11/2026)

**Pedido do responsável:** melhorar a arte dos mascotes, que são funcionais e servem de alívio ao analista. Decisões tomadas na conversa: estilo ilustrado (opção B dos esboços), só o rosto, olhos que acompanham o mouse. Autorização: "pode começar", para a etapa 1 do plano (o restante está em `gestao/BACKLOG.md`).

| Mudança | Arquivo |
|---|---|
| Rosto próprio por espécie (antes, um molde único com cores trocadas), três humores mantidos (`tranquilo`, `atento`, `curioso`), menos detalhe abaixo de 40 px, pupilas que acompanham o ponteiro ou o último toque | `aplicacao/src/compartilhado/Mascote.tsx` |
| Estilos do mascote (transição da pupila, desligada com "reduzir movimento") | `aplicacao/src/estilos.css` |
| 7 testes novos | `aplicacao/src/compartilhado/Mascote.test.tsx` (novo) |
| SVGs de consulta e prancha dos nove rostos | `identidade-visual/fofofauna/*.svg` (novos) |
| Documentação | `identidade-visual/fofofauna/README.md`, `aplicacao/src/compartilhado/README.md`, `gestao/CHANGELOG.md`, `gestao/BACKLOG.md`, `gestao/STATUS.md` |

## Decisões

- **A interface pública do componente não mudou** (`especie`, `humor`, `tamanho`, `MASCOTES`, texto do `aria-label`). `PainelAssistente.tsx` e `SaudeDoSistema.tsx` não foram alterados.
- **Um único ouvinte de ponteiro** para todos os mascotes da página, com atualização por quadro de animação; é removido quando o último mascote sai da tela.
- **O olhar volta ao centro após 4 s** sem movimento e fica parado com `prefers-reduced-motion: reduce`.
- **Os olhos ganharam branco em volta da pupila**, para a direção do olhar aparecer.
- Cores da ariranha clareadas (`#6b4a2f` para `#7a5535`) para não sumir no tema escuro.
- Sem biblioteca nova.

## Testes (Plan–Act–Verify)

Os comandos 1, 3, 4 e 5 foram executados pelo responsável no Windows (PowerShell, `F:\claude\guara\aplicacao`), e a saída foi colada na conversa. A sessão do Claude rodou num ambiente Linux, onde o `node_modules` do Windows não funciona e o registro npm recusou a instalação (403).

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Build, 1ª execução | `npm run build` | `TS2307: Cannot find module '@supabase/supabase-js'` em `src/nucleo/autenticacao.ts:73`. O pacote está no `package.json` e no `package-lock.json` (commit `4df52c9`, login Google), mas não estava instalado. Não tem relação com os mascotes | FALHOU (ambiente); resolvido com `npm ci` |
| 2 | Suíte, 1ª execução | `npm test` | `Tests 1 failed \| 225 passed (226)`. Falhou o teste novo do olhar: ele lia `style.transform` das pupilas e dependia do quadro de animação do jsdom | FALHOU |
| 3 | Correção | — | O deslocamento passou a ir em variáveis CSS (`--olhar-x`, `--olhar-y`) no SVG, aplicadas às pupilas em `estilos.css`; o teste lê essas variáveis e faz o quadro de animação rodar na hora | — |
| 4 | Suíte completa, com os 7 testes novos | `npm test` | `Test Files 23 passed (23)` · `Tests 226 passed (226)` | PASSOU |
| 5 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ 137 modules transformed`; `✓ built in 158ms` | PASSOU |
| 6 | Desenho dos nove rostos | `prancha-humores.svg` convertida em imagem e olhada | Três espécies distintas, três humores legíveis | PASSOU (imagem estática, gerada por script com as mesmas coordenadas do componente; não é o componente renderizado) |

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (assistente, Saúde do sistema, tema escuro, celular, 32 px).
- O movimento dos olhos não foi visto funcionando no aplicativo; só o teste no jsdom e a demonstração da conversa.
- Os SVGs de `identidade-visual/fofofauna/` são cópias feitas à parte e não se atualizam sozinhos.
- O trabalho ficou no branch `login-google`, que era o branch ativo. Nada foi commitado.
- A ocorrência das espécies nos biomas continua a confirmar (seção 7.1 do planejamento).
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
