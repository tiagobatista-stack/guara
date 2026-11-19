# Evidência: Inspeção de agrotóxicos (entregas a e b), 19/11/2026

| Item | Resultado |
|---|---|
| `npm test` (Vitest) | PASSOU: 808 testes |
| `tsc --noEmit` | PASSOU |
| `npm run build` | PASSOU |
| POP existente após a extensão do motor | PASSOU (745 testes antigos sem alteração) |
| PDF do roteiro no Edge (ponto com POP + inspeção, prévia toda respondida): formato fixo | PASSOU: bloco de 4 páginas (ficha + POP + 2); documento de 10 páginas como previsto; folga confirmada (fonte da inspeção a 8,5 pt ainda cabe; 9,5 pt estoura) |
| Documentos lavrados no ponto (editar no resultado, relatório de qualquer ponto, pendência só para "Autuado"/notificação "Feito") | PASSOU (testes automatizados) |
| Texto do relatório de 3 pontos fictícios | GERADO; redação em revisão (`documentacao/exemplos/relatorios-inspecao-exemplo.md`) |
| Telas no navegador, cliques reais | NÃO TESTADO |
| Importação de `operacao-alertas-setembro-2026.csv` | NÃO TESTADO (arquivo não enviado) |
| Nenhum texto gerado (relatório, roteiro, providências) cita lei, artigo, decreto ou valor | PASSOU (teste automatizado) |
| Seção "Formulários e relatório": N de M com perguntas puladas, selos (inclusive completo com pendências), data de edição só quando muda, botão gerar habilitado/desabilitado | PASSOU (813 testes; `formularios-ponto.test.tsx`) |
| Seção no navegador, cliques reais e aparência | NÃO TESTADO |
| Painel "Dados para o SIGA" | NÃO FEITO (não existe no repositório) |
| Roteiro com a inspeção em tabela (8 pt): PDF no Edge, ponto com POP + inspeção, prévia toda respondida | PASSOU: bloco de 4 páginas (ficha + POP + 2), documento de 10 páginas para 2 pontos; janela de quebra 49 a 52 itens, escolhido 50 |
| Mesmo roteiro em outros navegadores / sistemas (fonte padrão diferente) | NÃO TESTADO |
| Importação de `operacao-alertas-setembro-2026.csv`, total de páginas da Equipe B, relatórios dos pontos 03, 05 e 06 com lavrados fictícios | NÃO FEITO (arquivo não existe no repositório) |
| `npm test` | PASSOU: 822 testes |

