/**
 * Message protocol between the app and the chant-analysis worker. One shared
 * module so the two sides cannot drift apart.
 */

import type { DecodedToken } from './ctcDecode'

export interface ChantWorkerInit {
  type: 'init'
  /** Absolute URL prefix where model-manifest.json etc. are served. */
  modelBaseUrl: string
  /** Absolute URL prefix for the onnxruntime-web wasm binaries. */
  ortWasmBaseUrl: string
}

export interface ChantWorkerAnalyze {
  type: 'analyze'
  id: number
  /** 16 kHz mono PCM; the buffer is transferred, not copied. */
  samples: Float32Array
}

export type ChantWorkerRequest = ChantWorkerInit | ChantWorkerAnalyze

export interface ChantWorkerProgress {
  type: 'progress'
  /** 0..1 of the model download; loading from cache jumps straight to 1. */
  fraction: number
}

export interface ChantWorkerReady {
  type: 'ready'
  analyzerVersion: string
  executionProvider: 'webgpu' | 'wasm'
}

export interface ChantWorkerResult {
  type: 'result'
  id: number
  decodes: string[]
  tokens0: DecodedToken[]
  outFrames: number
}

export interface ChantWorkerFailure {
  type: 'error'
  /** Present when the failure belongs to one analyze call; absent = fatal. */
  id?: number
  message: string
}

export type ChantWorkerResponse =
  | ChantWorkerProgress
  | ChantWorkerReady
  | ChantWorkerResult
  | ChantWorkerFailure

/** Output shape the evaluation service consumes, however it was produced. */
export interface ChantAnalysisOutput {
  decodes: string[]
  tokens0: DecodedToken[]
  outFrames: number
}

export interface ChantAnalysisBackend {
  readonly analyzerVersion: string
  analyze(samples: Float32Array): Promise<ChantAnalysisOutput>
}
