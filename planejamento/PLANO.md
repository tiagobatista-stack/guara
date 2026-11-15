# PLANO — primeira versão completa do GUARÁ (P02 da apostila)

Plano do MVP alinhado à Apostila FluxoLab (decisão D10). Um único usuário local, sem autenticação, com os dados no **localStorage** do navegador e publicação estática no **Vercel**.

## 1. Limites (fronteiras declaradas)

- O localStorage pertence **a um navegador e a uma origem**. Não é multiusuário nem compartilhado entre dispositivos. A URL do Vercel tem dados próprios, diferentes dos de `localhost`.
- Os alertas são **locais**: avaliados quando o app é aberto ou usado. Não há e-mail, SMTP, scheduler nem execução com o navegador fechado.
- Não há login, backend, banco nem integração com sistemas reais da SEMA. Usar só dados fictícios.
- Exportação e importação JSON servem para backup e para alimentar o MCP local. Não há sincronização automática.

## 2. Modelo de dados

```ts
type Status = 'A Fazer' | 'Em Andamento' | 'Em Validação' | 'Concluída';
type Prioridade = 'Alta' | 'Média' | 'Baixa';

interface Demanda {
  id: string;                  // crypto.randomUUID(): estável e único
  titulo: string;              // obrigatório, de 3 a 120 caracteres
  descricao: string;           // até 2000 caracteres
  responsavel: string;         // texto livre, até 80 caracteres
  prioridade: Prioridade;
  status: Status;
  criadaEm: string;            // ISO 8601
  prazo?: string;              // AAAA-MM-DD, opcional
  ultimaAcaoRelevante: string; // ISO 8601
  bloqueio?: {                 // opcional, só enquanto travada (14/11/2026, ideia do TOCA)
    motivo: 'documento' | 'setor' | 'campo' | 'outro';
    desde: string;             // ISO 8601; mudar o motivo não muda
    detalhe?: string;          // opcional, texto livre até 300 caracteres; fora da tela compartilhada
  };
  processo?: string;           // opcional (14/11/2026): processo administrativo, ex.: FIC-2026-0001
  simp?: string;               // opcional: SIMP do Ministério Público, NNNNNN-NNN/AAAA
  judicial?: string;           // opcional: CNJ NNNNNNN-DD.AAAA.J.TR.OOOO, dígitos verificadores conferidos
  tipo?: 'campo' | 'gabinete'; // opcional (14/11/2026): deduzido do título no cadastro, a pessoa confere
  natureza?: 'demanda' | 'comum'; // opcional: demanda ou tarefa comum, idem
  coordenada?: { lat: number; lon: number }; // opcional (14/11/2026): graus decimais, SIRGAS 2000; fora da tela compartilhada
  vistoria?: { data?: string }; // opcional (15/11/2026), só tipo campo: com data = encaixada numa vistoria; sem data = em aberto; ausente = não informada. Fora da tela compartilhada e do MCP
  historico?: {                // opcional (14/11/2026): status e bloqueio ao longo do tempo, só acrescenta, até 500 eventos
    quando: string;            // ISO 8601
    acao: 'criada' | 'status' | 'travou' | 'bloqueio-alterado' | 'ainda-travada' | 'destravou' | 'bloqueio-encerrado';
    de?: Status; para?: Status;            // mudança de status
    motivo?: MotivoBloqueio; detalhe?: string; // eventos do bloqueio, com o detalhe daquele momento
  }[];
}

interface Configuracao {
  diasInatividade: number;     // dias corridos, inteiro de 1 a 365, padrão 3
}
```

**Chaves no localStorage:**

- `guara:demandas:v1`
- `guara:configuracao:v1`
- `guara:backup-antes-importacao:v1`

## 3. Regras

1. **Última ação relevante** muda só ao criar, ao editar de fato (algum campo alterado), ao mudar o status ou ao travar, mudar o motivo, reavaliar ("Ainda travada") ou destravar. Consultar, filtrar ou abrir o dashboard não conta.
   **Histórico:** criar, cada mudança de status (pelo Kanban ou pelo formulário) e cada ação do bloqueio acrescentam um evento. Concluir uma demanda travada encerra o bloqueio e registra "bloqueio encerrado ao concluir". Editar os outros campos não gera evento.
2. **Vencida:** status diferente de Concluída e `prazo` anterior ao início de hoje, no fuso do navegador.
3. **Inativa:** status diferente de Concluída e (agora − `ultimaAcaoRelevante`) **maior que** `diasInatividade` dias corridos.
4. **Exclusão:** só com confirmação explícita na interface, e persistida.
5. **Armazenamento corrompido** (JSON inválido): mostrar aviso, sem apagar nada e sem sobrescrever em silêncio. O usuário escolhe entre exportar o conteúdo bruto e restaurar os exemplos.
6. **Exemplos fictícios** são gravados só na primeira inicialização (chave ausente). "Restaurar exemplos" exige confirmação.
7. **Importação JSON:**
   - validar o esquema (versão, lista de demandas válidas, IDs únicos);
   - mostrar a confirmação com as contagens antes de substituir;
   - fazer um backup lógico automático antes de substituir;
   - se for cancelada, nada muda.
8. **Fonte única de verdade:** lista, Kanban, detalhe, dashboard, alertas e localStorage mudam juntos.
9. Sucesso só é exibido **depois** que a gravação deu certo. Mensagens em pt-BR.

## 4. Doze cenários de aceite

| # | Cenário | Resultado esperado |
|---|---|---|
| 1 | Criar uma demanda válida e pressionar F5 | A demanda continua na lista |
| 2 | Criar uma demanda com título vazio ou de 2 caracteres | Erro de validação e nada é gravado |
| 3 | Editar o título e pressionar F5 | Novo título persistido; `ultimaAcaoRelevante` atualizada |
| 4 | Abrir o detalhe sem alterar nada | `ultimaAcaoRelevante` não muda |
| 5 | Excluir e cancelar a confirmação | A demanda permanece |
| 6 | Excluir, confirmar e pressionar F5 | A demanda não aparece mais |
| 7 | Mover um cartão de A Fazer para Em Andamento pelo menu "Mover para" e pressionar F5 | Cartão na nova coluna; contagens do dashboard atualizadas |
| 8 | Filtrar por status, prioridade e responsável, junto com a pesquisa | Só aparecem as demandas que satisfazem todos os filtros |
| 9 | Demanda com prazo de ontem e status Em Andamento | Contada como vencida; se estiver Concluída, não conta |
| 10 | Limiar de 3 dias; demanda com última ação há 5 dias | Alerta aparece; depois de mudar o status, o alerta some |
| 11 | Exportar `guara-dados.json` e importá-lo de volta, com confirmação | Contagens idênticas; backup gravado antes |
| 12 | Importar um JSON inválido (esquema errado ou ID duplicado) | Erro claro; os dados existentes ficam intactos |

Cada cenário terá um teste Vitest (regras puras e repositório) ou um roteiro manual no navegador, registrado em `metodologia/evidencias/ACEITE-MVP.md`.

## 5. Incrementos

1. **Dados e CRUD (P03 e P04):**
   - modelo, regras puras e repositório localStorage, com testes;
   - lista com pesquisa e filtros;
   - formulário, detalhe e exclusão com confirmação.
2. **Kanban e Dashboard (P05):**
   - 4 colunas com o menu "Mover para";
   - métricas total, contagem por status, vencidas e inativas;
   - fonte única de verdade.
3. **Alertas e exportação (P06):**
   - limiar persistido, painel de alertas e sino;
   - exportação e importação JSON;
   - "Restaurar exemplos".

Depois de cada incremento: `npm test` e `npm run build` executados e registrados (gate F). A tela Saúde do sistema continua disponível e precisa passar no próprio teste.
