/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { normalizeBasePath } from './basePath'

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', '')
  return {
    base: normalizeBasePath(environment.VITE_BASE_PATH),
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      css: false,
    },
  }
})
