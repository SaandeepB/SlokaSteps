/**
 * Chant analyzer asset descriptors and loading.
 *
 * The model weights are NOT part of the app bundle: the Su-śrotā checkpoint
 * carries no explicit licence grant (research/pronunciation-ai/06), so the
 * assets are provisioned per deployment into `<base>/models/chant/` (dev and
 * preview serve the git-ignored `models-local/chant/` there). When the
 * assets are absent the analyzer reports itself unavailable and the app
 * falls back to participation-only encouragement — fail closed, never fail
 * into pretend analysis.
 */

import type { MelFrontendConfig } from './melFrontend'
import type { SanskritTokenizer } from './ctcDecode'

export interface ChantFrontendAsset extends MelFrontendConfig {
  sampleRate: number
  windowB64: string
  melFilterbankShape: [number, number]
  melFilterbankB64: string
  vocabSize: number
}

export interface ChantModelManifest {
  analyzerVersion: string
  files: Record<string, { bytes: number; sha256: string }>
}

export const CHANT_MODEL_FILE = 'susrota_ctc_fp16.onnx'
const CHANT_CACHE_NAME = 'sloka-steps-chant-model'

export function decodeBase64ToFloat32(b64: string): Float32Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Float32Array(bytes.buffer)
}

function assertShape(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`chant assets: ${message}`)
}

export function validateFrontendAsset(value: unknown): ChantFrontendAsset {
  const v = value as Partial<ChantFrontendAsset>
  assertShape(typeof v === 'object' && v !== null, 'frontend.json malformed')
  assertShape(v.sampleRate === 16000, 'unexpected sample rate')
  assertShape(
    typeof v.nFft === 'number' &&
      typeof v.winLength === 'number' &&
      typeof v.hopLength === 'number' &&
      typeof v.nMels === 'number' &&
      typeof v.preemph === 'number' &&
      typeof v.logZeroGuard === 'number' &&
      typeof v.normalizeStdEps === 'number' &&
      typeof v.vocabSize === 'number',
    'frontend constants missing',
  )
  assertShape(
    typeof v.windowB64 === 'string' && typeof v.melFilterbankB64 === 'string',
    'frontend tensors missing',
  )
  assertShape(
    Array.isArray(v.melFilterbankShape) &&
      v.melFilterbankShape.length === 2 &&
      v.melFilterbankShape[0] === v.nMels &&
      v.melFilterbankShape[1] === v.nFft! / 2 + 1,
    'filterbank shape inconsistent',
  )
  return v as ChantFrontendAsset
}

export function validateTokenizerAsset(value: unknown): SanskritTokenizer {
  const v = value as Partial<SanskritTokenizer>
  assertShape(typeof v === 'object' && v !== null, 'sa_tokenizer.json malformed')
  assertShape(
    typeof v.sanskritOffset === 'number' &&
      typeof v.sanskritWidth === 'number' &&
      typeof v.blankId === 'number',
    'tokenizer constants missing',
  )
  assertShape(
    Array.isArray(v.pieces) &&
      v.pieces.length === v.sanskritWidth &&
      v.pieces.every((p) => typeof p === 'string' && p.length > 0),
    'tokenizer pieces inconsistent',
  )
  return v as SanskritTokenizer
}

export function validateModelManifest(value: unknown): ChantModelManifest {
  const v = value as Partial<ChantModelManifest>
  assertShape(typeof v === 'object' && v !== null, 'model-manifest malformed')
  assertShape(
    typeof v.analyzerVersion === 'string' && v.analyzerVersion.length > 0,
    'analyzerVersion missing',
  )
  assertShape(
    typeof v.files === 'object' &&
      v.files !== null &&
      typeof v.files[CHANT_MODEL_FILE]?.bytes === 'number',
    'model file entry missing',
  )
  return v as ChantModelManifest
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { credentials: 'same-origin' })
  if (!response.ok) throw new Error(`chant assets: HTTP ${response.status} for ${url}`)
  return response.json()
}

export interface LoadedChantAssets {
  manifest: ChantModelManifest
  frontend: ChantFrontendAsset
  tokenizer: SanskritTokenizer
  modelBytes: Uint8Array
}

/**
 * Load manifest + constants + model weights, reporting model-download
 * progress. Weights are cached in the Cache API keyed by analyzer version;
 * stale versions are evicted. Works in both window and worker scopes.
 */
export async function loadChantAssets(
  baseUrl: string,
  onProgress: (fraction: number) => void,
): Promise<LoadedChantAssets> {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const manifest = validateModelManifest(
    await fetchJson(`${base}model-manifest.json`),
  )
  const frontend = validateFrontendAsset(await fetchJson(`${base}frontend.json`))
  const tokenizer = validateTokenizerAsset(
    await fetchJson(`${base}sa_tokenizer.json`),
  )

  const expectedBytes = manifest.files[CHANT_MODEL_FILE].bytes
  const modelUrl = `${base}${CHANT_MODEL_FILE}`
  const cacheKey = `${modelUrl}?v=${encodeURIComponent(manifest.analyzerVersion)}`

  const cache =
    typeof caches !== 'undefined' ? await caches.open(CHANT_CACHE_NAME) : null
  if (cache) {
    const hit = await cache.match(cacheKey)
    if (hit) {
      const bytes = new Uint8Array(await hit.arrayBuffer())
      if (bytes.byteLength === expectedBytes) {
        onProgress(1)
        return { manifest, frontend, tokenizer, modelBytes: bytes }
      }
      await cache.delete(cacheKey)
    }
  }

  const response = await fetch(modelUrl, { credentials: 'same-origin' })
  if (!response.ok || !response.body) {
    throw new Error(`chant assets: HTTP ${response.status} for model weights`)
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      received += value.byteLength
      onProgress(Math.min(0.999, received / expectedBytes))
    }
  }
  const bytes = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  if (bytes.byteLength !== expectedBytes) {
    throw new Error(
      `chant assets: model download size ${bytes.byteLength} != manifest ${expectedBytes}`,
    )
  }
  if (cache) {
    // Cache write failures (quota, private mode) must never block analysis.
    try {
      const stored = new Uint8Array(bytes.byteLength)
      stored.set(bytes)
      await cache.put(cacheKey, new Response(stored.buffer))
      for (const request of await cache.keys()) {
        if (request.url.startsWith(modelUrl) && request.url !== cacheKey) {
          await cache.delete(request)
        }
      }
    } catch {
      // Ignore: the in-memory copy is what analysis uses.
    }
  }
  onProgress(1)
  return { manifest, frontend, tokenizer, modelBytes: bytes }
}

/** Cheap availability probe (manifest only), for UI state before download. */
export async function probeChantAssets(
  baseUrl: string,
): Promise<ChantModelManifest | null> {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  try {
    return validateModelManifest(await fetchJson(`${base}model-manifest.json`))
  } catch {
    return null
  }
}
