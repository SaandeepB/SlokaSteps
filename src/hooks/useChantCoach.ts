import { useEffect, useSyncExternalStore } from 'react'
import { FEATURE_FLAGS } from '../config/featureFlags'
import {
  disableChantCoach,
  getChantCoachSnapshot,
  prepareChantCoach,
  probeChantCoach,
  setChantCoachLanguage,
  subscribeChantCoach,
  type ChantCoachSnapshot,
} from '../services/chantAnalysis/chantCoachRuntime'
import { useAppState } from './useAppState'

export interface UseChantCoachResult extends ChantCoachSnapshot {
  /** All gates open: flag, parent preference, and microphone allowed. */
  enabled: boolean
}

/** Read-only view of the Chant Coach runtime for any surface. */
export function useChantCoach(): UseChantCoachResult {
  const { state } = useAppState()
  const snapshot = useSyncExternalStore(
    subscribeChantCoach,
    getChantCoachSnapshot,
    getChantCoachSnapshot,
  )
  const enabled =
    FEATURE_FLAGS.chantCoachEnabled &&
    state.preferences.voicePrivacy.onDeviceChantCheck &&
    state.preferences.voicePrivacy.allowMicrophone
  return { ...snapshot, enabled }
}

/**
 * Drives the runtime from app state: probes asset availability when the
 * parent enables the coach, prepares (downloads/loads) it, and tears it
 * down when disabled. Mounted once inside the state provider.
 */
export function ChantCoachManager() {
  const { state } = useAppState()
  const { onDeviceChantCheck, allowMicrophone } = state.preferences.voicePrivacy
  const language = state.preferences.displayLanguage
  const enabled =
    FEATURE_FLAGS.chantCoachEnabled && onDeviceChantCheck && allowMicrophone

  useEffect(() => {
    setChantCoachLanguage(language)
  }, [language])

  useEffect(() => {
    if (!enabled) {
      disableChantCoach()
      return
    }
    let cancelled = false
    void probeChantCoach().then(() => {
      if (cancelled) return
      if (getChantCoachSnapshot().status === 'available') {
        void prepareChantCoach()
      }
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return null
}
