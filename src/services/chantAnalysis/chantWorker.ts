/// <reference lib="webworker" />
/**
 * Dedicated worker that owns the ONNX session and the compute-heavy steps:
 * mel features -> encoder+CTC forward -> Sanskrit-slice decode variants.
 * Keeping this off the main thread keeps the recorder UI responsive during
 * the seconds an evaluation takes.
 *
 * The worker never receives or sends audio URLs, never persists anything,
 * and holds recordings only for the duration of one analyze call.
 */

import * as ort from 'onnxruntime-web/all'
import {
  decodeBase64ToFloat32,
  loadChantAssets,
  type LoadedChantAssets,
} from './assets'
import { computeLogMelFeatures } from './melFrontend'
import { decodeVariants } from './ctcDecode'
import type {
  ChantWorkerRequest,
  ChantWorkerResponse,
} from './workerProtocol'

const scope = self as unknown as DedicatedWorkerGlobalScope

function post(message: ChantWorkerResponse): void {
  scope.postMessage(message)
}

interface WorkerState {
  assets: LoadedChantAssets
  session: ort.InferenceSession
  window: Float32Array
  filterbank: Float32Array
  executionProvider: 'webgpu' | 'wasm'
}

let statePromise: Promise<WorkerState> | null = null

async function createSession(
  modelBytes: Uint8Array,
): Promise<{ session: ort.InferenceSession; executionProvider: 'webgpu' | 'wasm' }> {
  const hasWebGpu =
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    navigator.gpu !== undefined
  if (hasWebGpu) {
    try {
      const session = await ort.InferenceSession.create(modelBytes, {
        executionProviders: ['webgpu'],
      })
      return { session, executionProvider: 'webgpu' }
    } catch {
      // Fall through to wasm; webgpu support varies by device and driver.
    }
  }
  const session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: ['wasm'],
  })
  return { session, executionProvider: 'wasm' }
}

async function initialise(
  modelBaseUrl: string,
  ortWasmBaseUrl: string,
): Promise<WorkerState> {
  ort.env.wasm.wasmPaths = ortWasmBaseUrl.endsWith('/')
    ? ortWasmBaseUrl
    : `${ortWasmBaseUrl}/`
  const assets = await loadChantAssets(modelBaseUrl, (fraction) =>
    post({ type: 'progress', fraction }),
  )
  const { session, executionProvider } = await createSession(assets.modelBytes)
  return {
    assets,
    session,
    window: decodeBase64ToFloat32(assets.frontend.windowB64),
    filterbank: decodeBase64ToFloat32(assets.frontend.melFilterbankB64),
    executionProvider,
  }
}

async function analyze(state: WorkerState, samples: Float32Array) {
  const { frontend, tokenizer } = state.assets
  const features = computeLogMelFeatures(samples, frontend, {
    window: state.window,
    filterbank: state.filterbank,
  })
  const output = await state.session.run({
    audio_signal: new ort.Tensor('float32', features.data, [
      1,
      frontend.nMels,
      features.frames,
    ]),
    length: new ort.Tensor(
      'int64',
      BigInt64Array.from([BigInt(features.featLen)]),
      [1],
    ),
  })
  const logProbs = output.logprobs
  const [, outFrames, vocab] = logProbs.dims
  if (vocab !== frontend.vocabSize) {
    throw new Error(`unexpected vocab size ${vocab}`)
  }
  const variants = decodeVariants(
    logProbs.data as Float32Array,
    outFrames,
    vocab,
    tokenizer,
  )
  return {
    decodes: variants.map((v) => v.text),
    tokens0: variants[0].tokens,
    outFrames,
  }
}

scope.onmessage = (event: MessageEvent<ChantWorkerRequest>) => {
  const message = event.data
  if (message.type === 'init') {
    if (!statePromise) {
      statePromise = initialise(message.modelBaseUrl, message.ortWasmBaseUrl)
    }
    statePromise
      .then((state) =>
        post({
          type: 'ready',
          analyzerVersion: state.assets.manifest.analyzerVersion,
          executionProvider: state.executionProvider,
        }),
      )
      .catch((error: unknown) => {
        statePromise = null
        post({
          type: 'error',
          message: error instanceof Error ? error.message : 'init failed',
        })
      })
    return
  }
  if (message.type === 'analyze') {
    const { id, samples } = message
    if (!statePromise) {
      post({ type: 'error', id, message: 'worker not initialised' })
      return
    }
    statePromise
      .then(async (state) => {
        const result = await analyze(state, samples)
        post({ type: 'result', id, ...result })
      })
      .catch((error: unknown) => {
        post({
          type: 'error',
          id,
          message: error instanceof Error ? error.message : 'analysis failed',
        })
      })
  }
}
