/**
 * Singleton runtime for the on-device Chant Coach analyzer.
 *
 * Owns the worker-backed analysis session and exposes a tiny external store
 * (status + download progress) for React surfaces. The runtime prepares only
 * when every gate agrees: build-time feature flag, parent preference, model
 * assets actually provisioned, and a browser with Worker support. Every
 * failure lands in a terminal status and the participation-only service
 * remains registered — the lesson experience never depends on this runtime.
 */

import { FEATURE_FLAGS } from '../../config/featureFlags'
import { appPublicAssetUrl } from '../../routes/basePath'
import type { SupportedLanguage } from '../../types'
import { translate } from '../../content/translations'
import type { TranslationKey, TranslationVars } from '../../content/translations'
import type { ChantEvaluationService } from '../../types/chant'
import { registerScoredEvaluationService } from '../pronunciation'
import { decodeRecordingBlob } from './audioInput'
import { probeChantAssets } from './assets'
import { OnDeviceChantEvaluationService } from './evaluationService'
import { WorkerChantBackend } from './workerClient'

export type ChantCoachStatus =
  /** Feature flag or parent preference is off; nothing is loaded. */
  | 'off'
  /** Enabled, but the model assets are not provisioned on this deployment. */
  | 'assets-missing'
  /** Assets exist; the one-time download/session build has not started. */
  | 'available'
  /** Downloading weights / building the session. */
  | 'preparing'
  | 'ready'
  | 'failed'

export interface ChantCoachSnapshot {
  status: ChantCoachStatus
  /** 0..1 model download progress while preparing. */
  progress: number
  analyzerVersion: string | null
  executionProvider: 'webgpu' | 'wasm' | null
  errorMessage: string | null
}

let snapshot: ChantCoachSnapshot = {
  status: 'off',
  progress: 0,
  analyzerVersion: null,
  executionProvider: null,
  errorMessage: null,
}

const listeners = new Set<() => void>()
let backend: WorkerChantBackend | null = null
let service: ChantEvaluationService | null = null
let probePromise: Promise<void> | null = null
let currentLanguage: SupportedLanguage = 'en-IN'

function emit(next: Partial<ChantCoachSnapshot>): void {
  snapshot = { ...snapshot, ...next }
  for (const listener of listeners) listener()
}

export function subscribeChantCoach(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getChantCoachSnapshot(): ChantCoachSnapshot {
  return snapshot
}

export function setChantCoachLanguage(language: SupportedLanguage): void {
  currentLanguage = language
}

function modelBaseUrl(): string {
  const override = import.meta.env.VITE_CHANT_MODEL_BASE_URL as
    | string
    | undefined
  const relative = override?.trim() || appPublicAssetUrl('/models/chant')
  return new URL(relative, document.baseURI).href
}

function ortWasmBaseUrl(): string {
  return new URL(appPublicAssetUrl('/ort'), document.baseURI).href
}

/**
 * Probe whether assets are provisioned, without downloading the weights.
 * Called when the coach becomes enabled; moves 'off' -> 'available' or
 * 'assets-missing'.
 */
export function probeChantCoach(): Promise<void> {
  if (!FEATURE_FLAGS.chantCoachEnabled) {
    emit({ status: 'off' })
    return Promise.resolve()
  }
  if (typeof Worker === 'undefined' || typeof fetch === 'undefined') {
    emit({ status: 'assets-missing' })
    return Promise.resolve()
  }
  if (probePromise) return probePromise
  probePromise = (async () => {
    try {
      const manifest = await probeChantAssets(modelBaseUrl())
      if (manifest) {
        emit({
          status: snapshot.status === 'ready' ? 'ready' : 'available',
          analyzerVersion: manifest.analyzerVersion,
        })
      } else {
        emit({ status: 'assets-missing' })
      }
    } catch {
      emit({ status: 'assets-missing' })
    } finally {
      probePromise = null
    }
  })()
  return probePromise
}

/**
 * Download (or load from cache) the weights and build the session. Safe to
 * call repeatedly; concurrent calls share one preparation.
 */
export async function prepareChantCoach(): Promise<void> {
  if (!FEATURE_FLAGS.chantCoachEnabled) return
  if (snapshot.status === 'ready' || snapshot.status === 'preparing') return
  if (typeof Worker === 'undefined') {
    emit({ status: 'failed', errorMessage: 'workers unavailable' })
    return
  }
  emit({ status: 'preparing', progress: 0, errorMessage: null })
  const nextBackend = new WorkerChantBackend(modelBaseUrl(), ortWasmBaseUrl(), {
    onProgress: (fraction) => emit({ progress: fraction }),
  })
  try {
    await nextBackend.init()
  } catch (error) {
    nextBackend.dispose()
    emit({
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'failed to load',
    })
    return
  }
  backend = nextBackend
  service = new OnDeviceChantEvaluationService({
    backend: nextBackend,
    decodeBlob: decodeRecordingBlob,
    localize: (key, params) =>
      translate(currentLanguage, key as TranslationKey, params as TranslationVars),
  })
  registerScoredEvaluationService(service)
  emit({
    status: 'ready',
    progress: 1,
    analyzerVersion: nextBackend.analyzerVersion,
    executionProvider:
      nextBackend.executionProvider === 'unknown'
        ? null
        : nextBackend.executionProvider,
  })
}

/** Parent turned the coach off (or the app is shutting the runtime down). */
export function disableChantCoach(): void {
  registerScoredEvaluationService(null)
  service = null
  backend?.dispose()
  backend = null
  emit({
    status: 'off',
    progress: 0,
    executionProvider: null,
    errorMessage: null,
  })
}

/** The scored service when ready, else null. UI must handle null. */
export function getChantCoachService(): ChantEvaluationService | null {
  return service
}
