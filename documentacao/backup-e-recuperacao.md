# Backup e recuperação

**Situação:** ainda não há banco, portanto não há backup. Política prevista (seção 15):

- O plano gratuito do Supabase não tem PITR. Não presumir que o backup do fornecedor basta.
- Exportação agendada com `pg_dump` e cópia dos arquivos armazenados, guardadas **fora** do fornecedor.
- Teste periódico de restauração em um ambiente separado, com o resultado registrado em `metodologia/evidencias/`.
- Nenhuma migração destrutiva sem backup prévio e validação.
