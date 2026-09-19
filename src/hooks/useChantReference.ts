import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getChantReferenceStore,
  type StoredChantReference,
} from '../services/chantAnalysis/chantReferenceStore'
import { decodeReference } from '../services/chantAnalysis/chantGrading'

export interface UseChantReferenceResult {
  reference: StoredChantReference | null
  loading: boolean
  /** Decode + save a recording as this sloka's reference. Returns success. */
  saveFromBlob: (blob: Blob) => Promise<boolean>
  clear: () => Promise<void>
}

/** Loads and manages the learner's own reference chant for one sloka. */
export function useChantReference(slokaId: string | undefined): UseChantReferenceResult {
  const [reference, setReference] = useState<StoredChantReference | null>(null)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!slokaId) {
      setReference(null)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    getChantReferenceStore()
      .get(slokaId)
      .then((value) => {
        if (active) {
          setReference(value)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setReference(null)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [slokaId])

  const saveFromBlob = useCallback(
    async (blob: Blob): Promise<boolean> => {
      if (!slokaId) return false
      const decoded = await decodeReference(slokaId, blob)
      if (!decoded) return false
      try {
        await getChantReferenceStore().set(decoded)
      } catch {
        return false
      }
      if (mountedRef.current) setReference(decoded)
      return true
    },
    [slokaId],
  )

  const clear = useCallback(async (): Promise<void> => {
    if (!slokaId) return
    try {
      await getChantReferenceStore().delete(slokaId)
    } catch {
      // A failed delete leaves the reference in place; nothing to surface.
    }
    if (mountedRef.current) setReference(null)
  }, [slokaId])

  return { reference, loading, saveFromBlob, clear }
}
