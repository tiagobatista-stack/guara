# Evidência — mascotes nos estados vazios (etapa 6, 14/11/2026)

**Pedido do responsável:** "vá para o próximo item" (`gestao/BACKLOG.md`, plano dos mascotes, item 1 da lista "A fazer": estados vazios). Feito na `main`.

| Mudança | Arquivo |
|---|---|
| Componente `EstadoVazio`: rosto do mascote principal (das Configurações) com a frase e, quando houver, uma dica do próximo passo. Versão compacta (32 px) e versão em cartão | `aplicacao/src/compartilhado/EstadoVazio.tsx` (novo), `estilos.css` (`.estado-vazio`) |
| Demandas: lista sem nenhuma demanda ("Use “Nova demanda” para registrar a primeira."), filtros sem resultado ("Mude ou limpe os filtros para ver as outras.") e tela compartilhada sem demanda em aberto | `modulos/demandas/Demandas.tsx` |
| Kanban: coluna vazia, versão compacta | `modulos/kanban/Kanban.tsx` |
| Dashboard: sem vencidas ou inativas; sem prazo em aberto | `modulos/painel/Painel.tsx` |
| Alertas: sem demanda inativa; triagem sem demanda sem prazo | `modulos/alertas/Alertas.tsx` |
| Módulos ainda não implementados | `compartilhado/EmConstrucao.tsx` |

## Decisões

- **A frase é que informa; o rosto é decorativo** (`aria-hidden`, olhos parados, sem piscar nem dormir). Uma tela pode ter vários estados vazios juntos (as quatro colunas do Kanban) e o leitor de tela anunciaria um mascote em cada um.
- As frases que já existiam foram mantidas; só entraram dicas de próximo passo onde há uma ação clara. Tom profissional, sem infantilizar.
- Ficaram sem mascote a lista de feriados locais e as listas da Saúde do sistema (são configuração e diagnóstico, e a Saúde já tem mascote próprio).

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 4 testes novos: frase, dica, rosto do principal escondido do leitor de tela e trocando com a escolha nas Configurações; Demandas vazia com a dica; as colunas do Kanban vazio com a versão compacta (32 px); módulo não implementado | em `compartilhado/EstadoVazio.test.tsx` | conferidos na suíte | PASSOU |
| 2 | Teste da festa no Kanban ajustado: pegava o primeiro mascote da página, que agora é o rosto decorativo de uma coluna vazia; passou a pegar o mascote vivo (`svg.mascote--vivo`) | em `modulos/kanban/Kanban.test.tsx` | falhou antes do ajuste, passou depois | PASSOU |
| 3 | Suíte completa | `npm test` | `Test Files 27 passed (27)` · `Tests 265 passed (265)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-DWTUf_83.js` | PASSOU |

## Limitações

- Telas no navegador: **NÃO CONFERIDO VISUALMENTE** (só testes no jsdom), inclusive o alinhamento em tela de celular.
- Os rostos dos estados vazios não acompanham o ponteiro nem comemoram (são decorativos, por decisão).
- Testes do hook (Python) e MCP: não executados, porque esses arquivos não mudaram.
- Ambiente: Node v26.13.1. Não publicado.
