/**
 * Manages a single temporary object URL for in-session recording playback.
 * Setting a new blob revokes the previous URL; revoke() cleans up on
 * delete/unmount. Recordings are never persisted anywhere.
 */
export interface ObjectUrlManager {
  set(blob: Blob): string
  get(): string | null
  revoke(): void
}

export function createObjectUrlManager(): ObjectUrlManager {
  let current: string | null = null
  return {
    set(blob: Blob): string {
      if (current) URL.revokeObjectURL(current)
      current = URL.createObjectURL(blob)
      return current
    },
    get() {
      return current
    },
    revoke() {
      if (current) {
        URL.revokeObjectURL(current)
        current = null
      }
    },
  }
}
