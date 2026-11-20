# Evidência — rodada da skill `testar-sistema` (20/11/2026)

**Pedido do responsável:** `/testar-sistema`, para que os três resultados da linha "Testes" do STATUS saiam da mesma rodada. Branch `operacoes-campo`, commit `278e0ed`, sem alterações de código. Nenhum serviço externo foi acionado.

**Ferramentas:** Node v26.13.1, npm 11.20.0, Python 3.12.7.

| # | Verificação | Comando | Resultado | Situação |
|---|---|---|---|---|
| 1 | Testes da aplicação | `cd aplicacao && npm test` | `Test Files 58 passed (58)`, `Tests 674 passed (674)` | PASSOU |
| 2 | Build de produção | `cd aplicacao && npm run build` | `✓ built in 275ms`; `index-BFAzjbW4.js` e `index-B3S3-AIP.css` | PASSOU |
| 3 | Hook de comandos | `python -m unittest testes/unidade/test_hook_verificar_comando.py -v` (da raiz) | `Ran 8 tests in 2.003s`, `OK` (8/8) | PASSOU |

## Observações

- O build mostra o aviso de chunk acima de 500 kB, que já existia. Não é erro.
- O bundle tem os mesmos nomes do que a URL pública serve depois do R2 (`2026-11-19-roteiro-url-publica.md`), o que é coerente com a árvore de `aplicacao/` sem mudanças desde `b800374`.
- Telas: NÃO CONFERIDO VISUALMENTE nesta rodada.
