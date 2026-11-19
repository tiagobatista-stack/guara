# Inspeção de agrotóxicos: ajustes feitos ao padronizar o questionário (entrega a)

Fonte: `documentacao/questionario-agrotoxicos.md` (texto original, não alterado). Código: `aplicacao/src/modulos/operacoes/inspecao-agrotoxicos.ts` (dados) sobre o motor do POP (`pop-supressao.ts`). Não há segundo motor.

**Motor (pop-supressao.ts):** tipos novos `simnao` (Sim/Não/N.A.), `numero` e `data`; campos `se` (condicional), `fase` e `secao`; `itensAplicaveis`, `itensDeCampoSemResposta` e `caracterizacaoValida` aceitam a lista de itens (padrão: POP); `divergencias`. O POP não mudou. Única mudança de comportamento: `blocoPopAtivo` também vale para "Aplicação irregular de agrotóxico" ("Desmatamento químico" já casava com `desmat`).

Aproximação de padrão (não é GoF): os itens são dados interpretados por funções puras, como no POP.

Ids: `C-<seção>.<pergunta>[.<sub>]`. Obrigatoriedade: toda pergunta Sim/Não/N.A. é obrigatória quando se aplica; texto, número, data e lista que complementam uma resposta (nº, validade, "especifique") são opcionais. Só a fase `campo` conta em "sem resposta".

## Dados pessoais (item 3)

Não existem campos para: nome do proprietário/responsável, CPF/CNPJ, telefone/e-mail, endereço, nomes de responsáveis técnicos, de pessoas presentes, do gerente/capataz e do operador aéreo. No lugar, perguntas Sim/Não/N.A.: C-1.5 (documento do responsável), C-1.6 (endereço para correspondência), C-1.7 (atualização no SIGA; C-1.7.1 notificação e prazo), C-1.8 (responsável técnico e CREA no auto), C-1.9 (pessoas presentes qualificadas), C-1.10 (acompanhante da vistoria), C-5.2.1 (operador aéreo identificado no auto).
"Município" saiu (já está no ponto); "Localização" não pede endereço nem coordenadas. "Nome da propriedade rural": não há campo novo (revisão de 19/11/2026). A inspeção mostra e edita o "Imóvel / local" do ponto, o mesmo valor do planejamento. O id C-1.1 ficou vago.

## Lacunas fechadas e ajustes (cada um)

1. **Autorização Ambiental (2.4):** o texto termina em "abertura de estradas," sem pergunta. Viraram 6 perguntas Sim/Não/N.A. (desmatamento, supressão da vegetação nativa, exploração florestal, manejo florestal, intervenção em APP, abertura de estradas), cada uma com o número se Sim.
2. **Aeródromo (C-4.2, nova):** a condicional "nos aeródromos" não tinha pergunta de origem. Criei "Há aeródromo na propriedade?"; o depósito (C-4.2.1) só aparece se Sim.
3. **Vencidos (4.3):** quantidade/tipo, lotes e "vencido há menos de 6 meses" só aparecem se houver vencidos. O caso "há vencido, mas não há menos de 6 meses" fica com a resposta N.A.; não criei pergunta extra.
4. **Aplicação aérea:** COA, aeronavegabilidade/ANAC, SAE, SGSO, operador aéreo, pátio (seção 6 inteira) e lavagem de aeronaves só se C-5.2 = Sim. O detalhe do pátio (C-6.2, 6.2.1, 6.2.2, 6.3) só se existir pátio (C-6.1 = Sim).
5. **Licença (2.3), separada em duas (revisão de 19/11/2026):** existência, tipo, número e validade na fase prévia (C-2.3 a C-2.3.4); "Condicionantes da licença verificadas em campo" (Conformes / Não conformes / N.A., C-2.3.5) e observação (C-2.3.6) na fase campo. Tipo, número e validade só se Sim; tipo é lista (LO, LI, LAS, LAC, APF rural, Outro) e "Outro" abre "Especifique". Validade é data.
6. **CAR (1.11/1.12):** o original pergunta "Possui CAR (SIMCAR)" e "Possui CAR Número do recibo Federal" sem separar a existência do número. Cada um virou Sim/Não/N.A. + número se Sim. Fase prévia, com sugestão da consulta automática.
7. **Embargos (2.13), revisão de 19/11/2026:** a parte SEMA vem só da consulta às bases (não se repete na inspeção). A pergunta de campo é "Embargos de outros órgãos (IBAMA, ICMBio, decisão judicial)?", com número e órgão (IBAMA, ICMBio, decisão judicial) se Sim; fase campo, sem sugestão da consulta. **Autos:** o questionário não tem pergunta sobre autos; a aba prévia mostra o resultado da consulta de autos só como informação.
8. **Itens do tipo "Apresentar…" sem Sim/Não** (SAE, SGSO, programa de treinamento, planilha dos relatórios operacionais, mapas): viraram "…apresentado(s)?" / "Possui…?" Sim/Não/N.A.
9. **SISDEV (removido, revisão de 19/11/2026):** no original é nota explicativa do registro no INDEA (C-2.10), não pergunta. O item C-2.11 foi retirado; SISDEV/INDEA é uma das fontes da conferência prévia do item INDEA.
10. **Observar no armazenamento (4.1.1):** a lista corrida virou lista de marcação (piso, ventilação, sinalização, EPIs, contenção, banheiro, lavagem de EPI).
11. **Poço (2.7):** hidrômetro (existe?), volume em litros (número) e foto só se houver poço registrado.
12. **Receituário (3.4):** "Nº e data" virou número (texto) e data; "informações detalhadas" virou Sim/Não, só se houver receituário.
13. **Motivação (5.5):** lista (erva daninha, insetos, fungos, dessecação) + "Outra" (acrescentada) com especificação. **Dosagem (5.7):** número + unidade (L/ha, kg/ha). **Meteorologia (5.10):** vento (texto), temperatura °C e umidade % (números; as unidades são leitura minha). **Proximidade (5.13):** lista (corpos hídricos, pomares, residências, comunidades, escolas, criação de animais) + "Nenhum dos anteriores" (acrescentada).
14. **Lavagem das aeronaves (6.4):** a pergunta composta foi separada em estado do piso (texto), rachaduras, tubulação de efluentes em bom estado e tubulação pluvial independente.
15. **Produtos sem registro, de origem estrangeira (7.6.1):** coleta/apreensão "em caso de impossibilidade" só aparece se 7.6 = Não (leitura minha).
16. **Volume de embalagens vazias (7.1.1):** ficou texto ("quantidade e unidade"): o original não diz a unidade.
17. **Rotulagem em língua estrangeira (4.4.2)**, subitem do original, é perguntada sempre, não só se houver contrabando.
18. **Fora das perguntas:** notificação e auto por falta de CTF, enquadramento legal, art. 76 do Decreto 6.514/2008, art. 17 da Lei 6.938/1981 e valores de multa. Não entram no GUARÁ (ver item 22, revisado).
19. **Fase prévia (leitura minha):** o que se confere em base ou cadastro (CAR, CTE, CTF, licença, autorizações, DLA, outorga, TCRA, MAPA, INDEA, autorização do MAPA em outra UF). O resto é de campo. Ajustar se a equipe preferir outra divisão.

## Tipo de dano e ponto (itens 1 e 4)

Sugeridos: "Desmatamento químico" e "Aplicação irregular de agrotóxico" (trazem POP + inspeção; aviso ao salvar). Em outros pontos, botão "Adicionar inspeção de agrotóxicos" (`inspecaoAtiva`); remover é livre se estiver vazia e pede confirmação se houver resposta. Nos tipos de agrotóxico a inspeção sai mudando o tipo no planejamento.
Respostas prévias em `conferenciaPrevia`, de campo em `inspecao`. Em campo, a prévia aparece como "conferido antes: <valor>" e resposta diferente gera `[DIVERGÊNCIA]`.

## Entrega (b) (revisão de 19/11/2026)

20. **Embargos de outros órgãos (C-2.13):** pares repetíveis {número, órgão}, até 10 (`C-2.13.<k>.1` número, `.2` órgão: IBAMA, ICMBio, Decisão judicial, Outro; `.3` especificar se Outro). A tela mostra um par; "+ Adicionar embargo" abre o seguinte. Uma frase por par; par incompleto vira [PENDENTE]. Os 10 pares existem como itens de dados; a tela esconde os não abertos (no papel saem 3).
21. **Fonte da conferência prévia:** toda pergunta Sim/Não/N.A. da fase prévia ganha `<id>@fonte` (lista: SIGA, SIMCAR, Geoportal SEMA-MT, Consulta pública CTF/IBAMA, SISDEV/INDEA, Sistema de outorga, Outra) e `<id>@fonte.outra`. "Outra" entra no relatório como "(fonte: texto)". Só aparece na aba prévia, depois da resposta.
22. **Sem base legal no GUARÁ (revisão de 19/11/2026):** multa e enquadramento legal vêm do SIGA Autuação; o GUARÁ não guarda nem sugere norma, artigo ou valor. `referencia-legal.ts` foi removido (a versão anterior, com o art. 76 do Decreto 6.514/2008, o art. 17 da Lei 6.938/1981 e faixas de multa, está no commit 8930a12). Nenhuma providência, frase de relatório ou página do roteiro cita lei, artigo, decreto ou valor; os testes conferem (`R$`, `art.`, `Decreto`, `Lei n`). Exceção: texto que o usuário digitar em campo livre. Também saiu da nota de C-2.2.2 a menção à Lei 12.651/2012 (ficam os códigos e as descrições das atividades).
23. **Providências = lembretes de procedimento** (`providencias.ts`), com "feito / não aplicável" marcados pelo fiscal (`Ponto.providencias`):
    - CTF inscrito (C-2.2 = Sim) sem certificado atualizado (C-2.2.3 = Não): "Notificar para apresentação do certificado de regularidade do CTF (prazo 24 h), antes da autuação."
    - Sem inscrição no CTF (C-2.2 = Não): "Avaliar autuação no SIGA Autuação."
    Mudança em relação à versão anterior: sem inscrição não sugere mais a notificação. Novas regras entram na lista `REGRAS`.
    **Revisão (19/11/2026, desfechos):** "Avaliar autuação no SIGA Autuação" tem desfecho Autuado / Não autuado / Não aplicável. Só "Autuado" exige o n.º do auto (vazio → [PENDENTE: n.º do documento lavrado]); "Não autuado" não gera frase nem pendência. A notificação do CTF segue "Feito / Não aplicável" e "Feito" exige o n.º da notificação.
    **Documentos lavrados são do ponto, não da inspeção:** `Ponto.lavrados` = `{auto?, notificacao?, embargo?}`, cada um com uma lista de n.º (até 20, 50 caracteres cada; só o número, sem enquadramento). Editados em "Registrar/Editar resultado" do ponto (vários separados por ponto e vírgula); `registrarResultado` grava e apaga (vazio remove o campo). O relatório de QUALQUER ponto cita: "Foi lavrado o Auto de Infração n.º …", "Foi lavrada a Notificação n.º …", "Foi lavrado o Termo de Embargo n.º …", com plural ("Foram lavrados os Termos de Embargo n.º 5, 6 e 7."). A inspeção só mostra o lembrete de onde editar.
24. **Roteiro impresso (revisão: formato fixo):** após a ficha e o POP, a inspeção ocupa SEMPRE 2 páginas (seções 1–3 na primeira, 4–7 na segunda), sem estimar linhas: uma linha compacta por item (7,5 pt), perguntas condicionais como linhas "se aplicável: se C-x = Sim", prévia como um parágrafo "Conferido antes:" e 3 pares de embargo. Ponto com POP + inspeção = 4 páginas (ficha, POP, 2); sem POP, ficha + 2 + 1 de anotações = 4. Começa em página ímpar. Capa com "EPI da equipe, material de coleta de amostra, lacres, termo de apreensão/depósito".
25. **Relatório:** `relatorio-inspecao.ts` interpreta `relatorio-frases-inspecao.ts` (rev. 4: "Outra" como "(fonte: texto)", embargos em pares). `relatorio-util.ts` recebeu os auxiliares comuns. Frases compostas de aplicação (produtos, dose/área/data, meteorologia) saem só com o que houver.

## Evidência (19/11/2026)

`npm test`: 808 passou (entrega a: 767; (b): `relatorio-inspecao.test.ts`, `providencias.test.tsx`, 3 casos em `roteiro-paginas.test.ts`). `tsc --noEmit` limpo. `npm run build`: passou. PDF do roteiro (ponto com POP + inspeção) impresso no Edge headless: 8 páginas = capa 2 + ficha 1 + POP 1 + inspeção 4, como calculado. **NÃO TESTADO:** telas no navegador com cliques reais; importação de `documentacao/exemplos/operacao-alertas-setembro-2026.csv` (arquivo ainda não enviado); (a referência legal deixou de existir no GUARÁ).
