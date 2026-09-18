// @vitest-environment node
import { describe, expect, it } from 'vitest'
import verifyParity from './fixtures/chant/verify-parity.json'
import {
  scoreAgainstText,
  summarise,
} from '../services/chantAnalysis/scoreAgainstText'

interface FixtureResult {
  index: number
  akshara: string
  label: 'correct' | 'incorrect' | 'unclear'
  evidence: { decodes: number; matched: number; heard: string[] }
}

interface FixtureEntry {
  clipId: string
  kind: string
  expectedText: string
  decodes: string[]
  results: FixtureResult[]
}

const entries = (verifyParity as { entries: FixtureEntry[] }).entries

describe('scoreAgainstText parity with verify_against_text.py', () => {
  it('covers correct pairs, hard negatives, and wrong-text pairings', () => {
    const kinds = new Set(entries.map((e) => e.kind))
    expect(kinds).toContain('correct-pair')
    expect(kinds).toContain('silence')
    expect(kinds).toContain('noise')
    expect(kinds).toContain('truncated')
    expect(kinds).toContain('wrong-text')
    expect(entries.length).toBeGreaterThanOrEqual(20)
  })

  it.each(entries.map((e) => [`${e.kind}:${e.clipId}`, e] as const))(
    '%s: labels and evidence match Python exactly',
    (_name, entry) => {
      const results = scoreAgainstText(entry.expectedText, entry.decodes)
      expect(results.length).toBe(entry.results.length)
      for (let i = 0; i < results.length; i++) {
        expect(results[i].index).toBe(entry.results[i].index)
        expect(results[i].akshara).toBe(entry.results[i].akshara)
        expect(results[i].label).toBe(entry.results[i].label)
        expect(results[i].evidence).toEqual(entry.results[i].evidence)
      }
    },
  )

  it('summarises counts consistently', () => {
    const entry = entries[0]
    const summary = summarise(scoreAgainstText(entry.expectedText, entry.decodes))
    expect(summary.aksharas).toBe(entry.results.length)
    expect(summary.correct + summary.incorrect + summary.unclear).toBe(
      summary.aksharas,
    )
  })
})
