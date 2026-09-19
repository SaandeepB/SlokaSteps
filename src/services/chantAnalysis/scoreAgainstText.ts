/**
 * Per-akshara "verify against known text" scoring with abstention.
 *
 * Port of `score_against_text` in
 * `research/pronunciation-ai/scripts/verify_against_text.py`. The design
 * knobs (N_DECODES, strict thresholds, wrong-consensus requirement) carry the
 * values the research harness measured with; they are tuning parameters a
 * validation study must revisit, not constants of nature. Abstention is the
 * safe default: for a child app, calling a correct chant wrong is far worse
 * than staying quiet.
 *
 * `chantScore.test.ts` holds this port to label- and evidence-identical
 * output with the Python original on the committed fixtures (16 real clips +
 * hard negatives, ONNX-fp16 decodes).
 */

import {
  align,
  canonicaliseForAlignment,
  normaliseDevanagari,
  segmentAksharas,
} from './devanagariText'

export const N_DECODES = 4
export const T_OK = N_DECODES // strict: ALL decodes must match
export const T_BAD = 0 // strict: NO decode matched
export const CONSENSUS_WRONG = true

export type AksharaLabel = 'correct' | 'incorrect' | 'unclear'

export interface AksharaEvidence {
  decodes: number
  matched: number
  heard: string[]
}

export interface AksharaResult {
  index: number
  akshara: string
  label: AksharaLabel
  evidence: AksharaEvidence
}

export interface AksharaSummary {
  aksharas: number
  correct: number
  incorrect: number
  unclear: number
}

export function referenceAksharas(expectedText: string): string[] {
  return segmentAksharas(
    canonicaliseForAlignment(normaliseDevanagari(expectedText)),
  )
}

export function decodeAksharas(decode: string): string[] {
  return segmentAksharas(canonicaliseForAlignment(normaliseDevanagari(decode)))
}

/**
 * For each decode, map every reference index to the aligned hyp akshara (or
 * null). Exposed separately so coverage assessment reuses the identical
 * alignment the labels come from.
 */
export function alignDecodes(
  refAksharas: string[],
  decodesAksharas: string[][],
): (string | null)[][] {
  return decodesAksharas.map((hyp) => {
    const pairs = align(refAksharas, hyp)
    const row: (string | null)[] = new Array<string | null>(
      refAksharas.length,
    ).fill(null)
    let refIndex = 0
    for (const [a, b] of pairs) {
      if (a !== null) {
        row[refIndex] = b
        refIndex += 1
      }
    }
    return row
  })
}

export function scoreAgainstText(
  expectedText: string,
  decodes: string[],
): AksharaResult[] {
  const refAksharas = referenceAksharas(expectedText)
  const decodesAksharas = decodes.map(decodeAksharas)
  const alignedPerDecode = alignDecodes(refAksharas, decodesAksharas)

  const results: AksharaResult[] = []
  for (let i = 0; i < refAksharas.length; i++) {
    const ref = refAksharas[i]
    const got = alignedPerDecode.map((row) => row[i])
    const matched = got.filter((g) => g === ref).length
    const wrong = got.filter((g): g is string => g !== null && g !== ref)
    const wrongCounts = new Map<string, number>()
    for (const w of wrong) wrongCounts.set(w, (wrongCounts.get(w) ?? 0) + 1)
    const topWrongCount = Math.max(0, ...wrongCounts.values())

    let label: AksharaLabel
    if (matched >= T_OK) {
      label = 'correct'
    } else if (
      matched <= T_BAD &&
      wrong.length > 0 &&
      (!CONSENSUS_WRONG ||
        topWrongCount >= Math.max(1, decodesAksharas.length - 1))
    ) {
      label = 'incorrect'
    } else {
      label = 'unclear'
    }

    results.push({
      index: i,
      akshara: ref,
      label,
      evidence: {
        decodes: decodesAksharas.length,
        matched,
        heard: got.map((g) => g ?? '-'),
      },
    })
  }
  return results
}

export function summarise(results: AksharaResult[]): AksharaSummary {
  const summary: AksharaSummary = {
    aksharas: results.length,
    correct: 0,
    incorrect: 0,
    unclear: 0,
  }
  for (const r of results) summary[r.label] += 1
  return summary
}
