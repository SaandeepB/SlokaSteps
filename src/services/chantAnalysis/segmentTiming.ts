/**
 * Best-effort timing for scored segments.
 *
 * The CTC decode yields one emission frame per SentencePiece token. This
 * module carries those frames through the exact normalisation pipeline the
 * scorer applies to decode text (drop chars → collapse whitespace →
 * word-final म् → anusvara → dedup doubled marks → strip spaces), so each
 * canonical-akshara of the decode gets a frame span, and each REFERENCE
 * akshara inherits the span of the decode akshara it aligned to.
 *
 * Timing is coarse by construction: one encoder frame is 4 feature hops
 * (40 ms of audio), and a token's chars share its emission frame. When the
 * mapping's assumptions fail (e.g. NFC changes the decode string), the
 * caller falls back to even distribution — timing is a convenience for
 * playback highlighting, never part of a verdict.
 */

import type { DecodedToken } from './ctcDecode'
import {
  align,
  isDroppedChar,
  segmentAksharasWithSpans,
} from './devanagariText'

export interface FrameSpan {
  startFrame: number
  endFrame: number
}

interface TrackedChar {
  char: string
  frame: number
}

const WORD_BOUNDARY = '▁'
const VIRAMA = '्'
const MA = 'म'
const ANUSVARA = 'ं'
const DOUBLED_MARKS = new Set(['ं', 'ः', '़'])

/**
 * Frame span per canonical akshara of the variant-0 decode, or null when the
 * decode text cannot be tracked through normalisation (caller falls back).
 * `canonicalAksharas` must be `decodeAksharas(decode0.text)` — lengths are
 * verified so a mismatch can never silently misattribute times.
 */
export function frameSpansForDecode(
  tokens: DecodedToken[],
  canonicalAksharas: string[],
): FrameSpan[] | null {
  if (tokens.length === 0) return canonicalAksharas.length === 0 ? [] : null

  // 1. Raw char stream with per-char emission frames ('▁' → space).
  let chars: TrackedChar[] = []
  for (const token of tokens) {
    for (const ch of token.piece) {
      chars.push({
        char: ch === WORD_BOUNDARY ? ' ' : ch,
        frame: token.frame,
      })
    }
  }

  // NFC is assumed to be a no-op on decode output (SentencePiece pieces are
  // NFC); bail out to the fallback if that ever fails.
  const rawString = chars.map((c) => c.char).join('')
  if (rawString.normalize('NFC') !== rawString) return null

  // 2. normaliseDevanagari: dropped chars → space, collapse ws, trim.
  chars = chars.map((c) => (isDroppedChar(c.char) ? { ...c, char: ' ' } : c))
  const collapsed: TrackedChar[] = []
  for (const c of chars) {
    if (/\s/.test(c.char)) {
      if (collapsed.length === 0) continue // leading whitespace
      if (collapsed[collapsed.length - 1].char === ' ') continue
      collapsed.push({ char: ' ', frame: c.frame })
    } else {
      collapsed.push(c)
    }
  }
  while (collapsed.length > 0 && collapsed[collapsed.length - 1].char === ' ') {
    collapsed.pop()
  }

  // 3. canonicaliseForAlignment: word-final म् → ं, dedup doubled marks,
  //    strip spaces.
  const canonicalChars: TrackedChar[] = []
  for (let i = 0; i < collapsed.length; i++) {
    const c = collapsed[i]
    const next = collapsed[i + 1]
    const afterNext = collapsed[i + 2]
    if (
      c.char === MA &&
      next?.char === VIRAMA &&
      (afterNext === undefined || afterNext.char === ' ')
    ) {
      canonicalChars.push({ char: ANUSVARA, frame: c.frame })
      i += 1
      continue
    }
    if (
      DOUBLED_MARKS.has(c.char) &&
      canonicalChars.length > 0 &&
      canonicalChars[canonicalChars.length - 1].char === c.char
    ) {
      continue
    }
    if (c.char === ' ') continue
    canonicalChars.push(c)
  }

  const canonical = canonicalChars.map((c) => c.char).join('')
  const spans = segmentAksharasWithSpans(canonical)
  if (spans.length !== canonicalAksharas.length) return null
  for (let i = 0; i < spans.length; i++) {
    if (spans[i].akshara !== canonicalAksharas[i]) return null
  }

  return spans.map((span) => {
    let start = Number.POSITIVE_INFINITY
    let end = 0
    for (let i = span.start; i < span.end; i++) {
      const frame = canonicalChars[i].frame
      if (frame < start) start = frame
      if (frame + 1 > end) end = frame + 1
    }
    return { startFrame: start, endFrame: end }
  })
}

/** Fallback: distribute aksharas evenly over the token emission span. */
export function evenFrameSpans(
  tokens: DecodedToken[],
  count: number,
): FrameSpan[] {
  if (count === 0) return []
  const first = tokens.length > 0 ? tokens[0].frame : 0
  const last = tokens.length > 0 ? tokens[tokens.length - 1].frame + 1 : count
  const width = Math.max(1, (last - first) / count)
  return Array.from({ length: count }, (_v, k) => ({
    startFrame: Math.floor(first + k * width),
    endFrame: Math.ceil(first + (k + 1) * width),
  }))
}

/**
 * For each reference akshara index, the variant-0 decode akshara index it
 * aligned to (or null for deletions) — the timing counterpart of the
 * scorer's alignment rows, produced by the same `align`.
 */
export function alignRefToHypIndices(
  refAksharas: string[],
  hypAksharas: string[],
): (number | null)[] {
  const pairs = align(refAksharas, hypAksharas)
  const out: (number | null)[] = new Array<number | null>(
    refAksharas.length,
  ).fill(null)
  let refIndex = 0
  let hypIndex = 0
  for (const [a, b] of pairs) {
    if (a !== null && b !== null) {
      out[refIndex] = hypIndex
      refIndex += 1
      hypIndex += 1
    } else if (a !== null) {
      out[refIndex] = null
      refIndex += 1
    } else {
      hypIndex += 1
    }
  }
  return out
}

export interface SegmentTimes {
  startMs: number
  endMs: number
}

/**
 * Millisecond spans per reference akshara. Unaligned reference positions get
 * a zero-width span at the previous segment's end, and spans are forced
 * monotonic so playback highlighting can never jump backwards.
 */
export function referenceSegmentTimes(
  refToHyp: (number | null)[],
  hypSpans: FrameSpan[],
  frameMs: number,
): SegmentTimes[] {
  const out: SegmentTimes[] = []
  let cursorMs = 0
  for (const hypIndex of refToHyp) {
    if (hypIndex !== null && hypIndex < hypSpans.length) {
      const span = hypSpans[hypIndex]
      const startMs = Math.max(cursorMs, Math.round(span.startFrame * frameMs))
      const endMs = Math.max(startMs, Math.round(span.endFrame * frameMs))
      out.push({ startMs, endMs })
      cursorMs = endMs
    } else {
      out.push({ startMs: cursorMs, endMs: cursorMs })
    }
  }
  return out
}
