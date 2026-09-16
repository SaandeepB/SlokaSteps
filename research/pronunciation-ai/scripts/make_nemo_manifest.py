"""
Build a NeMo-style JSONL manifest from a folder of transcribed clips.

STATUS: runnable now (pure stdlib) but pointless until real clips exist -- the
repo has ZERO audio. Kept so the eval pipeline is complete end to end.

Expects clip filenames to start with a sloka id from slokas_reference.json,
e.g.  saraswati-namastubhyam__child07__take2.wav

Output lines:  {"audio_filepath": "...", "text": "<Devanagari ref>",
                "sloka_id": "...", "duration": <sec or null>}

'text' is the KNOWN REFERENCE (what the child was asked to chant), never an ASR
transcript -- that is the whole point of the "verify, don't transcribe" framing
and of the Su-srota flywheel's trust model.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import wave

HERE = pathlib.Path(__file__).parent
SLOKAS = json.loads((HERE / "slokas_reference.json").read_text(encoding="utf-8"))["slokas"]
REF = {s["id"]: " ".join(s["devanagari_lines"]) for s in SLOKAS}
IDS = sorted(REF, key=len, reverse=True)  # longest-prefix match first


def sloka_id_for(name: str) -> str | None:
    stem = name.split("__")[0]
    if stem in REF:
        return stem
    for sid in IDS:
        if name.startswith(sid):
            return sid
    return None


def wav_duration(path: pathlib.Path) -> float | None:
    try:
        with wave.open(str(path), "rb") as w:
            return w.getnframes() / float(w.getframerate())
    except Exception:
        return None


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--wav-dir", required=True)
    ap.add_argument("--out", default="manifest.jsonl")
    args = ap.parse_args()

    wav_dir = pathlib.Path(args.wav_dir)
    lines, skipped = [], []
    for wav in sorted(wav_dir.glob("*.wav")):
        sid = sloka_id_for(wav.name)
        if not sid:
            skipped.append(wav.name)
            continue
        lines.append(json.dumps({
            "audio_filepath": str(wav.resolve()),
            "text": REF[sid],
            "sloka_id": sid,
            "duration": wav_duration(wav),
        }, ensure_ascii=False))

    pathlib.Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {len(lines)} entries -> {args.out}")
    if skipped:
        print(f"skipped {len(skipped)} file(s) with no recognisable sloka id prefix:")
        for s in skipped:
            print(f"  {s}")


if __name__ == "__main__":
    main()
