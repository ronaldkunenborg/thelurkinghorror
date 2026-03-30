#!/usr/bin/env python3
"""Convert extracted Amiga Lurking Horror Sound/*.dat files to WAV.

The .dat files on this disk are sample payloads with a small 10-byte header.
This tool exports browser-friendly mono 8-bit WAV files and writes a JSON
catalog with discovered metadata.
"""

from __future__ import annotations

import argparse
import json
import re
import wave
from pathlib import Path


def parse_number(path: Path) -> int | None:
    m = re.fullmatch(r"s(\d+)\.dat", path.name, flags=re.IGNORECASE)
    return int(m.group(1)) if m else None


def convert_dat_to_wav(dat_path: Path, wav_path: Path, sample_rate: int) -> dict:
    raw = dat_path.read_bytes()
    if len(raw) < 10:
        raise ValueError(f"Unexpectedly short .dat file: {dat_path}")

    # Header fields observed in this disk's Sound/*.dat files.
    total_minus_2 = int.from_bytes(raw[0:2], "big")
    rate_hint = int.from_bytes(raw[2:4], "big")
    loop_hint = int.from_bytes(raw[4:8], "big")
    total_minus_10 = int.from_bytes(raw[8:10], "big")

    pcm_signed = raw[10:]
    # WAV 8-bit PCM is unsigned: convert from signed 8-bit using xor 0x80.
    pcm_unsigned = bytes(b ^ 0x80 for b in pcm_signed)

    wav_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(1)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_unsigned)

    return {
        "source": dat_path.name,
        "wav": wav_path.name,
        "sample_count": len(pcm_unsigned),
        "header_total_minus_2": total_minus_2,
        "header_rate_hint": rate_hint,
        "header_loop_hint": loop_hint,
        "header_total_minus_10": total_minus_10,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert extracted Amiga .dat samples to .wav.")
    parser.add_argument("sound_dir", help="Directory containing s*.dat files (e.g. extracted Sound folder).")
    parser.add_argument("output_dir", help="Destination directory for .wav files.")
    parser.add_argument(
        "--sample-rate",
        type=int,
        default=11025,
        help="WAV output sample rate. Default: 11025",
    )
    parser.add_argument(
        "--catalog-path",
        default=None,
        help="Optional JSON metadata output path.",
    )
    args = parser.parse_args()

    sound_dir = Path(args.sound_dir).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not sound_dir.exists():
        raise SystemExit(f"Sound dir not found: {sound_dir}")

    rows: dict[str, dict] = {}
    for dat_path in sorted(sound_dir.glob("s*.dat")):
        number = parse_number(dat_path)
        if number is None:
            continue
        wav_path = output_dir / f"s{number}.wav"
        rows[str(number)] = convert_dat_to_wav(dat_path, wav_path, args.sample_rate)

    if args.catalog_path:
        catalog_path = Path(args.catalog_path).resolve()
        catalog_path.parent.mkdir(parents=True, exist_ok=True)
        catalog_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")

    print(f"Converted {len(rows)} sample(s) to {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
