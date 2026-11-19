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
