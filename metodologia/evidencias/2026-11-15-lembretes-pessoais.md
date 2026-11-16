# Lembretes pessoais do mascote (15/11/2026)

**Pedido do responsável:** lembretes na conversa do mascote, sem IA, como "me lembre de tomar antibiótico 3x ao dia", "me lembre de beber água daqui 1 min" e "ligar para o proprietário do processo XXXXX amanhã de manhã", com avisos em destaque. Especificação: `ROTINA_LEMBRETES.md` (fora do repositório), adaptada ao app web.

**Branch:** `supabase-banco` (a que estava em uso), sem commit.

## O que mudou

- Novo módulo `aplicacao/src/modulos/lembretes/` (leitura da frase, relógio, armazém `guara:lembretes-pessoais:v1`, comandos da conversa, aviso com destaque). Detalhes no `README.md` do módulo.
- `assistente/conversa.ts`: campo opcional `opcoes` (respostas prontas em botão), validado na leitura; conversas antigas continuam válidas.
- `assistente/PainelAssistente.tsx`: pedidos de lembrete antes dos outros comandos; botões das respostas prontas; atalho "Meus lembretes"; "ajuda" cita os lembretes.
- `nucleo/Aplicacao.tsx`: `<AvisosLembretes />` montado uma vez.
- `estilos.css`: aviso fixo com faixa colorida, selo ⚠️, animação desligada em "reduzir movimento".

## Execução

| Verificação | Como | Resultado |
| --- | --- | --- |
| `interpretar.test.ts` (12) | Node 22 `--experimental-strip-types` com um substituto mínimo do `vitest` (a VM Linux não tem o binário do Rolldown) | **PASSOU** 12/12 |
| `agendador.test.ts` (13) | idem | **PASSOU** 13/13 |
| `conversa-lembretes.test.ts` (6) | idem, com `localStorage` em memória | **PASSOU** 6/6 |
| Tipos do app (`src/main.tsx` e tudo o que ele importa, com `@types/react` do projeto) | `tsc` 7.0.2, `strict`, `noUnused*` | **PASSOU** (0 erros) |
| `AvisosLembretes.test.tsx` (5) e 2 testes novos em `PainelAssistente.test.tsx` | `npm test` (Vitest + jsdom) no Windows do responsável | **PASSOU** |
| Suíte completa `npm test` | Windows do responsável, 15/11/2026 23:21 | **PASSOU** 394/394 (36 arquivos) |
| `npm run build` | `tsc --noEmit && vite build` | **PASSOU** (109 módulos; JS 408,00 kB, gzip 123,50 kB) |
| Tela (aviso, som, notificação, selo, celular) | navegador real | **NÃO TESTADO** |

## Limitações

- O aviso só toca com o GUARÁ aberto no navegador (aba aberta, mesmo em segundo plano). Fechado, o atrasado aparece ao abrir ("Era às…"). Avisar com a página fechada exigiria push/serviço externo.
- O bipe pode ser bloqueado pelo navegador até a primeira interação com a página.
- A notificação do sistema depende da permissão ("ativar notificações") e mostra só a hora.
- Sem "pausar/retomar" lembrete nem "mudar lembrete para 9h" (etapa 5 da especificação); cancelar e criar de novo resolve.
