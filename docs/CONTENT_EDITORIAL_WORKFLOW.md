# Content editorial workflow

This workflow applies to slokas, translations, stories, cultural notes,
activities, illustrations, and audio metadata. It prevents draft material from
being presented as authoritative. It does not replace review by qualified
language, cultural, religious-tradition, pronunciation, accessibility, and
child-safety specialists.

## Status model

```ts
type ContentStatus = 'draft' | 'editorial-review' | 'approved'

interface EditorialMetadata {
  status: ContentStatus
  reviewer?: string
  reviewedAt?: string
  sourceTradition?: string
  sourceReferences?: string[]
  variationNotes?: string[]
}
```

- `draft`: authoring work; visible only in development or an editorial tool.
- `editorial-review`: complete enough to review, but not approved for a public
  learning path. Development builds must visibly label it as unreviewed.
- `approved`: all required reviews are recorded for this exact content version.

Status belongs to a version. Editing approved source text, meaning, narration,
or learning intent creates a new draft; approval does not silently carry over.

## Review sequence

1. **Draft creation**
   - Keep structured content separate from React components.
   - Record the source tradition, source references, intended age band, author,
     and known variants.
   - Use respectful, non-exclusionary wording and avoid claims that one version
     is universally definitive.
2. **Translation review**
   - Translate meaning and educational prose, never replace a Sanskrit sloka
     with a different prayer.
   - A native reviewer checks accuracy, reading level, names, honorifics, and
     fallback behavior in every supported language.
   - Missing translations must fall back honestly; machine or draft text must
     not be labeled reviewed.
3. **Cultural and tradition review**
   - A qualified reviewer checks people, places, sequence, values framing,
     iconography, and source-tradition context.
   - Conflicting traditions remain distinct. Do not splice them into a single
     account without an explicit comparative explanation and review.
4. **Pronunciation and audio review**
   - Review Sanskrit text, segmentation, transliteration, pauses, and every
     canonical or slow-teaching recording.
   - Human canonical recordings take priority. Generated and Suno-produced
     assets remain draft until their exact file and checksum are approved.
5. **Child-safety and learning-design review**
   - Check age suitability, emotional intensity, choices, feedback, privacy,
     accessibility, and whether activities can be completed without audio,
     color, drag-and-drop, or a microphone.
   - Avoid guilt, fear, religious coercion, and claims of spiritual reward for
     product engagement.
6. **Final approval**
   - Confirm required reviewers, dates, source notes, asset checksums, tests,
     and production visibility rules.
   - Change status to `approved` only through an auditable content change.

## Versioning and release gates

- Give every reviewed content unit and audio asset a monotonically increasing
  version. Persist stable IDs; do not use titles as identifiers.
- Store review metadata with the content or manifest entry reviewed.
- Production builds may expose `approved` content. Unapproved chapters must be
  hidden or shown as “Coming soon”; a development build may show them with a
  prominent review warning.
- A checksum change invalidates audio approval until the new file is reviewed.
- Localization fallback must never upgrade the fallback text's review status.

## Corrections

1. Record the report, affected IDs and versions, severity, and source.
2. Hide or downgrade unsafe or materially inaccurate content immediately.
3. Create a corrected draft without erasing the prior review history.
4. Repeat every affected review stage.
5. Publish a new version and document the correction in release notes.
6. Verify cached/offline clients receive the corrected manifest and asset.

Urgent child-safety or privacy corrections do not wait for the normal content
release cadence.

## Pull-request checklist

- Structured content and editorial metadata are present.
- Source tradition and known variations are explicit.
- All six language paths have reviewed text or an honest fallback.
- Sanskrit text and audio were not silently normalized.
- Activities are age-appropriate and keyboard accessible.
- Draft/editorial-review content is production-gated.
- Relevant tests, manifest checks, and documentation are updated.

