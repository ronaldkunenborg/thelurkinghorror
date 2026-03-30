#!/usr/bin/env python3
"""Small wrapper around amitools xdf utility for listing/extracting ADF images.

Usage examples:
  python tools/adf_tool.py list "..\\original_source\\disk.adf"
  python tools/adf_tool.py extract "..\\original_source\\disk.adf" ".\\tmp\\disk_unpack"
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def run_xdftool(args: list[str]) -> int:
    cmd = [sys.executable, "-m", "amitools.tools.xdftool"] + args
    proc = subprocess.run(cmd, check=False)
    return proc.returncode


def cmd_list(image: Path) -> int:
    if not image.exists():
        print(f"ADF not found: {image}", file=sys.stderr)
        return 2
    return run_xdftool([str(image), "list"])


def cmd_extract(image: Path, output_dir: Path, force: bool) -> int:
    if not image.exists():
        print(f"ADF not found: {image}", file=sys.stderr)
        return 2
    if output_dir.exists():
        if not force:
            print(
                f"Output directory already exists: {output_dir}\n"
                "Use --force to delete it before extraction.",
                file=sys.stderr,
            )
            return 2
        shutil.rmtree(output_dir)
    output_dir.parent.mkdir(parents=True, exist_ok=True)
    return run_xdftool([str(image), "unpack", str(output_dir)])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="List and extract Amiga ADF images.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_list = sub.add_parser("list", help="List files and directories in an ADF image.")
    p_list.add_argument("image", help="Path to .adf image.")

    p_extract = sub.add_parser("extract", help="Extract all files from an ADF image.")
    p_extract.add_argument("image", help="Path to .adf image.")
    p_extract.add_argument("output_dir", help="Directory where extracted files are written.")
    p_extract.add_argument(
        "--force",
        action="store_true",
        help="Delete output_dir first if it exists.",
    )

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    image = Path(args.image).resolve()

    if args.command == "list":
        return cmd_list(image)
    if args.command == "extract":
        return cmd_extract(image, Path(args.output_dir).resolve(), args.force)

    parser.print_help()
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
