/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const raizProjeto = fileURLToPath(new URL('..', import.meta.url));

// Versão mostrada no rodapé: a do package.json e o commit do build (Vercel ou git local).
const versao: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version;
function commitDoBuild(): string {
  const doVercel = process.env.VERCEL_GIT_COMMIT_SHA;
  if (doVercel) return doVercel.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __VERSAO_GUARA__: JSON.stringify(versao),
    __COMMIT_GUARA__: JSON.stringify(commitDoBuild()),
  },
  resolve: {
    alias: {
      // Catálogo e dados ficam fora de aplicacao/ (estrutura semântica, seção 8.5).
      '@catalogo': fileURLToPath(new URL('../backend/supabase/functions/_compartilhado', import.meta.url)),
      '@dados': fileURLToPath(new URL('../dados-ficticios', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    fs: { allow: [raizProjeto] },
  },
  test: {
    // A busca de testes parte da raiz do projeto para incluir testes/.
    dir: raizProjeto,
    include: ['aplicacao/src/**/*.test.{ts,tsx}', 'testes/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: [fileURLToPath(new URL('./src/configuracao-testes.ts', import.meta.url))],
  },
});
