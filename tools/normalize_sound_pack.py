#!/usr/bin/env python3
"""Normalize and resample WAV files to browser-safe PCM16 mono 44.1kHz."""

from __future__ import annotations

import argparse
import math
import struct
import wave
from pathlib import Path


def decode_pcm_to_float(frames: bytes, sample_width: int, channels: int) -> list[float]:
    samples: list[float] = []
    if sample_width == 1:
        for i in range(0, len(frames), channels):
            # 8-bit WAV is unsigned.
            s = (frames[i] - 128) / 128.0
            samples.append(max(-1.0, min(1.0, s)))
        return samples
    if sample_width == 2:
        step = 2 * channels
        for i in range(0, len(frames), step):
            s = struct.unpack_from("<h", frames, i)[0] / 32768.0
            samples.append(max(-1.0, min(1.0, s)))
        return samples
    raise ValueError(f"Unsupported sample width: {sample_width}")


def resample_linear(samples: list[float], src_rate: int, dst_rate: int) -> list[float]:
    if src_rate == dst_rate or len(samples) <= 1:
        return samples[:]
    out_len = max(1, int(round(len(samples) * (dst_rate / src_rate))))
    out: list[float] = []
    scale = (len(samples) - 1) / max(1, out_len - 1)
    for i in range(out_len):
        pos = i * scale
        idx = int(math.floor(pos))
        frac = pos - idx
        if idx >= len(samples) - 1:
            out.append(samples[-1])
        else:
            a = samples[idx]
            b = samples[idx + 1]
            out.append(a + (b - a) * frac)
    return out


def normalize(samples: list[float], target_peak: float, max_gain_db: float) -> list[float]:
    peak = max((abs(s) for s in samples), default=0.0)
    if peak <= 0.0:
        return samples
    gain = target_peak / peak
    max_gain = 10.0 ** (max_gain_db / 20.0)
    gain = min(gain, max_gain)
    return [max(-1.0, min(1.0, s * gain)) for s in samples]


def encode_float_to_pcm16(samples: list[float]) -> bytes:
    out = bytearray()
    for s in samples:
        v = int(round(max(-1.0, min(1.0, s)) * 32767.0))
        out += struct.pack("<h", v)
    return bytes(out)


def convert_file(src: Path, dst: Path, dst_rate: int, target_peak: float, max_gain_db: float) -> None:
    with wave.open(str(src), "rb") as r:
        channels = r.getnchannels()
        sample_width = r.getsampwidth()
        src_rate = r.getframerate()
        frames = r.readframes(r.getnframes())

    mono = decode_pcm_to_float(frames, sample_width, channels)
    resampled = resample_linear(mono, src_rate, dst_rate)
    normalized = normalize(resampled, target_peak=target_peak, max_gain_db=max_gain_db)
    pcm16 = encode_float_to_pcm16(normalized)

    dst.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(dst), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(dst_rate)
        w.writeframes(pcm16)


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize/resample WAV pack to PCM16 mono.")
    parser.add_argument("src_dir")
    parser.add_argument("dst_dir")
    parser.add_argument("--rate", type=int, default=44100)
    parser.add_argument("--target-peak", type=float, default=0.9)
    parser.add_argument("--max-gain-db", type=float, default=18.0)
    args = parser.parse_args()

    src_dir = Path(args.src_dir).resolve()
    dst_dir = Path(args.dst_dir).resolve()
    files = sorted(src_dir.glob("s*.wav"))
    count = 0
    for src in files:
        convert_file(src, dst_dir / src.name, args.rate, args.target_peak, args.max_gain_db)
        count += 1
    print(f"Converted {count} file(s) to {dst_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
