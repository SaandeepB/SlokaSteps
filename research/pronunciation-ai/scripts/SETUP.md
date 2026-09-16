# Harness setup — historical, install now done

**UPDATE 2026-09-15: the install below was done** (by the environment owner,
outside this analyst's own install step, per the task brief for this pass —
"the ML stack is now installed and verified"). This file is kept as the
accurate historical recipe and because items 2, part of 4, and 5 below are
still genuinely outstanding. See `09-*.md`/`10-*.md` for what running the
harness actually found.

## What was missing 2026-08-30, and current state 2026-09-15

| Need | State 2026-08-30 | State 2026-09-15 |
|---|---|---|
| `torch`, `torchaudio` | absent | **installed** (torch 2.13.0+cpu, via `py -3.11`) |
| `nemo_toolkit[asr]` | absent | **installed** (nemo 3.0.0) |
| `soundfile`, `numpy`, `librosa` | absent | **installed** |
| `ffmpeg` on PATH | absent | still not on PATH, but `imageio_ffmpeg.get_ffmpeg_exe()` resolves a working binary; not needed yet (dataset audio arrives pre-transcoded) |
| Su-śrotā `.nemo` checkpoint | not downloaded | **downloaded** (`sushrota_sanskrit_asr_v13b.nemo`, 523,192,320 bytes) — see `09-*.md` for what loading it actually took |
| generic IndicConformer checkpoint | not downloaded | **still not downloaded** — auto-gated on HF, needs a logged-in browser click to accept terms before any programmatic download works |
| **any recitation audio at all** | **absent** | **16 real clips** now present, from a CC BY 4.0 dataset (`prathoshap/sushrota-sanskrit-asr-data`, held-out split) — see `10-*.md` |
| child-voice audio with parental consent | absent | **still absent** — the real target population; nothing in `09`/`10` substitutes for this (see caveats there) |

## Step 1 — Python deps (needs approval, multi-GB)

```powershell
Set-Location "S:\Sloka App\research\pronunciation-ai\scripts"
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
# install the torch build for THIS machine first:
py -3.11 -m pip install "torch==2.4.*" --index-url https://download.pytorch.org/whl/cpu
py -3.11 -m pip install -r requirements.txt
```

Windows console note: set `PYTHONUTF8=1` (or `$env:PYTHONUTF8=1`) or Devanagari
prints raise `UnicodeEncodeError` on the default cp1252 stdout.

## Step 2 — ffmpeg

```powershell
winget install --id=Gyan.FFmpeg   # then reopen the shell
```

## Step 3 — model checkpoints

```powershell
py -3.11 -m huggingface_hub download prathoshap/sushrota-sanskrit-asr `
  sushrota_sanskrit_asr_v13b.nemo --local-dir models\susrota
# generic baseline — pick ONE and confirm it exposes a Sanskrit decode path:
#   ai4bharat/indic-conformer-600m-multilingual  (MIT, auto-gated: accept terms in a browser first)
```

The generic `ai4bharat/indic-conformer-600m-multilingual` repo is **auto-gated**
("agree to share contact information"). You must accept on the HF website with a
logged-in account before any programmatic download works.

## Step 4 — audio (the actual blocker)

There is no audio. To produce the item-1 / item-4 / item-5 numbers you must
first record real recitations. `01-susrota-vs-generic-indicconformer-cer-wer.md`
specifies how much, what kind, and by whom. Put raw clips in `raw_clips/`, named
`<sloka-id>__<speaker>__<take>.webm`, then:

```powershell
py -3.11 transcode_to_wav.py --in-dir raw_clips --out-dir wav16k
py -3.11 make_nemo_manifest.py --wav-dir wav16k --out manifest.jsonl
py -3.11 cer_wer_eval.py --manifest manifest.jsonl `
  --susrota-nemo models\susrota\sushrota_sanskrit_asr_v13b.nemo `
  --generic-nemo models\generic\<file>.nemo
```

## Licensing gate before redistributing anything

Read `06-license-status-all-three-resources.md` first. The Su-śrotā finetuned
**weights** have **no explicit license grant** on the model card (it only says
"observe the base model's license terms") — unchanged as of 2026-09-15,
re-confirmed in `09-*.md`. Running locally for evaluation is fine; bundling
the weights into the app is a separate decision that needs the author to add
an SPDX `license:` field.

The Su-śrotā **dataset** (`prathoshap/sushrota-sanskrit-asr-data`, used for
the audio in `10-*.md`) is a **separate resource with its own, clean
license**: `license: cc-by-4.0` in its README frontmatter, "Released under
CC-BY-4.0" in the body, with a citation request — quoted in full in `10-*.md`.
Do not conflate the two: dataset license ≠ model-weights license.
