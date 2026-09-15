/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Keep the output dir as `build/` so the FastAPI backend keeps serving from
    // frontend/build (see backend/app/main.py FRONTEND_BUILD_DIR).
    outDir: 'build',
  },
  server: {
    host: true,
    port: 3000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // A concrete origin so jsdom enables localStorage (opaque origins disable it).
    environmentOptions: { jsdom: { url: 'http://localhost:3000' } },
    setupFiles: './src/setupTests.ts',
    css: true,
  },
});
