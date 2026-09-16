"""
Extract a small (10-20 clip) sample from the Su-srota dataset's
`in_the_wild_test` split (CC BY 4.0, huggingface.co/datasets/
prathoshap/sushrota-sanskrit-asr-data) into individual 16 kHz mono WAV files
plus a manifest with full provenance. Written from scratch by the
research-analyst; only reads the public parquet already downloaded locally.

Per the task brief: keep the clip set small, do not bulk-download the
dataset. We already hold only the smallest split (327 clips, ~2h) locally;
this script writes out a deliberately small subset of it (default 16 clips)
spanning the duration range, plus a few of the shortest/longest as informal
"easy" and "hard" cases.
"""
from __future__ import annotations

import io
import json
import os
import sys

import pandas as pd
import soundfile as sf

PARQUET = "models/susrota_dataset/data/in_the_wild_test-00000-of-00001.parquet"
OUT_DIR = "clips/held_out"
MANIFEST = "clips/held_out_manifest.json"
N_CLIPS = 16


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    df = pd.read_parquet(PARQUET)
    df = df.sort_values("duration").reset_index(drop=True)

    # Spread the sample across the duration distribution: this is a
    # feasibility/technique test, not a statistically powered study, so an
    # even spread across short/medium/long clips is more useful than a
    # random sample of a 327-row split.
    idxs = sorted(set(
        int(round(i * (len(df) - 1) / (N_CLIPS - 1))) for i in range(N_CLIPS)
    ))

    manifest = []
    for rank, i in enumerate(idxs):
        row = df.iloc[i]
        audio_bytes = row["audio"]["bytes"]
        orig_path = row["audio"]["path"]
        data, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
        clip_id = f"heldout_{rank:02d}_dur{row['duration']:.1f}s"
        wav_path = os.path.join(OUT_DIR, f"{clip_id}.wav")
        sf.write(wav_path, data, sr, subtype="PCM_16")
        manifest.append({
            "clip_id": clip_id,
            "wav_path": wav_path.replace("\\", "/"),
            "text": row["text"],
            "duration_s": float(row["duration"]),
            "source": row["source"],
            "sample_rate": int(sr),
            "orig_parquet_row": int(i),
            "orig_audio_path_field": orig_path,
            "provenance": (
                "prathoshap/sushrota-sanskrit-asr-data, split=in_the_wild_test, "
                "CC BY 4.0, https://huggingface.co/datasets/"
                "prathoshap/sushrota-sanskrit-asr-data"
            ),
        })
        print(f"wrote {wav_path}  dur={row['duration']:.2f}s  sr={sr}")

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"\nwrote manifest: {MANIFEST} ({len(manifest)} clips)")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
