/**
 * Main-thread client for the chant-analysis worker. Implements the backend
 * interface the evaluation service consumes, adding init lifecycle, request
 * correlation, a per-call timeout, and progress callbacks for the UI.
 */

import type {
  ChantAnalysisBackend,
  ChantAnalysisOutput,
  ChantWorkerRequest,
  ChantWorkerResponse,
} from './workerProtocol'

const ANALYZE_TIMEOUT_MS = 90_000

export interface WorkerBackendCallbacks {
  onProgress?: (fraction: number) => void
}

interface PendingCall {
  resolve: (output: ChantAnalysisOutput) => void
  reject: (error: Error) => void
  timer: number
}

export class WorkerChantBackend implements ChantAnalysisBackend {
  private worker: Worker | null = null
  private readyPromise: Promise<void> | null = null
  private pending = new Map<number, PendingCall>()
  private nextId = 1
  private version = 'unknown'
  private provider: 'webgpu' | 'wasm' | 'unknown' = 'unknown'

  constructor(
    private readonly modelBaseUrl: string,
    private readonly ortWasmBaseUrl: string,
    private readonly callbacks: WorkerBackendCallbacks = {},
  ) {}

  get analyzerVersion(): string {
    return this.version
  }

  get executionProvider(): 'webgpu' | 'wasm' | 'unknown' {
    return this.provider
  }

  /** Idempotent: downloads/caches assets and builds the session once. */
  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise
    this.readyPromise = new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./chantWorker.ts', import.meta.url), {
        type: 'module',
      })
      this.worker = worker
      worker.onerror = (event) => {
        this.failAll(new Error(event.message || 'chant worker crashed'))
        reject(new Error(event.message || 'chant worker failed to start'))
      }
      worker.onmessage = (event: MessageEvent<ChantWorkerResponse>) => {
        const message = event.data
        switch (message.type) {
          case 'progress':
            this.callbacks.onProgress?.(message.fraction)
            break
          case 'ready':
            this.version = message.analyzerVersion
            this.provider = message.executionProvider
            resolve()
            break
          case 'result': {
            const call = this.pending.get(message.id)
            if (call) {
              this.pending.delete(message.id)
              clearTimeout(call.timer)
              call.resolve({
                decodes: message.decodes,
                tokens0: message.tokens0,
                outFrames: message.outFrames,
              })
            }
            break
          }
          case 'error': {
            if (message.id !== undefined) {
              const call = this.pending.get(message.id)
              if (call) {
                this.pending.delete(message.id)
                clearTimeout(call.timer)
                call.reject(new Error(message.message))
              }
            } else {
              this.failAll(new Error(message.message))
              reject(new Error(message.message))
            }
            break
          }
        }
      }
      this.send({
        type: 'init',
        modelBaseUrl: this.modelBaseUrl,
        ortWasmBaseUrl: this.ortWasmBaseUrl,
      })
    })
    this.readyPromise.catch(() => {
      // A failed init may be retried with a fresh backend instance.
    })
    return this.readyPromise
  }

  async analyze(samples: Float32Array): Promise<ChantAnalysisOutput> {
    await this.init()
    const worker = this.worker
    if (!worker) throw new Error('chant worker unavailable')
    const id = this.nextId++
    return new Promise<ChantAnalysisOutput>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('chant analysis timed out'))
      }, ANALYZE_TIMEOUT_MS)
      this.pending.set(id, { resolve, reject, timer })
      worker.postMessage({ type: 'analyze', id, samples } satisfies ChantWorkerRequest, [
        samples.buffer,
      ])
    })
  }

  dispose(): void {
    this.failAll(new Error('chant worker disposed'))
    this.worker?.terminate()
    this.worker = null
    this.readyPromise = null
  }

  private send(message: ChantWorkerRequest): void {
    this.worker?.postMessage(message)
  }

  private failAll(error: Error): void {
    for (const [, call] of this.pending) {
      clearTimeout(call.timer)
      call.reject(error)
    }
    this.pending.clear()
  }
}
