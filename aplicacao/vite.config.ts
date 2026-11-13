/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const raizProjeto = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react()],
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
    setupFiles: ['./src/configuracao-testes.ts'],
  },
});
