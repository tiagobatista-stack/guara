# Lembretes pessoais

Lembretes pedidos na conversa do assistente, em português falado, lidos por regras (sem IA e sem rede):

| Frase | O que acontece |
| --- | --- |
| `me lembre de beber água daqui 1 min` | lembrete único; água é **hábito** (suave) |
| `me lembre de tomar antibiótico 3x ao dia` | pergunta a 1ª vez (**[Agora] [Às 8h] [Às 12h]**) e por quantos dias; depois, de 8 em 8 h |
| `ligar para o proprietário do processo FIC-2026-0001 amanhã de manhã` | amanhã às 9h, **ligado à demanda** aberta com esse processo |

Também entende: `daqui 20 min`, `daqui meia hora`, `às 14h`, `às 3` (= 15h), `amanhã de manhã` (9h), `depois do almoço` (13h), `à noite` (19h), `sexta`, `20/11`, `daqui 3 dias`, `de 8 em 8 horas`, `de hora em hora`, `a cada 30 min`, `todo dia às 7h`, `dias úteis`, `toda segunda e quarta`, `por 7 dias`, `até sexta`, `sem fim`, `começando agora`. Sem "me lembre", uma frase que começa com verbo de ação (ligar, tomar, pagar, buscar…) e diz quando também vira lembrete.

A mascote **nunca sugere dose nem intervalo de remédio**: só repete o que a pessoa disse ("3x ao dia" vira de 8 em 8 h).

## Comandos

| Comando | O que faz |
| --- | --- |
| `lembretes` · `meus lembretes` | lista os ativos, numerados |
| `cancelar lembrete 2` · `cancelar lembrete da água` · `parar de me lembrar da água` | cancela, com **[Desfazer]** |
| `avisos` · `o que perdi?` | avisos das últimas 24 h (feito, pulado, sem resposta, página fechada) |
| `ativar notificações` | pede ao navegador a permissão de notificar |

## Aviso com destaque (`AvisosLembretes.tsx`)

Separado da conversa e montado uma vez em `Aplicacao`, aparece em qualquer tela.

- **Nível 1**, na hora: balão com faixa colorida (remédio, demanda, hábito, geral), mascote em alerta, bipe curto. Não fecha sozinho.
- **Nível 2**, sem resposta depois de 10 min (só lembrete firme): balão balança, bipe duplo, notificação do navegador, vibração (celular) e título da aba piscando.
- **Nível 3**, sem resposta depois de 30 min: o balão sai e fica o selo ⚠️ até a pessoa abrir.
- **Hábito** (água, alongar) fica no nível 1, não insiste e, sem resposta em 10 min, passa para a próxima vez.
- **Digitando**: o aviso espera até 20 s sem digitar; o selo ⏰ mostra que há aviso.
- **Página fechada**: lembrete firme dá **um** aviso ("Era às 16h: …") da vez mais recente; hábito é descartado.
- Botões: **[Feito]** ou **[Tomei]**, **[Mais 10 min]**, **[Mais 1 h]**, **[Pular esta vez/dose]** (se repete), **[Ver demanda]** (se ligado).
- As doses não escorregam: a próxima conta da hora prevista, não do clique.

**Privacidade:** a notificação do sistema pode aparecer na tela de bloqueio, por isso mostra só "Lembrete das 16h", nunca o texto.

## Limite do app web

O aviso só toca com o GUARÁ aberto neste navegador (aba aberta, mesmo em segundo plano). Com a página fechada não há como avisar sem um serviço externo; ao abrir, o atrasado aparece como "Era às…".

## Arquivos

- `interpretar.ts`: frase → pedido (função pura, recebe `agora`).
- `agendador.ts`: próxima vez, relógio, escalonamento e respostas (puro).
- `armazem.ts`: `guara:lembretes-pessoais:v1` no localStorage, validado na leitura.
- `conversa-lembretes.ts`: comandos da conversa; devolve `null` quando não é lembrete.
- `sinais.ts`: som (Web Audio), notificação, vibração, título e digitação; tudo protegido.
- `AvisosLembretes.tsx`: o aviso na tela.
