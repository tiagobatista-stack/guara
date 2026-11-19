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
7. **Embargos (2.13):** Sim/Não/N.A.; números (texto) e órgão (lista: IBAMA, SEMA, ICMBio, decisão judicial) se Sim. Fase prévia, com sugestão da consulta. **Autos:** o questionário não tem pergunta sobre autos; a aba prévia mostra o resultado da consulta de autos só como informação.
8. **Itens do tipo "Apresentar…" sem Sim/Não** (SAE, SGSO, programa de treinamento, planilha dos relatórios operacionais, mapas): viraram "…apresentado(s)?" / "Possui…?" Sim/Não/N.A.
9. **SISDEV (2.11):** o texto é um fragmento. Virou "O estabelecimento registra no SISDEV as informações de prescrição, comercialização e aplicação de produtos?".
10. **Observar no armazenamento (4.1.1):** a lista corrida virou lista de marcação (piso, ventilação, sinalização, EPIs, contenção, banheiro, lavagem de EPI).
11. **Poço (2.7):** hidrômetro (existe?), volume em litros (número) e foto só se houver poço registrado.
12. **Receituário (3.4):** "Nº e data" virou número (texto) e data; "informações detalhadas" virou Sim/Não, só se houver receituário.
13. **Motivação (5.5):** lista (erva daninha, insetos, fungos, dessecação) + "Outra" (acrescentada) com especificação. **Dosagem (5.7):** número + unidade (L/ha, kg/ha). **Meteorologia (5.10):** vento (texto), temperatura °C e umidade % (números; as unidades são leitura minha). **Proximidade (5.13):** lista (corpos hídricos, pomares, residências, comunidades, escolas, criação de animais) + "Nenhum dos anteriores" (acrescentada).
14. **Lavagem das aeronaves (6.4):** a pergunta composta foi separada em estado do piso (texto), rachaduras, tubulação de efluentes em bom estado e tubulação pluvial independente.
15. **Produtos sem registro, de origem estrangeira (7.6.1):** coleta/apreensão "em caso de impossibilidade" só aparece se 7.6 = Não (leitura minha).
16. **Volume de embalagens vazias (7.1.1):** ficou texto ("quantidade e unidade"): o original não diz a unidade.
17. **Rotulagem em língua estrangeira (4.4.2)**, subitem do original, é perguntada sempre, não só se houver contrabando.
18. **Fora das perguntas:** notificação e auto por falta de CTF, enquadramento legal, art. 76 do Decreto 6.514/2008, art. 17 da Lei 6.938/1981 e valores de multa. Vão para o arquivo de referência legal da entrega (b).
19. **Fase prévia (leitura minha):** o que se confere em base ou cadastro (CAR, CTE, CTF, licença, autorizações, DLA, outorga, TCRA, MAPA, INDEA, embargos). O resto é de campo. Ajustar se a equipe preferir outra divisão.

## Tipo de dano e ponto (itens 1 e 4)

Sugeridos: "Desmatamento químico" e "Aplicação irregular de agrotóxico" (trazem POP + inspeção; aviso ao salvar). Em outros pontos, botão "Adicionar inspeção de agrotóxicos" (`inspecaoAtiva`); remover é livre se estiver vazia e pede confirmação se houver resposta. Nos tipos de agrotóxico a inspeção sai mudando o tipo no planejamento.
Respostas prévias em `conferenciaPrevia`, de campo em `inspecao`. Em campo, a prévia aparece como "conferido antes: <valor>" e resposta diferente gera `[DIVERGÊNCIA]`.

## Evidência (19/11/2026)

`npm test`: 767 passou (745 antigos + 22 novos, em `inspecao-agrotoxicos.test.tsx`). `npm run build`: passou. Tela não conferida no navegador: NÃO TESTADO.
