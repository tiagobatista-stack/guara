# Tarefa: tela de mapa das demandas e operações no GUARÁ

## Contexto
O GUARÁ (React + TypeScript, pasta `aplicacao/`) ainda não tem mapa. A base de dados já existe:
- demandas com coordenada opcional em graus decimais (o leitor de coordenadas de `src/modulos/demandas/coordenadas.ts` já aceita vários formatos e tem testes);
- pontos de operação com coordenada obrigatória, município, viagem/equipe, datas e situação (`situacaoDoPonto` em `src/modulos/operacoes/regras.ts`);
- aviso de local repetido (raio de 200 m) e exportação CSV/GeoJSON (EPSG:4674).

Registro: `gestao/BACKLOG.md` (linhas 65–66) e `gestao/STATUS.md` (item 50) dizem que "mapa" vem depois da Agenda, que já está pronta.

## Antes de escrever código
1. Leia `CLAUDE.md`, `gestao/BACKLOG.md` e `gestao/STATUS.md` e siga as regras deles (frameworks, custos, nomes, testes).
2. Dependência: **Leaflet 1.9.x** (BSD-2-Clause, sem dependências, cerca de 42 KB gzip) e `@types/leaflet` em dev. Registre a justificativa conforme o CLAUDE.md: sem ele, zoom, arrasto, balões e escala teriam de ser feitos à mão. Não instale plugins.
3. Confirme as camadas no servidor real antes de usá-las. Abra
   `https://geo.sema.mt.gov.br/geoserver/wms?service=WMS&request=GetCapabilities`
   **sem authkey** e procure cada camada pelo **Name e pelo Title** (o nome técnico costuma ser diferente do nome que aparece no Geoportal). Já confirmadas no WFS:
   - `Geoportal:AREA_EMBARGADA_SIGA_POLIGONO` (Embargos SIGA)
   - `Geoportal:AUTOS_DE_INFRACAO_SIGA_POLIGONO` (Autos de infração)
   - `Geoportal:MVW_REQUERIMENTO_ATP` (CAR/SIMCAR; nomes como `CAR_ATP` e `AREA_IMOVEL_SIMCAR` **não** servem)
   - `Geoportal:TERRAS_INDIGENAS`, `Geoportal:UNIDADES_CONSERVACAO`
   - **Municípios: nome ainda não confirmado.** Procure "munic" no Name e no Title. Não invente o nome. Se não houver camada pública, use só a base local (abaixo) e registre isso no STATUS.
   Anote no STATUS quais camadas responderam sem chave. Se alguma exigir chave, ela fica de fora desta versão.

## Decisões já tomadas (não reabrir)
- **Sem mapa de fundo de terceiros** (OpenStreetMap, Esri, Google): o pedido dos blocos do mapa revela a área de fiscalização. As únicas fontes externas permitidas são as da SEMA.
- **Sem authkey no front-end.** O app vai rodar no Vercel e tudo o que está no build fica público. Esta versão usa só camadas WMS públicas, sem proxy.
- **Base local offline:** limites municipais de MT em GeoJSON (malha do IBGE, simplificada para algumas centenas de KB) dentro do app. Com ela, o mapa funciona em campo sem internet. Se não for possível baixar a malha neste ambiente, deixe o arquivo como pendência explícita e peça ao responsável. Não gere geometria inventada.
- **Fontes WMS configuráveis**, para que um servidor interno da SEMA entre no futuro só com configuração (detalhes abaixo).

## O que construir

### 1. `src/modulos/mapa/fontes-wms.ts`
```ts
export interface CamadaWms { nome: string; titulo: string; ligadaPorPadrao?: boolean }
export interface FonteWms { id: string; nome: string; url: string; camadas: CamadaWms[] }
export const FONTES_WMS: FonteWms[] = [
  { id: 'sema-publico', nome: 'SEMA-MT (público)',
    url: import.meta.env.VITE_WMS_SEMA ?? 'https://geo.sema.mt.gov.br/geoserver/wms',
    camadas: [ /* as confirmadas no passo 3, incluindo municípios se existir */ ] },
];
```
Todas as camadas começam desligadas, exceto a de municípios da SEMA (se existir). Um servidor interno no futuro será só mais uma entrada nesta lista.

### 2. `src/modulos/mapa/regras.ts` (puro, sem Leaflet, com testes)
- `itensDoMapa(demandas, operacoes)` devolve `{ noMapa, semLocal }`:
  - demandas com coordenada válida, lida pelo **leitor existente** de `coordenadas.ts` (não escreva outro);
  - pontos de operação, com rótulo (código ou número), operação, município, viagem/equipe e situação de `situacaoDoPonto`;
  - `semLocal`: demandas sem coordenada ou com coordenada inválida.
- Uma cor e um símbolo por situação. Use **forma diferente** para demanda (círculo) e ponto de operação (quadrado ou losango), para não depender só da cor. Situação desconhecida fica cinza.
- `legenda(itens)` com a contagem de cada situação.
- `limitesDosItens(itens)` para enquadrar o mapa; sem itens, o mapa abre no centro de MT.

### 3. `src/modulos/mapa/Mapa.tsx`
- Camada base: GeoJSON local dos municípios (linha fina, sem preenchimento, nome do município no tooltip).
- Camadas WMS: `L.tileLayer.wms(url, { layers, format: 'image/png', transparent: true })`, uma por camada, num controle de camadas com o título em português.
- Por cima: demandas e pontos de operação, com filtros "Demandas", "Operações" e por situação.
- Balão do item montado com nós de texto (`textContent`), **nunca** com `innerHTML` a partir de dados do usuário. Conteúdo: título ou código, situação, município, prazo ou datas da viagem, coordenada (decimal e GMS com o formatador existente) e botão "Abrir", que leva à demanda ou ao ponto.
- Escala métrica.
- Fonte que não responde: em `tileerror`, desligue a camada, mostre "Fonte indisponível: <nome>" e mantenha o resto funcionando.
- Lista "Sem localização (N)" abaixo do mapa, com botão "Abrir".
- Atribuição: "Limites: IBGE" e "Camadas: SEMA-MT".
- Mantenha os estilos do app (`cartao`, `texto-pequeno`, `texto-suave`, `texto--atencao`, `botao botao--pequeno`). Acrescente ao `estilos.css` só o necessário.

### 4. Entrada na navegação
Uma entrada "Mapa", seguindo o padrão das telas existentes (Demandas, Operações, Agenda).

## Testes
- `regras.ts`: demanda com e sem coordenada, coordenada inválida, ponto de cada situação, legenda, enquadramento vazio, com um item e com vários itens.
- `fontes-wms.ts`: nenhuma URL de fonte contém `authkey`. Esse teste protege o build público.
- Componente: renderiza a lista "sem localização" e a contagem. O Leaflet pode ser substituído por um dublê nos testes.
- Rode a verificação completa do projeto (tsc e testes) antes de concluir.

## Fora do escopo desta versão
Rota entre pontos, clique no polígono WMS para ver atributos (GetFeatureInfo depende de CORS; avaliar depois), camadas com chave, proxy no Vercel, servidor interno, situação "atendida" (ainda não existe; quando existir, entra como mais uma cor) e edição de pontos pelo mapa.

## Ao terminar
- Atualize `gestao/STATUS.md`: o que foi feito, quais camadas responderam sem chave, o nome confirmado (ou ausente) da camada de municípios e as pendências.
- Atualize o BACKLOG: o mapa sai de "o que ficou de fora"; rota e GetFeatureInfo continuam lá.
- Relate em poucas linhas o que não pôde ser testado (por exemplo, WMS real, se não houver rede).
