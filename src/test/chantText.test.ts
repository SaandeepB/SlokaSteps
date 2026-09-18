// @vitest-environment node
import { describe, expect, it } from 'vitest'
import textParity from './fixtures/chant/text-parity.json'
import alignParity from './fixtures/chant/align-parity.json'
import {
  align,
  canonicaliseForAlignment,
  charErrorRate,
  normaliseDevanagari,
  segmentAksharas,
  stripSpaces,
} from '../services/chantAnalysis/devanagariText'

interface TextCase {
  input: string
  normalised: string
  stripped: string
  canonical: string
  aksharas: string[]
}

interface AlignCase {
  ref: string[]
  hyp: string[]
  pairs: [string | null, string | null][]
}

const textCases = (textParity as { cases: TextCase[] }).cases
const alignCases = (alignParity as { cases: AlignCase[] }).cases

describe('devanagariText parity with common_text.py', () => {
  it('loads a non-trivial fixture set', () => {
    expect(textCases.length).toBeGreaterThanOrEqual(15)
    expect(alignCases.length).toBeGreaterThanOrEqual(5)
  })

  it.each(textCases.map((c, i) => [i, c] as const))(
    'case %i: normalise/strip/canonicalise/segment match Python',
    (_i, c) => {
      expect(normaliseDevanagari(c.input)).toBe(c.normalised)
      expect(stripSpaces(c.input)).toBe(c.stripped)
      expect(canonicaliseForAlignment(normaliseDevanagari(c.input))).toBe(
        c.canonical,
      )
      expect(
        segmentAksharas(canonicaliseForAlignment(normaliseDevanagari(c.input))),
      ).toEqual(c.aksharas)
    },
  )

  it.each(alignCases.map((c, i) => [i, c] as const))(
    'align case %i matches Python backtrace exactly',
    (_i, c) => {
      expect(align(c.ref, c.hyp)).toEqual(c.pairs)
    },
  )

  it('reproduces segmentation for every akshara list in the verify fixtures', async () => {
    // Every reference segmentation the scorer parity test depends on must
    // come out of this port identically, or scoring parity is meaningless.
    const { default: verifyParity } = await import(
      './fixtures/chant/verify-parity.json'
    )
    const entries = (
      verifyParity as {
        entries: { expectedText: string; results: { akshara: string }[] }[]
      }
    ).entries
    for (const entry of entries) {
      const refAksharas = segmentAksharas(
        canonicaliseForAlignment(normaliseDevanagari(entry.expectedText)),
      )
      expect(refAksharas).toEqual(entry.results.map((r) => r.akshara))
    }
  })

  it('computes character error rate like the Python helper', () => {
    expect(charErrorRate('सरस्वति', 'सरस्वति')).toBe(0)
    expect(charErrorRate('', '')).toBe(0)
    expect(charErrorRate('', 'क')).toBe(1)
    expect(charErrorRate('क', '')).toBe(1)
    // One substituted character out of four (space-stripped length).
    expect(charErrorRate('कखगघ', 'कखगच')).toBeCloseTo(0.25, 10)
  })
})
