// @vitest-environment node
/**
 * Calibrates and pins the coverage gate against the measured fixture set.
 * Every decision asserted here reflects the failure signatures measured in
 * research/pronunciation-ai/10: correct pairs and stopped-partway input must
 * be scored; silence, noise, and wrong-text input must be refused.
 */
import { describe, expect, it } from 'vitest'
import verifyParity from './fixtures/chant/verify-parity.json'
import {
  DefaultChantCoverageGate,
  computeCoverageAssessment,
} from '../services/chantAnalysis/coverage'
import type { ChantEvaluationRequest } from '../types/chant'

interface FixtureEntry {
  clipId: string
  kind: string
  expectedText: string
  decodes: string[]
}

const entries = (verifyParity as { entries: FixtureEntry[] }).entries
const gate = new DefaultChantCoverageGate()

function makeRequest(expectedText: string): ChantEvaluationRequest {
  return {
    recording: new Blob([]),
    slokaId: null,
    referenceId: null,
    expectedText,
    language: 'sa-IN',
    ageBand: '7-8',
    evaluationModes: ['pronunciation'],
  }
}

/**
 * Voiced-audio figures for fixture entries. The fixtures carry decodes, not
 * audio, so VAD cannot run here; these stand-ins express what an energy VAD
 * reports for each signature (silence: none; everything else: plenty), so
 * the DECODE-derived signals are what the assertions exercise.
 */
function voicedMsFor(kind: string): number {
  return kind === 'silence' ? 0 : 8000
}

describe('coverage gate on the measured fixture signatures', () => {
  const table = entries.map((entry) => {
    const assessment = computeCoverageAssessment(
      entry.expectedText,
      entry.decodes,
      voicedMsFor(entry.kind),
    )
    const decision = gate.assess(makeRequest(entry.expectedText), assessment)
    return { entry, assessment, decision }
  })

  it('prints the calibration table (documentation, always passes)', () => {
    for (const { entry, assessment, decision } of table) {
      const reason = decision.status === 'insufficient' ? decision.reason : '-'
      console.log(
        `${entry.kind.padEnd(13)} ${entry.clipId.padEnd(26)} ` +
          `exp=${String(assessment.expectedSegments).padStart(3)} ` +
          `dec=${String(assessment.decodedSegments).padStart(3)} ` +
          `cov=${String(assessment.coveredSegments).padStart(3)} ` +
          `run=${String(assessment.longestCoveredRun).padStart(3)} ` +
          `-> ${decision.status} ${reason}`,
      )
    }
    expect(table.length).toBe(entries.length)
  })

  it('admits every correctly-paired real clip to scoring', () => {
    for (const { entry, decision } of table) {
      if (entry.kind !== 'correct-pair') continue
      expect(decision.status, `${entry.clipId} should be scored`).toBe(
        'sufficient',
      )
    }
  })

  it('admits stopped-partway audio to scoring (the tail must abstain, not deviate)', () => {
    const truncated = table.filter(({ entry }) => entry.kind === 'truncated')
    expect(truncated.length).toBeGreaterThan(0)
    for (const { decision } of truncated) {
      expect(decision.status).toBe('sufficient')
    }
  })

  it('refuses silence as no speech', () => {
    const silence = table.filter(({ entry }) => entry.kind === 'silence')
    expect(silence.length).toBeGreaterThan(0)
    for (const { decision } of silence) {
      expect(decision.status).toBe('insufficient')
      if (decision.status === 'insufficient') {
        expect(decision.reason).toBe('no-speech-detected')
      }
    }
  })

  it('refuses noise as unclear audio, not as wrong text', () => {
    const noise = table.filter(({ entry }) => entry.kind === 'noise')
    expect(noise.length).toBeGreaterThan(0)
    for (const { decision } of noise) {
      expect(decision.status).toBe('insufficient')
      if (decision.status === 'insufficient') {
        expect(decision.reason).toBe('audio-unclear')
      }
    }
  })

  it('labels every wrong-text refusal as expected-text-not-heard', () => {
    for (const { entry, decision } of table) {
      if (entry.kind !== 'wrong-text') continue
      expect(decision.status).toBe('insufficient')
      if (decision.status === 'insufficient') {
        expect(decision.reason).toBe('expected-text-not-heard')
      }
    }
  })

  it('refuses every wrong-text pairing — the 32/32 false-deviation case', () => {
    const wrongText = table.filter(({ entry }) => entry.kind === 'wrong-text')
    expect(wrongText.length).toBeGreaterThanOrEqual(3)
    for (const { entry, decision } of wrongText) {
      expect(
        decision.status,
        `${entry.clipId} vs foreign text must not be scored`,
      ).toBe('insufficient')
    }
  })

  it('separates stopping partway from a whole-content mismatch', () => {
    const truncated = table.find(({ entry }) => entry.kind === 'truncated')
    const wrongText = table.find(({ entry }) => entry.kind === 'wrong-text')
    expect(truncated && wrongText).toBeTruthy()
    expect(truncated!.assessment.longestCoveredRun).toBeGreaterThan(
      wrongText!.assessment.longestCoveredRun,
    )
  })

  it('treats an empty expected text as analyzer-unavailable', () => {
    const assessment = computeCoverageAssessment('', ['क'], 5000)
    const decision = gate.assess(makeRequest(''), assessment)
    expect(decision.status).toBe('insufficient')
    if (decision.status === 'insufficient') {
      expect(decision.reason).toBe('analyzer-unavailable')
    }
  })

  it('treats no decoded units as no speech even with voiced audio', () => {
    const assessment = computeCoverageAssessment(
      entries[0].expectedText,
      ['', '', '', ''],
      5000,
    )
    const decision = gate.assess(
      makeRequest(entries[0].expectedText),
      assessment,
    )
    expect(decision.status).toBe('insufficient')
    if (decision.status === 'insufficient') {
      expect(decision.reason).toBe('no-speech-detected')
    }
  })
})
