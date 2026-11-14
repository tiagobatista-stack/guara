# Mascotes Fofofauna

| Mascote | Bioma | Personalidade |
|---|---|---|
| Ariranha | Amazônia | Curiosa, comunicativa, colaborativa |
| Lobo-guará | Cerrado | Observador, atento, independente |
| Capivara | Pantanal | Tranquila, acolhedora, organizada |

Mascotes apresentam resultados; **não são agentes** e não alteram permissões ou capacidades (seção 7.3). Ocorrência das espécies nos biomas a confirmar antes da arte definitiva. SVGs próprios, sem uso de material de terceiros.

## Arte (redesenho de 14/11/2026, etapa 1)

Estilo ilustrado, só o rosto, com contorno e traços próprios de cada espécie: orelhas grandes, focinho escuro e garganta clara no lobo-guará; cabeça larga, bigodes e mancha creme na garganta na ariranha; focinho retangular e olhos altos na capivara.

| Arquivo | Conteúdo |
|---|---|
| `lobo-guara.svg`, `ariranha.svg`, `capivara.svg` | Rosto de cada espécie no humor tranquilo |
| `prancha-humores.svg` | As três espécies nos três humores (tranquilo, atento, curioso), para conferência |

O desenho usado pelo aplicativo fica em `aplicacao/src/compartilhado/Mascote.tsx`. Os SVGs desta pasta são cópias estáticas para consulta: se o componente mudar, eles precisam ser refeitos.

Decisões do responsável (14/11/2026): estilo ilustrado; só o rosto; olhos que acompanham o ponteiro; tédio e sono quando a tela fica parada; campo para o analista dar nome a cada mascote (vazio mostra a espécie). Funções escolhidas: sinalizar o estado do trabalho, natureza da resposta, estados vazios, comemoração e reação ao toque. Só o redesenho e o olhar estão feitos; o restante está em `gestao/BACKLOG.md`.
