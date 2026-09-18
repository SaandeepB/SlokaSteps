/**
 * Local storage for a learner's own reference chant recordings — the model
 * takes their graded attempts are compared against. Kept on-device only
 * (IndexedDB), never uploaded, and stored as decoded 16 kHz mono samples so
 * grading needs no re-decode.
 *
 * This is the learner's OWN voice, recorded deliberately as a reference, not
 * captured child practice audio; it is retained (unlike practice recordings)
 * precisely because the learner asked to be graded against it, and it can be
 * deleted at any time.
 */

export interface StoredChantReference {
  slokaId: string
  /** 16 kHz mono PCM. */
  samples: Float32Array
  sampleRate: number
  durationMs: number
  createdAt: string
}

export interface ChantReferenceStore {
  get(slokaId: string): Promise<StoredChantReference | null>
  set(reference: StoredChantReference): Promise<void>
  delete(slokaId: string): Promise<void>
  listIds(): Promise<string[]>
}

const DB_NAME = 'sloka-steps-chant'
const DB_VERSION = 1
const STORE = 'references'

/** In-memory store — the test seam and the fallback where IndexedDB is absent. */
export class InMemoryChantReferenceStore implements ChantReferenceStore {
  private readonly map = new Map<string, StoredChantReference>()

  get(slokaId: string): Promise<StoredChantReference | null> {
    return Promise.resolve(this.map.get(slokaId) ?? null)
  }

  set(reference: StoredChantReference): Promise<void> {
    this.map.set(reference.slokaId, reference)
    return Promise.resolve()
  }

  delete(slokaId: string): Promise<void> {
    this.map.delete(slokaId)
    return Promise.resolve()
  }

  listIds(): Promise<string[]> {
    return Promise.resolve([...this.map.keys()])
  }
}

export class IndexedDbChantReferenceStore implements ChantReferenceStore {
  private dbPromise: Promise<IDBDatabase> | null = null

  private open(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'slokaId' })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'))
    })
    this.dbPromise.catch(() => {
      this.dbPromise = null
    })
    return this.dbPromise
  }

  private async tx<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    const db = await this.open()
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const request = run(transaction.objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('indexedDB request failed'))
    })
  }

  async get(slokaId: string): Promise<StoredChantReference | null> {
    const value = await this.tx<StoredChantReference | undefined>('readonly', (s) =>
      s.get(slokaId),
    )
    return value ?? null
  }

  async set(reference: StoredChantReference): Promise<void> {
    await this.tx('readwrite', (s) => s.put(reference))
  }

  async delete(slokaId: string): Promise<void> {
    await this.tx('readwrite', (s) => s.delete(slokaId))
  }

  async listIds(): Promise<string[]> {
    const keys = await this.tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys())
    return keys.map((key) => String(key))
  }
}

let singleton: ChantReferenceStore | null = null

export function getChantReferenceStore(): ChantReferenceStore {
  if (singleton) return singleton
  singleton =
    typeof indexedDB !== 'undefined'
      ? new IndexedDbChantReferenceStore()
      : new InMemoryChantReferenceStore()
  return singleton
}

/** Test seam. */
export function setChantReferenceStore(store: ChantReferenceStore | null): void {
  singleton = store
}
