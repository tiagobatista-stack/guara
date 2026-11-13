---
name: validar-pds
description: Checklist DIDÁTICO de qualidade de uma entrega do GUARÁ (build, testes, documentação, segredos, evidências). NÃO é o PDS oficial da SEMA-MT e nunca emite conclusão de conformidade.
---
# Validar PDS (didático)

> **Aviso:** o documento oficial do PDS não foi fornecido. Esta skill é apenas um checklist didático e **não emite conclusão de conformidade**.

1. Reúna as evidências **existentes**, sem executar nada novo além do necessário para ler resultados:
   - os registros mais recentes em `metodologia/evidencias/`;
   - `gestao/STATUS.md`;
   - `git status`.
2. Monte a matriz **critério × evidência × situação** (atendido, parcial, não atendido, não verificável) com estes critérios:
   - build executado com sucesso;
   - testes automatizados aprovados;
   - documentação atualizada (README, STATUS, CHANGELOG, ARQUITETURA);
   - nenhum segredo ou `.env` versionado (`git ls-files | grep -i env`);
   - evidências registradas com comando e saída;
   - dados apenas fictícios (`ficticio: true`, prefixo `FIC-`).
3. Sem evidência, o critério é **não verificável**, nunca "atendido".
4. A habilidade de produto `validar-pds` (em `backend/.../habilidades/validar-pds/`) aplica a mesma regra de forma determinística.
5. Termine repetindo o aviso de que não se trata do PDS oficial.
