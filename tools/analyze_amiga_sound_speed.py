#!/usr/bin/env python3
"""Analyze original Amiga sound assets for speed/pitch clues.

This script does not assume a single true decoding model. Instead it reports:
1) raw .dat header fields,
2) note-on events from .mid sidecar files,
3) candidate playback multipliers/rates under common assumptions.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import asdict, dataclass
from pathlib import Path

PAL_CLOCK_HZ = 7093789.2


@dataclass
class MidInfo:
    raw_bytes: list[int]
    note_on_status: int | None
    note_on_note: int | None
    note_on_velocity: int | None
    tail_event_value: int | None


@dataclass
class DatInfo:
    file_name: str
    sample_id: int
    data_length: int
    header_total_minus_2: int
    header_word_1: int
    header_word_2: int
    header_word_3: int
    header_total_minus_10: int
    sample_count: int
    duration_at_11025: float
    duration_at_16537: float


@dataclass
class AnalysisRow:
    sample_id: int
    dat: DatInfo
    mid: MidInfo | None
    inferred: dict


def parse_id(path: Path) -> int | None:
    m = re.fullmatch(r"s(\d+)\.(?:dat|mid|nam)", path.name, flags=re.IGNORECASE)
    return int(m.group(1)) if m else None


def read_dat(path: Path, sample_id: int) -> DatInfo:
    raw = path.read_bytes()
    if len(raw) < 10:
        raise ValueError(f"Unexpected short DAT file: {path}")
    h0 = int.from_bytes(raw[0:2], "big")
    h1 = int.from_bytes(raw[2:4], "big")
    h2 = int.from_bytes(raw[4:6], "big")
    h3 = int.from_bytes(raw[6:8], "big")
    h4 = int.from_bytes(raw[8:10], "big")
    sample_count = max(0, len(raw) - 10)
    return DatInfo(
        file_name=path.name,
        sample_id=sample_id,
        data_length=len(raw),
        header_total_minus_2=h0,
        header_word_1=h1,
        header_word_2=h2,
        header_word_3=h3,
        header_total_minus_10=h4,
        sample_count=sample_count,
        duration_at_11025=sample_count / 11025.0,
        duration_at_16537=sample_count / 16537.0,
    )


def read_mid(path: Path) -> MidInfo:
    raw = list(path.read_bytes())
    note_on_status = None
    note_on_note = None
    note_on_velocity = None
    tail_value = raw[7] if len(raw) > 7 else None
    for i in range(0, max(0, len(raw) - 2)):
        status = raw[i]
        if status == 0x90:  # note on, channel 0
            note_on_status = status
            note_on_note = raw[i + 1]
            note_on_velocity = raw[i + 2]
            break
    return MidInfo(
        raw_bytes=raw,
        note_on_status=note_on_status,
        note_on_note=note_on_note,
        note_on_velocity=note_on_velocity,
        tail_event_value=tail_value,
    )


def paula_rate_from_period(period: int) -> float | None:
    if period <= 0:
        return None
    return PAL_CLOCK_HZ / (2.0 * period)


def note_ratio(note: int, ref_note: int) -> float:
    return 2.0 ** ((note - ref_note) / 12.0)


def infer(dat: DatInfo, mid: MidInfo | None, current_rate: int, default_root_note: int) -> dict:
    info: dict[str, object] = {}
    note = mid.note_on_note if mid else None
    if note is not None:
        info["midi_note"] = note
        info["ratio_vs_A4_69"] = round(note_ratio(note, 69), 6)
        info["ratio_vs_C4_60"] = round(note_ratio(note, 60), 6)
        info["ratio_vs_root_note"] = round(note_ratio(note, default_root_note), 6)
        info["suggested_rate_from_root_note"] = round(current_rate * note_ratio(note, default_root_note), 2)
    else:
        info["midi_note"] = None

    # Candidate: interpret header_word_1 as Paula period when plausible.
    p1 = dat.header_word_1
    if 80 <= p1 <= 1024:
        info["paula_rate_from_header_word_1"] = round(paula_rate_from_period(p1), 2)
    else:
        info["paula_rate_from_header_word_1"] = None

    p2 = dat.header_word_2
    if 80 <= p2 <= 1024:
        info["paula_rate_from_header_word_2"] = round(paula_rate_from_period(p2), 2)
    else:
        info["paula_rate_from_header_word_2"] = None

    # Quick flag for your "sounds about 50% too slow" observation.
    info["suggested_rate_if_1_5x_faster"] = round(current_rate * 1.5, 2)
    return info


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze original Amiga sound files for speed clues.")
    parser.add_argument(
      "--input-dir",
      default="app/data/amiga_sound_original",
      help="Directory containing s*.dat / s*.mid / s*.nam files.",
    )
    parser.add_argument(
      "--current-rate",
      type=int,
      default=11025,
      help="Current assumed source playback rate used by conversion (default 11025).",
    )
    parser.add_argument(
      "--default-root-note",
      type=int,
      default=74,
      help="Assumed root note for note-ratio rate suggestions (default 74).",
    )
    parser.add_argument(
      "--json-out",
      default=None,
      help="Optional path to write full JSON report.",
    )
    args = parser.parse_args()

    base = Path(args.input_dir).resolve()
    if not base.exists():
        raise SystemExit(f"Input dir not found: {base}")

    dat_files = sorted(base.glob("s*.dat"))
    rows: list[AnalysisRow] = []
    for dat_path in dat_files:
        sample_id = parse_id(dat_path)
        if sample_id is None:
            continue
        dat_info = read_dat(dat_path, sample_id)
        mid_path = base / f"s{sample_id}.mid"
        mid_info = read_mid(mid_path) if mid_path.exists() else None
        inferred = infer(dat_info, mid_info, args.current_rate, args.default_root_note)
        rows.append(AnalysisRow(sample_id=sample_id, dat=dat_info, mid=mid_info, inferred=inferred))

    rows.sort(key=lambda r: r.sample_id)

    print("Amiga sound speed analysis")
    print(f"Input dir: {base}")
    print(f"Samples analyzed: {len(rows)}")
    print("")
    print("id | note | hdr1 | hdr2 | seconds@11025 | ratio_vs_root | suggested_rate_root | suggested_rate_1.5x")
    print("---|------|------|------|----------------|---------------|---------------------|-------------------")
    for row in rows:
        note = row.mid.note_on_note if row.mid else None
        ratio = row.inferred.get("ratio_vs_root_note")
        suggested = row.inferred.get("suggested_rate_from_root_note")
        sug15 = row.inferred.get("suggested_rate_if_1_5x_faster")
        print(
            f"{row.sample_id:>2} | "
            f"{str(note) if note is not None else '-':>4} | "
            f"{row.dat.header_word_1:>4} | "
            f"{row.dat.header_word_2:>4} | "
            f"{row.dat.duration_at_11025:>14.3f} | "
            f"{str(ratio) if ratio is not None else '-':>13} | "
            f"{str(suggested) if suggested is not None else '-':>19} | "
            f"{sug15:>17}"
        )

    note_values = sorted({row.mid.note_on_note for row in rows if row.mid and row.mid.note_on_note is not None})
    print("")
    print(f"Distinct MIDI notes in sidecar files: {note_values}")
    if note_values:
        print(f"MIDI note min/max: {min(note_values)}..{max(note_values)}")

    if args.json_out:
        out_path = Path(args.json_out).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        payload = [asdict(row) for row in rows]
        out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"JSON report written: {out_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
