# _compartilhado

Código TypeScript puro (sem APIs de Node ou Deno), carregável pelo Vite, Vitest e Deno.

- `agentes/<id>/`: contrato de cada agente (seção 9.3).
- `habilidades/<id>/`: contrato, implementação determinística e autoteste (seção 9.2).
- `ferramentas/`: catálogo de ferramentas (banco, arquivos, MCP) e seu estado.
- `gate-de-qualidade/`: validações antes de liberar resultados.

Composição: orquestrador → agente → habilidade → ferramenta.
