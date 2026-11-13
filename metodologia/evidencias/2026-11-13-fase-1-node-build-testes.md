# Evidências — Fase 1: Node.js, build e testes (13/11/2026)

| # | Item | Comando / verificação | Resultado | Situação |
|---|---|---|---|---|
| 1 | Instalação do Node.js, autorizada pelo usuário | `winget install --id OpenJS.NodeJS.LTS --exact --silent` | "Instalado com êxito"; hash do instalador verificado | PASSOU |
| 2 | Versões | `node -v`, `npm -v` | v26.13.1 / 11.20.0 (o requisito da apostila é ≥ 20.19 ou 22.12) | PASSOU |
| 3 | Dependências sem Tailwind | `npm run instalar-dependencias` | 98 pacotes, 0 vulnerabilidades. Versões resolvidas: react 19.3, vite 8.3.8, vitest 5.1.0, typescript 7.0.2, jsdom 31 | PASSOU |
| 4 | Testes Vitest (1ª execução) | `npm test` | `Test Files 5 passed (5)`, `Tests 40 passed (40)` | PASSOU |
| 5 | Build (1ª tentativa) | `npm run build` | `TS5102: Option 'baseUrl' has been removed` (TypeScript 7) | FALHOU |
| 6 | Build (2ª tentativa) | `baseUrl` removido do tsconfig | `TS6205: All type parameters are unused` em `tipos.ts` (`ContratoHabilidade<E,S>`) | FALHOU |
| 7 | Build (3ª tentativa) | genéricos sem uso removidos de `ContratoHabilidade` | `✓ built in 332ms`; JS de 289 kB (86,9 kB gzip) | PASSOU |
| 8 | Regressão depois das correções | `npm test` | `5 passed (5)`, `40 passed (40)` | PASSOU |
| 9 | App abre localmente | `npx vite --port 5173`; navegador em `http://localhost:5173/#/saude-do-sistema` | página "GUARÁ" carregada, sem erros no console | PASSOU |
| 10 | Saúde do sistema antes da verificação | inspeção do DOM | faixa "Modo local, sem Supabase" presente; 38 ocorrências de NÃO TESTADO; 0 habilidades OK | PASSOU |
| 11 | "Executar verificação" no navegador | clique real no botão | 10/10 habilidades ✓OK; 6/6 agentes OK; "10 de 10 habilidades OK, 0 com falha"; gate liberou | PASSOU |
| 12 | Aparência visual | — | O Tailwind foi removido e o CSS próprio ainda não foi escrito: o layout funciona, mas está **sem estilo** | NÃO TESTADO (fase 2) |

## Observações

- Os testes de unidade e de integração que provam que a verificação **consegue falhar** (habilidade quebrada resulta em FALHA; habilidade desativada resulta em ATENÇÃO, e o gate bloqueia) estão entre os 40 aprovados.
- A configuração de preview do Claude Browser exige `launch.json` na pasta de trabalho da sessão, que fica fora do projeto. Por isso o servidor foi iniciado manualmente com `npx vite`.
