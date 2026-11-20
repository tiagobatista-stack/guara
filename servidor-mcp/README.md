# Servidor MCP local — `guara-dados` (P10)

Servidor MCP **local e didático**, com transporte stdio e **somente leitura**, sobre o arquivo `guara-dados.json` exportado pela tela **Alertas** do GUARÁ.

- **Não** lê o localStorage, **não** abre porta de rede e **não** deve ser publicado no Vercel.
- **Não** sincroniza sozinho: depois de alterar dados no app, exporte o arquivo de novo.

## Ferramentas

| Ferramenta | Entrada | Saída |
|---|---|---|
| `listar_demandas` | `status?`, `prioridade?`, `limite?` (1 a 100) | total e itens |
| `resumir_demandas` | — | total, contagem por status, contagem por prioridade, data da exportação |
| `listar_inativas` | `limiar_dias?` (1 a 365), `referencia?` (ISO) | regra, total e itens com os dias parados |
| `consultar_demanda` | `id?` | uma demanda; sem `id`, a que estava aberta no GUARÁ na exportação (`origem.demandaEmFoco`). Erro se não houver id nem foco, ou se a demanda não existir |

## Formato das respostas: `{rastreio, resultado}`

**Mudança de contrato:** toda resposta de sucesso agora é `{ "rastreio": {...}, "resultado": ... }`. Antes, o resultado vinha solto; quem consome precisa ler o campo `resultado`. Erros continuam como `isError` com a mensagem.

| Campo de `rastreio` | Significado |
|---|---|
| `fonte`, `arquivo` | de onde vieram os dados |
| `sha256`, `bytes` | impressão digital do arquivo lido (prova que não mudou depois da leitura; não prova a integridade desde o navegador) |
| `exportadoEm`, `idadeHoras`, `limiteHoras` | instante da exportação, idade dela e o limite (24 h) |
| `aviso` | não nulo quando a exportação passa do limite ou não tem data: **o dado pode não refletir a tela do GUARÁ**; exporte de novo |
| `origemDaExportacao` | aplicação, tela, método e demanda em foco registrados pelo GUARÁ (`null` em arquivos antigos) |
| `metodo`, `somenteLeitura`, `ficticio`, `consultadoEm` | determinístico, sem IA; somente leitura; dados fictícios; instante da consulta |

Editar uma demanda no navegador depois de exportar **não** aparece aqui até uma nova exportação: por isso o aviso de idade.

`listar_inativas` usa a mesma função do app (`aplicacao/src/modulos/alertas/inatividade.ts`).

## Segurança

- O arquivo é aceito só se for `.json` e estiver **dentro de `servidor-mcp/dados/`** (proteção contra path traversal).
- O caminho pode ser definido pela variável `GUARA_DADOS_JSON`.
- O limite é de 1 MB.
- O esquema é validado com a mesma regra da importação do app.

## Uso

Requer Node ≥ 23.6, que executa TypeScript nativamente (testado com Node 26.13.1). Na primeira vez, instale as dependências:

```bash
cd servidor-mcp
npm install
```

Para testar sem a interface, rode o cliente MCP real que chama as 4 ferramentas, confere o rastro (caso válido, negado e de falha), a regra de idade da exportação e compara o total com o arquivo:

```bash
node servidor-mcp/testar-servidor.ts
```

## Registro no Claude Code

O registro está no escopo do projeto, em `.mcp.json` na raiz. Ao abrir uma sessão na pasta do projeto, aprove o servidor `guara-dados` e confira com `/mcp` ou `claude mcp list`.

## Dados

1. Na tela Alertas, clique em **Exportar guara-dados.json**.
2. Salve o arquivo em `servidor-mcp/dados/guara-dados.json`.

A pasta `dados/` não é versionada.
