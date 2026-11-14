# BACKLOG — GUARÁ

**Atualizado em:** 14/11/2026. A situação de cada entrega fica em `STATUS.md`; aqui fica só o que falta fazer, em ordem.

## Próxima sessão (em ordem)

1. **Reativar o MCP (P10).** No Node 26 o servidor já sobe e as dependências estão instaladas (`2026-11-14-reverificacao-node26.md`). Falta o responsável exportar `guara-dados.json` pela tela Alertas e salvá-lo em `servidor-mcp/dados/`; depois rode `node servidor-mcp/testar-servidor.ts`. Reinicie a sessão para o `guara-dados` reconectar e repita a chamada real de `resumir_demandas`. Abrir a tela `/mcp` ainda está NÃO TESTADO.
2. **Conferir no navegador o que foi publicado em 14/11/2026.** Já está na URL pública (`9e03ff8`). Confira em https://guara-lemon.vercel.app, inclusive em tela de celular: dias úteis (Dashboard, Kanban, Demandas), tempo em andamento, demanda travada, triagem sem prazo (Alertas), aviso de demanda parecida, três números, tipo e natureza (seis filtros em Demandas) e a tela compartilhada. Até lá, as telas estão NÃO CONFERIDO VISUALMENTE.

3. **Login Google (branch `login-google`).** O código está pronto. Faltam as decisões (contas pessoais ou institucionais, quem entra, aprovação institucional) e os passos 🔒 de `documentacao/implantacao.md` 4.1. Depois: persistência no Supabase com RLS e teste com dois usuários (Prompt 14).

## Pendências da apostila

- **Hook em Node.js (P11).** O hook está em Python (`.claude/hooks/verificar_comando.py`, 8/8 testes). A decisão de alinhamento previa portar para Node quando houvesse Node. Porte, mantendo os mesmos casos de teste e a sentinela `GUARA_HOOK_TEST_BLOCK`/`GUARA_OK`, e repita o teste em sessão real.
- **Orquestração A–F com os subagentes registrados (P09): PARCIAL.** B e C já foram feitos de verdade (ver o ponto de retomada do STATUS). Faltam A, D (paralelo real), E e F com os registrados. Depois disso, atualize a linha "Orquestração" do STATUS, que ainda diz NÃO DEMONSTRADO.

## Ideias vindas do TOCA (`F:\claude\toca`; lógica reescrita, sem copiar código, GPL-3)

- **Feriados locais:** uma tela para `extras` e `remover`, persistida no localStorage. A função `feriadosEntre` já aceita esses dois parâmetros.
- **Origem judicial ou do MP:** campo `origem` com prioridade e destaque, como em `judicial_modulo.py`. Muda o modelo da apostila: confirme com o responsável e faça migração do formato `versao: 1`, com backup antes.
- **Migrações versionadas:** lista de passos, como em `migracoes.py`. Necessária na primeira mudança de modelo que não for só um campo opcional novo (o bloqueio da demanda travada não precisou).
- **Prazo escrito em português:** "prazo 10 dias úteis", "sexta que vem", "22/12 a 29/12", como em `prazo.py:extrair`. No formulário, a data entra só como sugestão e a pessoa confirma.
- **Campos essenciais:** mostrar o que falta preencher em cada demanda, como em `perguntas.py`.
- **Extrair os três números do texto colado:** preencher processo, SIMP e CNJ a partir da descrição, como em `identificadores.py:extrair`; a pessoa confere antes de gravar.
- **Tela compartilhada no Kanban:** o cartão mostra o responsável; um modo como o da tela Demandas, com o mesmo resumo por lista branca.
- **Depois do MVP:** importar agenda `.ics` (`agenda_local.py`), histórico que guarda só o nome dos campos alterados, e uma verificação de termos proibidos (`verificar_generico.py`) no gate.
