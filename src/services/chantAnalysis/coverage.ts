/**
 * Coverage assessment and gate for the on-device chant analyzer.
 *
 * Why this exists (research/pronunciation-ai/10, measured on real audio):
 * correctly recited audio scored against the WRONG sloka's text produced
 * `incorrect` on 32/32 aksharas with zero abstention; silence and noise each
 * produced false deviations on roughly an eighth of units. Per-segment
 * scoring is only safe on input that demonstrably corresponds to the
 * expected text, so an analyzer must run this gate first and return an
 * unscored `unavailable` result when it refuses.
 *
 * The numeric thresholds are TUNING PARAMETERS, calibrated against the
 * committed fixture set (16 real clips + hard negatives — see
 * `chantCoverage.test.ts`, which asserts the gate's decision for every
 * fixture entry). They are provisional until the validation plan's
 * educator-labelled corpus exists, and they deliberately err toward refusal:
 * a wrongly-refused evaluation costs a retry; a wrongly-granted one can call
 * a correct chant wrong.
 */

import type {
  ChantCoverageGate,
  ChantEvaluationRequest,
  CoverageAssessment,
  CoverageDecision,
} from '../../types/chant'
import {
  alignDecodes,
  decodeAksharas,
  referenceAksharas,
} from './scoreAgainstText'

export const COVERAGE_THRESHOLDS = {
  /** Below this much voiced audio the recording is treated as speechless. */
  minVoicedMs: 250,
  /**
   * A contiguous run of covered units at least this long is accepted even
   * when overall coverage is low: a child who stops partway is ordinary and
   * must still be scored (the missing tail abstains rather than deviates).
   */
  minCoveredRun: 4,
  /** Alternative acceptance: this fraction of expected units covered ... */
  minCoveredRatio: 0.4,
  /** ... but never fewer than this many units. */
  minCoveredFloor: 3,
  /**
   * With coverage refused, at least this many decoded units means the child
   * clearly said SOMETHING sustained — report "that didn't sound like this
   * sloka" rather than "we couldn't hear you". Calibrated between the
   * measured noise signature (6 decoded units of garbage) and the smallest
   * measured wrong-text signature (8 decoded units).
   */
  wrongTextMinDecoded: 8,
  /** Least voiced milliseconds one akshara can plausibly occupy. */
  minVoicedMsPerAkshara: 60,
} as const

/**
 * Compute the coverage assessment from the decode variants. Covered means
 * the reference unit was delivered at its aligned position by at least one
 * decode variant — the same alignment rows the per-akshara scorer uses, so
 * gate and scorer can never disagree about what was heard where.
 */
export function computeCoverageAssessment(
  expectedText: string,
  decodes: string[],
  voicedMs: number,
): CoverageAssessment {
  const refAksharas = referenceAksharas(expectedText)
  const decodesAksharas = decodes.map(decodeAksharas)
  const rows = alignDecodes(refAksharas, decodesAksharas)

  let covered = 0
  let longestRun = 0
  let run = 0
  for (let i = 0; i < refAksharas.length; i++) {
    const hit = rows.some((row) => row[i] === refAksharas[i])
    if (hit) {
      covered += 1
      run += 1
      if (run > longestRun) longestRun = run
    } else {
      run = 0
    }
  }

  return {
    expectedSegments: refAksharas.length,
    // The penalty-0 variant is the canonical decode; higher penalties are
    // recovery probes and inflate token counts on degenerate input.
    decodedSegments: decodesAksharas.length > 0 ? decodesAksharas[0].length : 0,
    coveredSegments: covered,
    longestCoveredRun: longestRun,
    voicedMs: Math.round(voicedMs),
    expectedMinimumVoicedMs:
      refAksharas.length * COVERAGE_THRESHOLDS.minVoicedMsPerAkshara,
  }
}

/** Pure threshold policy over an already-measured assessment. */
export class DefaultChantCoverageGate implements ChantCoverageGate {
  assess(
    _request: ChantEvaluationRequest,
    assessment: CoverageAssessment,
  ): CoverageDecision {
    const t = COVERAGE_THRESHOLDS
    if (assessment.expectedSegments === 0) {
      return {
        status: 'insufficient',
        assessment,
        reason: 'analyzer-unavailable',
      }
    }
    if (
      assessment.voicedMs < t.minVoicedMs ||
      assessment.decodedSegments === 0
    ) {
      return {
        status: 'insufficient',
        assessment,
        reason: 'no-speech-detected',
      }
    }

    const coveredEnough =
      assessment.coveredSegments >=
      Math.max(
        t.minCoveredFloor,
        Math.ceil(assessment.expectedSegments * t.minCoveredRatio),
      )
    if (
      assessment.longestCoveredRun >= t.minCoveredRun ||
      coveredEnough
    ) {
      return { status: 'sufficient', assessment }
    }

    if (assessment.decodedSegments >= t.wrongTextMinDecoded) {
      return {
        status: 'insufficient',
        assessment,
        reason: 'expected-text-not-heard',
      }
    }
    return { status: 'insufficient', assessment, reason: 'audio-unclear' }
  }
}
