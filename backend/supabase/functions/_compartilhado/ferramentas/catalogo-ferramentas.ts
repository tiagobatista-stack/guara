import type { Ferramenta } from '../tipos.ts';

// Nenhuma ferramenta tem conexão configurada ainda. Sem teste de conexão real,
// o estado exibido é NÃO TESTADO; nunca OK por suposição (seção 9.7).
export const ferramentas: readonly Ferramenta[] = [
  {
    id: 'banco-postgres',
    nome: 'Banco PostgreSQL (Supabase)',
    descricao: 'Tabelas de demandas, catálogo, execuções e verificacoes_saude com RLS.',
    motivoSemTeste: 'Supabase ainda não configurado (exige autorização para criar o projeto).',
  },
  {
    id: 'armazenamento-arquivos',
    nome: 'Armazenamento de arquivos',
    descricao: 'Supabase Storage para documentos enviados.',
    motivoSemTeste: 'Supabase Storage ainda não configurado.',
  },
  {
    id: 'servidor-mcp',
    nome: 'Servidores MCP',
    descricao: 'Ferramentas padronizadas para agentes (somente leitura no início).',
    motivoSemTeste: 'Nenhum servidor MCP de produto definido (avaliação prevista na Etapa 4).',
  },
  {
    id: 'hook-desenvolvimento',
    nome: 'Hook PreToolUse (Claude Code)',
    descricao: 'Bloqueia comandos destrutivos e gravação de segredos durante o desenvolvimento.',
    motivoSemTeste:
      'Ferramenta de desenvolvimento, fora do navegador; a evidência do teste fica em metodologia/evidencias/.',
  },
];
