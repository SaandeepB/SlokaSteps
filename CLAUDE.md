# Sloka Steps — Claude Instructions

Read `AGENTS.md` for the full instruction set. The core rules are mirrored
here so either file is sufficient.

- **Project**: Sloka Steps — child-friendly Sanskrit sloka learning app.
  Local-only React 19 + TypeScript + Vite + Tailwind v4. No backend — do not
  introduce one without an explicit future request.
- **Filesystem boundary**: only ever touch files under `S:\Sloka App`.
  Quote the path in PowerShell (it contains a space). Never run broad
  deletions or modify global config.
- **Validation**: run `npm run check` (typecheck + lint + test + build)
  before declaring work complete. Never claim a check passed without
  running it.
- **Content safety**: sloka text/translations are prototype content — never
  call them official or definitive; record content changes in
  `CONTENT_REVIEW.md`. Never invent authoritative pronunciation scores;
  feedback is participation-only.
- **Child privacy**: never upload/persist child audio (session memory only);
  mic access only on explicit button press; no accounts, analytics, ads, or
  personal data collection; do not claim regulatory compliance.
- **Accessibility**: keyboard operable, labeled controls, aria-live feedback,
  reduced-motion support, no color-only state communication.
- **Code**: TS strict, no `any`, `import type` for types
  (verbatimModuleSyntax), data-driven lesson content, pure reward/streak
  functions in `src/utils`, persistence only under the `sloka-steps:v1`
  localStorage key. Tailwind v4 uses the Vite plugin + `@theme` tokens —
  there is no `tailwind.config.js`; do not create one.
