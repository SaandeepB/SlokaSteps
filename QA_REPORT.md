# QA_REPORT.md — Sloka Steps

> **2026-09-18 addendum — on-device Chant Coach + two new sloka paths.**
> `npm run check` passes end-to-end: `tsc -b` 0 errors, ESLint 0/0, **222
> tests + 1 skipped** across 29 files, production build clean. New coverage:
> the chant analyzer's text/frontend/decode/scoring layers are held
> byte-for-byte to the research checkpoint by committed fixtures; the coverage
> gate is calibrated and pinned against the measured hard negatives; the
> evaluation service's fail-closed reasons and structural honesty are tested
> with injected fakes; the child feedback surface is tested for the two-state
> (never-"wrong") rule.
>
> **This build was driven in a real browser** (Edge, headless, WebGPU) end to
> end: first-run setup → parent gate → enable the on-device chant check → the
> ~235 MB model downloads, caches, and builds a WebGPU session (status
> "ready · webgpu") → Chant Lab analyzes a real held-out Guru Brahma recitation
> against its own text (a `verified` result with per-akṣara evidence) and
> against a *different* sloka's text (the coverage gate refuses with
> `expected-text-not-heard`, no false per-syllable verdicts) → the guided
> line-by-line Chant Coach page renders. The `chantModelParity` suite confirms
> the in-browser numerics match the Python pipeline (84/84 decode variants).
>
> Not done, and not claimed (reserved for people by
> `docs/CHANT_COACH_VALIDATION_PLAN.md`): educator-defined acceptance criteria,
> reviewed reference recordings, a consented child corpus, blind expert ground
> truth, subgroup validation, and legal review. The analyzer is in the plan's
> internal-testing stage, off by default, labelled "in family testing".

---

# QA_REPORT.md — Sloka Steps Version 1

Validation performed on 2026-07-15 (Windows 11, Node v22.21.0, npm 10.9.4).

This report distinguishes **automated validation** (commands actually run,
results observed) from **code-inspection verification** (behavior guaranteed
by reviewed code + covering unit/interaction tests, but not clicked through
in a live browser, which this environment cannot do).

## Automated validation (all actually run, all passing)

| Check | Command | Result |
|---|---|---|
| Type check | `npm run typecheck` (`tsc -b`) | ✅ pass, 0 errors |
| Lint | `npm run lint` (ESLint 9) | ✅ pass, 0 errors, 0 warnings |
| Tests | `npm run test` (Vitest 3) | ✅ 57/57 tests, 9 files |
| Production build | `npm run build` | ✅ pass (index 0.70 kB, CSS 21.72 kB, JS 355.93 kB / 108 kB gzip) |
| Combined gate | `npm run check` | ✅ pass end-to-end |
| Preview server | `npm run preview` + HTTP requests | ✅ `/` → 200 shell, deep route `/lesson/saraswati-namastubhyam` → 200 (SPA fallback), CSS bundle → 200, favicon → 200 |
| Tailwind v4 output | grep of `dist/assets/*.css` | ✅ custom `@theme` tokens (`--color-saffron-500`, `--font-devanagari`, keyframes) present in emitted CSS |

The only stderr in the test run is the i18n engine's intentional dev-mode
fallback warnings — the exact behavior the spec requires (warn, fall back
to English, never render raw keys).

### What the 57 tests cover

- **Persistence**: empty storage → defaults; valid state round-trips;
  corrupted JSON → defaults; unsupported schema version → defaults;
  field-level sanitization; reset removes only `sloka-steps:v1`.
- **Profile/setup**: name trim + max length + friendly default; profile
  saves; language and daily goal persist to storage through the real form;
  age-range validation blocks submission.
- **Progression**: only lesson 1 available initially; completing 1 unlocks
  2 (and only 2); sequential unlock; coming-soon stays unavailable even
  after all lessons; locked and coming-soon lessons cannot be completed or
  award anything via direct actions/URLs.
- **Activities**: fill-blank wrong answer doesn't advance and can't record
  duplicate attempts, correct answer advances, options are visually
  indistinguishable before submission; matching wrong pair doesn't advance
  and resets gently, full match advances; arrange-words wrong order doesn't
  advance, correct order advances, chips remove/clear correctly.
- **Rewards**: 10 XP exactly once; badges never duplicated; 3/2/1-star
  calculations; best stars never decrease; practice runs recorded in
  history; same-day completions count one streak day.
- **Streak**: first completion → 1; same-day no increment; next-day +1;
  missed days reset; month-boundary local-date math; no UTC drift.
- **Audio/recording**: unsupported speech synthesis shows the friendly
  fallback and still allows continuing; unsupported MediaRecorder shows the
  message, doesn't crash, and unlocks Continue/Finish; temporary object
  URLs are revoked on replace and release.
- **Localization**: exactly six selectable languages; localized values
  resolve; missing values fall back to English; no raw keys; variable
  interpolation; Sanskrit marked `lang="sa"`; regional-script fallback
  notice appears for te/kn/ta and not for hi/mr.
- **Parent area**: wrong gate answer keeps the dashboard closed; correct
  answer opens it; reset requires confirmation and can be cancelled;
  confirmed reset clears only the app key and returns to setup.

## Manual checklist — status by verification method

Legend: 🧪 covered by automated tests · 👁 code-inspection (reviewed code
path; not executed in a live browser here)

| Item | Status |
|---|---|
| Welcome page loads | 👁 (route serves 200; component reviewed) |
| Setup works; profile survives refresh | 🧪 (form test writes to real localStorage; provider loads it on init) |
| All six languages selectable | 🧪 |
| Learning path renders; lesson 1 starts | 👁 + 🧪 (availability logic tested) |
| Lesson progress survives refresh | 🧪 (persisted `currentActivityIndex` round-trip) + 👁 (resume button) |
| Listen controls behave; no overlapping speech | 👁 (singleton service cancels before speak; guard ref blocks rapid clicks) + 🧪 (unsupported fallback) |
| Microphone denial doesn't crash; recording playback | 🧪 (unsupported path) + 👁 (permission-denied branch) |
| Wrong answers don't advance; correct answers advance | 🧪 |
| Completion awards correct XP; unlocks next lesson; practice doesn't duplicate XP | 🧪 |
| Parent gate and reset work | 🧪 |
| Coming-soon lessons award nothing | 🧪 |
| Not-found route works | 👁 (catch-all route + component reviewed) |
| Mobile layout, desktop intentional layout | 👁 (mobile-first classes; max-w-3xl column + decoration; chips wrap; no fixed overlays) |
| Reduced-motion preference works | 👁 (media query + `.reduce-motion` class both zero out animation) |
| Indic text not clipped | 👁 (line-height 1.9 on all Indic `lang` blocks; no uppercase transforms) |
| No obvious console errors | 🧪 (tests fail on thrown errors; only intended i18n dev warnings appear) |

**Honest gaps**: real-browser click-through (speech audio quality, live
microphone capture, visual layout at each breakpoint, screen-reader
behavior) was not performed in this environment and should be done by a
human before sharing with families. The `npm run dev` server itself was
exercised via `vite preview` over HTTP rather than a browser session.
