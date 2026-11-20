# Evidência: roteiro de uso na URL pública (P12, item 12)

- **Data:** 19/11/2026, por volta das 21h20 (horário de Cuiabá)
- **URL:** https://guara-lemon.vercel.app
- **Navegador:** navegador integrado do app Claude (perfil próprio, separado do Chrome do responsável), operado pelo Claude
- **Versão servida:** `assets/index-BFR3kueV.js` e `assets/index-B3S3-AIP.css`, os mesmos arquivos do build de `3666d55`

| Passo | O que foi feito | Resultado observado | Situação |
|---|---|---|---|
| Abrir | Página inicial | Dashboard carregou; `localStorage` com `guara:demandas:v1` (4 demandas fictícias) | PASSOU |
| Cadastrar | Demandas → Nova demanda: "Teste de entrega na URL pública (FICTÍCIA)", responsável "Equipe Teste (fictícia)" | Mensagem "Demanda criada e gravada."; total passou de 4 para 5; histórico com `criada → A Fazer` | PASSOU |
| Kanban | Menu "Mover para" do cartão: A Fazer → Em Andamento | Status gravado no `localStorage` como "Em Andamento" | PASSOU |
| F5 | Recarregamento da página (`performance` registra `reload`) | Demanda continua com 5 no total e status "Em Andamento"; Dashboard mostra "Em Andamento 2" | PASSOU |
| Saúde do sistema | "Executar verificação" | Estado geral **OK**; "10 de 10 habilidades OK, 0 com falha"; 6/6 agentes | PASSOU |

## Limitações

- O painel do navegador estava fora da tela, então o teste usou tamanho de janela emulado (1280×800). Parte das ações foi disparada por script na própria página: o envio do formulário (`requestSubmit`, que usa o tratamento da aplicação) e o clique no menu "Saúde do sistema". O mesmo tipo de limitação já constava em "Problemas conhecidos" do STATUS. Cliques físicos: **NÃO TESTADO**.
- Celular: **NÃO TESTADO** nesta rodada.
- A demanda de teste ficou só no armazenamento do navegador integrado; não afeta outros navegadores.
