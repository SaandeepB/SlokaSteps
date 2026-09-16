# PROPOSAL — changes to the chant evaluation contract

_Dated 2026-09-15. Codebase-engineer. Branch `feature/v2-foundation`._
_Evidence base: `research/pronunciation-ai/` reports `00`, `04`, `05`, `07`, `08`. Nothing here re-derives or re-benchmarks that work._
_Status: **proposal only. No code was written. No file under `src/` was modified.**_

---

## Backend flag (read this first)

**Nothing in this proposal requires a backend, a network call, or any new data
collection.** Every change is a local type definition plus local guard
functions. The `AGENTS.md` / `CLAUDE.md` "no backend without an explicit future
request" rule is not touched, not stretched, and not implicitly lifted anywhere
below. Where a backend would change something, it is called out inline and in
the D2 section — as a consequence to be aware of, never as a dependency.

Two related things this proposal also deliberately does **not** do:

- It adds **no persistence hook**. Per-syllable results are computed and handed
  to the UI; nothing is written to the `sloka-steps:v1` localStorage schema.
  Storing per-segment results against a child profile is `FUTURE_ROADMAP` #4 /
  decision **D6** and is a separate privacy decision, not an implementation
  detail of this contract.
- It adds **no consent field, no retention field, no transport field**. Those
  only become necessary under D2 option (a), which is not proposed.

---

## Summary of what I am proposing

| # | Change | Label | Real cost |
|---|---|---|---|
| **0** | Split `EvaluationProvenance` into `ScoredProvenance` / `UnscoredProvenance`; add `isScoredEvaluation`; repoint 2 call sites | **breaking-shaped, behaviourally inert** | 2 one-line edits |
| **1** | `SegmentScore` → `AssessedSegment \| UnclearSegment` with `outcome` categorical and `accuracy` optional-and-guarded | **breaking** (type shape) | 0 files |
| **2** | New `'verified'` provenance + `VerifiedChantEvaluation` + `isVerifiedEvaluation` | **additive** (new union member) | 0 files, *given change 0* |
| **3** | Coverage gate expressed in the contract (`CoverageAssessment`, `CoverageDecision`, `ChantCoverageGate`), required witness on `VerifiedChantEvaluation` | **additive** | 0 files |
| **4** | Test strategy: `chantSafety.test.tsx:51` **is not modified**; three new assertions added alongside it | **additive** | new test code only |

Recommended set: **0 + 1 + 2 + 3 + 4, in that order.** Change 0 is the one that
makes change 2 cheap; doing 2 before 0 breaks app code.

This refines report `07`'s recommended set (1B + 2A + 2A′ + 3A) in three places,
each flagged below with **[refines 07]** and the reason. I agree with `07`'s
direction throughout; the corrections are to its type mechanics and to one
blast-radius claim that I found to be wrong.

---

## 0 — Prerequisite: separate "scored" from "unscored" provenance

### Why this comes first

`07` §2A notes in passing that `UnscoredChantEvaluation.provenance` must become
`Exclude<EvaluationProvenance, 'analyzed' | 'verified'>` and calls it
"breaking-shaped but trivial, blast radius 0."

**That blast-radius claim is wrong, and I verified it by compiling.** Report `07`
states "0 app code" for the whole change set. Adding a `'verified'` member to
`ChantEvaluationResult` breaks **two existing narrowing sites**, because both
narrow by *excluding `'analyzed'`* and then read `childMessageKey` — a property
that a `VerifiedChantEvaluation` does not have:

- `src/components/audio/RecorderPanel.tsx:74-76`
  ```ts
  isAnalyzedEvaluation(result) ? null : (result.childMessageKey as TranslationKey)
  ```
- `src/test/chantSafety.test.tsx:55-57`
  ```ts
  if (result.provenance === 'analyzed') throw new Error('unreachable')
  return translate('en-IN', result.childMessageKey as TranslationKey)
  ```

Compiled against the proposed union (`tsc --strict --noEmit`, throwaway file,
deleted after):

```
error TS2339: Property 'childMessageKey' does not exist on type 'Unscored | Verified'.
  Property 'childMessageKey' does not exist on type 'Verified'.   (x2)
```

This is a *good* break — the compiler is correctly saying "you have not decided
what the child sees when a scored result arrives." But it must be sequenced, not
discovered. And the underlying bug is that `isAnalyzedEvaluation` is being used
as "is this safe to render as encouragement?", which it silently stops being the
moment a second scored provenance exists.

### Proposed shape — **breaking-shaped, behaviourally inert**

```ts
/**
 * Provenances that may carry measured detail. Everything not listed here is
 * structurally incapable of holding a score (see `UnscoredChantEvaluation`),
 * so adding a member to this union is the single place that decision is made.
 */
export type ScoredProvenance = 'analyzed' | 'verified'

/** Every other provenance. Derived, so the two can never drift apart. */
export type UnscoredProvenance = Exclude<EvaluationProvenance, ScoredProvenance>

export interface UnscoredChantEvaluation extends ChantEvaluationBase {
  provenance: UnscoredProvenance          // was Exclude<..., 'analyzed'>
  childMessageKey: string
  parentSummary: string
  dimensions?: never
  segments?: never
}

export type ScoredChantEvaluation = AnalyzedChantEvaluation | VerifiedChantEvaluation

/**
 * The guard a rendering surface should use. `isAnalyzedEvaluation` answers a
 * narrower question ("was this a GOP-style analysis?") and must not be used to
 * decide whether encouragement text is safe to render.
 */
export function isScoredEvaluation(
  result: ChantEvaluationResult,
): result is ScoredChantEvaluation {
  return result.provenance === 'analyzed' || result.provenance === 'verified'
}
```

**If applied on its own, today, this is a no-op at runtime**: `ScoredProvenance`
is `'analyzed'` alone until change 2 lands, so `isScoredEvaluation` is
extensionally identical to `isAnalyzedEvaluation`. That is exactly why it should
land first and separately — it is a rename with a proof, not a behaviour change.

The two call sites then become, and compile clean (verified):

```ts
// RecorderPanel.tsx
isScoredEvaluation(result) ? null : (result.childMessageKey as TranslationKey)
// chantSafety.test.tsx childText()
if (isScoredEvaluation(result)) throw new Error('unreachable')
```

Note `expectNoScores` at `chantSafety.test.tsx:49-50` (`result.dimensions`,
`result.segments`) needs **no change** — those properties remain readable across
the whole union. Verified by compiling.

---

## 1 — The `unclear` / abstain gap

### Assessment of `07`'s proposal

`07` §1 is right on the substance: `accuracy: number` cannot express abstain,
`confidence` is the wrong field (it is documented as *alignment* confidence),
and option 1C (a magic `observations` code) and 1D (optional `assessment`
alongside a required `accuracy`) both fail because forgetting a check yields a
fabricated number. I agree, and I agree with the choice of **1B, the
discriminated union**, over 1A — it matches the idiom the file already uses.

But `07`'s 1B has two mechanical defects that I confirmed with the compiler.

#### Defect A — `UnclearSegment` as written is **not** structurally score-free

`07` writes `UnclearSegment` by *omitting* `accuracy`, with the comment
"structurally cannot carry accuracy or observations." That is true for a fresh
object literal (excess-property checking) and **false for anything else**.
Compiled:

```ts
const smuggled = { index: 0, label: 'sa', startMs: 0, endMs: 1,
                   confidence: 1, status: 'unclear' as const, accuracy: 0 }
const seg: UnclearSegment_as_written_in_07 = smuggled   // COMPILES. No error.
```

An analyzer that builds a segment record and then narrows it — the normal shape
of a decode-consensus loop — walks straight through. The fix is the idiom the
file already uses for exactly this purpose (`dimensions?: never;
segments?: never`): declare the forbidden properties as `?: never`. With that,
the same assignment errors:

```
error TS2322: Types of property 'accuracy' are incompatible.
  Type 'number' is not assignable to type 'undefined'.
```

There is an honest trade-off here that I want on the record rather than
buried. `accuracy?: never` makes the property *readable* on the union as
`number | undefined` (omitting it entirely would make reads a hard error). I
tested this: under `strict`, `const pct: number = seg.accuracy` still fails, so
a consumer cannot get a number out without an explicit check. The producer-side
guarantee is the one that prevents *invention*, and it is the one `?: never`
buys. This is the same trade-off the contract already accepts for
`dimensions?: never` — which is precisely why `expectNoScores` can read
`result.dimensions` without narrowing. Consistency wins.

#### Defect B — `accuracy: number` on `AssessedSegment` re-creates the problem it was added to solve **[refines 07]**

`07` keeps `accuracy: number` required on `AssessedSegment` and shares that type
with the verified branch. But **the recommended technique produces no accuracy
scalar at all.** From `04`:

> `verify(...) -> [ { index, akshara, label: 'correct'|'incorrect'|'unclear', evidence } ]`
> … **No overall percentage. No number shown to a child.**

and

> it must never turn "3 of 4 decodes" into "75%".

If `AssessedSegment` requires `accuracy: number`, the only value an implementer
has to put there is `matched / decodes` — which is the exact fabrication `04`
forbids, now mandated by the type. The contract would be *requiring* the
invented number.

So the categorical outcome must be a first-class field, and the scalar must be
optional and reserved for an analyzer that genuinely measures a continuous
quantity (GOP-style, `analyzed`).

### Proposed shape — **breaking** (type shape); real cost: 0 files

```ts
/**
 * Integer evidence from decode-consensus, for the parent-facing view and for
 * audit. Deliberately NOT a ratio: `matched / decodes` is not an accuracy and
 * must never be presented as a percentage (research/pronunciation-ai/04, 05).
 */
export interface SegmentEvidence {
  /** How many decode variants were run for this attempt. */
  decodes: number
  /** How many of them delivered the expected unit at this position. */
  matched: number
  /** What the non-matching decodes delivered, in decode order. */
  heard: string[]
}

interface SegmentBase {
  /** Position in the reference segmentation, stable across attempts. */
  index: number
  /** The reference unit as displayed — Devanagari or transliteration. */
  label: string
  kind: SegmentKind
  /** Milliseconds from the start of the child's recording. */
  startMs: number
  endMs: number
  /** 0–1 ALIGNMENT confidence; low values mean the timing is unreliable. */
  confidence: number
  /** Why the analyzer landed where it did. Never rendered as a number. */
  evidence?: SegmentEvidence
}

/** The analyzer is willing to commit to a judgement for this segment. */
export interface AssessedSegment extends SegmentBase {
  status: 'assessed'
  /**
   * Categorical. This is the ONLY judgement a decode-consensus analyzer can
   * make; it never derives a scalar.
   */
  outcome: 'matched' | 'deviation'
  /**
   * 0–1, and set ONLY by an analyzer that measures a continuous quantity
   * (e.g. GOP forced alignment). A decode-consensus analyzer MUST omit it —
   * `matched / decodes` is not an accuracy.
   */
  accuracy?: number
  /** Empty when the segment carried no taxonomy findings. */
  observations: SegmentObservation[]
}

/**
 * The analyzer abstains on this segment — the default and majority bucket by
 * design (04). Typed `never` on every judgement-bearing field for the same
 * reason `UnscoredChantEvaluation` types `dimensions`/`segments` as `never`:
 * an abstention must be structurally incapable of carrying a verdict.
 */
export interface UnclearSegment extends SegmentBase {
  status: 'unclear'
  outcome?: never
  accuracy?: never
  observations?: never
}

export type SegmentScore = AssessedSegment | UnclearSegment
```

### Label and real cost

**Breaking** in the pure type sense — `SegmentScore` gains a required
discriminant and `accuracy` is no longer unconditionally present.

**Real cost: zero files.** Grep (`2026-09-15`, `src/**/*.{ts,tsx}`) finds
`SegmentScore` in `src/types/chant.ts` only, at its definition (line 73) and its
single use site (line 133). The one segment-shaped literal in the repo is
`src/test/chantSafety.test.tsx:82`, and it sits under the `@ts-expect-error` on
line 81 — that directive suppresses every error on the line, and the
`segments?: never` violation keeps firing regardless of the element shape, so
the fixture compiles unchanged either way. Updating it is optional hygiene, not
a required migration.

### Dimension-level abstention

I agree with `07` §3A: `dimensions` is already `Partial<Record<…>>`, so an
un-assessable dimension is simply omitted. **No type change, zero cost.** I do
*not* recommend `07`'s alternative 3B (adding `'unclear'` to `DimensionStatus`)
right now — it creates a second, redundant way to say the same thing, and the
`DimensionScore.score: number` field has the same "what number do I put here?"
problem as Defect B. Revisit it only if a dimension surface is actually
designed; at that point `DimensionScore.score` should get the same
optional-and-guarded treatment.

---

## 2 — The `referenceId` mismatch

### Assessment

The mismatch is real and `07` §2 diagnoses it correctly:

- `AnalyzedChantEvaluation.referenceId: string` is non-null and required, with
  the doc comment *"A scored result is always measured against a specific
  reference."* That invariant is **audio-reference-centric** — it assumes GOP
  against an approved teacher recording.
- The verification technique measures against `expectedText` only, which
  `ChantEvaluationRequest` already carries (line 155), and needs **no audio
  reference whatsoever**.
- Confirmed by grep: no sloka in `src/content/slokas/` declares a reference at
  all (`grep -rn "reference" src/content/slokas/` → no matches), and the only
  runtime construction site passes `referenceId: null`
  (`RecorderPanel.tsx:64`). So under today's contract a verification analyzer
  could not return a result for any sloka in the app.

I agree with `07` §2A (new `'verified'` provenance) over §2B (relaxing
`referenceId` on the analyzed branch). 2B erases a real distinction — "measured
against an approved teacher recording" and "checked against text" are different
claims with different review requirements, and the `ChantReference`
`reviewStatus` machinery in `src/types/chant.ts:24-29` exists to make the first
one auditable. Collapsing them would quietly let a text-check inherit the
credibility of an approved-reference measurement.

### Proposed shape — **additive** (new union member)

```ts
export type EvaluationProvenance =
  | 'participation-only'
  | 'simulated'
  | 'unavailable'
  | 'analyzed'      // measured against an approved audio reference (GOP-style)
  | 'verified'      // checked against expectedText only; no audio reference

/**
 * Produced by a validated verification analyzer: the child's recording is
 * compared against the reference TEXT, not against an approved recording.
 * Carries per-segment detail and an explicit abstention for everything the
 * analyzer is not sure about.
 *
 * No implementation may return this shape until its thresholds have been tuned
 * and reviewed per docs/CHANT_COACH_VALIDATION_PLAN.md.
 */
export interface VerifiedChantEvaluation extends ChantEvaluationBase {
  provenance: 'verified'
  /**
   * Always null. The reference for this result is `expectedText`, not a
   * recording — a non-null value here would let a surface claim the child was
   * measured against a named teacher, which a text check cannot support.
   */
  referenceId: null
  /** Identifies the analyzer and the taxonomy version its codes belong to. */
  analyzerId: string
  recordingDurationMs: number
  /** The coverage check this result passed. See change 3. */
  coverage: CoverageAssessment
  /** The whole result. Abstention is expected to dominate (04). */
  segments: SegmentScore[]
  /**
   * Rhythm and melody are meaningless without an audio reference, so they are
   * excluded at the type level rather than left to convention.
   */
  dimensions: Partial<Record<'completeness' | 'pronunciation' | 'audio-quality', DimensionScore>>
  /** Already-localized child-facing prose from the tutor layer. */
  childSummary: string
  parentSummary: string
}

export type ChantEvaluationResult =
  | UnscoredChantEvaluation
  | AnalyzedChantEvaluation
  | VerifiedChantEvaluation

export function isVerifiedEvaluation(
  result: ChantEvaluationResult,
): result is VerifiedChantEvaluation {
  return result.provenance === 'verified'
}
```

**`referenceId: null` rather than `07`'s `string | null` [refines 07].**
Narrowing a `string | null` base field to `null` in a sub-interface is legal and
costs nothing. It closes the one way this variant could mislead. If the product
later wants to record *which reference the child was chanting along to* — real
context, but not a measurement — that belongs in a distinctly named field
(`accompaniedReferenceId`), never in `referenceId`, so that no surface can read
it as "what we measured against." I am not proposing that field now.

### Label and real cost

**Additive** for producers: a new union member. `isAnalyzedEvaluation` continues
to return `false` for it, correctly. There are no exhaustive
`switch (provenance)` statements in the repo (grep confirms every `provenance`
comparison is an equality check against a single literal).

**Real cost: zero files — but only because change 0 landed first.** Without
change 0, this breaks `RecorderPanel.tsx:76` and `chantSafety.test.tsx:57`, as
compiled above. That is the entire argument for the sequencing.

---

## 3 — The coverage / front gate

### The finding

From `04`:

> With no front gate, silence / wrong sloka / a sibling talking / the reference
> audio played back all flow into per-akṣara scoring and produce "incorrect"
> flags — the exact false-accusation the abstain design exists to prevent, just
> relocated.

and the harness result it rests on: garbage / wrong-sloka input currently yields
**~7 of 16 akṣaras flagged `incorrect`**. `05` step 6 makes the acceptance
criterion explicit: hard negatives must resolve to `unavailable` or `unclear`,
and *any* `incorrect` on them is a protocol failure, not a tuning issue.

### Does the contract need a distinct provenance for this? **No.**

`'unavailable'` already exists, already lives in the unscored branch, and is
already `dimensions?: never; segments?: never` — structurally incapable of
carrying the false flags. It already matches
`docs/CHANT_COACH_ARCHITECTURE.md:32` ("Low confidence returns
`unable-to-evaluate`; it does not guess"). Adding a fifth provenance such as
`'not-assessable'` would duplicate it and give a future surface two things to
handle where one will do.

### But the contract *should* express the pre-check. Here is why.

If the gate lives inside the analyzer as a private early return, then the single
most important safety test we can write for this feature — `05` step 6, "hard
negatives never produce a deviation" — can only be written as an
implementation test against a model that does not exist yet and is blocked on a
corpus that does not exist yet (`B4`, `B5`, `D1`). Naming the gate in the
contract lets that invariant be tested **now**, at contract level, with a fake
gate and no ML at all.

### Proposed shape — **additive**

```ts
/** Why an evaluation could not be produced. Enumerated, never free text. */
export type UnavailableReason =
  | 'coverage-too-low'     // too little of the expected text was recognisable
  | 'recording-too-short'
  | 'no-speech-detected'
  | 'analyzer-unavailable' // model not loaded / feature not ready

export interface UnscoredChantEvaluation extends ChantEvaluationBase {
  provenance: UnscoredProvenance
  childMessageKey: string
  parentSummary: string
  /** Only meaningful when `provenance` is 'unavailable'. Carries no score. */
  unavailableReason?: UnavailableReason
  dimensions?: never
  segments?: never
}

/**
 * Integer counts only. Never divided, never shown as a percentage, and never
 * shown to a child — this exists so a parent view and a test can see WHY the
 * gate decided what it decided.
 */
export interface CoverageAssessment {
  expectedSegments: number
  /** Segments the best decode accounted for. */
  coveredSegments: number
  voicedMs: number
  expectedMinimumMs: number
}

export type CoverageDecision =
  | { status: 'sufficient'; assessment: CoverageAssessment }
  | { status: 'insufficient'; assessment: CoverageAssessment; reason: UnavailableReason }

/**
 * Runs BEFORE any per-segment work. A verification analyzer must call this and
 * return an `unavailable` result on `insufficient` — wrong-sloka, silence, and
 * noise are routed away from scoring, not scored (04, 05 step 6).
 */
export interface ChantCoverageGate {
  assess(request: ChantEvaluationRequest): Promise<CoverageDecision>
}
```

Paired with `VerifiedChantEvaluation.coverage: CoverageAssessment` (required, in
change 2): **a verified result cannot be constructed without having computed
coverage.** That is not full enforcement — it does not prove the decision was
`'sufficient'` — but it converts "remember to gate" from a comment into a
compiler obligation, and it makes the gate's inputs visible to the parent view
and to tests.

### Optional strengthening — a branded witness (your call, not recommended by default)

If you want the type system to prove the gate *passed*, not merely that it ran:

```ts
declare const sufficientCoverage: unique symbol
export interface SufficientCoverage extends CoverageAssessment {
  readonly [sufficientCoverage]: true
}
// VerifiedChantEvaluation.coverage: SufficientCoverage
```

Only the gate module can mint a `SufficientCoverage`, so a verified result
becomes unconstructible without a passing gate. It is genuinely stronger. It is
also more type machinery than anything currently in this codebase, and it makes
test fixtures awkward. I am flagging it rather than recommending it — **decide
this one explicitly.**

---

## 4 — The test assertion at `src/test/chantSafety.test.tsx:51`

```ts
expect(JSON.stringify(result)).not.toMatch(/"(score|accuracy)"/)
```

### What this assertion actually protects

It is a **runtime backstop behind the compile-time `never` guard**. The type
system stops a score at the top level of a known shape; the serialized-form
regex catches a score smuggled in anywhere — nested inside an object the types
do not see, added by a spread, arriving through a widened assignment. It is the
belt to the type system's braces, and it is the thing standing between a
placeholder service and a fabricated number reaching a child.

Loosening it — `if (result.provenance !== 'verified')`, or dropping `accuracy`
from the regex — would remove the backstop from the branch that most needs it,
precisely as the first real analyzer arrives. That must not happen.

### Recommendation: **do not modify line 51. At all.**

Two facts make this possible:

**Fact 1 — `expectNoScores` is never called on a scored result.** Its three call
sites (lines 97, 120, 132) pass results from `ParticipationEvaluationService`,
`MockChantEvaluationService`, and `LocalPitchEvaluationService`, all of which
return `UnscoredChantEvaluation` and always will. A `VerifiedChantEvaluation`
never reaches this helper. The helper's own first line
(`expect(result.provenance).not.toBe('analyzed')`) should gain a sibling
`expect(isScoredEvaluation(result)).toBe(false)` so that routing a scored result
here fails loudly rather than silently — that is a **strengthening**, and it is
an addition, not an edit to line 51.

**Fact 2 — under the shape proposed in change 1, a `verified` result contains no
`accuracy` key at all.** This is the part of the brief I want to answer head-on.
The premise "a `verified` result legitimately contains `accuracy`" is true of
report `07`'s shape, where `AssessedSegment.accuracy: number` is required and
shared with the verified branch. It is **not** true of the shape I propose,
because `04` is explicit that decode-consensus yields no scalar:

> No overall percentage. No number shown to a child. … it must never turn
> "3 of 4 decodes" into "75%".

`accuracy` stays reserved for a GOP-style continuous measurement, i.e. the
`analyzed` branch — which has no implementation, is gated behind the full
validation plan, and is not what this proposal enables. **The cleanest way to
handle a test that a new type would break is to design the type so it does not
break the test.** That is not a coincidence; the test encoded a real property
and the type was the thing that was wrong.

### What to add alongside it — **additive**, new assertions only

```ts
/**
 * The scored counterpart of expectNoScores. A verification result may carry
 * integer evidence, but never a scalar score, and its abstentions must be
 * structurally empty.
 */
function expectNoInventedScores(result: VerifiedChantEvaluation) {
  // Stricter than line 51, not looser: verification has NO accuracy scalar.
  expect(JSON.stringify(result)).not.toMatch(/"(score|accuracy|percent)"/)

  for (const segment of result.segments) {
    if (segment.status !== 'unclear') continue
    // An abstention carries no verdict, in fact as well as in type.
    expect(Object.keys(segment)).not.toContain('outcome')
    expect(Object.keys(segment)).not.toContain('accuracy')
    expect(Object.keys(segment)).not.toContain('observations')
  }
}

/** 05 step 6, as a contract test — runnable today with a fake gate. */
it('routes hard-negative input to unavailable, never to a deviation', async () => {
  // gate returns { status: 'insufficient', reason: 'coverage-too-low' }
  const result = await analyzerWithFakeGate.evaluate(makeRequest())
  expect(result.provenance).toBe('unavailable')
  expect(isScoredEvaluation(result)).toBe(false)
  expectNoScores(result)                 // the UNMODIFIED line-51 helper
})

/** A new provenance cannot silently become unscored. */
it('keeps every provenance classified as scored or unscored', () => {
  const all: EvaluationProvenance[] = [
    'participation-only', 'simulated', 'unavailable', 'analyzed', 'verified',
  ]
  const scored: ScoredProvenance[] = ['analyzed', 'verified']
  expect(all.filter((p) => !scored.includes(p as ScoredProvenance)))
    .toEqual(['participation-only', 'simulated', 'unavailable'])
})
```

Net effect on the safety property: **strictly stronger.** The original
assertion is preserved verbatim and now also guards against mis-routing; scored
results get their own, tighter assertion; and the hard-negative acceptance
criterion from `05` becomes an executable test years before the model exists.

### If you prefer `07`'s shape instead (accuracy shared with `verified`)

Then line 51 does need handling, and the way to do it **without weakening** is a
provenance allowlist plus a compensating structural assertion — never a regex
relaxation:

```ts
/** Provenances permitted to carry a scalar score. Adding a member here is a
 *  safety decision and requires the validation plan to have passed for it. */
const SCORE_BEARING_PROVENANCES: readonly EvaluationProvenance[] = ['analyzed']

function expectNoScores(result: ChantEvaluationResult) {
  expect(SCORE_BEARING_PROVENANCES).not.toContain(result.provenance)
  expect(result.dimensions).toBeUndefined()
  expect(result.segments).toBeUndefined()
  expect(JSON.stringify(result)).not.toMatch(/"(score|accuracy)"/)
}
```

This still keeps `verified` out of the score-bearing set, so it is only a
partial answer — which is itself the argument for change 1's shape.

---

## 5 — Blast radius, verified

Grep run `2026-09-15` over `src/**/*.{ts,tsx}` on `feature/v2-foundation`.

| Symbol | Occurrences | Where |
|---|---|---|
| `SegmentScore` | 2 | `src/types/chant.ts:73` (definition), `:133` (use in `AnalyzedChantEvaluation`) |
| `DimensionScore` | 2 | `src/types/chant.ts:92` (definition), `:132` (use) |
| `SegmentObservation` | 2 | `src/types/chant.ts:59`, `:87` |
| `DimensionStatus` | 2 | `src/types/chant.ts:90`, `:93` |
| `.segments` / `segments:` | 3 | `src/types/chant.ts:133`; `src/test/chantSafety.test.tsx:50`, `:82` |
| `.dimensions` / `dimensions:` | 2 | `src/types/chant.ts:132`; `src/test/chantSafety.test.tsx:49` |
| `accuracy` | 3 | `src/types/chant.ts:83`; `src/test/chantSafety.test.tsx:51`, `:82` |
| `AnalyzedChantEvaluation` | 4 | `src/types/chant.ts` ×3; a **comment** in `src/services/pronunciation.ts:18` |
| `isAnalyzedEvaluation` | 3 | `src/types/chant.ts:143`; `src/components/audio/RecorderPanel.tsx:7`, `:74` |
| `provenance` (comparisons) | 8 in non-type files | all single-literal equality; **no exhaustive `switch`** |

**Confirmed: no implementation returns `AnalyzedChantEvaluation`. No code reads
`.accuracy`, `.segments`, or `.dimensions` outside the test file.** The three
shipping services (`ParticipationEvaluationService`,
`MockChantEvaluationService`, `LocalPitchEvaluationService`) all return
`UnscoredChantEvaluation`; `ServerChantEvaluationService` rejects without a
network call.

### Real migration cost

| Change | Files that must be edited | Lines |
|---|---|---|
| 0 — scored/unscored split + `isScoredEvaluation` | `src/types/chant.ts`, `src/components/audio/RecorderPanel.tsx`, `src/test/chantSafety.test.tsx` | ~6 |
| 1 — `SegmentScore` union | `src/types/chant.ts` **only** | ~40 (all new/rewritten type decls) |
| 2 — `verified` variant + guard | `src/types/chant.ts` **only** (given 0) | ~35 |
| 3 — coverage gate types | `src/types/chant.ts` **only** | ~35 |
| 4 — tests | `src/test/chantSafety.test.tsx` (**additions only**; line 51 untouched) | ~40 added |

**Total: three files touched, roughly 160 lines, almost all of it new type
declarations in one file.** No component re-renders differently. No service
behaviour changes. `npm.cmd run check` should pass unchanged apart from the new
tests — though I have not run it, because nothing has been implemented.

Where I disagree with `07`: its "0 app code" claim. One app file
(`RecorderPanel.tsx`) genuinely breaks, and only sequencing change 0 first makes
the rest free. Everything else in `07`'s blast-radius analysis I re-ran and
confirmed.

---

## The two open product decisions

### D5 — child-facing surface shows only correct / unclear, never "incorrect"

**Not decided here. Both answers are accommodated by the same contract.**

The asymmetry behind the question is settled evidence, from `05`:

> a design that **abstains** on 60% of syllables and is **never wrong** on the
> 40% it does judge is far more acceptable than one that judges everything and
> is wrong 5% of the time

#### Type layer or presentation layer? — **presentation layer, with a type-level affordance**

Argument for putting it in the type: a presentation-layer convention is
something a future component can forget, and "don't show the child the red one"
is exactly the kind of rule that erodes.

Argument against, which I find decisive: **the parent view legitimately needs
`deviation`.** `05`'s whole design stance is *"the tool points and the user's
ear judges."* If `deviation` cannot exist in the type, the parent view cannot
exist, and the feature's only genuinely useful output is destroyed to protect a
rendering rule. The alternatives are worse: two parallel result types invites
the child one being treated as "the real one"; stripping `deviation` before it
reaches the type throws away evidence the parent needs and makes the result
unauditable.

So the contract states what was measured, honestly and once. But the safe
rendering should be the *easy* one, which is a type-level affordance rather than
a comment:

```ts
/**
 * What a child may be shown. Deliberately narrower than SegmentScore: the
 * child surface consumes this, never `VerifiedChantEvaluation.segments`.
 */
export type ChildSegmentView =
  | { index: number; label: string; status: 'correct' }
  | { index: number; label: string; status: 'unclear' }

/** The single place D5 is decided. */
export function toChildSegmentViews(
  result: VerifiedChantEvaluation,
): ChildSegmentView[]
```

A child component typed against `ChildSegmentView[]` **cannot** receive a
`deviation`, whatever the analyzer produced. The rule is enforced by the
compiler at the boundary; the contract stays honest behind it.

#### What changes under each answer

| | **D5 = yes** (child sees correct / unclear only) | **D5 = no** (child may see a deviation) |
|---|---|---|
| `ChildSegmentView` | 2 members as written above | gains `{ …; status: 'deviation' }` |
| `toChildSegmentViews` | maps `outcome: 'deviation'` → `'unclear'` | maps it through unchanged |
| Translation pack | no child-facing "incorrect" copy is ever written | needs non-judgemental child copy, educator-reviewed |
| `childSummary` | must never imply an error count | may reference a deviation, carefully |
| `05` go/no-go bar | false positives are a **parent-facing** risk | false positives become **child-facing**; the acceptance threshold in `05` step 7 must be set correspondingly harder |
| Parent view | reads `result.segments` directly | unchanged |

**`VerifiedChantEvaluation` is identical under both answers.** D5 is a
one-function change and blocks nothing in changes 0–4. That is the point of
routing it through a projection function rather than through the result type.

### D2 — where inference runs

**Not decided here. Nothing in this proposal presumes an answer, and nothing in
it requires a backend.**

| | **(a) backend** | **(b) deferred** (current) | **(c) on-device** |
|---|---|---|---|
| Changes 0–4 as written | land unchanged | land unchanged | land unchanged |
| Requires lifting the no-backend rule | **Yes — explicitly, per `08`** | No | No |
| Additional contract surface needed | consent state, retention/deletion, transport-error branch, just-in-time notice — **none of which I am proposing** | none | one extra `UnavailableReason` member, `'analyzer-not-loaded'` (already in change 3) |
| `analyzerId` | should encode the server model + taxonomy version | unused | should encode model + **export/quantisation** + taxonomy version — the existing doc comment already supports this |
| Coverage gate | same | same | must be lazily loaded with the model; `'analyzer-not-loaded'` covers the pre-load window |
| `recordingDurationMs`, `SegmentEvidence` | unchanged | unchanged | unchanged |

Per `08`, (b) is the current state and the zero-risk option; (c) is the only
option that adds the capability without new child-data risk, **and its
browser-viable model export is marked unverified in `08` — that is not a settled
fact and nothing here assumes it.** (a) converts the product into one that holds
children's voice recordings on a server and triggers the full COPPA
verifiable-consent + DPDP regime; per `08` that is a product and legal decision,
not an engineering default, and it cannot be a side effect of adopting this
contract.

**Landing changes 0–4 does not commit to any of the three.** They are type
definitions with no implementation; under (b) they simply sit there, correct and
unused, exactly as `AnalyzedChantEvaluation` does today.

---

## Sequencing

| Step | Content | Blocked on | Runtime effect |
|---|---|---|---|
| **1** | Change 0 — scored/unscored split, `isScoredEvaluation`, repoint 2 call sites | nothing | **none** (extensionally identical today) |
| **2** | Change 1 — `SegmentScore` union | step 1 | none (no producer exists) |
| **3** | Change 2 — `verified` provenance + variant + guard | steps 1–2 | none |
| **4** | Change 3 — coverage gate types + required `coverage` witness | step 3 | none |
| **5** | Change 4 — new tests, line 51 untouched | steps 1–4 | test-only |
| **6** | `toChildSegmentViews` + `ChildSegmentView` | **D5** | none until a surface renders it |
| **7** | Any analyzer implementation | **D2**, model access, `D3` licence grant (`06`), `D1` corpus, `docs/CHANT_COACH_VALIDATION_PLAN.md`, educator sign-off | the feature |

Steps 1–5 are safe to land behind `chantCoachEnabled: false` with no behaviour
change whatsoever, and `07` §S4 is right that doing it now is far cheaper than
doing it once an analyzer exists.

**Step 7 is blocked and stays blocked.** Per `00`: `B1`–`B5` are all
unmeasurable today, there is zero audio in the repo, no consented child corpus
exists (`D1`), the Su-śrotā weights have no explicit licence grant (`06`/`D3`),
and no false-positive rate has been measured by anyone, including the upstream
project. Nothing in steps 1–6 should be read as progress toward shipping
pronunciation feedback to a child — it is progress toward the contract being
*able* to carry an honest result if one ever exists.

---

## What I recommend, and what I need decided before implementing

### What I recommend

1. **Adopt changes 0 → 4, in that order, now.** The blast radius is three files
   and one of the five steps has any runtime footprint at all (none of them do).
   Getting this contract right while nothing implements it costs ~160 lines;
   getting it right after an analyzer exists costs a migration plus the risk of
   a fabricated number shipping in the interim.
2. **Take `07`'s direction but not its exact mechanics.** Its two substantive
   findings — `SegmentScore` cannot abstain, and `referenceId` blocks text-only
   verification — are correct and are the reason to act. Its `UnclearSegment`
   does not actually prevent a smuggled score (compiled and confirmed), its
   required `accuracy: number` would *mandate* the `matched / decodes`
   fabrication that `04` forbids, and its "0 app code" blast radius is wrong by
   one app file.
3. **Do not touch `src/test/chantSafety.test.tsx:51`.** Design the `verified`
   shape so it carries no `accuracy`, add a stricter scored-result assertion
   beside the existing one, and add the `05` step-6 hard-negative test.
4. **Keep `'unavailable'` as the gate's output.** No fifth provenance.
5. **Do not implement any analyzer.** Step 7 is blocked on things no amount of
   engineering effort can unblock from inside this repo.

### What I need decided before writing any of it

| | Decision | Default if you don't decide | Blocks |
|---|---|---|---|
| **A** | **D4** — adopt this contract now, or wait for an analyzer? | wait (status quo) | everything below |
| **B** | **D5** — child surface: correct/unclear only, or may show deviation? | — | only step 6 (`toChildSegmentViews`); steps 1–5 proceed either way |
| **C** | **D2** — backend / deferred / on-device? | (b) deferred, per `08` | only step 7; steps 1–6 proceed either way |
| **D** | `VerifiedChantEvaluation.referenceId`: strict `null` (my recommendation) or `07`'s `string \| null`? | strict `null` | change 2 |
| **E** | `accuracy` banned outright on `verified` (my recommendation) or shared with `analyzed` per `07` 1B? | banned | changes 1, 2, 4 — this is what lets line 51 stay untouched |
| **F** | Branded `SufficientCoverage` witness, or plain `CoverageAssessment`? | plain | change 3 |

### What I explicitly do **not** need

- **A backend.** Nothing above requires one, and I am not proposing one. If D2
  resolves to (a), that is a separate decision requiring the explicit lift
  described in `08`, and it would need contract additions (consent, retention,
  transport) that are deliberately absent here.
- **Real audio, or a corpus.** Changes 0–4 are type definitions and compile-time
  tests; they are fully exercisable with zero audio. Real audio and a consented
  child corpus (`D1`) are required for step 7 and only step 7.
- **A legal review.** Not for changes 0–4 — they collect nothing, transmit
  nothing, and persist nothing. A privacy review *is* required before step 7,
  and separately before **D6** (persisting per-segment results against a child
  profile), which this proposal does not enable and does not ask for.
