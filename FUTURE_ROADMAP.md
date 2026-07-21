# FUTURE_ROADMAP.md — Sloka Steps

Deliberately **not implemented** in Version 1. Listed so future work can be
planned without prematurely building it.

1. **Qualified Sanskrit content review** — scholars validate Devanagari
   text, sandhi variants, and transliteration scheme (see
   `CONTENT_REVIEW.md` for recorded variations).
2. **Reviewed regional-language translations** — native-speaker review of
   Hindi drafts; full Telugu, Kannada, Tamil, Marathi meaning packs and
   regional-script renderings of the slokas (`regionalScripts` field already
   exists in the data model).
3. **Professional prerecorded audio** — reviewed recordings per line and
   full chant; `SlokaLine.audioUrl` plus `PrerecordedAudioPlayback` are the
   integration points.
4. **Validated Sanskrit pronunciation analysis** — replace
   `MockPronunciationEvaluation` behind the existing
   `PronunciationEvaluationService` interface; only with expert validation
   and explicit parental consent.
5. **Parent accounts** (optional, privacy-reviewed).
6. **Multiple child profiles** per device/family.
7. **Supabase or Firebase evaluation** for a managed backend.
8. **Cloud progress synchronization** across devices.
9. **React Native or Expo Android application** — reward/streak/progression
   logic in `src/utils` and the typed content in `src/content` are
   framework-agnostic to ease porting.
10. **Google Play Store release** (family policy compliance).
11. **Offline lesson downloads** (bundled audio packs).
12. **Content-management system** for curriculum editors.
13. **More slokas and learning levels** — Level 1 expansion first
    (activities for Asato Ma and Sarve Bhavantu), then Level 2+.
14. **Optional PWA installation** (manifest + service worker).
15. **Child-safe, consent-aware analytics** (aggregate, no behavioral
    profiles) — only after privacy review.
16. **Privacy and legal review** — COPPA/GDPR-K assessment before any
    production launch.
17. **Accessibility testing with children and parents** — moderated
    sessions across ages 4–10, screen readers, and switch access.
18. **Audio recording retention controls** — parent-facing switches if
    recordings ever become persistable.
19. **Teacher or family practice modes** — shared practice sessions,
    classroom-safe views.
