import type { AgeBand } from './state'
import type { AudioLanguage } from './audio'

/** A reference may represent spoken recitation or one of several melodic traditions. */
export type RecitationStyle =
  | 'plain-recitation'
  | 'melodic-sloka'
  | 'vedic-chant'
  | 'teacher-specific'

export interface ChantReference {
  id: string
  slokaId: string
  name: string
  teacherName?: string
  traditionLabel?: string
  recitationStyle: RecitationStyle
  audioUrl: string
  slowAudioUrl?: string
  waveformDataUrl?: string
  pitchContourUrl?: string
  alignmentDataUrl?: string
  version: number
  reviewStatus:
    | 'draft'
    | 'pronunciation-review'
    | 'cultural-review'
    | 'approved'
    | 'rejected'
}

/**
 * How a result was produced. Only a scored provenance may carry detail — the
 * result union below makes every other provenance structurally incapable of
 * holding one, so a placeholder cannot invent feedback even by mistake.
 */
export type EvaluationProvenance =
  | 'participation-only'
  | 'simulated'
  | 'unavailable'
  /** Measured against an approved audio reference, forced-alignment style. */
  | 'analyzed'
  /** Checked against the reference text only; no audio reference involved. */
  | 'verified'

/**
 * Provenances permitted to carry measured detail. Adding a member here is a
 * safety decision, not a refactor: it is the single place that says results of
 * this kind may hold segments. Everything else is unscored by derivation.
 */
export type ScoredProvenance = 'analyzed' | 'verified'

/** Derived, so the scored and unscored sets can never drift apart. */
export type UnscoredProvenance = Exclude<EvaluationProvenance, ScoredProvenance>

export type ChantEvaluationMode =
  | 'completeness'
  | 'pronunciation'
  | 'rhythm'
  | 'melody'

/** Summary axes. Audio quality is always assessed; the rest are requested. */
export type EvaluationDimension = ChantEvaluationMode | 'audio-quality'

export type SegmentKind = 'syllable' | 'word'

/**
 * One finding from the pronunciation error taxonomy. `code` is owned and
 * versioned by the analyzer named in `analyzerId`, so the taxonomy can grow
 * without a change to this contract.
 */
export interface SegmentObservation {
  code: string
  /** 0–1 confidence in this specific observation. */
  confidence: number
}

/**
 * Why an analyzer reached the verdict it did, in integer counts.
 *
 * Deliberately not a ratio. `matched` over `decodes` is not an accuracy and
 * must never be rendered as a percentage: the decode variants are re-readings
 * of one encoder pass, not independent samples, so they can agree by chance and
 * the counts do not support a probability. Real-audio testing saw exactly that
 * — pure noise still produced two spuriously matched units out of 32
 * (`research/pronunciation-ai/10`).
 */
export interface SegmentEvidence {
  /** How many decode variants were compared for this attempt. */
  decodes: number
  /** How many of them delivered the expected unit at this position. */
  matched: number
  /** What the non-matching decodes delivered instead, in decode order. */
  heard: string[]
}

/**
 * One aligned unit of the reference text, positioned against the child's
 * recording.
 *
 * This is the tier a forced aligner fills in, and the tier the error taxonomy
 * attaches to. Dimension scores are summaries computed over these segments —
 * never the other way around, so detail is never lost before it is stored.
 */
interface SegmentBase {
  /** Position in the reference segmentation, stable across attempts. */
  index: number
  /** The reference unit as displayed — Devanagari or transliteration. */
  label: string
  kind: SegmentKind
  /** Milliseconds from the start of the child's recording. */
  startMs: number
  endMs: number
  /** 0–1 alignment confidence; low values mean the timing is unreliable. */
  confidence: number
  /** Kept so a parent surface can show why, and not only what. */
  evidence?: SegmentEvidence
}

/** The analyzer is willing to commit to a verdict for this segment. */
export interface AssessedSegment extends SegmentBase {
  status: 'assessed'
  /**
   * What the analyzer observed, categorically. `matched` means the decodes
   * agreed with the reference here — an observation about the decode, not a
   * certification that the child pronounced it correctly.
   */
  outcome: 'matched' | 'deviation'
  /**
   * 0–1, and set ONLY by an analyzer that measures a continuous quantity, such
   * as goodness-of-pronunciation against an approved recording. An analyzer
   * that compares decodes against reference text must omit it: it has no scalar
   * to report, and dividing its evidence counts would invent one.
   */
  accuracy?: number
  /** Empty when the segment carried no taxonomy findings. */
  observations: SegmentObservation[]
}

/**
 * The analyzer abstains on this segment, and abstention is expected to be
 * common rather than exceptional. Every verdict-bearing field is typed `never`
 * for the same reason `UnscoredChantEvaluation` types `dimensions` and
 * `segments` that way: an abstention must be structurally incapable of carrying
 * a judgement, not merely conventionally free of one.
 */
export interface UnclearSegment extends SegmentBase {
  status: 'unclear'
  outcome?: never
  accuracy?: never
  observations?: never
}

export type SegmentScore = AssessedSegment | UnclearSegment

export type DimensionStatus = 'great' | 'good-practice' | 'try-again'

export interface DimensionScore {
  status: DimensionStatus
  /** 0–1. */
  score: number
  /** 0–1. */
  confidence: number
  message: string
}

/** Why an evaluation could not be produced. Enumerated, never free text. */
export type UnavailableReason =
  /** Essentially no voiced audio was present. */
  | 'no-speech-detected'
  /** Too little audio to attempt anything at all. */
  | 'recording-too-short'
  /** Voiced audio, but no coherent recitation could be made out. */
  | 'audio-unclear'
  /** Clear speech that did not correspond to the expected text. */
  | 'expected-text-not-heard'
  /** The analyzer itself is not ready — not loaded, or not enabled. */
  | 'analyzer-unavailable'

/**
 * What a coverage check measured, in integer counts and milliseconds.
 *
 * This exists because per-segment scoring is only safe on input that actually
 * corresponds to the expected text. Real-audio testing of the text-verification
 * technique found that unmatched input is not merely unhelpful but actively
 * harmful: correctly recited audio compared against a different sloka's text
 * produced a deviation on 32 of 32 units with no abstention at all, and silence
 * and noise each produced deviations on roughly an eighth of units
 * (`research/pronunciation-ai/10`, measured on 16 adult clips — not children,
 * and not a validated product figure).
 *
 * The failure signatures those tests produced are what these fields are shaped
 * to separate:
 *
 * - silence — no voiced audio, nothing decoded, nothing covered
 * - noise — voiced audio, little decoded, a unit or two covered by chance
 * - wrong text — voiced audio, plenty decoded, nothing covered
 * - stopping partway — a contiguous prefix covered, the remainder simply absent
 *
 * The last of those is the one case that must still be scored. A child who
 * stops partway is ordinary, and the technique handles it well: the missing
 * tail resolves to abstention rather than to deviations. `longestCoveredRun` is
 * what separates it from the rest, so it must not be gated out with them.
 */
export interface CoverageAssessment {
  /** Units the expected text was segmented into. */
  expectedSegments: number
  /** Units the decode produced, whatever they turned out to be. */
  decodedSegments: number
  /** Expected units the decode accounted for, anywhere in the recording. */
  coveredSegments: number
  /** Longest run of consecutive expected units that were covered. */
  longestCoveredRun: number
  /** Voiced audio detected, in milliseconds. */
  voicedMs: number
  /** Least voiced audio this expected text could plausibly occupy. */
  expectedMinimumVoicedMs: number
}

export type CoverageDecision =
  | { status: 'sufficient'; assessment: CoverageAssessment }
  | {
      status: 'insufficient'
      assessment: CoverageAssessment
      reason: UnavailableReason
    }

/**
 * Applies coverage policy to an already-measured assessment.
 *
 * Measuring coverage needs the decode, so an analyzer produces the
 * `CoverageAssessment`; deciding what it means is separate, synchronous, and
 * pure. Splitting them keeps the thresholds — which are tuning parameters, not
 * constants, and have to be tuned against a labelled corpus — testable on their
 * own, without a model and without audio.
 *
 * An analyzer must apply this before any per-segment work and, on
 * `insufficient`, return an unscored `unavailable` result carrying the reason.
 * It must not fall through to scoring.
 */
export interface ChantCoverageGate {
  assess(
    request: ChantEvaluationRequest,
    assessment: CoverageAssessment,
  ): CoverageDecision
}

interface ChantEvaluationBase {
  evaluationVersion: string
  /** Null while no approved reference recording exists for the sloka. */
  referenceId: string | null
}

/**
 * No analysis was performed. `dimensions` and `segments` are typed `never` so
 * that participation, simulated, and unavailable results cannot carry a score.
 */
export interface UnscoredChantEvaluation extends ChantEvaluationBase {
  provenance: UnscoredProvenance
  /** Translation key for child-facing text — encouragement, never a judgement. */
  childMessageKey: string
  /** Parent-facing plain text stating that no analysis took place. */
  parentSummary: string
  /** Only meaningful when `provenance` is `unavailable`. Carries no score. */
  unavailableReason?: UnavailableReason
  dimensions?: never
  segments?: never
}

/**
 * Produced only by a validated analyzer. No implementation may return this
 * shape until its scoring has been reviewed by qualified Sanskrit educators.
 */
export interface AnalyzedChantEvaluation extends ChantEvaluationBase {
  provenance: 'analyzed'
  /** A scored result is always measured against a specific reference. */
  referenceId: string
  /** Identifies the analyzer and the taxonomy version its codes belong to. */
  analyzerId: string
  recordingDurationMs: number
  dimensions: Partial<Record<EvaluationDimension, DimensionScore>>
  segments: SegmentScore[]
  /** Already-localized child-facing prose from the tutor layer. */
  childSummary: string
  parentSummary: string
}

/**
 * Produced only by a validated analyzer that compares the recording against the
 * reference TEXT rather than against an approved recording. It abstains
 * wherever it is unsure, and it may only be built for input that passed a
 * coverage check. As with `AnalyzedChantEvaluation`, no implementation may
 * return this shape until its thresholds have been tuned and reviewed by
 * qualified Sanskrit educators.
 */
export interface VerifiedChantEvaluation extends ChantEvaluationBase {
  provenance: 'verified'
  /**
   * Always null. The reference here is the expected text, not a recording; a
   * reference id would let a surface claim the child was measured against a
   * named teacher, which a text comparison cannot support.
   */
  referenceId: null
  /** Identifies the analyzer and the taxonomy version its codes belong to. */
  analyzerId: string
  recordingDurationMs: number
  /** The coverage this result was permitted on. Required, so it cannot be skipped. */
  coverage: CoverageAssessment
  segments: SegmentScore[]
  /**
   * Rhythm and melody are not meaningful without an audio reference, so they
   * are excluded here rather than left to convention.
   */
  dimensions: Partial<
    Record<'completeness' | 'pronunciation' | 'audio-quality', DimensionScore>
  >
  /** Already-localized child-facing prose from the tutor layer. */
  childSummary: string
  parentSummary: string
}

export type ScoredChantEvaluation =
  | AnalyzedChantEvaluation
  | VerifiedChantEvaluation

export type ChantEvaluationResult =
  | UnscoredChantEvaluation
  | ScoredChantEvaluation

/**
 * The guard a rendering surface should use before treating a result as
 * encouragement. `isAnalyzedEvaluation` answers a narrower question and stopped
 * being the right one the moment a second scored provenance existed.
 */
export function isScoredEvaluation(
  result: ChantEvaluationResult,
): result is ScoredChantEvaluation {
  return result.provenance === 'analyzed' || result.provenance === 'verified'
}

export function isAnalyzedEvaluation(
  result: ChantEvaluationResult,
): result is AnalyzedChantEvaluation {
  return result.provenance === 'analyzed'
}

export function isVerifiedEvaluation(
  result: ChantEvaluationResult,
): result is VerifiedChantEvaluation {
  return result.provenance === 'verified'
}

export interface ChantEvaluationRequest {
  recording: Blob
  /** Null when practice is not tied to a catalogued sloka. */
  slokaId: string | null
  referenceId: string | null
  /** Reference text the recording is aligned against. */
  expectedText: string
  language: AudioLanguage
  ageBand: AgeBand
  evaluationModes: ChantEvaluationMode[]
}

/**
 * The single evaluation contract. Participation-only encouragement and a future
 * validated analyzer implement the same interface, so the call site never has
 * to know which one is registered.
 */
export interface ChantEvaluationService {
  evaluate(request: ChantEvaluationRequest): Promise<ChantEvaluationResult>
}
