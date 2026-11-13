# Plano de Planejamento --- Estagiário Digital Fofofauna

**Versão:** 1.3\
**Data:** 13 de novembro de 2026\
**Status:** Proposta de planejamento para orientar a implementação

**Equipe do projeto:**

  -----------------------------------------------------------------------
  Integrante                     Papel           Acesso ao GitHub
  ------------------------------ --------------- ------------------------
  github.com/tiagobatista-stack  Responsável     Proprietário

  gracioli.neto@ifmt.edu.br      Equipe          Colaborador --- convite
                                                 pendente
  -----------------------------------------------------------------------

Para o convite em repositório pessoal, o GitHub exige o nome de usuário
do convidado (Settings → Collaborators → Add people); o convite por
e-mail só é aceito em organizações. O papel de cada integrante e o nível
de permissão (leitura, escrita ou manutenção) deverão ser confirmados.

**Alterações da versão 1.3:** metodologia e técnicas de prompting
(seção 21); composição de habilidades e agentes no backend (seções 9.1
a 9.6); tela de validação e saúde de agentes e habilidades (seção 9.7);
estrutura semântica de pastas (seção 8.5); padrões de orquestração alinhados à apostila FluxoLab (seção
20.6).

**Alterações da versão 1.2:** remoção de vínculos com projetos
anteriores; correção dos padrões de orquestração e da PDS conforme o
GovFlow AI Lab; contexto institucional; execução do orquestrador; MVP
dividido em MVP-0 e MVP-1; limites do plano gratuito e backup.

------------------------------------------------------------------------

## 1. Visão geral

O projeto propõe desenvolver uma plataforma digital de apoio às
atividades administrativas, operacionais e técnicas de análise de
processos. A plataforma funcionará como um **estagiário digital**:
auxilia o profissional a organizar demandas, consultar informações,
examinar documentos, identificar pendências e preparar materiais de
trabalho.

A solução não substituirá sistemas institucionais ou legados. Será uma
camada auxiliar de organização, inteligência e automação, que trabalhará
com os sistemas existentes por meio de arquivos, APIs, consultas
autorizadas e integrações tecnicamente viáveis.

O profissional continuará responsável pela análise, validação e decisão.
O sistema deverá deixar claro o que foi extraído de fontes, o que é
inferência ou sugestão produzida por IA e o que ainda depende de
conferência humana.

A identidade visual será baseada na **Fofofauna**, com personagens
inspirados em animais silvestres nativos dos três biomas presentes em
Mato Grosso: Amazônia, Cerrado e Pantanal.

## 2. Objetivos

### 2.1 Objetivo geral

Construir uma plataforma modular, segura, mobile first e de baixo custo
que funcione como assistente operacional e técnico para apoiar processos
de análise, sem substituir os sistemas institucionais utilizados pelo
profissional.

### 2.2 Objetivos específicos

-   Reduzir tarefas repetitivas e o tempo gasto na organização de
    informações.
-   Facilitar o recebimento e o acompanhamento de demandas.
-   Organizar documentos e dados associados a processos.
-   Extrair, estruturar e comparar informações documentais.
-   Apoiar pesquisas em fontes autorizadas.
-   Identificar requisitos, lacunas, divergências e possíveis
    inconsistências.
-   Preparar checklists, minutas, relatórios, planilhas e outros
    produtos preliminares.
-   Apoiar atividades de geoprocessamento quando aplicável.
-   Manter histórico, fontes e rastreabilidade das atividades.
-   Permitir expansão por módulos independentes.

## 3. Princípios orientadores

1.  **Apoio, não substituição:** a plataforma complementa os sistemas
    existentes.
2.  **Supervisão humana:** decisões, aprovações, assinaturas e
    encaminhamentos oficiais permanecem sob responsabilidade humana.
3.  **Rastreabilidade:** resultados relevantes devem indicar origem,
    data, método e estado de validação.
4.  **Segurança desde a concepção:** controle de acesso, proteção de
    dados e segregação entre usuários.
5.  **Modularidade:** funcionalidades devem ser adicionadas sem
    comprometer o núcleo.
6.  **Simplicidade:** evitar complexidade prematura e abstrações sem
    necessidade demonstrada.
7.  **Mobile first:** priorizar smartphones, mantendo boa experiência em
    tablets e computadores.
8.  **Portabilidade:** evitar dependência desnecessária de um fornecedor
    específico.
9.  **Transparência da IA:** diferenciar fatos documentados, extrações,
    inferências e sugestões.
10. **Custo controlado:** priorizar software livre e serviços gratuitos,
    sem assumir que planos gratuitos sejam ilimitados ou adequados a
    dados institucionais.

## 4. Público e contexto de uso

A plataforma será utilizada por profissionais que precisam organizar e
apoiar atividades de análise de processos. O escopo inicial deverá ser
multidisciplinar e permitir adaptação a diferentes rotinas.

As atividades concretas, os tipos de processo, os sistemas legados e as
fontes de dados deverão ser configurados de acordo com o contexto
institucional e com as permissões do usuário.

**Contexto inicial (a confirmar):** Secretaria de Estado de Meio
Ambiente de Mato Grosso (SEMA-MT), com setores como licenciamento,
fiscalização e tecnologia, os mesmos usados nos dados fictícios do
GovFlow AI Lab.

**Demanda piloto:** o MVP será validado com **um único tipo de demanda**,
a ser escolhido na Etapa 1. Os demais tipos serão incorporados depois
que o fluxo completo estiver aprovado com o piloto.

Não se deve presumir que a plataforma terá autorização para acessar
sistemas internos, documentos restritos ou dados pessoais. Cada
integração dependerá de autorização e avaliação de segurança.

## 5. Experiência de uso e fluxo de trabalho

O fluxo geral proposto é:

1.  **Receber demanda:** o usuário registra uma atividade, informa o
    contexto e identifica o processo.
2.  **Reunir materiais:** o usuário envia documentos ou indica fontes de
    consulta autorizadas.
3.  **Organizar:** a plataforma classifica arquivos, registra metadados
    e relaciona materiais à demanda.
4.  **Examinar:** ferramentas de extração e análise identificam conteúdo
    relevante, requisitos, divergências e lacunas.
5.  **Pesquisar:** quando autorizado, o sistema consulta fontes externas
    ou institucionais disponíveis.
6.  **Preparar resultados:** o sistema produz sínteses, checklists,
    tabelas, minutas e relatórios preliminares.
7.  **Revisar:** o profissional confere as fontes, corrige e valida o
    material.
8.  **Exportar ou encaminhar:** o usuário utiliza o resultado no sistema
    institucional correspondente, conforme os procedimentos vigentes.
9.  **Registrar:** a plataforma mantém histórico das ações e do estado
    de validação.

O sistema não deverá protocolar, aprovar, assinar ou alterar registros
institucionais automaticamente no MVP.

## 6. Escopo funcional

### 6.1 Núcleo da plataforma

-   Autenticação e gestão de sessão.
-   Perfil do usuário.
-   Controle de acesso e permissões.
-   Navegação e composição da interface.
-   Registro de atividades e eventos relevantes.
-   Gerenciamento e ativação de módulos.
-   Preferências pessoais.
-   Notificações e lembretes.
-   Serviços compartilhados.
-   Histórico de operações e auditoria.

### 6.2 Módulos funcionais previstos

  -----------------------------------------------------------------------
  Módulo                              Responsabilidade
  ----------------------------------- -----------------------------------
  Assistente                          Interface conversacional para
                                      receber solicitações e apresentar
                                      resultados

  Demandas e processos                Cadastro auxiliar, organização,
                                      situação, prioridade e
                                      acompanhamento

  Documentos                          Upload, classificação, leitura,
                                      extração e comparação

  Análise técnica                     Checklists, requisitos, lacunas e
                                      inconsistências

  Pesquisa                            Consulta a legislação, referências
                                      e bases autorizadas

  Produção técnica                    Preparação de minutas, relatórios,
                                      tabelas e documentos preliminares

  Geoprocessamento                    Apoio a GeoJSON, KML e outros
                                      formatos geoespaciais pertinentes

  Agenda                              Prazos, compromissos e lembretes

  Deslocamentos e campo               Planejamento de viagens, vistorias
                                      e operações de campo vinculadas a
                                      demandas

  Conhecimento                        Organização de normas,
                                      procedimentos e referências
                                      autorizadas

  Painel                              Visão de demandas, prazos,
                                      pendências e atividades

  Saúde do sistema                    Validação e estado de agentes,
                                      habilidades, ferramentas e
                                      padrões de orquestração (seção
                                      9.7)
  -----------------------------------------------------------------------

A lista representa o horizonte funcional, não uma obrigação de
implementar todos os módulos na primeira versão.

### 6.3 Mapa de funcionalidades e módulos

  -----------------------------------------------------------------------
  Funcionalidade          Descrição                Módulo de destino
  ----------------------- ------------------------ ----------------------
  Hoje                    Painel de atividades     Painel
                          prioritárias             

  Tarefas                 Gestão de demandas e     Demandas e processos
                          atividades               

  Viagens                 Módulo de deslocamentos  Deslocamentos e campo
                          e operações de campo     

  Diário                  Registro de atividades   Núcleo (auditoria e
                          e histórico              histórico)

  Avisos e lembretes      Central de               Núcleo (notificações)
                          notificações             e Agenda

  Buscar demanda          Pesquisa global          Núcleo (busca)

  Consulta ao geoportal   Integração com           Geoprocessamento
                          ferramentas geoespaciais 

  Publicação de arquivos  Gestão e exportação      Documentos e Produção
                          documental               técnica

  Campo de conversa       Interface do estagiário  Assistente
                          digital                  
  -----------------------------------------------------------------------

Cada funcionalidade deverá respeitar o modelo de permissões e
isolamento de dados da plataforma. Operações de campo sem conexão
(sincronização offline) ficam fora do MVP e serão avaliadas em etapa
posterior.

## 7. Identidade visual --- Fofofauna

### 7.1 Conceito

A Fofofauna será a identidade dos personagens que representam o
estagiário digital. A proposta inicial contempla três mascotes, um
associado a cada bioma de Mato Grosso.

  Bioma      Espécie candidata   Personalidade conceitual
  ---------- ------------------- --------------------------------------
  Amazônia   Ariranha            Curiosa, comunicativa e colaborativa
  Cerrado    Lobo-guará          Observador, atento e independente
  Pantanal   Capivara            Tranquila, acolhedora e organizada

As espécies são uma proposta inicial de identidade. Antes da produção
definitiva, deverá ser confirmada a ocorrência natural de cada espécie
nos biomas mato-grossenses e revisada a adequação da associação
ecológica. A representação deverá respeitar as características
biológicas dos animais.

### 7.2 Comportamento dos personagens

Cada mascote poderá ter:

-   Nome próprio.
-   Identidade visual exclusiva.
-   Expressões faciais e estados visuais.
-   Animações leves.
-   Frases contextualizadas.
-   Personalidade e tom de comunicação.
-   Reações a eventos da aplicação.

Exemplos de situações: chegada de uma demanda, conclusão de uma etapa,
identificação de pendência, prazo próximo, falha de operação ou
solicitação de revisão.

O tom deverá ser acolhedor e profissional, sem infantilizar a interface.
A personalidade não poderá interferir na precisão técnica nem alterar o
conteúdo dos resultados.

### 7.3 Organização técnica

Criar um módulo independente `mascotes`, com cadastro de personagens,
bioma associado, recursos gráficos, frases, estados e preferências de
exibição.

A arquitetura deverá permitir selecionar um personagem ou, futuramente,
apresentar os três como uma equipe. Como decisão inicial, os três
personagens coexistirão no produto, e o usuário poderá escolher um
mascote principal. A seleção será apenas uma preferência visual: não
alterará permissões, dados ou capacidades do sistema.

Priorizar SVG e animações leves, com atenção ao desempenho em
dispositivos móveis. Não utilizar imagens ou personagens protegidos por
direitos de terceiros sem licença adequada.

### 7.4 Layout de referência da interface

Referência visual: `referencias/layout_dashboard_referencia.webp`
(destino na estrutura do projeto: `identidade-visual/referencias/`)
(painel de tarefas em três colunas: menu lateral, área central
analítica e painel de conversa à direita).

A referência orienta apenas a **estrutura e a hierarquia** da interface.
Não deverão ser reproduzidos marca, textos, ícones, avatares (por
exemplo, Memojis) ou ilustrações da imagem; a identidade visual será a
da Fofofauna.

Elementos adotados:

-   **Menu lateral adaptável a dispositivos móveis:** no desktop, coluna
    fixa com módulos ativos (Painel, Demandas, Documentos, Agenda,
    Conhecimento etc.), atalhos rápidos, Configurações e Sair. Em
    tablets, versão recolhida só com ícones. No smartphone, barra de
    navegação inferior com os 4 ou 5 módulos principais e menu completo
    em gaveta. Os itens exibidos virão do registro de módulos (seção
    8.3) e das permissões do usuário.
-   **Área central com demandas e atividades prioritárias:** cartões de
    resumo (demandas abertas, pendências de revisão, prazos próximos,
    concluídas), lista de demandas do dia, atividades em andamento e
    linha do tempo de prazos e compromissos. No smartphone, os blocos
    serão empilhados em uma única coluna, por ordem de prioridade.
-   **Painel contextual de notificações:** coluna à direita no desktop
    (gaveta ou tela própria no smartphone) com prazos, pendências de
    revisão, falhas de operação e resultados prontos, sempre ligados à
    demanda de origem.
-   **Assistente Fofofauna integrado à interface:** o mascote principal
    escolhido pelo usuário aparece no painel do assistente e reage a
    eventos (seção 7.2), sem ocupar espaço do conteúdo técnico. Respostas
    do assistente deverão distinguir fatos extraídos, inferências e
    sugestões, com indicação de fontes e estado de revisão.
-   **Campo de interação por linguagem natural:** campo de mensagem
    fixo na base do painel do assistente (no smartphone, botão flutuante
    que abre a conversa), com envio de texto, anexo de documentos e,
    futuramente, entrada por voz. A busca global do cabeçalho poderá
    aceitar comandos em linguagem natural. No MVP, o campo poderá operar
    com comandos e fluxos assistidos determinísticos, sem exigir modelo
    de IA pago (seção 9).

Requisitos transversais: modo claro e escuro, contraste e navegação por
teclado acessíveis (WCAG 2.1 AA como meta), áreas de toque adequadas em
telas pequenas e carregamento leve dos painéis secundários.

## 8. Arquitetura técnica proposta

### 8.1 Stack inicial

  -----------------------------------------------------------------------
  Camada                  Tecnologia proposta     Observações
  ----------------------- ----------------------- -----------------------
  Frontend                React + TypeScript      Interface tipada e
                                                  componentizada

  Ferramentas frontend    Vite                    Desenvolvimento e build

  Estilização             Tailwind CSS            Design responsivo

  Aplicação instalável    PWA                     Experiência semelhante
                                                  a aplicativo

  Banco de dados          PostgreSQL              Banco relacional
                                                  portável

  Backend gerenciado      Supabase                Avaliar Auth, banco e
  inicial                                         armazenamento

  Autenticação            Supabase Auth + Google  Exige configuração e
                          OAuth                   autorização no Google

  Testes unitários        Vitest                  Testes de lógica e
                                                  componentes

  Testes de interface     Playwright              Fluxos de navegador

  Versionamento           Git                     Histórico de alterações

  Repositório             GitHub ou alternativa   Código e colaboração
                          compatível              

  Documentação            Markdown                Documentação versionada
  -----------------------------------------------------------------------

A stack é uma recomendação inicial, sujeita à verificação de
compatibilidade, manutenção, licenças, requisitos institucionais e
limites de custo antes da implementação.

### 8.2 Visão em camadas

1.  **Interface:** PWA mobile first, painel, navegação, conversa,
    documentos e mascotes.
2.  **Núcleo da aplicação:** autenticação, autorização, usuários,
    módulos, notificações, auditoria e configurações.
3.  **Orquestração:** interpretação da solicitação, planejamento de
    etapas, seleção de ferramentas, execução controlada e apresentação
    de resultados.
4.  **Módulos de domínio:** processos, documentos, análise técnica,
    pesquisa, produção, geoprocessamento e agenda.
5.  **Adaptadores de integração:** APIs, importação/exportação, serviços
    externos e conectores autorizados.
6.  **Persistência:** PostgreSQL, armazenamento de arquivos e histórico
    operacional.

### 8.3 Modularidade

Cada módulo deverá possuir identificação, versão, descrição, permissões
necessárias, rotas, componentes de navegação, serviços e configurações
próprias, conforme aplicável.

O núcleo deverá conhecer o contrato público de cada módulo, não sua
implementação interna. A desativação de um módulo não poderá comprometer
os demais.

A modularidade deverá ser implementada de forma compatível com a stack
escolhida. Não criar um sistema distribuído ou arquitetura de
microsserviços sem necessidade concreta.

### 8.4 Execução do orquestrador e guarda de segredos

O frontend é estático e não poderá conter lógica privilegiada, chaves de
modelos de IA ou a chave `service_role`. Toda lógica do orquestrador,
chamada a modelos e integração externa rodará no servidor.

-   **Opção padrão:** Supabase Edge Functions, com segredos guardados no
    cofre do próprio Supabase e acesso ao banco sujeito a RLS.
-   **Alternativa:** backend próprio (por exemplo, Python/FastAPI,
    mesma tecnologia do laboratório), caso o processamento de documentos
    ou as bibliotecas necessárias não caibam nas Edge Functions.

A escolha será registrada em `ARQUITETURA.md` na Etapa 1. Em ambas as
opções, cada chamada deverá validar a sessão do usuário e registrar a
execução conforme a seção 9.

### 8.5 Estrutura semântica de pastas

A pasta do projeto será **semântica**: cada diretório tem nome em
português que descreve o que contém e para que serve, de modo que a
estrutura funcione como um mapa da proposta. Quem abrir o repositório
deve reconhecer módulos, agentes, habilidades e evidências sem ler o
código.

    estagiario-digital-fofofauna/
      README.md                  # visão geral e como iniciar
      CLAUDE.md                  # contexto permanente para o Claude Code
      .claude/                   # ferramentas de desenvolvimento
        skills/                  #   testar-sistema, revisar-interface,
                                 #   validar-pds
        agents/                  #   arquiteto, implementador, auditor
        hooks/                   #   bloqueio de comandos e segredos
        settings.json
      gestao/                    # acompanhamento do projeto
        STATUS.md
        CHANGELOG.md
        equipe.md
        decisoes/                # uma decisão técnica por arquivo
      planejamento/              # este documento, requisitos e
                                 # critérios de aceite
      metodologia/               # como o sistema foi construído
        tecnicas.md              #   técnicas de prompting (seção 21)
        prompts/                 #   prompts utilizados, versionados
        evidencias/              #   registros PASSOU, FALHOU, NÃO TESTADO
      identidade-visual/
        fofofauna/               # mascotes em SVG, estados e frases
        referencias/             # imagens de referência de layout
      aplicacao/                 # frontend React + TypeScript + Vite
        src/
          nucleo/                # autenticação, navegação, permissões
          modulos/
            painel/
            demandas/
            documentos/
            assistente/
            saude-do-sistema/    # tela da seção 9.7
          compartilhado/         # componentes e estilos reutilizáveis
      backend/                   # detalhado na seção 9.5
        supabase/
          migrations/
          functions/
      dados-ficticios/           # demandas e documentos de exemplo
      testes/
        unidade/
        integracao/
        interface/
        autotestes-habilidades/  # usados pela verificação de saúde
        avaliacoes-ia/           # evals da seção 20.8
      documentacao/
        ARQUITETURA.md
        implantacao.md
        backup-e-recuperacao.md

Regras da estrutura:

-   Nomes em português, minúsculos, com hífen (`saude-do-sistema`),
    exceto arquivos e pastas que as ferramentas exigem com nome fixo
    (`README.md`, `CLAUDE.md`, `.claude/`, `src/`, `supabase/`,
    `package.json`).
-   Proibidas pastas genéricas sem significado, como `utils`, `misc`,
    `temp`, `novo` ou `diversos`.
-   Cada agente e cada habilidade tem sua própria pasta, com o nome
    idêntico ao identificador do catálogo (seções 9.2 e 9.3). Assim o
    nome da pasta, o registro no banco e o cartão na tela Saúde do
    sistema coincidem.
-   Pastas de domínio relevantes terão um `README.md` curto explicando
    responsabilidade, entradas, saídas e dependências.
-   O GovFlow AI Lab permanece em repositório próprio e não é copiado
    para esta estrutura (seção 20.1).

## 9. Orquestrador do estagiário digital

O orquestrador será responsável por coordenar atividades que envolvam
mais de um módulo ou ferramenta.

Responsabilidades previstas:

-   Interpretar solicitações em linguagem natural.
-   Identificar o objetivo e os materiais disponíveis.
-   Dividir atividades em etapas verificáveis.
-   Selecionar ferramentas autorizadas.
-   Solicitar informações ausentes.
-   Executar operações permitidas.
-   Registrar resultados e fontes.
-   Identificar falhas e limitações.
-   Encaminhar resultados para revisão humana.

A lógica de negócio não deverá ficar inteiramente dentro de um modelo de
IA. Regras determinísticas, validações, permissões e operações críticas
deverão ser implementadas em código convencional.

Cada execução deverá registrar, quando pertinente: usuário, demanda,
ferramenta utilizada, parâmetros relevantes, fontes consultadas,
horário, resultado, falhas e estado de revisão.

Não assumir que um modelo de IA ou uma API externa será gratuita. O MVP
deverá funcionar com recursos determinísticos e fluxos assistidos sem
exigir obrigatoriamente um serviço de IA pago. Integrações com modelos
deverão ser opcionais, substituíveis e sujeitas a controle de custo e
privacidade.

### 9.1 Composição em camadas

O backend do estagiário digital é composto por quatro elementos, cada
um com responsabilidade única:

1.  **Orquestrador** (código convencional): recebe a solicitação,
    aplica permissões, escolhe o fluxo, aciona agentes, registra a
    execução e aplica o gate de qualidade.
2.  **Agentes:** executores especializados, cada um com papel,
    habilidades permitidas, ferramentas e limites próprios.
3.  **Habilidades (skills):** procedimentos reutilizáveis com contrato
    de entrada e saída. Um agente só executa as habilidades que lhe
    foram atribuídas.
4.  **Ferramentas:** acesso controlado a dados e serviços (banco,
    armazenamento de arquivos, MCP, APIs autorizadas).

Regra de composição: **orquestrador → agente → habilidade →
ferramenta**. Nenhum agente acessa ferramentas diretamente fora de uma
habilidade, e nenhuma habilidade grava dados sem passar pela validação
do backend.

Cada habilidade pode ser executada de forma **determinística** (regras
e código, sem IA) ou **assistida por IA** (quando houver modelo
autorizado). O MVP usa apenas a forma determinística (seção 16).

### 9.2 Catálogo de habilidades

  -----------------------------------------------------------------------
  Habilidade              Entrada                  Saída
  ----------------------- ------------------------ ----------------------
  registrar-demanda       Dados informados pelo    Demanda validada e
                          usuário                  registrada

  classificar-demanda     Demanda e documentos     Tipo, setor e
                                                   prioridade sugeridos

  extrair-documento       Arquivo PDF com camada   Texto e campos com
                          de texto                 página de origem

  montar-checklist        Tipo de demanda          Checklist aplicável
                                                   configurado

  conferir-requisitos     Checklist e extrações    Itens atendidos,
                                                   pendentes e não
                                                   verificáveis, com
                                                   evidências

  avaliar-prazos          Demandas e datas         Demandas paradas ou
                                                   com prazo próximo

  redigir-minuta          Resultado da conferência Minuta preliminar
                          e modelo                 marcada como "a
                                                   revisar"

  validar-evidencias      Resultado preliminar     Verificação de fontes,
                                                   IDs e ressalvas

  relatorio-executivo     Resultados validados     Relatório consolidado
                                                   com rastreabilidade

  validar-pds             Entrega de software do   Checklist didático de
                          próprio sistema          qualidade (não é o PDS
                                                   oficial da SEMA)
  -----------------------------------------------------------------------

Contrato mínimo de cada habilidade: identificador, versão, descrição,
esquema de entrada, esquema de saída, permissões necessárias,
ferramentas usadas, modo (determinístico ou assistido), testes e
critérios de aceite. Saídas são validadas por esquema antes de seguirem
para a próxima etapa.

### 9.3 Catálogo de agentes

  -----------------------------------------------------------------------
  Agente                  Papel                    Habilidades
                                                   permitidas
  ----------------------- ------------------------ ----------------------
  triagem                 Recebe e classifica a    registrar-demanda,
                          demanda; aplica o        classificar-demanda
                          roteamento

  documental              Organiza e extrai        extrair-documento
                          conteúdo dos documentos

  analista                Monta e confere o        montar-checklist,
                          checklist técnico        conferir-requisitos

  prazos                  Acompanha inatividade e  avaliar-prazos
                          prazos

  redator                 Prepara minutas e        redigir-minuta,
                          relatórios preliminares  relatorio-executivo

  revisor                 Revisão independente;    validar-evidencias
                          não aprova o que não foi
                          verificado
  -----------------------------------------------------------------------

Regras dos agentes:

-   Permissões mínimas: triagem, documental, analista, prazos e revisor
    operam somente em leitura; só o redator gera rascunhos, e nenhum
    agente grava resultado final sem aprovação humana.
-   O agente revisor nunca revisa o próprio trabalho e não pode ser
    desativado no fluxo de resultados.
-   Cada agente recebe só o contexto da demanda em curso (seção 20.2).
-   Os mascotes da Fofofauna apresentam os resultados, mas não são
    agentes (seção 7.3).

### 9.4 Fluxo padrão de uma demanda

1.  **Triagem** registra e classifica a demanda e escolhe o fluxo
    (roteamento).
2.  **Documental** extrai o conteúdo dos documentos enviados.
3.  **Analista** monta o checklist e confere os requisitos. Em paralelo,
    **prazos** avalia os riscos de tempo.
4.  **Redator** consolida a minuta preliminar.
5.  **Revisor** valida evidências e fontes de forma independente.
6.  **Gate de qualidade:** o resultado só é liberado ao usuário se os
    esquemas, as fontes e a revisão forem aprovados; caso contrário,
    volta ao passo 4 com no máximo duas tentativas.
7.  **Revisão humana:** o profissional corrige, valida e exporta.

Cada passo gera um registro de execução (seção 9.5).

### 9.5 Estrutura no backend

Organização proposta da pasta `backend/` (opção padrão da seção 8.4;
estrutura geral na seção 8.5):

    backend/supabase/
      migrations/              # tabelas, RLS e registro de execuções
      functions/
        orquestrador/          # ponto de entrada; permissões e fluxos
        saude/                 # verificação da seção 9.7
        _compartilhado/
          agentes/             # uma pasta por agente: triagem,
                               # documental, analista, prazos,
                               # redator, revisor
          habilidades/         # uma pasta por habilidade: contrato,
                               # implementação e autoteste
          ferramentas/         # acesso a banco, arquivos e MCP
          gate-de-qualidade/   # validações antes de liberar resultados

Tabelas de rastreabilidade (todas com RLS por usuário):

-   `agentes` e `habilidades`: catálogo, versão e estado (ativa ou
    inativa).
-   `execucoes`: usuário, demanda, fluxo, início, fim e situação.
-   `etapas_execucao`: agente, habilidade, entrada resumida, saída,
    ferramentas chamadas, falhas e duração.
-   `evidencias`: fonte (documento, página, trecho) vinculada a cada
    resultado.
-   `revisoes`: decisão humana, correções e data.

### 9.6 Habilidades e agentes de desenvolvimento

Além dos componentes do produto, o repositório terá habilidades e
agentes para o **Claude Code** em `.claude/`, usados na construção do
sistema:

-   **Skills:** `testar-sistema` (build, testes e relatório PASSOU,
    FALHOU ou NÃO TESTADO), `revisar-interface` (acessibilidade,
    responsividade e regressão visual) e `validar-pds` (checklist
    didático de qualidade das entregas).
-   **Subagentes:** `arquiteto` (analisa arquitetura e riscos, sem
    alterar código), `implementador` (corrige problema pontual com
    teste) e `auditor` (revisa evidências, sem aprovar o que não foi
    testado).
-   **Hook:** bloqueio de comandos perigosos e de gravação de segredos
    antes da execução (seção 20.7).

Habilidades e agentes de desenvolvimento não são carregados pelo
produto em execução.

### 9.7 Tela de validação e saúde de agentes e habilidades

O sistema terá uma tela própria, **Saúde do sistema**, que torna
visível e verificável a composição descrita nas seções 9.1 a 9.6. É a
principal evidência de que agentes e habilidades existem, estão
conectados e funcionam.

**Indicadores gerais (cartões no topo):**

-   Agentes ativos / total e habilidades ativas / total.
-   Taxa de aprovação no gate de qualidade (últimas 24 h e 7 dias).
-   Execuções concluídas, com falha e aguardando revisão humana.
-   Data e resultado da última verificação completa.

**Painel de agentes:** um cartão por agente com papel, versão,
habilidades permitidas, ferramentas autorizadas, situação, última
execução, taxa de sucesso e tempo médio. O mascote Fofofauna indica
visualmente o estado geral (por exemplo, tranquilo quando tudo está
OK, atento quando há alerta), sem substituir o texto do estado.

**Painel de habilidades:** tabela com identificador, versão, modo
(determinístico ou assistido), agente responsável, resultado do último
teste, cobertura dos critérios de aceite e última execução real.

**Mapa de composição:** diagrama orquestrador → agentes → habilidades
→ ferramentas, com cada ligação colorida pelo estado. Permite ver de
imediato onde está uma falha.

**Ferramentas e integrações:** conexão com banco, armazenamento de
arquivos, servidores MCP e hooks ativos, cada um com teste de conexão.

**Padrões de orquestração:** quadro A–F (seção 20.6) com a situação de
cada padrão (DEMONSTRADO, NÃO DEMONSTRADO, FALHOU) e link para o
registro de execução que comprova.

**Estados padronizados:** `OK` (verde), `ATENÇÃO` (amarelo), `FALHA`
(vermelho) e `NÃO TESTADO` (cinza). Todo estado tem cor, ícone e texto,
para não depender só da cor (acessibilidade).

**Ações disponíveis:**

-   **Executar verificação:** roda o teste de fumaça de cada habilidade
    com uma demanda fictícia fixa e compara com a saída esperada.
-   **Ver evidências:** abre o registro (`execucoes` e
    `etapas_execucao`) que sustenta cada estado.
-   **Desativar ou reativar** um agente ou habilidade, com registro em
    auditoria. O agente revisor e o gate de qualidade não podem ser
    desativados.

**Backend da verificação:**

-   Função `saude` no orquestrador, que consulta o catálogo, executa os
    testes de fumaça e grava o resultado em uma tabela
    `verificacoes_saude` (data, componente, estado, detalhe, duração).
-   Cada habilidade expõe um **autoteste** no seu contrato (entrada
    fictícia e saída esperada), usado pela verificação.
-   A verificação usa somente dados fictícios, nunca demandas reais.
-   Um estado só é `OK` se o teste foi realmente executado; nada é
    marcado como aprovado por suposição.

**Acesso:** perfil de administração, com visão resumida (somente
indicadores) disponível aos demais usuários.

## 10. Integração com sistemas legados

A plataforma deverá coexistir com os sistemas institucionais. Não deverá
exigir sua substituição, migração ou reimplementação.

Ordem de preferência para integração:

1.  APIs oficiais e autorizadas.
2.  Importação e exportação de arquivos.
3.  Consultas a bases públicas autorizadas.
4.  Conectores específicos documentados.
5.  Automação de interface somente quando permitida, estável e aprovada.

Toda integração deverá ter escopo, credenciais, permissões, limites e
tratamento de erros definidos.

No MVP, priorizar o fluxo por arquivos enviados pelo usuário.
Integrações diretas deverão ser adicionadas gradualmente, depois de
confirmadas as condições técnicas e institucionais.

## 11. Autenticação, autorização e segurança

A autenticação inicial deverá utilizar conta Google por OAuth 2.0, por
meio do Supabase Auth, se a avaliação técnica e institucional confirmar
essa escolha.

Requisitos:

-   Login e logout.
-   Gestão segura de sessão.
-   Proteção de rotas e operações.
-   Perfis e permissões.
-   Isolamento dos dados entre usuários.
-   Políticas RLS no PostgreSQL.
-   Validação no backend.
-   Proteção de segredos e tokens.
-   Registro de operações relevantes.
-   Tratamento de erros sem exposição de informações sensíveis.

A autorização nunca deverá depender apenas da interface. Toda operação
protegida deverá ser validada no backend e, quando aplicável, no banco
de dados.

A chave `service_role` do Supabase e outros segredos nunca poderão ser
expostos no navegador, no repositório ou em logs.

A autenticação Google não concede automaticamente acesso a Google Drive,
Agenda, Gmail ou outros serviços. Cada integração exigirá escopos e
consentimentos específicos.

## 12. Privacidade, LGPD e dados institucionais

Antes de utilizar documentos reais, deverá ser definida a classificação
dos dados e verificado se o uso de serviços externos é permitido pela
instituição responsável.

Requisitos mínimos:

-   Coletar e armazenar apenas dados necessários.
-   Restringir acesso por usuário e função.
-   Proteger arquivos e tráfego.
-   Definir retenção e descarte.
-   Evitar dados sensíveis em logs.
-   Não enviar documentos restritos a serviços de IA externos sem
    autorização.
-   Documentar fornecedores e locais de processamento.
-   Prever exportação e exclusão conforme política aplicável.
-   Separar ambiente de desenvolvimento e produção.

O uso de plano gratuito de um fornecedor não significa, por si só, que o
serviço esteja aprovado para armazenar dados institucionais.

## 13. Política de custos e licenciamento

A prioridade é custo zero ou o menor custo possível, com preferência por
software livre e open source.

Antes de adotar um serviço, verificar:

-   Licença do software.
-   Limites do plano gratuito.
-   Limites de armazenamento e processamento.
-   Suspensão por inatividade.
-   Necessidade de cartão de crédito.
-   Limites de requisições.
-   Restrições comerciais ou institucionais.
-   Possibilidade de exportação e migração.
-   Custos futuros previsíveis.

Não contratar serviços, ativar planos pagos ou gerar despesas sem
autorização expressa.

Manter PostgreSQL, migrações e dados em formatos portáveis. O uso de
Supabase deverá evitar dependências proprietárias desnecessárias e
preservar a possibilidade de migração para infraestrutura própria.

Pontos de atenção do plano gratuito do Supabase (confirmar os valores
vigentes na página oficial de preços antes da adoção):

-   Projetos gratuitos são pausados após cerca de uma semana sem uso.
-   Banco e armazenamento de arquivos têm cotas reduzidas.
-   Não há backup com recuperação pontual (PITR).
-   Criar o projeto na região de São Paulo (`sa-east-1`), por
    proximidade e residência de dados (LGPD).
-   Definir se o login usará contas Google pessoais ou institucionais e
    obter aprovação institucional para o uso do serviço.

## 14. Qualidade de engenharia

Adotar práticas adequadas ao porte do projeto:

-   Código claro e tipado.
-   Separação de responsabilidades.
-   Baixo acoplamento e alta coesão.
-   Componentes reutilizáveis.
-   Validação de entradas.
-   Tratamento centralizado de erros.
-   Logs estruturados.
-   Testes unitários, integração e interface.
-   Migrações versionadas.
-   Revisão de dependências e licenças.
-   Documentação técnica.
-   Acessibilidade e desempenho.

Aplicar SOLID e DRY quando agregarem valor. Evitar abstrações prematuras
e complexidade desnecessária.

Toda funcionalidade deverá ter critérios de aceite e testes
proporcionais ao risco.

## 15. Persistência, backup e recuperação

O banco de dados deverá ser versionado por migrações. Alterações
destrutivas não poderão ser aplicadas sem backup e validação.

Planejar:

-   Restrições de integridade.
-   Relações entre usuários, demandas, documentos e atividades.
-   Isolamento de dados.
-   Backups e recuperação.
-   Exportação de dados.
-   Histórico de alterações quando necessário.
-   Registro de migrações.
-   Procedimentos de atualização e reversão.

A política de backup deverá considerar as limitações do plano de
hospedagem. Não presumir que o fornecedor gratuito ofereça backup
suficiente.

Backup próprio mínimo: exportação agendada do banco com `pg_dump` e
cópia dos arquivos armazenados, guardadas fora do fornecedor, com teste
periódico de restauração em ambiente separado.

## 16. Estratégia de entrega

### Etapa 1 --- Diagnóstico e desenho

-   Examinar o ambiente de desenvolvimento.
-   Definir requisitos funcionais e não funcionais.
-   Confirmar o tipo de demanda piloto do MVP (seção 4).
-   Decidir onde executar o orquestrador e guardar segredos (seção
    8.4).
-   Criar `ARQUITETURA.md` com a arquitetura e as decisões técnicas.
-   Confirmar stack, licenças e custos.
-   Desenhar arquitetura, modelo de dados e contratos de módulos.
-   Identificar integrações e intervenções humanas necessárias.
-   Criar `STATUS.md` e documentação inicial.
-   Versionar o GovFlow AI Lab existente em repositório próprio,
    separado do produto.

**Entrega:** plano técnico, estrutura do projeto e decisões registradas.

### Etapa 2 --- Fundação técnica

-   Criar aplicação React, TypeScript e Vite.
-   Configurar estilo e responsividade.
-   Implementar navegação e layout principal.
-   Preparar PWA.
-   Configurar banco e migrações.
-   Implementar autenticação e autorização.
-   Configurar políticas RLS.
-   Criar testes básicos e pipeline de validação.

**Entrega:** aplicação acessível, com login e persistência segura.

### Etapa 3 --- MVP operacional

O MVP será entregue em duas fatias, ambas aplicadas à demanda piloto
(seção 4).

**MVP-0 --- fluxo mínimo ponta a ponta:**

-   Login Google.
-   Perfil e controle de acesso.
-   Painel inicial simples.
-   Cadastro e acompanhamento de demandas.
-   Upload e organização de documentos.
-   Registro de atividades.
-   Checklist de análise configurável, preenchido manualmente.
-   Preparação de resultado preliminar a partir do checklist.
-   Revisão e validação humana.
-   Exportação de resultados.
-   Layout em três áreas (menu, área central e painel contextual),
    adaptado a smartphones (seção 7.4).
-   Tela **Saúde do sistema** com catálogo de agentes e habilidades,
    autotestes executáveis e evidências (seção 9.7).

**MVP-1 --- primeiros recursos assistidos:**

-   Extração de texto de PDFs que já possuem camada de texto.
-   Assistente com comandos e fluxos determinísticos (seção 9).
-   Identidade inicial completa da Fofofauna.

Ficam fora do MVP: OCR de documentos digitalizados, uso offline e
chamadas obrigatórias a modelos de IA pagos.

**Entrega:** fluxo completo de apoio a uma demanda, desde o recebimento
até a preparação de um resultado revisável.

### Etapa 4 --- Orquestração e módulos adicionais

-   Orquestrador de atividades.
-   Pesquisa em fontes autorizadas.
-   Comparação documental.
-   Produção técnica ampliada.
-   Agenda e notificações.
-   Geoprocessamento.
-   Base de conhecimento.
-   Integrações específicas com sistemas legados.
-   Incorporação de skills, agentes, MCP e padrões de orquestração
    validados no GovFlow AI Lab (seção 20).

**Entrega:** ampliação gradual das capacidades, com testes e
rastreabilidade.

### Etapa 5 --- Validação e implantação

-   Testar em smartphones, tablets e computadores.
-   Validar permissões e isolamento de dados.
-   Testar fluxos completos.
-   Avaliar segurança e privacidade.
-   Validar backup e recuperação.
-   Corrigir problemas.
-   Documentar implantação, operação e atualização.

**Entrega:** versão implantada, documentada e com limitações conhecidas.

## 17. Critérios de aceite do MVP

O MVP somente deverá ser considerado funcional quando:

-   Um usuário conseguir autenticar-se com Google.
-   Rotas e operações protegidas exigirem autorização.
-   Os dados de um usuário não forem acessíveis a outro.
-   O usuário conseguir criar e acompanhar uma demanda.
-   O usuário conseguir anexar e consultar documentos autorizados.
-   O sistema registrar as operações relevantes.
-   O sistema conseguir produzir ao menos um resultado preliminar
    revisável.
-   O usuário conseguir corrigir, validar e exportar esse resultado.
-   A interface funcionar em telas móveis e desktop.
-   Os testes essenciais estiverem automatizados e aprovados.
-   Recursos de IA presentes no MVP tiverem avaliações registradas e
    aprovadas nos limiares definidos.
-   A tela Saúde do sistema exibir todos os agentes e habilidades, e a
    ação "Executar verificação" produzir estados reais com evidência
    registrada.
-   A documentação de instalação e operação estiver atualizada.

## 18. Autonomia do agente de desenvolvimento

O agente de programação deverá executar diretamente todas as tarefas
tecnicamente possíveis e autorizadas:

-   Criar e editar arquivos.
-   Instalar dependências.
-   Configurar ferramentas.
-   Executar comandos.
-   Criar migrações.
-   Implementar funcionalidades.
-   Executar testes.
-   Corrigir falhas.
-   Atualizar documentação.
-   Preparar implantação.

Não deverá transferir ao usuário tarefas que consiga executar com
segurança.

Quando uma ação exigir intervenção humana --- por exemplo, criar conta,
aceitar termos, confirmar identidade, autorizar OAuth ou fornecer acesso
institucional --- deverá:

1.  Explicar o motivo.
2.  Indicar o serviço e a etapa exata.
3.  Fornecer o link oficial, quando aplicável.
4.  Informar o que o usuário precisa fazer.
5.  Aguardar a conclusão.
6.  Retomar do ponto em que parou.

Não solicitar senhas ou segredos diretamente na conversa. Utilizar
mecanismos seguros de autenticação e armazenamento de credenciais.

Não afirmar que uma configuração foi concluída sem verificar seu
funcionamento. Não contratar serviços ou gerar despesas sem autorização.

## 19. Documentação e acompanhamento

Manter, no mínimo:

-   `README.md`: visão geral, requisitos e inicialização.
-   `documentacao/ARQUITETURA.md`: arquitetura e decisões técnicas.
-   `gestao/STATUS.md`: andamento, pendências, testes e próximos passos.
-   `gestao/CHANGELOG.md`: histórico de alterações.
-   `CONTRIBUTING.md`: convenções de desenvolvimento, se houver
    colaboração.
-   Documentação de implantação e backup.

O `STATUS.md` deverá registrar etapas concluídas, funcionalidades
implementadas, testes realizados, problemas conhecidos, intervenções
humanas pendentes e próximas atividades.

Ao concluir cada etapa, apresentar um resumo objetivo do que foi feito,
do que foi testado, do que está pendente e do próximo passo.

## 20. Laboratório de IA e engenharia de agentes

Esta seção incorpora ao planejamento as competências de engenharia de IA
que serão exercitadas na formação e aplicadas, depois de validadas, ao
produto.

### 20.1 Separação entre laboratório e produto

O laboratório já existe como projeto didático da formação
(`GovFlow_AI_Lab_Codigo_Fonte_Aula_SEMA/govflow-ai-lab/`): API FastAPI
com SQLite, interface React/TypeScript, servidor MCP local somente
leitura via stdio, subagentes, skills, hook e plugin, operando sobre 30
demandas fictícias. Ele roda apenas em `127.0.0.1` e não deverá ser
exposto a outros hosts sem autenticação, controle de acesso, TLS e
revisão de segurança.

O trabalho será dividido em dois projetos distintos:

  -----------------------------------------------------------------------
  Aspecto              GovFlow AI Lab            Estagiário Digital
                       (laboratório)             (produto)
  -------------------- ------------------------- ------------------------
  Finalidade           Experimentar, comparar e  Entregar a plataforma
                       aprender técnicas de IA   utilizável

  Dados                Exclusivamente fictícios  Dados reais somente após
                                                 autorização (seção 12)

  Repositório          Próprio, em               Próprio, separado do
                       github.com/tiagobatista-  laboratório
                       stack                     

  Estabilidade         Pode quebrar, ser         Exige testes, revisão e
                       refeito ou descartado     controle de versão

  Critério de saída    Experimento documentado   Funcionalidade com
                       com resultado medido      critérios de aceite
  -----------------------------------------------------------------------

Regras:

-   O produto não poderá depender em tempo de execução de código,
    prompts ou configurações do laboratório.
-   Uma técnica só migra do laboratório para o produto depois de
    avaliada (seção 20.8), documentada e reimplementada ou revisada
    segundo os padrões de qualidade da seção 14.
-   Credenciais, chaves e ambientes do laboratório e do produto deverão
    ser distintos.
-   Cada experimento do laboratório deverá registrar objetivo, técnica,
    dados fictícios utilizados, métricas, resultado e recomendação
    (adotar, adaptar ou descartar).

### 20.2 Engenharia de prompts e gestão de contexto

-   Prompts tratados como código: versionados, revisados e testados.
-   Modelos de prompt com papéis claros: instruções do sistema, contexto
    da demanda, dados de entrada e formato de saída esperado.
-   Separação explícita entre instruções e conteúdo de documentos, para
    reduzir o risco de injeção de instruções (*prompt injection*) a
    partir de arquivos enviados.
-   Saídas estruturadas (por exemplo, JSON validado por esquema) sempre
    que o resultado alimentar outra etapa.
-   Gestão de contexto: enviar apenas trechos relevantes, resumir
    histórico longo, registrar quais fontes compuseram o contexto e
    respeitar limites de tokens e custo.
-   Exigir citação da fonte (documento, página ou trecho) para fatos
    extraídos, conforme o princípio de transparência da IA.

### 20.3 Skills especializadas

Skills são pacotes reutilizáveis de instruções, roteiros e recursos que
especializam o comportamento do assistente em uma tarefa.

-   Cada skill terá nome, descrição, gatilho de uso, instruções,
    recursos auxiliares, versão e testes.
-   **PDS:** no laboratório, a skill `revisar-pds` revisa uma entrega
    de software com base nos critérios do PDS SEMA, produzindo uma
    matriz requisito × evidência × situação (atendido, parcial, não
    atendido, não verificável), sem presumir conformidade. No produto,
    ela servirá como **verificação de qualidade das entregas do
    próprio Estagiário Digital**, não como funcionalidade para o
    usuário final.
-   **Pendência:** o documento oficial do PDS ainda não foi fornecido
    (`docs/pds-referencia.md` é um marcador). Enquanto não houver o
    documento, com título, versão, data e origem, nenhuma conclusão de
    conformidade poderá ser emitida.
-   Skills existentes no laboratório e candidatas a adaptação:
    `avaliar-inatividade`, `planejar-encaminhamentos`,
    `relatorio-executivo` e `validar-evidencias`.
-   Skills previstas para o produto: extração documental, montagem de
    checklist, redação de minutas e conferência de requisitos.
-   Skills serão prototipadas no laboratório e incorporadas ao produto
    somente após avaliação.

### 20.4 Integração com APIs e MCP

-   Integrações com APIs seguirão a ordem de preferência da seção 10 e
    serão implementadas na camada de adaptadores de integração.
-   O **Model Context Protocol (MCP)** será avaliado como forma
    padronizada de expor ferramentas e fontes de dados aos agentes.
-   Cada servidor MCP deverá ter escopo, permissões mínimas, lista de
    ferramentas permitidas, tratamento de erros e registro de uso.
-   Servidores MCP de terceiros só poderão ser usados após verificação
    de origem, licença, manutenção e segurança.
-   No laboratório, servidores MCP operarão apenas sobre dados
    fictícios. O ponto de partida é o servidor `mcp_server/server.py`,
    somente leitura, que consulta a API local (por exemplo,
    `consultar_demanda`).
-   Operações com efeito externo (envio, gravação, exclusão) exigirão
    confirmação humana.

### 20.5 Agentes especializados e delegação de tarefas

-   Agentes especializados poderão ser associados aos módulos de domínio
    (por exemplo: documentos, análise técnica, pesquisa e produção
    técnica).
-   O laboratório já define nove subagentes em `.claude/agents/`:
    `coordenador`, `analista-prazos`, `analista-priorizacao`,
    `auditor-conformidade`, `relator-executivo`, `validador` e os
    especialistas de licenciamento, fiscalização e tecnologia.
-   Cada agente terá objetivo, ferramentas permitidas, permissões,
    limites de custo e formato de resposta definidos.
-   A delegação será feita pelo orquestrador (seção 9), com instruções
    completas e escopo restrito; o agente delegado não herdará
    permissões além das necessárias.
-   Resultados de agentes delegados serão tratados como material a
    verificar, nunca como decisão final.
-   Os mascotes da Fofofauna são identidade visual e tom de comunicação;
    não correspondem a agentes nem alteram capacidades (seção 7.3).

### 20.6 Comparação dos seis padrões de orquestração

Os seis padrões avaliados na atividade de encerramento são os da
apostila FluxoLab (P09), demonstrados por invocação real de subagentes:

  -----------------------------------------------------------------------
  Padrão                 Demonstração no           Uso no Estagiário
                         desenvolvimento           Digital (seção 9.4)
  ---------------------- ------------------------- ----------------------
  A. Delegação simples   arquiteto avalia riscos   Orquestrador delega a
                         do MVP                    extração ao agente
                                                   documental

  B. Sequencial          arquiteto recomenda →     triagem → documental →
                         implementador corrige     analista → redator

  C. Revisor             auditor verifica a        Agente revisor valida
  independente           correção                  a minuta do redator

  D. Paralelo            arquiteto e auditor       analista e prazos
                         analisam aspectos         trabalham sobre a
                         distintos, só leitura     mesma demanda

  E. Supervisor /        Claude principal          Orquestrador consolida
  agregador              consolida conflitos       as saídas dos agentes

  F. Gate de qualidade   implementar só se testes  Resultado só é
                         e build passarem          liberado se esquema,
                                                   fontes e revisão
                                                   forem aprovados
  -----------------------------------------------------------------------

Padrões que não puderem ser executados de verdade (por exemplo,
paralelismo indisponível) serão registrados como **NÃO DEMONSTRADO**,
sem simulação.

O GovFlow AI Lab pratica um conjunto complementar
(`docs/orquestracoes-claude.md`), útil como referência adicional:

  -----------------------------------------------------------------------
  Padrão                 Execução no laboratório   Aplicação candidata
                                                   no produto
  ---------------------- ------------------------- ----------------------
  Sequencial             analista-prazos →         Extrair → conferir →
                         auditor-conformidade →    redigir resultado
                         relator-executivo; cada   preliminar
                         etapa recebe a saída
                         anterior

  Paralelo               analista-prazos,          Conferir vários
                         analista-priorizacao e    requisitos de uma
                         auditor-conformidade sem  demanda ao mesmo tempo
                         dependências;
                         consolidação ao final

  Roteamento             Examina setor e           Encaminhar a demanda
                         prioridade e delega a um  ao fluxo do tipo de
                         especialista por regra    processo
                         explícita

  Hierárquico            Coordenador decompõe e    Montar relatório a
                         distribui a três          partir de vários
                         especialistas; validador  documentos
                         avalia o produto

  Avaliador–otimizador   Relator produz, validador  Revisar minuta contra
                         aplica rubrica; no máximo checklist
                         duas revisões

  Eventos                Script cria evento local  Alerta de prazo ou
                         de inatividade; operador  demanda parada que
                         invoca o orquestrador     inicia uma análise
                         com o JSON                sob comando humano
  -----------------------------------------------------------------------

Padrões conceituais complementares, que podem se combinar aos
anteriores: handoff, reflexão, debate/consenso e planejador–executor.

O simulador determinístico `scripts/orchestration_demo.py` serve apenas
para ilustração e não substitui a execução real dos subagentes. O
padrão de eventos não representa automação autônoma permanente.

Evidências mínimas por rodada:

-   Registro mostrando cada agente acionado, ordem e identidade.
-   Ferramentas MCP efetivamente usadas.
-   Produto final com IDs e dados confirmados.
-   Execuções não realizadas ou não suportadas.
-   Tempo e tokens somente quando o ambiente fornecer essas métricas.

Método de comparação:

-   Aplicar os padrões a uma mesma tarefa, com o mesmo conjunto de dados
    fictícios.
-   Medir qualidade do resultado, taxa de erros, custo, tokens,
    latência, número de chamadas e esforço de revisão humana.
-   Registrar a recomendação de uso de cada padrão no produto.
-   Preferir o padrão mais simples que atenda ao critério de qualidade
    (sequencial ou roteamento antes de hierárquico).

### 20.7 Hooks para automação

Hooks serão usados em dois contextos distintos:

-   **Desenvolvimento (Claude Code):** executar formatação, lint e
    testes após edições; bloquear gravação de segredos e arquivos
    `.env`; impedir comandos destrutivos; registrar ações relevantes.
    Ponto de partida: o hook `.claude/hooks/check_command.py` do
    laboratório, que verifica comandos antes da execução.
-   **Aplicação (orquestrador):** pontos de extensão antes e depois do
    uso de ferramentas para validar parâmetros, aplicar permissões,
    mascarar dados sensíveis, registrar auditoria e exigir revisão
    humana quando necessário.

Hooks deverão ser simples, versionados, testados e documentados. Regras
de segurança não poderão depender apenas de hooks: a validação no
backend e no banco permanece obrigatória (seção 11).

### 20.8 Testes e validação de resultados de IA

-   Conjuntos de avaliação (*evals*) com casos fictícios e respostas de
    referência, versionados junto ao código.
-   Testes de regressão sempre que prompts, skills, modelos ou padrões
    de orquestração forem alterados.
-   Validação automática de formato (esquemas), presença de fontes e
    correspondência entre citação e documento.
-   Rubricas de qualidade para avaliação humana; avaliação por modelo
    (*LLM como avaliador*) somente se calibrada contra avaliação humana.
-   Métricas mínimas: precisão das extrações, taxa de alucinação,
    cobertura do checklist, custo e latência.
-   Limiares de aprovação definidos antes do experimento; resultado
    abaixo do limiar impede a migração para o produto.

### 20.9 Laboratório com dados exclusivamente fictícios

-   O GovFlow AI Lab utilizará somente dados fictícios ou sintéticos.
-   É proibido usar documentos reais, dados pessoais, processos
    institucionais ou cópias anonimizadas de casos reais no
    laboratório.
-   Dados fictícios deverão ser identificados como tal (por exemplo,
    marcação "FICTÍCIO" nos arquivos e metadados).
-   Identificadores (CPF, CNPJ, matrículas, coordenadas, números de
    processo) deverão ser gerados de forma a não coincidir com
    registros reais conhecidos.
-   Uma verificação automatizada deverá alertar sobre padrões de dados
    reais antes de commits no repositório do laboratório.
-   O conjunto de dados fictícios deverá ser versionado e documentado,
    para permitir repetir os experimentos.

## 21. Metodologia de desenvolvimento assistido por IA

### 21.1 Método adotado

A proposta e o sistema são construídos com **prompting orientado a
evidências**, a metodologia da formação: o profissional descreve,
autoriza e valida; o Claude Code escreve o código, configura ferramentas
e executa testes. Nenhuma etapa é considerada concluída por afirmação
do modelo, somente por evidência verificável (arquivo, teste executado,
registro de ferramenta ou demonstração no navegador).

O ciclo de cada etapa segue **Plan–Act–Verify**:

1.  **Planejar:** especificar objetivo, limites e critérios de aceite.
2.  **Agir:** o Claude Code implementa de forma incremental.
3.  **Verificar:** executar testes e build e conferir as evidências.
4.  **Criticar e revisar:** auditar falhas, corrigir e repetir a
    regressão.

### 21.2 Técnicas utilizadas

  -----------------------------------------------------------------------
  Técnica                 Como foi aplicada na     Onde aparece no
                          proposta                 sistema
  ----------------------- ------------------------ ----------------------
  Role prompting          Claude Code atua como    Papel de cada agente
                          engenheiro principal do  (seção 9.3)
                          projeto (seção 22)

  Engenharia de contexto  Este planejamento e o    `CLAUDE.md`, contexto
                          `CLAUDE.md` registram    da demanda enviado aos
                          regras permanentes       agentes (seção 20.2)

  Zero-shot               Primeira versão do plano Classificação inicial
                          gerada a partir da       de demandas pelo
                          descrição do objetivo    agente de triagem

  Decomposição / prompt   Entrega dividida em      Fluxo sequencial do
  chaining                etapas e em MVP-0 e      orquestrador (seção
                          MVP-1 (seção 16)         9.4)

  Specification /         Critérios de aceite do   Contratos de entrada e
  contract prompting      MVP (seção 17) e         saída de cada skill
                          contratos de módulos     (seção 9.2)

  Few-shot                Imagem de referência de  Exemplos de checklist e
                          layout como exemplo      minuta fornecidos às
                          visual (seção 7.4)       skills de redação

  Plan–Act–Verify         Avaliação da proposta em Gate de qualidade antes
                          modo de planejamento     de liberar resultados
                          antes de editar

  Critique–Revise         Revisão da versão 1.1    Agente revisor e
                          para 1.2, corrigindo     padrão de revisor
                          divergências             independente

  Delegation prompting    Delegação de pesquisa e  Orquestrador delega a
                          revisão a subagentes     agentes especializados

  Tool-grounded prompting Conferência dos padrões  Respostas fundadas em
                          e skills nos arquivos    ferramentas MCP
                          reais do laboratório     realmente invocadas

  Guardrails              Regras de segurança,     Hooks, permissões
                          custo e dados fictícios  mínimas e aprovação
                          (seções 11 a 13)         humana
  -----------------------------------------------------------------------

Distinções adotadas: prompt é instrução pontual; `CLAUDE.md` é contexto
persistente; skill é procedimento reutilizável; agente é executor
especializado; MCP é interface de ferramentas e dados; hook é reação
programática a um evento real; plugin é pacote de extensões. Um texto
afirmando que uma ferramenta foi consultada não é evidência de que ela
foi chamada.

## 22. Primeira instrução ao Claude Code

Comece examinando o ambiente de trabalho e este planejamento.

Antes de implementar:

1.  Faça um diagnóstico do ambiente.
2.  Apresente a arquitetura recomendada.
3.  Registre a estrutura de diretórios.
4.  Justifique a stack e as dependências.
5.  Identifique custos, limites e riscos.
6.  Separe o que pode ser automatizado do que depende de intervenção
    humana.
7.  Defina o escopo e os critérios de aceite do MVP.

Depois do diagnóstico, avance diretamente nas decisões reversíveis e de
baixo risco e inicie a implementação. Não interrompa o trabalho para
pedir aprovação de detalhes técnicos rotineiros.

Quando houver decisões institucionais, riscos de segurança, custos,
permissões externas ou ações irreversíveis, interrompa somente a
operação afetada e solicite a autorização necessária.

------------------------------------------------------------------------

## Resultado esperado

Entregar uma plataforma mobile first, modular, segura e de baixo custo,
com identidade visual própria baseada na Fofofauna de Mato Grosso.

A plataforma deverá atuar como um estagiário digital que organiza
demandas, examina documentos, pesquisa fontes autorizadas, auxilia
análises e prepara produtos preliminares.

Deverá coexistir com os sistemas institucionais e legados, sem
substituí-los. O profissional continuará responsável pela revisão,
validação e decisão final.

A prioridade é entregar um MVP real e utilizável rapidamente, mantendo
uma arquitetura que permita expansão sustentável.
