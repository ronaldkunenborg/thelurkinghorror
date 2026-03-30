#!/usr/bin/env python3
"""Extract Blorb sound resources and convert AIFF to WAV.

Supports Blorb FORM IFRS with RIdx entries for Snd resources.
For AIFF resources, exports both .aiff and browser-friendly .wav.
"""

from __future__ import annotations

import argparse
import struct
import wave
from pathlib import Path


def read_u32be(buf: bytes, off: int) -> int:
    return struct.unpack_from(">I", buf, off)[0]


def decode_extended80(data10: bytes) -> float:
    """Decode 80-bit IEEE extended float (AIFF sample rate)."""
    if len(data10) != 10:
        raise ValueError("extended80 requires 10 bytes")
    expon = ((data10[0] & 0x7F) << 8) | data10[1]
    sign = -1 if (data10[0] & 0x80) else 1
    hi = int.from_bytes(data10[2:6], "big")
    lo = int.from_bytes(data10[6:10], "big")
    if expon == 0 and hi == 0 and lo == 0:
        return 0.0
    if expon == 0x7FFF:
        return float("inf") * sign
    mant = (hi << 32) | lo
    return sign * (mant / (1 << 63)) * (2 ** (expon - 16383))


def parse_ridx_entries(blorb: bytes) -> list[tuple[str, int, int]]:
    if blorb[0:4] != b"FORM" or blorb[8:12] != b"IFRS":
        raise ValueError("Not a Blorb FORM IFRS file")
    off = 12
    ridx_payload = None
    while off + 8 <= len(blorb):
        cid = blorb[off:off + 4]
        clen = read_u32be(blorb, off + 4)
        payload_off = off + 8
        payload_end = payload_off + clen
        if payload_end > len(blorb):
            break
        if cid == b"RIdx":
            ridx_payload = blorb[payload_off:payload_end]
            break
        off = payload_end + (clen & 1)
    if ridx_payload is None:
        raise ValueError("RIdx chunk not found")
    n = read_u32be(ridx_payload, 0)
    entries = []
    pos = 4
    for _ in range(n):
        usage = ridx_payload[pos:pos + 4].decode("latin1", "replace")
        number = read_u32be(ridx_payload, pos + 4)
        roff = read_u32be(ridx_payload, pos + 8)
        entries.append((usage, number, roff))
        pos += 12
    return entries


def extract_form_chunk(blorb: bytes, off: int) -> tuple[str, bytes]:
    if blorb[off:off + 4] != b"FORM":
        raise ValueError(f"Expected FORM at offset 0x{off:x}")
    size = read_u32be(blorb, off + 4)
    ftype = blorb[off + 8:off + 12].decode("latin1", "replace")
    total = 8 + size
    data = blorb[off:off + total]
    return ftype, data


def parse_aiff_chunks(aiff_form: bytes):
    if aiff_form[0:4] != b"FORM" or aiff_form[8:12] != b"AIFF":
        raise ValueError("Not an AIFF FORM")
    off = 12
    comm = None
    ssnd = None
    while off + 8 <= len(aiff_form):
        cid = aiff_form[off:off + 4]
        clen = read_u32be(aiff_form, off + 4)
        payload_off = off + 8
        payload_end = payload_off + clen
        if payload_end > len(aiff_form):
            break
        payload = aiff_form[payload_off:payload_end]
        if cid == b"COMM":
            comm = payload
        elif cid == b"SSND":
            ssnd = payload
        off = payload_end + (clen & 1)
    if comm is None or ssnd is None:
        raise ValueError("AIFF missing COMM or SSND")
    if len(comm) < 18:
        raise ValueError("AIFF COMM too short")
    channels = struct.unpack_from(">H", comm, 0)[0]
    sample_frames = read_u32be(comm, 2)
    sample_size = struct.unpack_from(">H", comm, 6)[0]
    sample_rate = decode_extended80(comm[8:18])

    if len(ssnd) < 8:
        raise ValueError("AIFF SSND too short")
    offset = read_u32be(ssnd, 0)
    _block_size = read_u32be(ssnd, 4)
    pcm = ssnd[8 + offset:]

    return {
        "channels": channels,
        "sample_frames": sample_frames,
        "sample_size": sample_size,
        "sample_rate": sample_rate,
        "pcm_be": pcm,
    }


def aiff_pcm_to_wav(aiff_info: dict, wav_path: Path) -> None:
    channels = aiff_info["channels"]
    sample_size = aiff_info["sample_size"]
    sample_rate = int(round(aiff_info["sample_rate"]))
    pcm_be = aiff_info["pcm_be"]

    if sample_size not in (8, 16):
        raise ValueError(f"Unsupported AIFF sample size: {sample_size}")
    sampwidth = 1 if sample_size == 8 else 2

    if sample_size == 8:
        # AIFF 8-bit is signed; WAV 8-bit is unsigned.
        wav_pcm = bytes((b + 128) & 0xFF for b in pcm_be)
    else:
        # Convert 16-bit big-endian signed to little-endian signed.
        if len(pcm_be) % 2 != 0:
            pcm_be = pcm_be[:-1]
        wav_pcm = bytearray(len(pcm_be))
        for i in range(0, len(pcm_be), 2):
            wav_pcm[i] = pcm_be[i + 1]
            wav_pcm[i + 1] = pcm_be[i]
        wav_pcm = bytes(wav_pcm)

    wav_path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(wav_path), "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sampwidth)
        wf.setframerate(sample_rate)
        wf.writeframes(wav_pcm)


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract sounds from Blorb file.")
    parser.add_argument("blorb", help="Path to .blb/.blorb file")
    parser.add_argument("out_dir", help="Output directory")
    args = parser.parse_args()

    blorb_path = Path(args.blorb).resolve()
    out_dir = Path(args.out_dir).resolve()
    blorb = blorb_path.read_bytes()

    entries = parse_ridx_entries(blorb)
    snd_entries = [(usage, num, off) for usage, num, off in entries if usage == "Snd "]

    out_dir.mkdir(parents=True, exist_ok=True)
    extracted = 0
    for _usage, number, off in snd_entries:
        ftype, form_data = extract_form_chunk(blorb, off)
        aiff_path = out_dir / f"s{number}.aiff"
        aiff_path.write_bytes(form_data)

        if ftype == "AIFF":
            info = parse_aiff_chunks(form_data)
            wav_path = out_dir / f"s{number}.wav"
            aiff_pcm_to_wav(info, wav_path)
        extracted += 1

    print(f"Extracted {extracted} sound resource(s) to {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
