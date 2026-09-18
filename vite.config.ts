/// <reference types="vitest/config" />
import { createReadStream, existsSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { normalizeBasePath } from './basePath'

/**
 * Cross-origin isolation headers: everything this app loads is same-origin,
 * and isolation lets onnxruntime-web use multithreaded wasm for the chant
 * analyzer. Static production hosting can set the same two headers
 * (docs/WEB_DEPLOYMENT.md); without them the analyzer still works,
 * single-threaded.
 */
const ISOLATION_HEADERS = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

const MODEL_CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.onnx': 'application/octet-stream',
}

/**
 * Serves the git-ignored chant model assets (models-local/chant) at
 * /models/chant/ in dev and preview. Production deploys copy the same
 * directory next to the built site instead — the weights are provisioned
 * per deployment, never bundled (no explicit licence grant on the Su-śrotā
 * checkpoint: research/pronunciation-ai/06).
 */
function chantModelAssetsPlugin(): Plugin {
  let base = '/'
  const rootDir = join(__dirname, 'models-local', 'chant')

  const handler = (
    url: string,
    res: import('node:http').ServerResponse,
    next: () => void,
  ) => {
    const prefix = `${base}models/chant/`
    if (!url.startsWith(prefix)) return next()
    const requested = url.slice(prefix.length).split('?')[0]
    if (!requested || requested.includes('..') || requested.includes('/')) {
      res.statusCode = 404
      return res.end()
    }
    const filePath = normalize(join(rootDir, requested))
    if (!existsSync(filePath)) {
      res.statusCode = 404
      return res.end()
    }
    const extension = requested.slice(requested.lastIndexOf('.'))
    res.setHeader(
      'Content-Type',
      MODEL_CONTENT_TYPES[extension] ?? 'application/octet-stream',
    )
    res.setHeader('Content-Length', statSync(filePath).size)
    createReadStream(filePath).pipe(res)
  }

  return {
    name: 'sloka-chant-model-assets',
    configResolved(config) {
      base = config.base
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) =>
        handler(req.url ?? '', res, next),
      )
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) =>
        handler(req.url ?? '', res, next),
      )
    },
  }
}

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '.', '')
  return {
    base: normalizeBasePath(environment.VITE_BASE_PATH),
    plugins: [react(), tailwindcss(), chantModelAssetsPlugin()],
    // onnxruntime-web is imported only inside the chant worker; letting the
    // dev optimizer discover it mid-flight triggers a full page reload that
    // kills the worker during model preparation. It ships as native ESM, so
    // serve it unbundled instead.
    optimizeDeps: { exclude: ['onnxruntime-web'] },
    server: { headers: ISOLATION_HEADERS },
    preview: { headers: ISOLATION_HEADERS },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
      css: false,
    },
  }
})
