# DECISIONS.md — Sloka Steps Version 1

Product and engineering decisions made where the specification left room for
judgment. None of these affect product safety or correctness guarantees.

## Architecture

1. **Scaffold written directly, not via `npm create vite`.** The interactive
   scaffolder can misbehave in a non-empty directory and prompts for input;
   the equivalent template files (Vite 6 + React 19 + TS strict, same
   tsconfig layout as the official `react-ts` template) were written
   explicitly into the project root so nothing could land in a nested folder.
2. **Language and daily goal live in `UserSettings`, not `ChildProfile`.**
   Setup collects them together, but they are settings a parent may change
   later; keeping one source of truth avoids sync bugs. `ChildProfile` holds
   `displayName` and `ageRange` only.
3. **`lastCompletion` is runtime-only state.** The completion screen reads
   the result of the just-finished lesson from memory; it is intentionally
   excluded from the persisted schema, so a refresh on `/complete/:id`
   safely redirects to the learning path.
4. **Reducer imports static content.** Unlock/award guards live inside the
   reducer (`isLessonEnterable`) so no action — including hand-crafted
   ones — can complete a locked or coming-soon lesson. Content is static
   typed data, so this stays pure and testable.
5. **The `completion` activity is a marker, not a screen.** The engine
   dispatches `COMPLETE_LESSON` from the final interactive step's button
   handler (never from an effect, avoiding StrictMode double-dispatch) and
   navigates to `/complete/:slokaId`, which renders the celebration.
6. **Estimated minutes: 1 minute per finished activity.** A deliberately
   simple, surveillance-free approximation for the daily goal
   (`ESTIMATED_MINUTES_PER_ACTIVITY` in `src/utils/rewards.ts`).
7. **Practice completions count as streak-qualifying.** The same-day rule
   already prevents inflation (multiple completions on one day never
   increment twice), and punishing practice would contradict the
   encouragement-first design.
8. **History capped at 100 entries** to bound localStorage growth; the
   dashboard shows the latest 20.

## Content and localization

9. **Match pairs are whole lines.** Each line's transliteration matches its
   child-friendly line meaning — big touch targets and age-appropriate
   difficulty for 4–10.
10. **Fill-blank distractors are hand-picked** per sloka from other words of
    the same sloka (always 3 options), so options are plausible but fair.
11. **UI translation coverage:** all six languages fully cover the required
    navigation/control keys plus common lesson strings (~50 keys each);
    longer prose (privacy page, some parent-area text) intentionally falls
    back to English and is flagged in the Parent Area notice. All non-English
    packs are marked `prototype-draft`.
12. **Sloka meanings ship in English (all 8) and Hindi (the 6 interactive
    lessons).** Telugu, Kannada, Tamil, and Marathi meanings fall back to
    English pending qualified review — honest fallback was preferred over
    machine-quality translations of religious content.
13. **No regional-script (Telugu/Kannada/Tamil) renderings of the Sanskrit
    text ship in V1.** The data model supports them (`regionalScripts`), but
    generating them mechanically risks errors in sacred text. The UI shows
    the documented fallback notice instead.
14. **Badge names are English-only in V1** (proper-noun-like reward names);
    localizing them is listed for the content-review pass.
15. **Theme strings are English-only in V1**; the meaning card carries the
    localized substance of each lesson.

## Audio

16. **Speech synthesis uses the `hi-IN` voice** as the closest widely
    available approximation for Devanagari-based text, clearly labeled in
    the UI as "a simple computer voice, not a Sanskrit teacher."
17. **Repeat/full-chant steps gate Continue on a recording attempt** (per
    spec) but any microphone error or unsupported browser unlocks
    Continue/finish immediately — recording can never block a lesson.
18. **Recording playback uses a custom button over an `Audio` element**
    (consistent, child-sized controls) rather than native `<audio controls>`.

## Design

19. **Primary action color is deep teal** (contrast ≥ 4.5:1 with white
    text); saffron is reserved for accents, stars, and progress. The palette
    follows the suggested warm cream / saffron / teal / sky / lavender /
    lotus scheme with an added soft leaf green for success states.
20. **Fonts are system stacks** (Nirmala UI ships with Windows and covers
    Devanagari, Telugu, Kannada, and Tamil; Noto Sans fallbacks elsewhere).
    No runtime font downloads, per the privacy guardrail.
21. **Desktop layout centers a tablet-width column (max-w-3xl)** over soft
    radial background decoration, so the app never looks like a bare mobile
    strip on a large screen.
