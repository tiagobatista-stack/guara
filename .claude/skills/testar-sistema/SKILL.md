---
name: testar-sistema
description: Executa o build, os testes Vitest e os testes do hook do GUARÁ e registra cada item como PASSOU, FALHOU ou NÃO TESTADO em metodologia/evidencias/ e em gestao/STATUS.md. Use antes de declarar qualquer entrega concluída.
---
# Testar sistema

1. Verifique as ferramentas com `node -v`, `npm -v` e `python --version`. Se faltar alguma, marque os itens dependentes como **NÃO TESTADO** e informe o motivo. Nunca simule resultados.
2. Na pasta `aplicacao/`, rode `npm test` (Vitest: `testes/` e `aplicacao/src/**/*.test.tsx`).
3. Na pasta `aplicacao/`, rode `npm run build`.
4. Na raiz do projeto, rode `python -m unittest testes/unidade/test_hook_verificar_comando.py -v`.
5. Registre cada item em `metodologia/evidencias/AAAA-MM-DD-<assunto>.md` com:
   - o comando exato;
   - a data;
   - o trecho relevante da saída (totais de testes, erros);
   - a situação: **PASSOU**, **FALHOU** ou **NÃO TESTADO**.
6. Atualize a tabela de `gestao/STATUS.md`.
7. Se algo falhar, não declare a etapa concluída. Descreva a falha e proponha a correção.
