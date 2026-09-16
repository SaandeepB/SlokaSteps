"""
Transcode browser recordings (webm/opus, mp4/aac, ...) to 16 kHz mono WAV.

STATUS: NOT RUN. ffmpeg is NOT on PATH in this environment (verified). This
wraps ffmpeg; install ffmpeg first (see SETUP.md).

Why this is needed: SlokaSteps' recorder (src/hooks/useRecorder.ts) produces a
Blob of type `recorder.mimeType || 'audio/webm'` -- in practice WebM/Opus on
Chromium, MP4/AAC on Safari. The Su-srota model needs 16 kHz mono float32 PCM.
`soundfile` alone cannot read WebM/Opus, so a transcode step is unavoidable.

Usage:
  py -3.11 transcode_to_wav.py --in-dir raw_clips/ --out-dir wav16k/
"""

from __future__ import annotations

import argparse
import pathlib
import shutil
import subprocess
import sys

SR = 16_000


def check_ffmpeg() -> str:
    exe = shutil.which("ffmpeg")
    if not exe:
        sys.stderr.write(
            "\n[blocked] ffmpeg not found on PATH.\n"
            "  Windows:  winget install --id=Gyan.FFmpeg  (or scoop install ffmpeg)\n"
            "  then reopen the shell so PATH updates.\n\n"
        )
        raise SystemExit(2)
    return exe


def transcode_one(ffmpeg: str, src: pathlib.Path, dst: pathlib.Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        ffmpeg, "-y", "-i", str(src),
        "-ac", "1", "-ar", str(SR),
        "-c:a", "pcm_s16le",
        "-af", "highpass=f=40,lowpass=f=7500",  # gentle band-limit; do NOT denoise
        str(dst),
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--in-dir", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--glob", default="*.webm")
    args = ap.parse_args()

    ffmpeg = check_ffmpeg()
    in_dir = pathlib.Path(args.in_dir)
    out_dir = pathlib.Path(args.out_dir)
    n = 0
    for src in sorted(in_dir.glob(args.glob)):
        dst = out_dir / (src.stem + ".wav")
        transcode_one(ffmpeg, src, dst)
        n += 1
        print(f"  {src.name} -> {dst}")
    print(f"done: {n} file(s) at {SR} Hz mono")


if __name__ == "__main__":
    main()
