/**
 * Grades a chant attempt against the learner's own reference recording, and
 * decodes a fresh reference from a recording blob. Pure orchestration over the
 * validated similarity scorer and the audio decoder; it never throws at the
 * caller (every failure is a typed outcome) and never fabricates a score.
 */

import {
  audioSimilarityFromSamples,
  gradeFromSimilarity,
  type ChantGradeResult,
} from './audioSimilarity'
import {
  decodeRecordingBlob,
  measureVoicedMs,
  ANALYSIS_SAMPLE_RATE,
} from './audioInput'
import type { StoredChantReference } from './chantReferenceStore'

/** Least voiced audio a gradeable chant attempt must contain. */
const MIN_VOICED_MS = 500
/** Least total recording length to attempt grading. */
const MIN_DURATION_MS = 800

export type ChantTestOutcome =
  | { status: 'graded'; result: ChantGradeResult; durationMs: number }
  | { status: 'no-reference' }
  | { status: 'too-quiet' }
  | { status: 'too-short' }
  | { status: 'undecodable' }

export interface DecodeBlob {
  (blob: Blob): Promise<{ samples: Float32Array; durationMs: number }>
}

/**
 * Decode a recording into a stored reference. Returns null when the recording
 * is unusable (empty / no speech), so a bad reference can never be saved.
 */
export async function decodeReference(
  slokaId: string,
  blob: Blob,
  now: () => string = () => new Date().toISOString(),
  decode: DecodeBlob = decodeRecordingBlob,
): Promise<StoredChantReference | null> {
  let decoded
  try {
    decoded = await decode(blob)
  } catch {
    return null
  }
  if (decoded.durationMs < MIN_DURATION_MS || decoded.samples.length === 0) {
    return null
  }
  if (measureVoicedMs(decoded.samples).voicedMs < MIN_VOICED_MS) return null
  return {
    slokaId,
    samples: decoded.samples,
    sampleRate: ANALYSIS_SAMPLE_RATE,
    durationMs: Math.round(decoded.durationMs),
    createdAt: now(),
  }
}

/**
 * Grade an attempt blob against a stored reference. `reference` is null when
 * the learner has not set one yet — the caller then routes to reference
 * capture instead of grading.
 */
export async function gradeChantAttempt(
  blob: Blob,
  reference: StoredChantReference | null,
  decode: DecodeBlob = decodeRecordingBlob,
): Promise<ChantTestOutcome> {
  if (!reference) return { status: 'no-reference' }
  let decoded
  try {
    decoded = await decode(blob)
  } catch {
    return { status: 'undecodable' }
  }
  if (decoded.durationMs < MIN_DURATION_MS || decoded.samples.length === 0) {
    return { status: 'too-short' }
  }
  if (measureVoicedMs(decoded.samples).voicedMs < MIN_VOICED_MS) {
    return { status: 'too-quiet' }
  }
  const similarity = audioSimilarityFromSamples(reference.samples, decoded.samples)
  return {
    status: 'graded',
    result: gradeFromSimilarity(similarity),
    durationMs: Math.round(decoded.durationMs),
  }
}
