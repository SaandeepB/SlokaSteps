/**
 * Copies the onnxruntime-web wasm runtime files into public/ort/ so the
 * chant-analysis worker can load them same-origin (ort.env.wasm.wasmPaths).
 * Runs automatically before dev and build (predev/prebuild). public/ort/ is
 * git-ignored: these are generated, version-locked artifacts of the
 * onnxruntime-web dependency.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const distDir = join(root, 'node_modules', 'onnxruntime-web', 'dist')
const outDir = join(root, 'public', 'ort')

if (!existsSync(distDir)) {
  console.error('copy-ort-assets: onnxruntime-web is not installed; run npm install first.')
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })

// The .jsep files carry the WebGPU-enabled build; the plain ones are the
// wasm-only fallback. Both loaders (.mjs) and binaries (.wasm) are needed.
const wanted = readdirSync(distDir).filter(
  (name) => name.startsWith('ort-wasm-simd-threaded') && (name.endsWith('.wasm') || name.endsWith('.mjs')),
)

if (wanted.length === 0) {
  console.error('copy-ort-assets: no ort-wasm-simd-threaded files found; onnxruntime-web layout changed?')
  process.exit(1)
}

for (const name of wanted) {
  copyFileSync(join(distDir, name), join(outDir, name))
}
console.log(`copy-ort-assets: copied ${wanted.length} files to public/ort/`)
