# 07 — Interface impact: what would `ChantEvaluationResult` need to carry a verification-based result?

_Dated 2026-08-30. Research-analyst. Assessed against the CURRENT contract in `src/types/chant.ts` (uncommitted refactor in the working tree, not the old `src/types/services.ts` shapes)._

---

## Verdict box

| | |
|---|---|
| **What I set out to assess** | What `ChantEvaluationResult` would need to represent a "verify against known text" result — specifically, `SegmentScore.accuracy` is a bare `number` with no way to say **abstain / unclear**, which is the core of the recommended approach. Additive or breaking? |
| **What I actually did** | Read the current `src/types/chant.ts`, `pronunciation.ts`, `chantEvaluation.ts`, `RecorderPanel.tsx`, `chantSafety.test.tsx`; grepped for every consumer of `SegmentScore` / `AnalyzedChantEvaluation` / `.accuracy`. Wrote concrete proposed type shapes. |
| **What I concluded** | Two changes are needed. **(1)** a per-segment `unclear` state — cleanest as a **discriminated `SegmentScore`** or an added required `assessment` field; **strictly "breaking" at the type level but with near-zero real blast radius** — *nothing in the app constructs or reads a `SegmentScore` today.* **(2)** a way to return a scored result with **no audio reference** — `AnalyzedChantEvaluation` currently requires `referenceId: string` (non-null), but verification needs only `expectedText`; this is a genuine mismatch. Adding a `'verified'` provenance is additive-ish; relaxing `referenceId` is breaking. Details + exact shapes below. Adding `'unclear'` to `DimensionStatus` is **additive**. |

---

## Current contract (relevant parts, from `src/types/chant.ts`)

```ts
type EvaluationProvenance = 'participation-only' | 'simulated' | 'unavailable' | 'analyzed'

interface SegmentObservation { code: string; confidence: number }

interface SegmentScore {
  index: number
  label: string
  kind: 'syllable' | 'word'
  startMs: number
  endMs: number
  accuracy: number          // 0–1  <-- no way to say "abstain"
  confidence: number        // 0–1 ALIGNMENT confidence (timing reliability)
  observations: SegmentObservation[]
}

type DimensionStatus = 'great' | 'good-practice' | 'try-again'
interface DimensionScore { status: DimensionStatus; score: number; confidence: number; message: string }

interface AnalyzedChantEvaluation extends ChantEvaluationBase {
  provenance: 'analyzed'
  referenceId: string       // <-- NON-null required; a scored result must name an audio reference
  analyzerId: string
  recordingDurationMs: number
  dimensions: Partial<Record<EvaluationDimension, DimensionScore>>
  segments: SegmentScore[]
  childSummary: string
  parentSummary: string
}
```

### Who actually consumes these today (grep, 2026-08-30)

- `SegmentScore`, `DimensionScore`, `AnalyzedChantEvaluation`: **referenced only** in `src/types/chant.ts` (definitions), a **comment** in `src/services/pronunciation.ts`, and `src/test/chantSafety.test.tsx` (a `@ts-expect-error` fixture + `expect(result.segments).toBeUndefined()`).
- The only runtime code that touches an evaluation result is `RecorderPanel.tsx`, via `isAnalyzedEvaluation(result)` — and it deliberately renders **nothing** for an analyzed result (`isAnalyzedEvaluation(result) ? null : result.childMessageKey`).
- **No implementation returns `AnalyzedChantEvaluation`. No code reads `.accuracy`, `.segments`, or `.dimensions`.**

**Consequence:** every change below is "breaking" only in the pure TypeScript sense (it changes an exported type's shape). The **practical** blast radius is the one test fixture. That is worth stating loudly because it means the contract can be gotten right *now*, cheaply, before an analyzer exists.

---

## Problem 1 — `SegmentScore` cannot express "unclear"

The recommended approach (`04`) emits, per syllable, one of **correct / incorrect / unclear**, and `unclear` is the **majority** bucket by design. `accuracy: number` can't hold that: `0` reads as "totally wrong", `0.5` as "half right", `null`/`NaN` breaks the type and every `.toFixed()` downstream. `confidence` is the wrong field — its doc comment says it's *alignment* confidence (is the timing reliable), not *assessment* confidence (are we sure this is right/wrong).

### Option 1A — add a required discriminant field _(breaking at type level; ~zero real cost)_

```ts
/** What the analyzer is willing to say about this segment. */
export type SegmentAssessment = 'matched' | 'deviation-detected' | 'unclear'

export interface SegmentScore {
  index: number
  label: string
  kind: SegmentKind
  startMs: number
  endMs: number
  assessment: SegmentAssessment          // NEW — required
  /** Only meaningful when assessment !== 'unclear'. Omitted on abstain. */
  accuracy?: number                       // was `number`; now optional
  confidence: number
  observations: SegmentObservation[]
}
```
- Adding a **required** `assessment` → breaking for any code that builds a `SegmentScore` literal (today: none in app; one fixture in the test).
- Widening `accuracy` to `number | undefined` → breaking for readers (today: none).
- **Recommended if you want to keep `SegmentScore` a single interface.**

### Option 1B — discriminated union on `SegmentScore` _(breaking; most in-house-style)_

```ts
interface SegmentBase {
  index: number
  label: string
  kind: SegmentKind
  startMs: number
  endMs: number
  confidence: number          // alignment/timing confidence — always present
}

export interface AssessedSegment extends SegmentBase {
  status: 'assessed'
  accuracy: number            // 0–1, only ever set here
  observations: SegmentObservation[]
}

export interface UnclearSegment extends SegmentBase {
  status: 'unclear'           // the analyzer abstains on this syllable
  // structurally cannot carry accuracy or observations
}

export type SegmentScore = AssessedSegment | UnclearSegment
```
- Mirrors exactly how `ChantEvaluationResult = UnscoredChantEvaluation | AnalyzedChantEvaluation` already uses the type system to make an unscored result *structurally* incapable of holding a score. An `UnclearSegment` is *structurally* incapable of holding an `accuracy`. Very consistent with the file's existing design intent.
- Breaking (shape change); every read site needs a `status` check (today: none).
- **Recommended if you want the strongest safety guarantee.**

### Option 1C — encode abstain in `observations[]` _(additive-looking, but rejected)_

Reserve `code: 'segment.unclear'` in the taxonomy and leave `accuracy` as-is. Additive to the type **only if `accuracy` were already optional** — it isn't. And semantically wrong: `observations` is the *error-taxonomy* tier ("what kind of mispronunciation"), not the "did we assess this at all" tier. A UI that forgets to scan `observations` for the magic code renders a real-looking `accuracy: 0` for an abstention — the precise failure mode the project forbids. **Do not use.**

### Option 1D — keep `accuracy` required, add optional `assessment` _(additive; also rejected)_

Additive, non-breaking. But a consumer that reads `.accuracy` without checking `.assessment` shows fake precision on an abstain. The safety-by-construction ethos of this file (`dimensions?: never`) argues against any shape where forgetting a check produces a fabricated score. **Do not use.**

---

## Problem 2 — a verification result has **no audio reference**

`AnalyzedChantEvaluation.referenceId: string` is **non-null and required**, with the doc comment _"A scored result is always measured against a specific reference."_ That assumption is **audio-reference-centric** (GOP / forced-alignment against an approved teacher recording). The recommended approach measures against **`expectedText` only** — which `ChantEvaluationRequest` already carries — and needs **no approved audio reference**. Today **all 9 slokas have `referenceId: null`** (no approved reference recordings exist), so under the current type a verification analyzer literally could not return its result.

### Option 2A — new provenance `'verified'` _(additive union member + new variant)_

```ts
export type EvaluationProvenance =
  | 'participation-only' | 'simulated' | 'unavailable'
  | 'analyzed'      // scored against an approved audio reference (GOP-style)
  | 'verified'      // checked against expectedText only; no audio reference

export interface VerifiedChantEvaluation extends ChantEvaluationBase {
  provenance: 'verified'
  referenceId: string | null           // may be null — text is the reference
  analyzerId: string
  recordingDurationMs: number
  /** Segment-level check is the whole result. */
  segments: SegmentScore[]             // using the Problem-1 shape (1B recommended)
  /** Only completeness / pronunciation make sense here — no rhythm/melody without an audio ref. */
  dimensions: Partial<Record<'completeness' | 'pronunciation' | 'audio-quality', DimensionScore>>
  childSummary: string
  parentSummary: string
}

export type ChantEvaluationResult =
  | UnscoredChantEvaluation
  | AnalyzedChantEvaluation
  | VerifiedChantEvaluation
```
- Adding `'verified'` to the union: **additive** for producers, mildly breaking for any exhaustive `switch (provenance)` — there are none; `isAnalyzedEvaluation` still returns `false` correctly for it.
- New `VerifiedChantEvaluation` variant: **additive** (new union member). `UnscoredChantEvaluation.provenance` uses `Exclude<EvaluationProvenance, 'analyzed'>` — **this would need to become `Exclude<EvaluationProvenance, 'analyzed' | 'verified'>`** so an unscored result can't claim `'verified'`. That one-line change is **breaking-shaped but trivial**.
- Add a guard: `isVerifiedEvaluation(result)`. The existing `chantSafety.test.tsx` invariant (`JSON.stringify(result)` must not match `/"(score|accuracy)"/` for non-analyzed results) **would need updating** — a `'verified'` result legitimately contains `accuracy` on its `AssessedSegment`s. That test currently treats *any* `accuracy` key as a red flag; it would need to allow it under `provenance: 'verified'` (and `'analyzed'`). **This is the single most important downstream edit** and it's in test code, not app code.
- **Recommended.** It keeps "GOP against an approved recording" and "verify against known text" as visibly different things, which matches how the Su-śrotā project itself distinguishes them.

### Option 2B — relax `AnalyzedChantEvaluation.referenceId` to `string | null` _(breaking)_

Smaller diff, but it erases the distinction between "scored against an approved teacher recording" and "checked against text", and it weakens the doc-comment invariant. Breaking for anyone relying on `referenceId` being non-null in the analyzed branch (today: the type itself, and `AnalyzedChantEvaluation` requires it — the test builds a fixture with `referenceId: 'reference-under-review'`). **Not recommended** — the provenance split is more honest.

---

## Problem 3 — dimension-level abstention

`DimensionStatus = 'great' | 'good-practice' | 'try-again'` has no "couldn't assess this dimension." Two ways:

### Option 3A — omit the dimension from the `Partial` record _(no change; already works)_

`dimensions` is `Partial<Record<...>>`. If the analyzer couldn't assess pronunciation, **don't include a `pronunciation` key**. Consumers already must handle absence. **Zero type change.** Slightly implicit ("absent = not assessed").

### Option 3B — add `'unclear'` to `DimensionStatus` _(additive)_

```ts
export type DimensionStatus = 'great' | 'good-practice' | 'try-again' | 'unclear'
```
- **Additive** for producers. For an exhaustive consumer `switch`, adding a union member is technically breaking — but there are **no consumers** and the `DimensionScore` is never rendered today. In practice: additive.
- Slightly more explicit than 3A. Either is fine; 3A costs nothing.

---

## What is already right (no change needed)

- `ChantEvaluationRequest.expectedText: string` — **already present.** The verification approach needs exactly this and nothing more.
- `ChantEvaluationRequest.referenceId: string | null` — **already nullable.** A verification call works with `referenceId: null`.
- `SegmentObservation { code; confidence }` — fine as the home for *error-taxonomy* findings (which retroflex was substituted, etc.), which is a separate concern from correct/incorrect/unclear.
- `analyzerId` + the "taxonomy version its codes belong to" comment — already supports versioning the abstain thresholds and the observation codes without a contract change, exactly as `04`/`05` require (re-tune on every model change).
- The `UnscoredChantEvaluation` `dimensions?: never; segments?: never` guard — keep it; extend the `Exclude<>` to also exclude `'verified'`.

---

## Summary of proposed changes

| # | Change | Label | Real blast radius today |
|---|---|---|---|
| 1B | `SegmentScore` → `AssessedSegment \| UnclearSegment` discriminated union | **breaking** (type shape) | 1 test fixture; 0 app code |
| — | (alt) 1A: add required `assessment`, make `accuracy` optional | **breaking** | same |
| 2A | add `'verified'` provenance + `VerifiedChantEvaluation` variant + `isVerifiedEvaluation` guard | **additive** (new members) | new guard; **update the `chantSafety.test.tsx` "no accuracy key" invariant to allow it under `verified`/`analyzed`** |
| 2A′ | `UnscoredChantEvaluation.provenance: Exclude<EvaluationProvenance, 'analyzed' \| 'verified'>` | breaking-shaped, trivial | 0 |
| 3A | omit un-assessable dimensions from the `Partial` record | **no change** | 0 |
| 3B | (alt) add `'unclear'` to `DimensionStatus` | **additive** | 0 |

**Recommended set:** 1B + 2A + 2A′ + 3A. Net effect: the contract gains a structurally-safe way to abstain per syllable and a distinct, honest provenance for text-only verification, while keeping every existing safety invariant (`analyzed` is still the only GOP-style scored branch; unscored results still `never` carry scores). The one edit that needs care is the test invariant in `src/test/chantSafety.test.tsx` — and per the role boundary, **the research-analyst does not make it**; this report hands it to whoever implements the analyzer.
