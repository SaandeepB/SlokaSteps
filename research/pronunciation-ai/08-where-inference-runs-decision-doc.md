# 08 — Where pronunciation inference runs: a decision doc

_Dated 2026-08-30. Research-analyst. This lays out the options and their consequences so a human can choose. It does not choose._

---

## Verdict box

| | |
|---|---|
| **Decision to be made** | If SlokaSteps ever runs real pronunciation analysis, **where does the model run?** (a) a new backend service, (b) stays mocked / deferred, or (c) in-browser / on-device. |
| **What I actually did** | Mapped each option against this repo's "no backend without explicit request" rule and against COPPA / India DPDP for child voice data. Checked in-browser feasibility against evidence (ONNX exports, model size) without inventing what I could not verify. |
| **What I concluded (for the reader to act on)** | **(b) is the current state and the only zero-risk option** — it costs a capability, not safety. **(a) is the highest-risk option**: it converts a "child's voice never leaves the device" product into one that holds children's voice recordings on a server, triggering the full COPPA verifiable-consent + DPDP no-profiling regime. **(c) is the only option that adds the capability without contradicting the no-backend rule or materially increasing child-data risk — IF a browser-viable model export proves feasible, which I could not verify.** The choice is (b) now; (c) vs (a) later. |

---

## Constraints that are already settled (do not relitigate)

From `AGENTS.md`, `CLAUDE.md`, `docs/CHILD_PRIVACY_CHECKLIST.md`, `docs/CHANT_COACH_ARCHITECTURE.md`, `PRIVACY_NOTES.md`, `FUTURE_ROADMAP.md`:

- **No backend without an explicit future request.** `FUTURE_ROADMAP` #7 ("Supabase or Firebase evaluation for a managed backend") and the fail-closed `ServerChantEvaluationService` placeholder show a backend is *anticipated* but gated on a deliberate decision. Choosing (a) **is** that decision — it cannot be a side effect of shipping Chant Coach.
- **Child audio never uploaded, never persisted.** Recordings live in memory for the session only; only a boolean "a recording was attempted" is stored.
- `allowModelTraining` is **permanently `false`** in this foundation. `allowCloudEvaluation` defaults **`false`**, behind a parent gate.
- The project **does not claim COPPA / DPDP compliance** and requires a formal legal review before any production release. Nothing below is that review.
- Already established for this project: **DPDP defines a child as under 18 and prohibits profiling of children; COPPA treats voice recordings as regulated personal information and requires separate verifiable parental consent for AI-training use.**
- `FUTURE_ROADMAP` #4, quoted: _"Storing per-segment accuracy over time is a separate decision from computing it — see the child-privacy review before doing so."_ **Computing a score and keeping a longitudinal record of a named child's per-syllable scores are different decisions.** A stored per-child pronunciation history is the thing most likely to read as "profiling / behavioural monitoring of a child" under DPDP — regardless of where the model runs.

---

## Option (a) — new backend service

The recording (or a derived feature stream) is sent to a server that runs Su-śrotā and returns the result.

### Against the repo rules
- Directly requires lifting the "no backend" rule — an explicit, logged decision, not an implementation detail.
- Re-opens everything `docs/CHANT_COACH_ARCHITECTURE.md` lists under "Cloud evaluation requires…": protected endpoint, parent opt-in, just-in-time notice, minimised encrypted transfer, enforced retention/deletion, processor review, consent withdrawal path, no secrets in the browser bundle. Plus `audio:verify`-style checks that no provider auth leaks into the client.

### COPPA (US)
- A recording of a child's voice **is** personal information under COPPA. Transmitting it to a server for processing is "collection."
- Requires **verifiable parental consent before collection** — a higher bar than the app's current in-app parent arithmetic gate (which `PRIVACY_NOTES.md` itself calls "a deterrent, not authentication").
- If the audio, transcripts, or scores are **retained** or used to **improve the model**, that is a **separate, additional** verifiable consent (recent COPPA amendments treat AI/ML training as a distinct purpose). `allowModelTraining = false` must stay enforced server-side, not just in the client.
- Data minimisation, deletion on request, no conditioning app functionality on consent to non-core processing.

### India DPDP
- Child = **under 18**. Processing a child's personal data needs **verifiable parental consent**.
- DPDP **prohibits** "tracking or behavioural monitoring of children" and "targeted advertising directed at children," and processing likely to cause "detrimental effect on the well-being of a child."
- A server that receives children's chanting audio and (especially) keeps per-child pronunciation results over time is squarely in the zone the reviewers must scrutinise for "profiling."
- Adds obligations: a Consent Manager / grievance path, breach notification, data-residency thought (cross-border transfer rules), a Data Protection Officer if volume warrants.

### Cost / liability
- Ongoing server cost + GPU (Su-śrotā is a NeMo PyTorch model; CPU inference is slow, GPU inference is a recurring bill).
- A permanent "we have children's voice recordings on our infrastructure" attack surface and breach liability — the exact thing the product has so far deliberately not had.
- The licence gap on the Su-śrotā weights (`06`) applies: serving them is redistribution-adjacent; needs the author's explicit licence first.

### When (a) is nonetheless the right call
- If analysis needs a model too large to run on-device **and** the product decision is that pronunciation feedback is worth the regime above. That is a legitimate choice — but it is a strategic one for the product owners + legal, not an engineering default.

---

## Option (b) — stays mocked / deferred (current state)

`ParticipationEvaluationService` ships; `chantCoachEnabled = false`; the "verify against known text" work stays in `research/`.

### Against the repo rules
- **Fully compliant.** No change to any privacy posture. Audio stays in-memory, session-only, never transmitted.

### COPPA / DPDP
- **No additional exposure.** Nothing new to consent to; nothing stored; nothing profiled.

### Cost
- Zero new work, zero new risk, zero infrastructure.
- The cost is entirely opportunity cost: **children get no pronunciation feedback.** The "listen to the teacher / chant with the teacher" activities and the participation encouragement remain the whole experience.
- The `FUTURE_ROADMAP` #4 path stays open; the research in this folder stays usable when the decision is revisited.

### When (b) is the right call
- Until there is (i) a validated analyzer (`docs/CHANT_COACH_VALIDATION_PLAN.md` passed), (ii) qualified-educator sign-off, (iii) a privacy/legal review, and (iv) a decision on *where* it runs. Absent any one of those, (b) is not a compromise — it is the correct state.

---

## Option (c) — in-browser / on-device (ONNX Runtime Web / WASM, or WebGPU)

The model runs in the child's browser. Audio is processed locally and **never leaves the device**; only the (non-audio) result is shown.

### Evidence FOR feasibility (verified)
- **AI4Bharat already publishes an ONNX export** of the multilingual IndicConformer: `ai4bharat/indic-conformer-600m-multilingual` carries `onnx` in its HF tags and ships `model_onnx.py` / `model_onnx_1b_batched_rnnt.py` (HF API, read 2026-08-30). So a Conformer-CTC ONNX path from this family **exists from the vendor**.
- ONNX Runtime Web runs Conformer/wav2vec2/whisper-class encoders in-browser today (WASM SIMD + threads, or WebGPU). The verification approach needs only the **encoder + CTC head + greedy decode + string alignment** — the alignment/vote/abstain layer is trivial JS (the Python version in `scripts/` is ~150 lines of pure stdlib and runs instantly).
- Repo-consistent: `LocalPitchEvaluationService` and `docs/CHANT_COACH_ARCHITECTURE.md` ("optional on-device signal processing") already anticipate an on-device path.

### Evidence AGAINST / unverified (do not overclaim)
- **The published ONNX is the 600 M multilingual model.** 600 M params → hundreds of MB to download and slow WASM inference — not comfortable for a kids' app on a mid-range tablet. The `~129 M` IndicConformer the Su-śrotā card cites (`02`) would be far more viable, but I did **not** verify an ONNX export of that specific smaller model exists.
- **Su-śrotā's *finetuned* weights ship only as `.nemo` (PyTorch).** Converting to ONNX (`model.export("model.onnx")` in NeMo, then quantise, then wire to ort-web) is a plausible but **unverified** engineering step. NeMo→ONNX for the CTC path of hybrid RNNT-CTC models is supported in general; I have not tested it for this checkpoint, and the "Sanskrit slice" tokenizer logic would need reimplementing in JS.
- **Bundle size + first-load.** Even a quantised ~129 M model is ~40–130 MB. That is a real UX cost for a lightweight app (current deps are tiny — React + Router + Lucide).
- The Su-śrotā weights **licence gap** (`06`) applies here too — shipping the weights in the app bundle is redistribution.

### COPPA / DPDP — the decisive advantage
- Audio is **never collected** (never leaves the device), so there is **no transmission, no server retention, no cross-border transfer**. The consent burden drops to roughly what the app already does for the in-memory recorder.
- The one thing still requiring the privacy review: **do not persist per-syllable scores against a named child profile.** On-device computation is fine; an on-device *longitudinal pronunciation record* is still the DPDP "profiling of a child" question (`FUTURE_ROADMAP` #4). Compute-and-discard, or compute-and-show-once, sidesteps it.

### Cost
- One-time: model export + quantisation + ort-web integration + a JS port of the akṣara segmentation / alignment / abstain logic.
- Ongoing: none (no server, no GPU bill, no breach surface). Bundle-size and older-device performance are the recurring trade-offs.

---

## Decision table

| | (a) backend | (b) mocked / deferred | (c) in-browser / on-device |
|---|---|---|---|
| Contradicts "no backend" rule? | **Yes — needs explicit lift** | No | No |
| Child audio leaves device? | **Yes** | No | No |
| New COPPA verifiable-consent regime? | **Yes** (before collection; again for any training use) | No | No (audio not collected) |
| DPDP "profiling of a child" exposure | High if per-child history stored; medium otherwise | None | Low — only if scores are persisted per profile |
| New infrastructure / ongoing cost | Server + GPU + ops + breach liability | None | One-time engineering; bundle size |
| Model feasibility | Known (run the `.nemo` as-is) | n/a | **Unverified** — 600 M ONNX exists but is heavy; small-model export not tested |
| Su-śrotā weights licence gap (`06`) applies | Yes (serving) | No | Yes (bundling) |
| Capability delivered to children | Full | **None** | Full, if feasible |
| Reversibility | Hard (data already collected) | Trivial | Easy (ship without it) |

---

## What each option needs before it could proceed

- **(b):** nothing. It is the current state.
- **(c):** verify a browser-viable model export (start by asking the author which base checkpoint + whether a CTC ONNX export of the finetuned weights is possible — see `02`); get an explicit `license:` on the Su-śrotā weights (`06`); prototype ort-web inference + a JS port of `scripts/verify_against_text.py`; then the full `docs/CHANT_COACH_VALIDATION_PLAN.md`; then a privacy review focused narrowly on "may an on-device score be persisted per child profile."
- **(a):** an explicit product + legal decision to lift the no-backend rule; the entire `docs/CHANT_COACH_ARCHITECTURE.md` "Cloud evaluation requires…" checklist; COPPA verifiable parental consent infrastructure; DPDP Consent Manager + grievance + breach-notification + data-residency design; the Su-śrotā licence grant; the validation plan; and a standing "disable immediately" switch.

The reader chooses. The consequences per option are above.
