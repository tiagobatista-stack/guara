# Evidência — coordenada da demanda (14/11/2026)

**Pedido do responsável:** "a próxima etapa após a criação do campo coordenadas é a criação do banco de dados no Supabase" (item "Coordenadas da demanda" das ideias vindas do TOCA, em `gestao/BACKLOG.md`). Feito na `main`, sobre `7862e30`.

Lógica reescrita a partir de `F:\claude\toca\compartilhado\nucleo\coordenadas.py` (GPL-3), sem copiar código.

| Mudança | Arquivo |
|---|---|
| Leitor `lerCoordenada`: graus decimais (ponto ou vírgula; separados por vírgula, ponto e vírgula, barra ou espaço), graus-minutos-segundos e graus e minutos decimais com «°», «º», «'», «’», «"», «”», e sem símbolos com letra de hemisfério («15 30 0 S 55 30 0 W»). Sinal ou letra N/S/E/W, com L (leste) e O (oeste), antes ou depois do número; com letra a ordem não importa. Grava em graus decimais (6 casas), SIRGAS 2000. Fora do Brasil é aviso; ordem trocada vira aviso com sugestão de troca. `formatarDecimal`, `formatarGms` (estilo QGIS), `coordenadaValida` | `aplicacao/src/modulos/demandas/coordenadas.ts` (novo) |
| Modelo: `coordenada?: { lat, lon }` na demanda, opcional, sem migração e sem mudar `versao: 1`; na entrada do formulário é texto | `modelo.ts`, `planejamento/PLANO.md` |
| Regras: validação com a mensagem do leitor; editar compara o valor (outro formato do mesmo ponto não é mudança); apagar o texto remove; `paraEntrada` devolve decimal; validação da gravada e da importação | `regras.ts` |
| Formulário: campo "Coordenada (opcional)" com retorno ao digitar ("Entendido: 15° 30' 0" S, 55° 30' 0" W (-15.500000, -55.500000, SIRGAS 2000).", avisos e botão "Trocar a ordem"); o erro de verdade só aparece ao gravar | `FormularioDemanda.tsx` |
| Detalhe da demanda: linha "Coordenada" em decimal e GMS | `Demandas.tsx` |

## Decisões

- **UTM não é aceito:** a conversão pediria uma biblioteca de projeção (o TOCA usa `pyproj`). A mensagem pede graus.
- **Conferência só "dentro do Brasil"** (retângulo aproximado), como aviso. O TOCA confere Mato Grosso.
- **Sem link para mapa:** abrir num serviço externo envia a coordenada para fora; fica para decisão do responsável.
- **Privacidade:** a coordenada pode identificar um imóvel e, por ele, uma pessoa. Fica fora da tela compartilhada (o resumo é por lista branca), do Kanban e do MCP (que devolve só campos escolhidos). Vai no JSON exportado. Testes e exemplos usam números redondos fictícios (−15,5; −55,5), sem relação com registros reais (seção 20.9).

## Testes (Plan–Act–Verify)

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | 32 testes unitários: 14 formatos aceitos, segundos com decimais, ordem com e sem letra; 9 recusas (vazia, um valor só, UTM, minutos ≥ 60, mesmo eixo, latitude e longitude fora do limite, só números sem letra, texto livre); avisos de ordem trocada e de fora do Brasil; saída decimal e GMS e volta; validação da gravada; criar, editar, apagar, importar e ausência na tela compartilhada | em `testes/unidade/coordenadas.test.ts` (novo) | conferidos na suíte | PASSOU |
| 2 | 2 testes de tela: retorno ao digitar, "Trocar a ordem", gravação em decimal, linha no detalhe, ausência na tela compartilhada; UTM recusado ao gravar com a mensagem no campo | em `Demandas.test.tsx` | conferidos na suíte | PASSOU |
| 3 | Suíte completa | `npm test` | `Tests 356 passed (356)` | PASSOU |
| 4 | Build | `npm run build` | `tsc --noEmit` sem erros; `✓ built`, bundle `index-BOY74mu4.js` | PASSOU |
| 5 | MCP (usa a mesma validação) | `node servidor-mcp/testar-servidor.ts` | "MCP total=4 · JSON no disco=4 · COINCIDEM" (depois da correção em `2026-11-14-mcp-sem-tsx.md`) | PASSOU |

Durante o trabalho: um caso falhou («S 15° 30' W 55° 30'»: a letra entre os números era lida como do primeiro); corrigido decidindo pelo texto inteiro se as letras vêm antes ou depois. Um teste antigo (`demandas-dominio.test.ts`) precisou declarar o exemplo sem coordenada, porque na entrada ela é texto e na demanda são números.

## Limitações

- Não extrai a coordenada de um texto colado (o TOCA faz); fica como ideia.
- Telas no navegador: **NÃO CONFERIDO VISUALMENTE**.
- Ambiente: Node v26.13.1. Não publicado.
