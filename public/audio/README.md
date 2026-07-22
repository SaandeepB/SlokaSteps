# Sloka Steps audio assets

The runtime reads `manifest.json`; it never discovers files by scanning folders.
Only assets marked `approved` are eligible for learner playback.

- `slokas/` contains reviewed chanting, teaching, melodic, and narration assets.
- `stories/` contains reviewed narration and background assets.
- Provider-generated files belong below a `generated/` directory and begin as
  `needs-review`.

Do not place credentials, child recordings, or unreviewed canonical chanting here.
